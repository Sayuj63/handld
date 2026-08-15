import { and, eq, ilike, or } from "drizzle-orm";
import { NextRequest } from "next/server";

import { user } from "@/db/schema";
import { db } from "@/lib/db";
import { json, route } from "@/lib/http";
import { apiLimiter, checkLimit } from "@/lib/ratelimit";
import { requireStaff } from "@/lib/rbac";

/** GET /api/users?q=&globalRole= — staff-only user search (assignee picker etc.) */
export const GET = route(async (req: NextRequest) => {
  const staff = await requireStaff();
  await checkLimit(apiLimiter, `api:${staff.id}`);

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const globalRole = req.nextUrl.searchParams.get("globalRole")?.trim();

  const conditions = [];
  if (q) {
    const term = `%${q}%`;
    conditions.push(or(ilike(user.name, term), ilike(user.email, term)));
  }
  if (globalRole) conditions.push(eq(user.globalRole, globalRole));

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      globalRole: user.globalRole,
      role: user.role,
      banned: user.banned,
    })
    .from(user)
    .where(conditions.length ? and(...conditions) : undefined)
    .limit(20);

  return json({ users: rows });
});
