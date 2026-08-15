import { count, eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { changeRequests, invitation, member, organization, stores, user as userTable } from "@/db/schema";
import { db } from "@/lib/db";
import { json, route } from "@/lib/http";
import { apiLimiter, checkLimit } from "@/lib/ratelimit";
import { requireOrgAccess, requireOrgOwner, requireUser } from "@/lib/rbac";
import { updateOrgSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";

export const GET = route(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  await checkLimit(apiLimiter, `api:${user.id}`);

  const { id } = (await ctx.params) as { id: string };
  const orgId = id;
  const role = await requireOrgAccess(user, orgId);

  const [org, members, storeRows, counts, invitations] = await Promise.all([
    db.select().from(organization).where(eq(organization.id, orgId)).limit(1),
    db
      .select({
        userId: member.userId,
        name: userTable.name,
        email: userTable.email,
        role: member.role,
      })
      .from(member)
      .innerJoin(userTable, eq(member.userId, userTable.id))
      .where(eq(member.organizationId, orgId))
      .orderBy(member.createdAt),
    db.select().from(stores).where(eq(stores.orgId, orgId)).orderBy(stores.createdAt),
    db
      .select({
        total: count(),
        open: count(sql<number>`case when ${changeRequests.status} not in ('completed','rejected') then 1 end`),
      })
      .from(changeRequests)
      .where(eq(changeRequests.orgId, orgId)),
    role === "owner" || role === "admin" || user.globalRole === "super_admin"
      ? db.select().from(invitation).where(eq(invitation.organizationId, orgId))
      : [],
  ]);

  const isManager = role === "owner" || role === "admin" || user.globalRole === "super_admin";

  return json({
    organization: org[0] ?? null,
    members: members.map((m) => ({ ...m, isManager })),
    stores: storeRows,
    stats: {
      total: counts[0]?.total ?? 0,
      open: counts[0]?.open ?? 0,
    },
    invitations: isManager
      ? invitations.map((i) => ({ id: i.id, email: i.email, role: i.role, status: i.status, expiresAt: i.expiresAt }))
      : [],
  });
});

export const PATCH = route(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  await checkLimit(apiLimiter, `api:${user.id}`);

  const { id } = (await ctx.params) as { id: string };
  const orgId = id;
  await requireOrgOwner(user, orgId);

  const body = updateOrgSchema.parse(await req.json());

  const changes: Record<string, unknown> = {};
  if (body.name !== undefined) changes.name = body.name;
  if (body.logo !== undefined) changes.logo = body.logo;
  if (!Object.keys(changes).length) return json({ ok: true });

  await db.update(organization).set(changes).where(eq(organization.id, orgId));
  await audit({
    orgId,
    actorUserId: user.id,
    action: "org.update",
    entityType: "org",
    entityId: orgId,
    metadata: { fields: Object.keys(changes) },
  });

  const updated = await db.select().from(organization).where(eq(organization.id, orgId)).limit(1);
  return json({ organization: updated[0] ?? null });
});
