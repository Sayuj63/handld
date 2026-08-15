import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { json, route } from "@/lib/http";
import { apiLimiter, checkLimit } from "@/lib/ratelimit";
import { requireOrgOwner, requireUser } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";

/** DELETE /api/orgs/[id]/members/[userId] — remove a member (owner / super admin) */
export const DELETE = route(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  await checkLimit(apiLimiter, `api:${user.id}`);

  const { id, userId } = (await ctx.params) as { id: string; userId: string };
  const orgId = id;
  await requireOrgOwner(user, orgId);

  await auth.api.removeMember({
    headers: await headers(),
    body: {
      organizationId: orgId,
      memberIdOrEmail: userId,
    },
  });

  await audit({
    orgId,
    actorUserId: user.id,
    action: "member.remove",
    entityType: "org",
    entityId: orgId,
    metadata: { userId },
  });

  return json({ ok: true });
});
