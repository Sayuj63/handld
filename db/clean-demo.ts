/**
 * Cleanup script — removes ALL demo/seed data from the database, leaving only
 * the super admin account (SUPER_ADMIN_EMAIL) intact. Use this when you're
 * done demoing and want a clean production start:
 *
 *   npm run db:clean
 *
 * Deletes: demo orgs (Studio Caramel, Noir Beauty), their stores, members,
 * change requests, comments, attachments, audit logs, notifications,
 * notification preferences, invitations, and the demo users (priya, prachi,
 * aarav, meera). Also clears the email outbox (includes stuck/failed rows).
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { eq, inArray, or } from "drizzle-orm";

import { db } from "../lib/db";
import {
  account,
  attachments,
  auditLogs,
  changeRequests,
  comments,
  emailOutbox,
  invitation,
  member,
  notificationPreferences,
  notifications,
  organization,
  session,
  stores,
  user,
} from "./schema";

const DEMO_ORGS = ["seed-org-caramel", "seed-org-noir"];
const DEMO_USERS = ["seed-priya", "seed-prachi", "seed-aarav", "seed-meera"];

async function main() {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail) {
    console.error("SUPER_ADMIN_EMAIL is not set in .env.local");
    process.exit(1);
  }

  console.log("Cleaning demo data… (keeping super admin " + superAdminEmail + ")\n");

  // Super admin must exist so we don't nuke the owner's login.
  const admin = await db.select({ id: user.id }).from(user).where(eq(user.email, superAdminEmail)).limit(1);
  if (!admin[0]) {
    console.error(`Super admin ${superAdminEmail} not found — aborting to avoid destroying everything.`);
    process.exit(1);
  }

  const demoRequestIds = (await db
    .select({ id: changeRequests.id })
    .from(changeRequests)
    .where(inArray(changeRequests.orgId, DEMO_ORGS))).map((r) => r.id);

  // ---- Child rows of demo requests ----
  if (demoRequestIds.length) {
    await db.delete(comments).where(inArray(comments.changeRequestId, demoRequestIds));
    await db.delete(attachments).where(inArray(attachments.changeRequestId, demoRequestIds));
  }
  await db.delete(changeRequests).where(inArray(changeRequests.orgId, DEMO_ORGS));
  await db.delete(notificationPreferences).where(inArray(notificationPreferences.userId, DEMO_USERS));
  await db.delete(notifications).where(
    or(inArray(notifications.userId, DEMO_USERS), inArray(notifications.orgId, DEMO_ORGS)),
  );
  await db.delete(invitation).where(inArray(invitation.organizationId, DEMO_ORGS));
  await db.delete(auditLogs).where(
    or(inArray(auditLogs.orgId, DEMO_ORGS), inArray(auditLogs.actorUserId, DEMO_USERS)),
  );
  await db.delete(emailOutbox).where(
    or(inArray(emailOutbox.orgId, DEMO_ORGS), inArray(emailOutbox.userId, DEMO_USERS)),
  );

  // ---- Memberships, stores, orgs ----
  await db.delete(member).where(inArray(member.organizationId, DEMO_ORGS));
  await db.delete(stores).where(inArray(stores.orgId, DEMO_ORGS));
  await db.delete(organization).where(inArray(organization.id, DEMO_ORGS));

  // ---- Demo users (auth rows first) ----
  await db.delete(session).where(inArray(session.userId, DEMO_USERS));
  await db.delete(account).where(inArray(account.userId, DEMO_USERS));
  await db.delete(user).where(inArray(user.id, DEMO_USERS));

  console.log("Done ✓");
  console.log(`Remaining: super admin only (${superAdminEmail}).`);
  console.log("The portal is now empty — create orgs and invite clients from the admin view.");
}

main().catch((err) => {
  console.error("Clean failed:", err);
  process.exit(1);
});
