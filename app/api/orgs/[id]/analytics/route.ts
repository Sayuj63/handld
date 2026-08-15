import { count, eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { changeRequests } from "@/db/schema";
import { db } from "@/lib/db";
import { forbidden, json, route } from "@/lib/http";
import { apiLimiter, checkLimit } from "@/lib/ratelimit";
import { requireOrgAccess, requireUser } from "@/lib/rbac";

/**
 * GET /api/orgs/[id]/analytics
 * Owners/admins (and super admin) only — client members are excluded (PRD §4).
 */
export const GET = route(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  await checkLimit(apiLimiter, `api:${user.id}`);

  const { id } = (await ctx.params) as { id: string };
  const orgId = id;
  const role = await requireOrgAccess(user, orgId);
  if (role === "member" && user.globalRole !== "super_admin") {
    throw forbidden("Analytics are available to owners and staff only");
  }

  const byStatus = await db
    .select({ key: changeRequests.status, n: count() })
    .from(changeRequests)
    .where(eq(changeRequests.orgId, orgId))
    .groupBy(changeRequests.status);

  const byType = await db
    .select({ key: changeRequests.type, n: count() })
    .from(changeRequests)
    .where(eq(changeRequests.orgId, orgId))
    .groupBy(changeRequests.type);

  const byPriority = await db
    .select({ key: changeRequests.priority, n: count() })
    .from(changeRequests)
    .where(eq(changeRequests.orgId, orgId))
    .groupBy(changeRequests.priority);

  const summary = await db
    .select({
      total: count(),
      completed: count(sql<number>`case when ${changeRequests.status} = 'completed' then 1 end`),
      rejected: count(sql<number>`case when ${changeRequests.status} = 'rejected' then 1 end`),
      overdue: count(sql<number>`case when ${changeRequests.status} not in ('completed','rejected') and ${changeRequests.updatedAt} < now() - interval '7 days' then 1 end`),
      avgTurnaroundDays: sql<number>`round(avg(case when ${changeRequests.status} = 'completed' then extract(epoch from (${changeRequests.completedAt} - ${changeRequests.createdAt})) / 86400.0 end)::numeric, 1)`,
    })
    .from(changeRequests)
    .where(eq(changeRequests.orgId, orgId));

  const monthly = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${changeRequests.createdAt}), 'YYYY-MM')`,
      n: count(),
    })
    .from(changeRequests)
    .where(eq(changeRequests.orgId, orgId))
    .groupBy(sql`date_trunc('month', ${changeRequests.createdAt})`)
    .orderBy(sql`date_trunc('month', ${changeRequests.createdAt}) desc`)
    .limit(6);

  const s = summary[0];
  const total = Number(s?.total ?? 0);
  const completed = Number(s?.completed ?? 0);

  return json({
    orgId,
    totals: {
      total,
      completed,
      rejected: Number(s?.rejected ?? 0),
      open: total - completed - Number(s?.rejected ?? 0),
      overdue: Number(s?.overdue ?? 0),
      completionRate: total ? Math.round((completed / total) * 100) : 0,
      avgTurnaroundDays: s?.avgTurnaroundDays ? Number(s.avgTurnaroundDays) : null,
    },
    byStatus,
    byType,
    byPriority,
    monthly: monthly.reverse(),
  });
});
