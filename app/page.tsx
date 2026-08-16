import { headers } from "next/headers";
import { redirect } from "next/navigation";

import "@/app/landing.css";
import { LandingPage } from "@/components/landing/landing-page";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  // Logged-in users go into the product via /app (which fans out to
  // /admin or /dashboard depending on role); everyone else sees the
  // marketing landing page at the root.
  if (session) redirect("/app");
  return <LandingPage />;
}
