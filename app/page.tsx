import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const staff = session.user.globalRole === "super_admin" || session.user.globalRole === "team_member";
  redirect(staff ? "/admin" : "/dashboard");
}
