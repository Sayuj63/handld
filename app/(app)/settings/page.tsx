"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Banner,
  BlockStack,
  Button,
  Card,
  ChoiceList,
  Page,
  Spinner,
  Text,
} from "@shopify/polaris";

import { api } from "@/lib/api-client";
import { NOTIFICATION_MODE_LABELS } from "@/lib/constants";

export default function SettingsPage() {
  const [mode, setMode] = useState<"instant" | "hourly_digest" | "daily_digest" | "off">("instant");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ preferences: { mode: typeof mode } }>("/api/notifications/preferences");
      setMode(res.preferences.mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load preferences");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await api("/api/notifications/preferences", {
        method: "PATCH",
        body: JSON.stringify({ mode }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save preferences");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Page title="Settings">
        <Spinner accessibilityLabel="Loading settings" />
      </Page>
    );
  }

  return (
    <Page title="Settings">
      <BlockStack gap="400">
        {error && <Banner tone="critical">{error}</Banner>}
        {saved && <Banner tone="success">Preferences saved</Banner>}

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">Email notifications</Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              How often should we email you about request activity? In-app notifications are always instant.
            </Text>
            <ChoiceList
              title="Email frequency"
              choices={[
                { label: `${NOTIFICATION_MODE_LABELS.instant} — send me each update as it happens`, value: "instant" },
                { label: `${NOTIFICATION_MODE_LABELS.hourly_digest} — a single summary each hour`, value: "hourly_digest" },
                { label: `${NOTIFICATION_MODE_LABELS.daily_digest} — one summary per day`, value: "daily_digest" },
                { label: `${NOTIFICATION_MODE_LABELS.off} — email me only about invites & passwords`, value: "off" },
              ]}
              selected={[mode]}
              onChange={(v) => setMode(v[0] as typeof mode)}
            />
            <div>
              <Button variant="primary" loading={saving} onClick={save}>
                Save preferences
              </Button>
            </div>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
