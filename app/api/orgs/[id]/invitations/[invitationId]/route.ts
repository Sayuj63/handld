import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { invitation } from "@/db/schema";
import { db } from "@/lib/db";
import { json, notFound, route } from "@/lib/http";
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

  // Confirm the invitation belongs to this org before touching it — prevents
  // one org's cancel from targeting another org's invitation id.
  const existing = await db
    .select({ id: invitation.id })
    .from(invitation)
    .where(and(eq(invitation.id, invitationId), eq(invitation.organizationId, orgId)))
    .limit(1);
  if (!existing[0]) throw notFound("Invitation not found");

  // Try Better Auth's cancel first — it clears any related plugin state. If
  // it fails (e.g. super-admin isn't a member of the org, so BA rejects the
  // action even though our RBAC already approved it), fall through to a
  // direct status update. Either way the row ends up cancelled.
  let cancelledViaBetterAuth = false;
  try {
    await auth.api.cancelInvitation({
      headers: await headers(),
      body: { invitationId },
    });
    cancelledViaBetterAuth = true;
  } catch {
    /* fall through to direct update */
  }
  if (!cancelledViaBetterAuth) {
    await db
      .update(invitation)
      .set({ status: "canceled" })
      .where(eq(invitation.id, invitationId));
  }

  await audit({
    orgId,
    actorUserId: user.id,
    action: "invitation.cancel",
    entityType: "org",
    entityId: orgId,
    metadata: { invitationId, viaBetterAuth: cancelledViaBetterAuth },
  });

  return json({ ok: true });
});
