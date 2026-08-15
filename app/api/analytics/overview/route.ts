import { count, eq, sql } from "drizzle-orm";

import { changeRequests, organization } from "@/db/schema";
import { db } from "@/lib/db";
import { json, route } from "@/lib/http";
import { apiLimiter, checkLimit } from "@/lib/ratelimit";
import { getUserOrgs, requireStaff } from "@/lib/rbac";

/** GET /api/analytics/overview — per-org summary across the staff's orgs */
export const GET = route(async () => {
  const user = await requireStaff();
  await checkLimit(apiLimiter, `api:${user.id}`);

  const orgs =
    user.globalRole === "super_admin"
      ? (await db.select({ id: organization.id, name: organization.name }).from(organization)).map((o) => ({ orgId: o.id, orgName: o.name }))
      : (await getUserOrgs(user.id)).map((o) => ({ orgId: o.orgId, orgName: o.orgName }));

  const rows: {
    orgId: string;
    orgName: string;
    total: number;
    open: number;
    completed: number;
    overdue: number;
    avgTurnaroundDays: number | null;
  }[] = [];

  for (const org of orgs) {
    const summary = await db
      .select({
        total: count(),
        completed: count(sql<number>`case when ${changeRequests.status} = 'completed' then 1 end`),
        overdue: count(sql<number>`case when ${changeRequests.status} not in ('completed','rejected') and ${changeRequests.updatedAt} < now() - interval '7 days' then 1 end`),
        avgTurnaroundDays: sql<number>`round(avg(case when ${changeRequests.status} = 'completed' then extract(epoch from (${changeRequests.completedAt} - ${changeRequests.createdAt})) / 86400.0 end)::numeric, 1)`,
      })
      .from(changeRequests)
      .where(eq(changeRequests.orgId, org.orgId));

    const s = summary[0];
    const total = Number(s?.total ?? 0);
    const completed = Number(s?.completed ?? 0);
    rows.push({
      orgId: org.orgId,
      orgName: org.orgName,
      total,
      open: total - completed,
      completed,
      overdue: Number(s?.overdue ?? 0),
      avgTurnaroundDays: s?.avgTurnaroundDays ? Number(s.avgTurnaroundDays) : null,
    });
  }

  return json({
    orgs: rows,
    totals: rows.reduce(
      (acc, r) => ({
        total: acc.total + r.total,
        open: acc.open + r.open,
        completed: acc.completed + r.completed,
        overdue: acc.overdue + r.overdue,
      }),
      { total: 0, open: 0, completed: 0, overdue: 0 },
    ),
  });
});
