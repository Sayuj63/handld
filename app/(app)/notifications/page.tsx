"use client";

import { useCallback, useEffect, useState } from "react";
import { Banner, BlockStack, Box, Button, Card, Page, Spinner, Text } from "@shopify/polaris";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api-client";
import type { NotificationsResponse } from "@/lib/types";

export default function NotificationsPage() {
  const router = useRouter();
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<NotificationsResponse>("/api/notifications"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notifications");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function open(n: NotificationsResponse["notifications"][number]) {
    await api(`/api/notifications/${n.id}/read`, { method: "PATCH" }).catch(() => {});
    const url = (n.payload?.url as string) ?? null;
    router.push(url ?? "/notifications");
    router.refresh();
  }

  async function markAll() {
    await api("/api/notifications/read-all", { method: "POST" }).catch(() => {});
    load();
  }

  if (error) {
    return (
      <Page title="Notifications">
        <Banner tone="critical">{error}</Banner>
      </Page>
    );
  }

  if (!data) {
    return (
      <Page title="Notifications">
        <Spinner accessibilityLabel="Loading" />
      </Page>
    );
  }

  return (
    <Page
      title="Notifications"
      primaryAction={
        data.notifications.some((n) => !n.read) ? (
          <Button onClick={markAll}>Mark all as read</Button>
        ) : undefined
      }
    >
      {data.notifications.length === 0 ? (
        <Card>
          <Box padding="600">
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <Text as="h2" variant="headingMd">
                No notifications
              </Text>
              <div style={{ marginTop: 8 }}>
                <Text as="p" variant="bodyMd" tone="subdued">
                  You&apos;re all caught up. Notifications for request activity will show up here.
                </Text>
              </div>
            </div>
          </Box>
        </Card>
      ) : (
        <BlockStack gap="200">
          {data.notifications.map((n) => (
            <Card key={n.id} padding="400">
              <div
                style={{ cursor: "pointer" }}
                onClick={() => open(n)}
              >
                <BlockStack gap="100">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <Text as="span" variant="bodyLg" fontWeight={n.read ? "regular" : "semibold"}>
                      {!n.read && <span style={{ color: "#008060", marginRight: 6 }}>●</span>}
                      {n.title}
                    </Text>
                    <Text as="span" variant="bodySm" tone="subdued">
                      {new Date(n.createdAt).toLocaleString()}
                    </Text>
                  </div>
                  {n.body && (
                    <Text as="p" variant="bodyMd" tone="subdued">
                      {n.body}
                    </Text>
                  )}
                </BlockStack>
              </div>
            </Card>
          ))}
        </BlockStack>
      )}
    </Page>
  );
}
