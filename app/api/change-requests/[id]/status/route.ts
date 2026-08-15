import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { changeRequests } from "@/db/schema";
import { db } from "@/lib/db";
import { badRequest, json, route } from "@/lib/http";
import { apiLimiter, checkLimit } from "@/lib/ratelimit";
import { STATUS_LABELS, STATUS_TRANSITIONS } from "@/lib/constants";
import type { RequestStatus } from "@/lib/constants";
import { getOrgStaff, getRequestOrThrow, serializeRequest } from "@/lib/request-helpers";
import { requireOrgAccess, requireRequestManager, requireUser } from "@/lib/rbac";
import { statusChangeSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";
import { appUrl, statusChangedEmail } from "@/lib/email";
import { createInAppNotification, enqueueEmail, flushOutbox } from "@/lib/notifications";

/**
 * PATCH /api/change-requests/[id]/status
 * Staff-only (super admin / org owner / org admin — per the PRD matrix).
 * Validates the transition against the workflow state diagram, records the
 * audit trail, and triggers client-facing notifications.
 */
export const PATCH = route(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  await checkLimit(apiLimiter, `api:${user.id}`);

  const { id } = (await ctx.params) as { id: string };
  const requestRow = await getRequestOrThrow(id);
  await requireOrgAccess(user, requestRow.orgId);
  await requireRequestManager(user, requestRow.orgId);

  const body = statusChangeSchema.parse(await req.json());

  const from = requestRow.status as RequestStatus;
  const to = body.status as RequestStatus;
  if (from === to) throw badRequest(`Request is already ${STATUS_LABELS[to]}`);
  if (!STATUS_TRANSITIONS[from].includes(to)) {
    throw badRequest(`Cannot move a request from "${STATUS_LABELS[from]}" to "${STATUS_LABELS[to]}"`);
  }

  await db
    .update(changeRequests)
    .set({
      status: to,
      updatedAt: new Date(),
      completedAt: to === "completed" ? new Date() : null,
    })
    .where(eq(changeRequests.id, requestRow.id));

  await audit({
    orgId: requestRow.orgId,
    actorUserId: user.id,
    action: "request.status",
    entityType: "request",
    entityId: requestRow.id,
    metadata: { from, to, note: body.note || null },
  });

  // Notify the creator + org staff.
  const url = `${appUrl()}/requests/${requestRow.id}`;
  const mail = statusChangedEmail({
    title: requestRow.title,
    from: STATUS_LABELS[from],
    to: STATUS_LABELS[to],
    note: body.note || undefined,
    url,
  });

  const staff = await getOrgStaff(requestRow.orgId);
  const recipients = new Map<string, { userId: string; email: string; name: string }>();
  if (requestRow.createdBy !== user.id) {
    recipients.set(requestRow.createdBy, {
      userId: requestRow.createdBy,
      email: requestRow.creatorEmail ?? "",
      name: requestRow.creatorName ?? "",
    });
  }
  for (const s of staff) if (s.userId !== user.id && !recipients.has(s.userId)) recipients.set(s.userId, s);

  for (const r of recipients.values()) {
    await createInAppNotification({
      userId: r.userId,
      orgId: requestRow.orgId,
      type: "status_changed",
      title: `${requestRow.title} → ${STATUS_LABELS[to]}`,
      body: body.note || `Status changed from ${STATUS_LABELS[from]} to ${STATUS_LABELS[to]}.`,
      payload: { requestId: requestRow.id, url },
    });
    // Emails to the creator are debounced — rapid status flips collapse into one.
    if (r.userId === requestRow.createdBy) {
      await enqueueEmail({
        orgId: requestRow.orgId,
        userId: r.userId,
        to: r.email,
        subject: mail.subject,
        html: mail.html,
        kind: "status_changed",
        debounceKey: `status:${requestRow.id}`,
        idempotencyKey: `status:${requestRow.id}:${to}`,
      });
    }
  }
  await flushOutbox(requestRow.orgId);

  const updated = await getRequestOrThrow(requestRow.id);
  return json({ request: serializeRequest(updated) });
});
