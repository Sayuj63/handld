import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { member, organization, user as userTable } from "@/db/schema";
import { db } from "@/lib/db";
import { badRequest, json, route } from "@/lib/http";
import { apiLimiter, checkLimit, inviteLimiter } from "@/lib/ratelimit";
import { requireOrgAccess, requireOrgOwner, requireUser } from "@/lib/rbac";
import { inviteMemberSchema } from "@/lib/validators";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { appUrl, inviteEmail } from "@/lib/email";
import { enqueueEmail, flushOutbox } from "@/lib/notifications";

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

  const result = await auth.api.createInvitation({
    headers: await headers(),
    body: {
      organizationId: orgId,
      email: body.email,
      role: body.role,
    },
  });
  const invitationRow = result as { id: string; expiresAt: string | Date };

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
