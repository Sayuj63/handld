"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  DataTable,
  FormLayout,
  Grid,
  InlineStack,
  Page,
  Select,
  Spinner,
  Text,
  TextField,
} from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";
import { useParams } from "next/navigation";

import { api } from "@/lib/api-client";
import { ORG_ROLE_LABELS, STATUS_LABELS } from "@/lib/constants";
import type { MeResponse, OrgAnalytics, OrgDetailResponse } from "@/lib/types";

export default function OrgDetailPage() {
  const params = useParams<{ id: string }>();
  const orgId = params.id;

  const [data, setData] = useState<OrgDetailResponse | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [analytics, setAnalytics] = useState<OrgAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("owner");
  const [storeDomain, setStoreDomain] = useState("");
  const [storeLabel, setStoreLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [org, meRes] = await Promise.all([
        api<OrgDetailResponse>(`/api/orgs/${orgId}`),
        api<MeResponse>("/api/me"),
      ]);
      setData(org);
      setMe(meRes);
      const role = meRes.isSuperAdmin
        ? "owner"
        : meRes.orgs.find((o) => o.orgId === orgId)?.role;
      if (role === "owner" || role === "admin") {
        setAnalytics(await api<OrgAnalytics>(`/api/orgs/${orgId}/analytics`).catch(() => null));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load organization");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const isManager = useMemo(() => {
    if (!me) return false;
    if (me.isSuperAdmin) return true;
    const role = me.orgs.find((o) => o.orgId === orgId)?.role;
    return role === "owner" || role === "admin";
  }, [me, orgId]);

  async function invite() {
    setError(null);
    setBusy(true);
    try {
      await api(`/api/orgs/${orgId}/members`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      setInviteEmail("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send invite");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(userId: string) {
    if (!window.confirm("Remove this member from the organization?")) return;
    setBusy(true);
    try {
      await api(`/api/orgs/${orgId}/members/${userId}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove member");
    } finally {
      setBusy(false);
    }
  }

  async function cancelInvitation(invitationId: string) {
    setBusy(true);
    try {
      await api(`/api/orgs/${orgId}/invitations/${invitationId}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't cancel invitation");
    } finally {
      setBusy(false);
    }
  }

  async function addStore() {
    setError(null);
    setBusy(true);
    try {
      await api(`/api/orgs/${orgId}/stores`, {
        method: "POST",
        body: JSON.stringify({ shopifyDomain: storeDomain.trim(), label: storeLabel.trim() }),
      });
      setStoreDomain("");
      setStoreLabel("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add store");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Page>
        <Spinner accessibilityLabel="Loading" />
      </Page>
    );
  }

  const org = data?.organization;

  return (
    <Page title={org?.name ?? "Organization"} subtitle={org?.slug ?? ""}>
      <BlockStack gap="400">
        {error && <Banner tone="critical">{error}</Banner>}

        {isManager && analytics && (
          <>
            <Grid columns={{ xs: 2, md: 2, xl: 4 }} gap={{ xs: "16px", md: "16px" }}>
              {[
                { label: "Open", value: String(analytics.totals.open), tone: undefined as string | undefined },
                { label: "Completed", value: `${analytics.totals.completionRate}%`, tone: undefined },
                {
                  label: "Turnaround",
                  value: analytics.totals.avgTurnaroundDays != null ? `${analytics.totals.avgTurnaroundDays}d` : "—",
                  tone: undefined,
                },
                {
                  label: "Overdue",
                  value: String(analytics.totals.overdue),
                  tone: analytics.totals.overdue > 0 ? "critical" : undefined,
                },
              ].map((card) => (
                <Card key={card.label} padding="400">
                  <BlockStack gap="100">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      {card.label}
                    </Text>
                    <Text as="p" variant="heading2xl" tone={card.tone as "critical" | undefined}>
                      {card.value}
                    </Text>
                  </BlockStack>
                </Card>
              ))}
            </Grid>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Requests by status</Text>
                <DataTable
                  columnContentTypes={["text", "numeric"]}
                  headings={["Status", "Count"]}
                  rows={analytics.byStatus.map((s) => [
                    STATUS_LABELS[s.key as keyof typeof STATUS_LABELS] ?? s.key,
                    String(s.n),
                  ])}
                />
                <Text as="h2" variant="headingMd">Requests by month</Text>
                <DataTable
                  columnContentTypes={["text", "numeric"]}
                  headings={["Month", "New requests"]}
                  rows={analytics.monthly.map((m) => [m.month, String(m.n)])}
                />
              </BlockStack>
            </Card>
          </>
        )}

        <Grid columns={{ xs: 1, lg: 2 }} gap={{ xs: "16px" }}>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Members</Text>
                {data?.members.length === 0 && (
                  <Text as="p" variant="bodyMd" tone="subdued">No members yet.</Text>
                )}
                {data?.members.map((m, mi) => (
                  <Box key={m.userId} paddingBlock="200" borderBlockStartWidth={mi > 0 ? "0165" : undefined} borderColor="border">
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="100">
                        <Text as="span" variant="bodyMd" fontWeight="semibold">{m.name || "—"}</Text>
                        <Text as="span" variant="bodySm" tone="subdued">{m.email}</Text>
                      </BlockStack>
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="span" variant="bodySm" tone="subdued">{ORG_ROLE_LABELS[m.role as keyof typeof ORG_ROLE_LABELS] ?? m.role}</Text>
                        {isManager && me?.isSuperAdmin !== true && m.role === "owner" && me?.orgs.find((o) => o.orgId === orgId)?.role !== "owner" ? null : isManager && (
                          <Button
                            size="slim"
                            icon={DeleteIcon}
                            onClick={() => removeMember(m.userId)}
                            accessibilityLabel={`Remove ${m.email}`}
                          />
                        )}
                      </InlineStack>
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Stores</Text>
                {data?.stores.length === 0 && (
                  <Text as="p" variant="bodyMd" tone="subdued">No stores linked yet.</Text>
                )}
                {data?.stores.map((s) => (
                  <InlineStack key={s.id} align="space-between">
                    <Text as="span" variant="bodyMd">{s.shopifyDomain}</Text>
                    <Text as="span" variant="bodySm" tone="subdued">{s.label || "—"}</Text>
                  </InlineStack>
                ))}
                {isManager && (
                  <Box paddingBlockStart="200" borderBlockStartWidth="0165" borderColor="border">
                    <FormLayout>
                      <TextField label="Shopify domain" value={storeDomain} onChange={setStoreDomain} placeholder="mystore.myshopify.com" autoComplete="off" />
                      <TextField label="Label (optional)" value={storeLabel} onChange={setStoreLabel} placeholder="e.g. US store" autoComplete="off" />
                      <Button onClick={addStore} disabled={!storeDomain.trim()} loading={busy}>Add store</Button>
                    </FormLayout>
                  </Box>
                )}
              </BlockStack>
            </Card>
          </BlockStack>

          {isManager && (
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Invite someone</Text>
                  <FormLayout>
                    <TextField label="Email" type="email" value={inviteEmail} onChange={setInviteEmail} placeholder="client@company.com" autoComplete="email" />
                    <Select
                      label="Role"
                      options={[
                        { label: "Client owner", value: "owner" },
                        { label: "Client member", value: "member" },
                        { label: "Team member (staff)", value: "admin" },
                      ]}
                      value={inviteRole}
                      onChange={setInviteRole}
                    />
                    <Button variant="primary" onClick={invite} disabled={!inviteEmail.trim()} loading={busy}>
                      Send invitation
                    </Button>
                  </FormLayout>
                  <Text as="p" variant="bodySm" tone="subdued">
                    They&apos;ll get an email with a link to set their password and join.
                  </Text>
                </BlockStack>
              </Card>

              {data && data.invitations.length > 0 && (
                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">Pending invitations</Text>
                    {data.invitations.map((inv) => (
                      <InlineStack key={inv.id} align="space-between" blockAlign="center">
                        <BlockStack gap="100">
                          <Text as="span" variant="bodyMd">{inv.email}</Text>
                          <Text as="span" variant="bodySm" tone="subdued">
                            {ORG_ROLE_LABELS[inv.role as keyof typeof ORG_ROLE_LABELS] ?? inv.role} · expires{" "}
                            {new Date(inv.expiresAt).toLocaleDateString()}
                          </Text>
                        </BlockStack>
                        <Button size="slim" onClick={() => cancelInvitation(inv.id)}>Cancel</Button>
                      </InlineStack>
                    ))}
                  </BlockStack>
                </Card>
              )}
            </BlockStack>
          )}
        </Grid>
      </BlockStack>
    </Page>
  );
}
