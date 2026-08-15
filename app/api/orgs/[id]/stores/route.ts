import { NextRequest } from "next/server";

import { stores } from "@/db/schema";
import { db } from "@/lib/db";
import { json, route } from "@/lib/http";
import { apiLimiter, checkLimit } from "@/lib/ratelimit";
import { requireOrgOwner, requireUser } from "@/lib/rbac";
import { addStoreSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";

/** POST /api/orgs/[id]/stores — add a Shopify store to an org */
export const POST = route(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  await checkLimit(apiLimiter, `api:${user.id}`);

  const { id } = (await ctx.params) as { id: string };
  const orgId = id;
  await requireOrgOwner(user, orgId);

  const body = addStoreSchema.parse(await req.json());

  const storeId = crypto.randomUUID();
  await db.insert(stores).values({
    id: storeId,
    orgId,
    shopifyDomain: body.shopifyDomain,
    label: body.label || null,
  });

  await audit({
    orgId,
    actorUserId: user.id,
    action: "store.create",
    entityType: "org",
    entityId: orgId,
    metadata: { storeId, shopifyDomain: body.shopifyDomain },
  });

  return json({ store: { id: storeId, shopifyDomain: body.shopifyDomain, label: body.label || null } }, { status: 201 });
});
