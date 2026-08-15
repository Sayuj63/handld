import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { auth } from "@/lib/auth";
import { getUserOrgs } from "@/lib/rbac";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const orgs = await getUserOrgs(session.user.id);

  return (
    <AppShell
      user={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        globalRole: session.user.globalRole,
      }}
      orgs={orgs.map((o) => ({ orgId: o.orgId, orgName: o.orgName, role: o.role }))}
    >
      {children}
    </AppShell>
  );
}
