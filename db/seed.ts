/**
 * Seed script — creates the super admin (from SUPER_ADMIN_EMAIL), two demo
 * client orgs with stores, users in each role, and a handful of change
 * requests spanning the workflow.
 *
 *   npm run db:seed
 *
 * Passwords for demo accounts are printed at the end. In production, change
 * them immediately.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";

import { db } from "../lib/db";
import {
  account,
  auditLogs,
  changeRequests,
  comments,
  member,
  notificationPreferences,
  organization,
  stores,
  user,
} from "./schema";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

async function upsertUser(input: {
  id: string;
  email: string;
  name: string;
  globalRole: string;
  password: string;
}) {
  const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, input.email)).limit(1);
  if (existing[0]) return existing[0].id;

  await db.insert(user).values({
    id: input.id,
    name: input.name,
    email: input.email,
    emailVerified: true,
    globalRole: input.globalRole,
  });
  const passwordHash = await hashPassword(input.password);
  await db.insert(account).values({
    id: randomUUID(),
    accountId: input.id,
    providerId: "credential",
    userId: input.id,
    password: passwordHash,
  });
  return input.id;
}

async function upsertOrg(input: { id: string; name: string; slug: string }) {
  const existing = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, input.slug))
    .limit(1);
  if (existing[0]) return existing[0].id;
  await db.insert(organization).values({
    id: input.id,
    name: input.name,
    slug: input.slug,
    createdAt: daysAgo(60),
  });
  return input.id;
}

async function upsertMember(orgId: string, userId: string, role: string) {
  const existing = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.organizationId, orgId), eq(member.userId, userId)))
    .limit(1);
  if (!existing[0]) {
    await db.insert(member).values({
      id: randomUUID(),
      organizationId: orgId,
      userId,
      role,
      createdAt: daysAgo(50),
    });
  }
}

async function main() {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail) {
    console.error("SUPER_ADMIN_EMAIL is not set in .env.local — the seed needs to know who the super admin is.");
    process.exit(1);
  }
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || "ChangeDesk123!";
  const demoPassword = "ChangeDesk123!";

  console.log("Seeding handld…\n");

  // 1. Users
  const sayujId = await upsertUser({
    id: "seed-sayuj",
    email: superAdminEmail,
    name: "Sayuj",
    globalRole: "super_admin",
    password: adminPassword,
  });
  // Super admin also gets the admin-plugin role.
  await db
    .update(user)
    .set({ role: "admin", globalRole: "super_admin" })
    .where(eq(user.id, sayujId));

  const priyaId = await upsertUser({
    id: "seed-priya",
    email: "priya@handld.dev",
    name: "Priya (Team)",
    globalRole: "team_member",
    password: demoPassword,
  });
  const prachiId = await upsertUser({
    id: "seed-prachi",
    email: "prachi@studiocaramel.com",
    name: "Prachi",
    globalRole: "user",
    password: demoPassword,
  });
  const aaravId = await upsertUser({
    id: "seed-aarav",
    email: "aarav@studiocaramel.com",
    name: "Aarav",
    globalRole: "user",
    password: demoPassword,
  });
  const meeraId = await upsertUser({
    id: "seed-meera",
    email: "meera@noirbeauty.com",
    name: "Meera",
    globalRole: "user",
    password: demoPassword,
  });

  // 2. Orgs + memberships
  const caramelId = await upsertOrg({
    id: "seed-org-caramel",
    name: "Studio Caramel",
    slug: "studio-caramel",
  });
  const noirId = await upsertOrg({ id: "seed-org-noir", name: "Noir Beauty", slug: "noir-beauty" });

  for (const [orgId, memberships] of [
    [caramelId, [[sayujId, "owner"], [priyaId, "admin"], [prachiId, "owner"], [aaravId, "member"]]],
    [noirId, [[sayujId, "owner"], [priyaId, "admin"], [meeraId, "owner"]]],
  ] as const) {
    for (const [userId, role] of memberships) await upsertMember(orgId, userId, role);
  }

  // 3. Stores
  await db
    .insert(stores)
    .values([
      { id: "seed-store-caramel", orgId: caramelId, shopifyDomain: "studiocaramel.myshopify.com", label: "Main store" },
      { id: "seed-store-noir", orgId: noirId, shopifyDomain: "noirbeauty.myshopify.com", label: "Noir Beauty" },
    ])
    .onConflictDoNothing();

  // 4. Change requests
  const req = async (input: {
    id: string;
    orgId: string;
    storeId?: string;
    createdBy: string;
    assignedTo?: string;
    title: string;
    description: string;
    type: string;
    priority: string;
    status: string;
    daysAgo: number;
    referenceUrl?: string;
    targetSection?: string;
  }) => {
    const createdAt = daysAgo(input.daysAgo);
    const updatedAt = input.status === "submitted" ? createdAt : daysAgo(Math.max(0, input.daysAgo - 1));
    await db
      .insert(changeRequests)
      .values({
        id: input.id,
        orgId: input.orgId,
        storeId: input.storeId ?? null,
        createdBy: input.createdBy,
        assignedTo: input.assignedTo ?? null,
        title: input.title,
        description: input.description,
        type: input.type,
        priority: input.priority,
        status: input.status,
        referenceUrl: input.referenceUrl ?? null,
        targetSection: input.targetSection ?? null,
        createdAt,
        updatedAt,
        completedAt: input.status === "completed" ? daysAgo(Math.max(0, input.daysAgo - 3)) : null,
      })
      .onConflictDoNothing();
    await db.insert(auditLogs).values({
      id: randomUUID(),
      orgId: input.orgId,
      actorUserId: input.createdBy,
      action: "request.create",
      entityType: "request",
      entityId: input.id,
      metadata: { title: input.title },
      createdAt,
    });
  };

  await req({
    id: "seed-req-1",
    orgId: caramelId,
    storeId: "seed-store-caramel",
    createdBy: prachiId,
    assignedTo: priyaId,
    title: "Update homepage hero image for summer collection",
    description: "Swap the current hero image for the new summer campaign shot (attached). Keep the same headline copy for now.",
    type: "content",
    priority: "high",
    status: "in_progress",
    daysAgo: 4,
    targetSection: "Homepage hero",
  });
  await req({
    id: "seed-req-2",
    orgId: caramelId,
    storeId: "seed-store-caramel",
    createdBy: aaravId,
    title: "Checkout page shows wrong currency on mobile",
    description: "On iOS Safari the price shows USD instead of the store currency. Reproduced on iPhone 14, latest iOS.",
    type: "bug",
    priority: "urgent",
    status: "in_review",
    daysAgo: 2,
    targetSection: "Checkout",
  });
  await req({
    id: "seed-req-3",
    orgId: caramelId,
    createdBy: prachiId,
    title: "Add size guide to product pages",
    description: "We'd like a collapsible size guide on all product pages, matching the brand aesthetic. Happy to provide the content.",
    type: "new_feature",
    priority: "medium",
    status: "acknowledged",
    daysAgo: 6,
    targetSection: "Product page",
  });
  await req({
    id: "seed-req-4",
    orgId: caramelId,
    createdBy: aaravId,
    title: "Tweak announcement bar copy",
    description: "Change the announcement bar to: 'Free shipping over ₹2,499 — code CARAMEL10'.",
    type: "content",
    priority: "low",
    status: "completed",
    daysAgo: 12,
    targetSection: "Announcement bar",
  });
  await req({
    id: "seed-req-5",
    orgId: caramelId,
    createdBy: prachiId,
    title: "Mobile menu spacing feels cramped",
    description: "The navigation links on mobile are too close together — add breathing room. See screenshot.",
    type: "design",
    priority: "medium",
    status: "submitted",
    daysAgo: 1,
    targetSection: "Mobile menu",
  });
  await req({
    id: "seed-req-6",
    orgId: noirId,
    storeId: "seed-store-noir",
    createdBy: meeraId,
    title: "Add Klaviyo signup popup",
    description: "We want a newsletter popup wired to our Klaviyo list, showing after 15 seconds, once per session.",
    type: "new_feature",
    priority: "high",
    status: "in_progress",
    daysAgo: 3,
    targetSection: "Global",
  });
  await req({
    id: "seed-req-7",
    orgId: noirId,
    createdBy: meeraId,
    title: "Product images not loading on collection pages",
    description: "Some product thumbnails on the New Arrivals collection are broken after yesterday's theme update.",
    type: "bug",
    priority: "urgent",
    status: "on_hold",
    daysAgo: 5,
    referenceUrl: "https://noirbeauty.myshopify.com/collections/new-arrivals",
    targetSection: "Collection page",
  });
  await req({
    id: "seed-req-8",
    orgId: noirId,
    createdBy: meeraId,
    title: "Update About page with new team photos",
    description: "Replacing the About page imagery with the new team photos we sent over email.",
    type: "content",
    priority: "low",
    status: "rejected",
    daysAgo: 9,
    targetSection: "About page",
  });

  // 5. A comment + status audit on the currency bug
  await db
    .insert(comments)
    .values({
      id: "seed-comment-1",
      changeRequestId: "seed-req-2",
      userId: priyaId,
      body: "Reproduced — looks like the payment gateway's currency setting. Fixing the cart currency conversion now.",
      createdAt: daysAgo(1),
    })
    .onConflictDoNothing();
  await db
    .insert(auditLogs)
    .values({
      id: randomUUID(),
      orgId: caramelId,
      actorUserId: priyaId,
      action: "request.status",
      entityType: "request",
      entityId: "seed-req-2",
      metadata: { from: "in_progress", to: "in_review", note: "Fix deployed, waiting on client review" },
      createdAt: daysAgo(1),
    })
    .onConflictDoNothing();

  // 6. Notification prefs
  await db
    .insert(notificationPreferences)
    .values([{ userId: prachiId, mode: "instant" }, { userId: meeraId, mode: "daily_digest" }])
    .onConflictDoNothing();

  console.log("Done ✓\n");
  console.log("── Demo accounts (password for all: ChangeDesk123!) ──");
  console.log(`  Super admin  → ${superAdminEmail}   (password: ${adminPassword})`);
  console.log("  Team member  → priya@handld.dev");
  console.log("  Client owner → prachi@studiocaramel.com  (Studio Caramel)");
  console.log("  Client owner → meera@noirbeauty.com      (Noir Beauty)");
  console.log("  Client member→ aarav@studiocaramel.com");
  console.log("\nOrgs: Studio Caramel, Noir Beauty — each with stores and seeded requests.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
