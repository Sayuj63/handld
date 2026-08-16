import { headers } from "next/headers";
import { redirect } from "next/navigation";

import "@/app/landing.css";
import { LandingPage } from "@/components/landing/landing-page";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  // Logged-in users go straight into the app; everyone else sees the
  // marketing landing page.
  if (session) {
    const staff = session.user.globalRole === "super_admin" || session.user.globalRole === "team_member";
    redirect(staff ? "/admin" : "/dashboard");
  }
  return <LandingPage />;
}
