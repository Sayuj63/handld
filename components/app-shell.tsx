"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Frame, Navigation, TopBar } from "@shopify/polaris";
import {
  HomeIcon,
  NotificationIcon,
  OrganizationIcon,
  PlusIcon,
  SettingsIcon,
} from "@shopify/polaris-icons";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { api } from "@/lib/api-client";
import { signOut } from "@/lib/auth-client";
import type { OrgLite } from "@/lib/types";

type ShellUser = { id: string; name: string; email: string; globalRole: string };

export function AppShell({
  user,
  orgs,
  children,
}: {
  user: ShellUser;
  orgs: OrgLite[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const staff = user.globalRole === "super_admin" || user.globalRole === "team_member";

  const [unread, setUnread] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const loadUnread = useCallback(async () => {
    try {
      const res = await api<{ unread: number }>("/api/notifications");
      setUnread(res.unread);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadUnread();
    const t = setInterval(loadUnread, 60_000);
    return () => clearInterval(t);
  }, [loadUnread]);

  const doSignOut = async () => {
    await signOut();
    router.push("/sign-in");
    router.refresh();
  };

  const navigationItems = [
    ...(staff
      ? [
          {
            label: "Queue",
            icon: HomeIcon,
            url: "/admin",
            selected: pathname?.startsWith("/admin") && !pathname?.startsWith("/admin/orgs"),
          },
          {
            label: "Organizations",
            icon: OrganizationIcon,
            url: "/admin/orgs",
            selected: pathname?.startsWith("/admin/orgs"),
          },
        ]
      : [
          {
            label: "Dashboard",
            icon: HomeIcon,
            url: "/dashboard",
            selected: pathname === "/dashboard" || pathname?.startsWith("/requests"),
          },
          {
            label: "New request",
            icon: PlusIcon,
            url: "/dashboard/new",
            selected: pathname?.startsWith("/dashboard/new"),
          },
        ]),
    { label: "Notifications", icon: NotificationIcon, url: "/notifications" },
    { label: "Settings", icon: SettingsIcon, url: "/settings" },
  ];

  const userMenuMarkup = (
    <TopBar.UserMenu
      name={user.name || "Account"}
      detail={user.email}
      initials={(user.name || "CD")
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()}
      open={userMenuOpen}
      onToggle={() => setUserMenuOpen((v) => !v)}
      actions={[
        {
          items: [
            ...(orgs.length > 0
              ? [
                  {
                    content: `Organizations: ${orgs.map((o) => o.orgName).slice(0, 3).join(", ")}${orgs.length > 3 ? "…" : ""}`,
                    onAction: () => {},
                  },
                ]
              : [{ content: "No organization yet", onAction: () => {} }]),
            ...(staff ? [{ content: "Open queue", onAction: () => router.push("/admin") }] : []),
            { content: "Sign out", onAction: doSignOut },
          ],
        },
      ]}
    />
  );

  const bellMarkup = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 12 }}>
      {unread > 0 && (
        <Badge tone="critical" size="small">
          {String(unread)}
        </Badge>
      )}
      <Link href="/notifications" aria-label="Notifications" title="Notifications">
        <span style={{ display: "inline-flex", alignItems: "center", cursor: "pointer", color: "#202223" }}>
          <NotificationIcon width={20} height={20} />
        </span>
      </Link>
    </div>
  );

  const topBar = (
    <TopBar
      showNavigationToggle={false}
      userMenu={userMenuMarkup}
      secondaryMenu={bellMarkup}
    />
  );

  return (
    <Frame
      topBar={topBar}
      navigation={
        <Navigation location="/">
          <Navigation.Section items={navigationItems} />
        </Navigation>
      }
    >
      {children}
    </Frame>
  );
}
