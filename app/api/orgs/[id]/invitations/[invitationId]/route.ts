import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { json, route } from "@/lib/http";
import { apiLimiter, checkLimit } from "@/lib/ratelimit";
import { requireOrgOwner, requireUser } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";

/** DELETE /api/orgs/[id]/invitations/[invitationId] — cancel a pending invite */
export const DELETE = route(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  await checkLimit(apiLimiter, `api:${user.id}`);

  const { id, invitationId } = (await ctx.params) as { id: string; invitationId: string };
  const orgId = id;
  await requireOrgOwner(user, orgId);

  await auth.api.cancelInvitation({
    headers: await headers(),
    body: { invitationId },
  });

  await audit({
    orgId,
    actorUserId: user.id,
    action: "invitation.cancel",
    entityType: "org",
    entityId: orgId,
    metadata: { invitationId },
  });

  return json({ ok: true });
});
