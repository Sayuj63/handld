"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  InlineStack,
  Modal,
  Page,
  Spinner,
  Text,
  TextField,
} from "@shopify/polaris";
import Link from "next/link";

import { api } from "@/lib/api-client";

type OverviewOrg = {
  orgId: string;
  orgName: string;
  total: number;
  open: number;
  completed: number;
  overdue: number;
  avgTurnaroundDays: number | null;
};

export default function AdminOrgsPage() {
  const [orgs, setOrgs] = useState<OverviewOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ orgs: OverviewOrg[] }>("/api/analytics/overview");
      setOrgs(res.orgs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createOrg() {
    setCreateError(null);
    setCreating(true);
    try {
      await api("/api/orgs", { method: "POST", body: JSON.stringify({ name: name.trim() }) });
      setCreateOpen(false);
      setName("");
      await load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Couldn't create organization");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Page
      title="Organizations"
      subtitle="Clients you work with"
      primaryAction={
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          Create organization
        </Button>
      }
    >
      <BlockStack gap="400">
        {error && <Banner tone="critical">{error}</Banner>}

        {loading ? (
          <Card>
            <div style={{ textAlign: "center", padding: 32 }}>
              <Spinner accessibilityLabel="Loading organizations" />
            </div>
          </Card>
        ) : (
          <Card padding="0">
            {orgs.length === 0 ? (
              <Box padding="400">
                <Text as="p" variant="bodyMd" tone="subdued">
                  No organizations yet — create the first one to invite your clients.
                </Text>
              </Box>
            ) : (
              orgs.map((o, i) => (
                <Link key={o.orgId} href={`/admin/orgs/${o.orgId}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                  <Box paddingBlock="300" paddingInline="400" borderBlockStartWidth={i > 0 ? "0165" : undefined} borderColor="border">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                      <Text as="span" variant="bodyLg" fontWeight="semibold">
                        {o.orgName}
                      </Text>
                      <InlineStack gap="400" wrap>
                        <Text as="span" variant="bodySm" tone="subdued">Open {o.open}</Text>
                        <Text as="span" variant="bodySm" tone="subdued">Total {o.total}</Text>
                        <Text as="span" variant="bodySm" tone="subdued">
                          Avg turnaround {o.avgTurnaroundDays != null ? `${o.avgTurnaroundDays}d` : "—"}
                        </Text>
                        {o.overdue > 0 && (
                          <Text as="span" variant="bodySm" tone="critical">
                            {o.overdue} overdue
                          </Text>
                        )}
                      </InlineStack>
                    </div>
                  </Box>
                </Link>
              ))
            )}
          </Card>
        )}
      </BlockStack>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create organization"
        primaryAction={{ content: "Create", loading: creating, onAction: createOrg, disabled: !name.trim() }}
        secondaryActions={[{ content: "Cancel", onAction: () => setCreateOpen(false) }]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            {createError && <Banner tone="critical">{createError}</Banner>}
            <TextField label="Organization name" value={name} onChange={setName} placeholder="e.g. Studio Caramel" autoFocus autoComplete="off" />
            <Text as="p" variant="bodySm" tone="subdued">
              After creating, open the organization to invite its owner and add stores.
            </Text>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
