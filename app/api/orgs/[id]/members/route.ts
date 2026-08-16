import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { invitation, member, organization, user as userTable } from "@/db/schema";
import { db } from "@/lib/db";
import { badRequest, json, route } from "@/lib/http";
import { apiLimiter, checkLimit, inviteLimiter } from "@/lib/ratelimit";
import { requireOrgAccess, requireOrgOwner, requireUser } from "@/lib/rbac";
import { inviteMemberSchema } from "@/lib/validators";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { appUrl, inviteEmail } from "@/lib/email";
import { enqueueEmail, flushOutbox } from "@/lib/notifications";

const INVITE_TTL_DAYS = 7;

export const GET = route(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  await checkLimit(apiLimiter, `api:${user.id}`);

  const { id } = (await ctx.params) as { id: string };
  const orgId = id;
  await requireOrgAccess(user, orgId);

  const rows = await db
    .select({
      userId: member.userId,
      name: userTable.name,
      email: userTable.email,
      role: member.role,
      createdAt: member.createdAt,
    })
    .from(member)
    .innerJoin(userTable, eq(member.userId, userTable.id))
    .where(eq(member.organizationId, orgId))
    .orderBy(member.createdAt);

  return json({ members: rows });
});

/**
 * POST /api/orgs/[id]/members — invite a user to the org.
 * Allowed: Super Admin or the org owner (PRD matrix). The invited user
 * creates an account via the emailed link and the invitation is accepted.
 */
export const POST = route(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  await checkLimit(apiLimiter, `api:${user.id}`);

  const { id } = (await ctx.params) as { id: string };
  const orgId = id;
  await requireOrgOwner(user, orgId);

  const body = inviteMemberSchema.parse(await req.json());
  await checkLimit(inviteLimiter, `invite:${body.email}`);

  // Already a member?
  const memberCheck = await db
    .select({ userId: member.userId })
    .from(member)
    .innerJoin(userTable, eq(member.userId, userTable.id))
    .where(and(eq(member.organizationId, orgId), eq(userTable.email, body.email)))
    .limit(1);
  if (memberCheck[0]) throw badRequest("That user is already a member of this organization");

  // Try Better Auth's createInvitation first — it handles duplicate detection
  // and hooks into the organization plugin. It throws when the caller isn't a
  // member of the target org (super-admin bypass case), so we fall through to
  // a direct DB insert. Either path lands the same shape of row.
  let invitationRow: { id: string; expiresAt: Date };
  try {
    const result = await auth.api.createInvitation({
      headers: await headers(),
      body: {
        organizationId: orgId,
        email: body.email,
        role: body.role,
      },
    });
    const raw = result as { id: string; expiresAt: string | Date };
    invitationRow = {
      id: raw.id,
      expiresAt: raw.expiresAt instanceof Date ? raw.expiresAt : new Date(raw.expiresAt),
    };
  } catch {
    // Kill any older pending invite for the same (org, email) so we don't
    // accumulate duplicates each time super-admin re-invites.
    await db
      .update(invitation)
      .set({ status: "canceled" })
      .where(
        and(
          eq(invitation.organizationId, orgId),
          eq(invitation.email, body.email),
          eq(invitation.status, "pending"),
        ),
      );

    const id = randomUUID();
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
    await db.insert(invitation).values({
      id,
      organizationId: orgId,
      email: body.email,
      role: body.role,
      status: "pending",
      expiresAt,
      inviterId: user.id,
    });
    invitationRow = { id, expiresAt };
  }

  const orgRow = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  const inviteUrl = `${appUrl()}/invite/${invitationRow.id}`;
  const mail = inviteEmail({
    orgName: orgRow[0]?.name ?? "your organization",
    inviterName: user.name,
    inviteUrl,
    expiresAt: new Date(invitationRow.expiresAt),
  });
  await enqueueEmail({
    orgId,
    userId: null, // account-level email — sent regardless of prefs
    to: body.email,
    subject: mail.subject,
    html: mail.html,
    kind: "invite",
    idempotencyKey: `invite:${invitationRow.id}`,
  });
  await flushOutbox(orgId);

  await audit({
    orgId,
    actorUserId: user.id,
    action: "member.invite",
    entityType: "org",
    entityId: orgId,
    metadata: { email: body.email, role: body.role },
  });

  return json(
    {
      invitation: {
        id: invitationRow.id,
        email: body.email,
        role: body.role,
        expiresAt: invitationRow.expiresAt,
      },
    },
    { status: 201 },
  );
});
