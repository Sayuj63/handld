import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { invitation, organization } from "@/db/schema";
import { db } from "@/lib/db";
import { json, notFound, route } from "@/lib/http";

/**
 * GET /api/invitations/[id] — public, token-scoped lookup so the invite page
 * can show who/what the invitation is for before the user signs in.
 */
export const GET = route(async (req: NextRequest, ctx) => {
  const { id } = (await ctx.params) as { id: string };

  const rows = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      orgName: organization.name,
    })
    .from(invitation)
    .innerJoin(organization, eq(invitation.organizationId, organization.id))
    .where(and(eq(invitation.id, id), eq(invitation.status, "pending")))
    .limit(1);

  if (!rows[0]) throw notFound("Invitation not found or already used");
  if (rows[0].expiresAt.getTime() < Date.now()) throw notFound("Invitation has expired");

  return json({ invitation: rows[0] });
});
