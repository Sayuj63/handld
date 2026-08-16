import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

// Entry point for the product. Landing lives at `/`, dashboards live under
// their own routes; `/app` just fans the signed-in user out to the right one.
export default async function AppEntry() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?next=/app");

  const staff =
    session.user.globalRole === "super_admin" || session.user.globalRole === "team_member";
  redirect(staff ? "/admin" : "/dashboard");
}
