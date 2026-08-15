import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";

import { member, organization } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, forbidden, unauthorized } from "@/lib/http";

export type SessionUser = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>["user"];
export type SessionOrg = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>["session"]["activeOrganizationId"];

/** Resolve the session from the incoming request. Throws 401 when absent. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw unauthorized();
  return session.user;
}

/** Resolve the session; null when anonymous (for public routes). */
export async function getOptionalUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export function isSuperAdmin(user: Pick<SessionUser, "globalRole">) {
  return user.globalRole === "super_admin";
}

export function isTeamMember(user: Pick<SessionUser, "globalRole">) {
  return user.globalRole === "team_member";
}

export function isStaff(user: Pick<SessionUser, "globalRole">) {
  return isSuperAdmin(user) || isTeamMember(user);
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isSuperAdmin(user)) throw forbidden("Super admin access required");
  return user;
}

export async function requireStaff(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isStaff(user)) throw forbidden("Staff access required");
  return user;
}

export type OrgMembership = { orgId: string; role: string; orgName: string };

/** All orgs the user belongs to, with role + name. */
export async function getUserOrgs(userId: string): Promise<OrgMembership[]> {
  const rows = await db
    .select({
      orgId: member.organizationId,
      role: member.role,
      orgName: organization.name,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId));
  return rows;
}

/** The user's role in a specific org, or null. */
export async function getOrgRole(
  userId: string,
  orgId: string,
): Promise<OrgMembership["role"] | null> {
  const rows = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, orgId), eq(member.userId, userId)))
    .limit(1);
  return rows[0]?.role ?? null;
}

/**
 * Core multi-tenancy guard (§6.2): verify the caller may access `orgId`.
 * Super admin may access any org; everyone else must be a member.
 * Returns the caller's role in that org.
 */
export async function requireOrgAccess(
  user: SessionUser,
  orgId: string,
): Promise<OrgMembership["role"]> {
  if (isSuperAdmin(user)) return "owner";
  const role = await getOrgRole(user.id, orgId);
  if (!role) throw forbidden("You don't have access to this organization");
  return role;
}

/** Super admin or org owner. */
export async function requireOrgOwner(user: SessionUser, orgId: string): Promise<void> {
  if (isSuperAdmin(user)) return;
  const role = await requireOrgAccess(user, orgId);
  if (role !== "owner") throw forbidden("Only the organization owner can do this");
}

/**
 * Anyone who can act on requests inside an org: Super Admin or Team Member
 * (per the PRD RBAC matrix — client owners/members cannot change status).
 * Team members are still tenant-scoped: they must be members of the org.
 */
export async function requireRequestManager(user: SessionUser, orgId: string): Promise<void> {
  if (isSuperAdmin(user)) return;
  await requireOrgAccess(user, orgId);
  if (!isTeamMember(user)) {
    throw forbidden("Only staff can update request status");
  }
}

/**
 * Parse + validate an orgId supplied by the client (query/body) against the
 * caller's memberships. Never trust the raw value — this is the heart of
 * tenant isolation.
 */
export async function resolveOrgId(user: SessionUser, rawOrgId: string | null | undefined) {
  if (!rawOrgId) throw new ApiError(400, "orgId is required", "missing_org");
  if (isSuperAdmin(user)) return rawOrgId;
  const role = await getOrgRole(user.id, rawOrgId);
  if (!role) throw forbidden("You don't have access to this organization");
  return rawOrgId;
}
