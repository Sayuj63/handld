import { and, count, eq, gte, sql } from "drizzle-orm";

import { emailOutbox, notificationPreferences, notifications } from "@/db/schema";
import { db } from "@/lib/db";
import { EMAIL_DEBOUNCE_MS, ORG_EMAIL_HOURLY_CAP } from "@/lib/constants";
import type { NotificationMode } from "@/lib/constants";
import { digestEmail, sendEmail } from "@/lib/email";

/* ─────────────────────────────────────────────────────────────
 * In-app notifications — mirror every email trigger.
 * ───────────────────────────────────────────────────────────── */

export async function createInAppNotification(input: {
  userId: string;
  orgId?: string | null;
  type: string;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
}) {
  await db.insert(notifications).values({
    userId: input.userId,
    orgId: input.orgId ?? null,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    payload: input.payload ?? {},
  });
}

export async function getUserNotificationMode(userId: string): Promise<NotificationMode> {
  const rows = await db
    .select({ mode: notificationPreferences.mode })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  return (rows[0]?.mode as NotificationMode) ?? "instant";
}

/* ─────────────────────────────────────────────────────────────
 * Email queue (§8.1)
 *  - per-user preference (instant / hourly_digest / daily_digest / off)
 *  - debounce window: rapid events on the same key collapse into one email
 *  - per-org hourly cap with digest fallback
 *  - idempotency keys so retries never double-send
 * ───────────────────────────────────────────────────────────── */

export async function enqueueEmail(input: {
  orgId: string | null;
  userId: string | null;
  to: string;
  subject: string;
  html: string;
  kind: string;
  debounceKey?: string;
  idempotencyKey?: string;
}) {
  const mode = input.userId ? await getUserNotificationMode(input.userId) : "instant";

  // User opted out of email entirely.
  if (mode === "off") {
    await db.insert(emailOutbox).values({
      orgId: input.orgId,
      userId: input.userId,
      to: input.to,
      subject: input.subject,
      html: input.html,
      kind: input.kind,
      status: "skipped",
      debounceKey: input.debounceKey,
      idempotencyKey: input.idempotencyKey ?? null,
    });
    return;
  }

  // Debounce: if a pending email with the same key exists within the window,
  // collapse into it instead of queueing a new one.
  if (input.debounceKey) {
    const cutoff = new Date(Date.now() - EMAIL_DEBOUNCE_MS);
    const existing = await db
      .select({ id: emailOutbox.id })
      .from(emailOutbox)
      .where(
        and(
          eq(emailOutbox.debounceKey, input.debounceKey),
          eq(emailOutbox.status, "pending"),
          gte(emailOutbox.createdAt, cutoff),
        ),
      )
      .limit(1);
    if (existing[0]) {
      await db
        .update(emailOutbox)
        .set({ subject: input.subject, html: input.html })
        .where(eq(emailOutbox.id, existing[0].id));
      return;
    }
  }

  // Digest-mode users never get instant emails.
  const queuedAsDigest = mode === "hourly_digest" || mode === "daily_digest";

  await db.insert(emailOutbox).values({
    orgId: input.orgId,
    userId: input.userId,
    to: input.to,
    subject: input.subject,
    html: input.html,
    kind: input.kind,
    status: queuedAsDigest ? "digest" : "pending",
    debounceKey: input.debounceKey,
    idempotencyKey: input.idempotencyKey ?? null,
  });
}

async function countSentInHour(orgId: string): Promise<number> {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  const rows = await db
    .select({ n: count() })
    .from(emailOutbox)
    .where(and(eq(emailOutbox.orgId, orgId), eq(emailOutbox.status, "sent"), gte(emailOutbox.sentAt, cutoff)));
  return rows[0]?.n ?? 0;
}

/**
 * Send queued emails. Rows newer than the debounce window stay pending;
 * once an org hits its hourly cap the remainder fall back to the digest
 * queue. Call after relevant mutations, and from the cron route.
 */
export async function flushOutbox(orgId?: string | null) {
  const where = [eq(emailOutbox.status, "pending")];
  if (orgId) where.push(eq(emailOutbox.orgId, orgId));

  const pending = await db.select().from(emailOutbox).where(and(...where)).limit(100);

  for (const row of pending) {
    // Debounced email still inside its window? Wait for the window to close.
    if (row.debounceKey && Date.now() - row.createdAt.getTime() < EMAIL_DEBOUNCE_MS) continue;

    // Per-org hourly cap → fall back to digest.
    if (row.orgId && (await countSentInHour(row.orgId)) >= ORG_EMAIL_HOURLY_CAP) {
      await db.update(emailOutbox).set({ status: "digest" }).where(eq(emailOutbox.id, row.id));
      continue;
    }

    try {
      await sendEmail({
        to: row.to,
        subject: row.subject,
        html: row.html,
        idempotencyKey: row.idempotencyKey ?? undefined,
      });
      await db
        .update(emailOutbox)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(emailOutbox.id, row.id));
    } catch (err) {
      const attempts = row.attemptCount + 1;
      await db
        .update(emailOutbox)
        .set({
          attemptCount: attempts,
          status: attempts >= 3 ? "failed" : "pending",
          error: err instanceof Error ? err.message.slice(0, 500) : "send failed",
        })
        .where(eq(emailOutbox.id, row.id));
    }
  }
}

/**
 * Bundle digest rows per user into one email.
 * Respects hourly vs daily cadence per preference; `force` sends regardless
 * of cadence (used by the manual flush endpoint).
 */
export async function sendDigests(force = false) {
  const rows = await db
    .select()
    .from(emailOutbox)
    .where(eq(emailOutbox.status, "digest"))
    .limit(200);

  const byUser = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.userId ?? row.to;
    if (!byUser.has(key)) byUser.set(key, []);
    byUser.get(key)!.push(row);
  }

  for (const group of byUser.values()) {
    const userId = group[0].userId;
    const mode = userId ? await getUserNotificationMode(userId) : "instant";

    // Cadence check (unless forced).
    if (!force) {
      const lastDigest = await db
        .select({ sentAt: emailOutbox.sentAt })
        .from(emailOutbox)
        .where(and(eq(emailOutbox.userId, userId ?? ""), eq(emailOutbox.kind, "digest"), eq(emailOutbox.status, "sent"), sql`sent_at is not null`))
        .orderBy(sql`sent_at desc`)
        .limit(1);
      const hoursSince = lastDigest[0]?.sentAt
        ? (Date.now() - lastDigest[0].sentAt.getTime()) / 3_600_000
        : Infinity;
      if (mode === "hourly_digest" && hoursSince < 1) continue;
      if (mode === "daily_digest" && hoursSince < 24) continue;
    }

    const orgName = group[0].orgId ? (await orgNameFor(group[0].orgId)) : "ChangeDesk";
    const { subject, html } = digestEmail({
      orgName,
      items: group.map((r) => ({ title: r.subject, detail: "" })),
    });

    try {
      await sendEmail({ to: group[0].to, subject, html });
      const sentAt = new Date();
      for (const row of group) {
        await db
          .update(emailOutbox)
          .set({ status: "sent", sentAt })
          .where(eq(emailOutbox.id, row.id));
      }
    } catch (err) {
      console.error("[email] digest send failed:", err);
    }
  }
}

async function orgNameFor(orgId: string): Promise<string> {
  const { organization } = await import("@/db/schema");
  const rows = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);
  return rows[0]?.name ?? "ChangeDesk";
}
