import { json, route } from "@/lib/http";
import { getUserOrgs, isSuperAdmin, isTeamMember, requireUser } from "@/lib/rbac";

/** GET /api/me — session user + orgs (used after sign-in to pick a destination) */
export const GET = route(async () => {
  const user = await requireUser();
  const orgs = await getUserOrgs(user.id);
  return json({
    user: { id: user.id, name: user.name, email: user.email, globalRole: user.globalRole },
    orgs,
    staff: isSuperAdmin(user) || isTeamMember(user),
    isSuperAdmin: isSuperAdmin(user),
  });
});
