import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { organization } from "@/db/schema";
import { db } from "@/lib/db";
import { json, route } from "@/lib/http";
import { apiLimiter, checkLimit } from "@/lib/ratelimit";
import { getUserOrgs, requireSuperAdmin, requireUser } from "@/lib/rbac";
import { createOrgSchema } from "@/lib/validators";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** GET /api/orgs — the caller's organizations (all of them for super admin) */
export const GET = route(async () => {
  const user = await requireUser();
  await checkLimit(apiLimiter, `api:${user.id}`);

  if (user.globalRole === "super_admin") {
    const all = await db.select().from(organization).orderBy(organization.name);
    return json({
      orgs: all.map((o) => ({ orgId: o.id, orgName: o.name, role: "owner" })),
    });
  }
  const orgs = await getUserOrgs(user.id);
  return json({ orgs });
});

/** POST /api/orgs — create a client org (Super Admin only) */
export const POST = route(async (req: NextRequest) => {
  const user = await requireSuperAdmin();
  await checkLimit(apiLimiter, `api:${user.id}`);

  const body = createOrgSchema.parse(await req.json());
  const slug = body.slug || slugify(body.name);

  // Slug collisions → disambiguate with a suffix.
  let finalSlug = slug;
  for (let i = 1; ; i++) {
    const existing = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.slug, finalSlug))
      .limit(1);
    if (!existing[0]) break;
    finalSlug = `${slug}-${i}`;
  }

  const result = await auth.api.createOrganization({
    headers: await headers(),
    body: {
      name: body.name,
      slug: finalSlug,
      logo: body.logo || null,
    },
  });
  if (!result?.id) throw new Error("Failed to create organization");

  await audit({
    orgId: result.id,
    actorUserId: user.id,
    action: "org.create",
    entityType: "org",
    entityId: result.id,
    metadata: { name: body.name, slug: finalSlug },
  });

  return json({ organization: result }, { status: 201 });
});
