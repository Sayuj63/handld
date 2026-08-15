"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banner,
  BlockStack,
  Card,
  Grid,
  Page,
  Select,
  Spinner,
  Text,
  TextField,
} from "@shopify/polaris";

import { RequestList } from "@/components/request-list";
import { api } from "@/lib/api-client";
import { PRIORITIES, PRIORITY_LABELS, REQUEST_STATUSES, STATUS_LABELS } from "@/lib/constants";
import type { OrgLite, RequestLite, RequestListResponse } from "@/lib/types";

export default function AdminQueuePage() {
  const [orgs, setOrgs] = useState<OrgLite[]>([]);
  const [orgId, setOrgId] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [q, setQ] = useState("");
  const [requests, setRequests] = useState<RequestLite[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<{ orgs: { orgName: string; total: number; open: number; overdue: number }[]; totals: { total: number; open: number; overdue: number } } | null>(null);

  const loadOrgs = useCallback(async () => {
    try {
      const res = await api<{ orgs: OrgLite[] }>("/api/orgs");
      setOrgs(res.orgs);
      const ov = await api<typeof overview>("/api/analytics/overview").catch(() => null);
      setOverview(ov);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "50" });
      if (orgId) params.set("orgId", orgId);
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (q.trim()) params.set("q", q.trim());
      const res = await api<RequestListResponse>(`/api/change-requests?${params}`);
      setRequests(res.requests);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [orgId, status, priority, q]);

  useEffect(() => {
    loadOrgs();
  }, [loadOrgs]);

  useEffect(() => {
    load();
  }, [load]);

  const overdue = useMemo(
    () => overview?.totals.overdue ?? 0,
    [overview],
  );

  return (
    <Page
      fullWidth
      title="Queue"
      subtitle="Every client's change requests, in one place"
    >
      <BlockStack gap="400">
        {error && <Banner tone="critical">{error}</Banner>}

        <Grid columns={{ xs: 2, md: 4 }}>
          <Card padding="400">
            <Text as="p" variant="bodyMd" tone="subdued">Open</Text>
            <Text as="p" variant="heading2xl">{overview?.totals.open ?? "—"}</Text>
          </Card>
          <Card padding="400">
            <Text as="p" variant="bodyMd" tone="subdued">Total</Text>
            <Text as="p" variant="heading2xl">{overview?.totals.total ?? "—"}</Text>
          </Card>
          <Card padding="400">
            <Text as="p" variant="bodyMd" tone="subdued">Completed</Text>
            <Text as="p" variant="heading2xl">{overview ? overview.totals.total - overview.totals.open : "—"}</Text>
          </Card>
          <Card padding="400">
            <Text as="p" variant="bodyMd" tone="subdued">Overdue (7d+)</Text>
            <Text as="p" variant="heading2xl" tone={overdue > 0 ? "critical" : undefined}>
              {overdue}
            </Text>
          </Card>
        </Grid>

        <Card padding="400">
          <Grid columns={{ xs: 1, sm: 2, lg: 4 }} gap={{ xs: "400" }}>
            <Select
              label="Organization"
              options={[{ label: "All organizations", value: "" }, ...orgs.map((o) => ({ label: o.orgName, value: o.orgId }))]}
              value={orgId}
              onChange={setOrgId}
            />
            <Select
              label="Status"
              options={[{ label: "All statuses", value: "" }, ...REQUEST_STATUSES.map((s) => ({ label: STATUS_LABELS[s], value: s }))]}
              value={status}
              onChange={setStatus}
            />
            <Select
              label="Priority"
              options={[{ label: "All priorities", value: "" }, ...PRIORITIES.map((p) => ({ label: PRIORITY_LABELS[p], value: p }))]}
              value={priority}
              onChange={setPriority}
            />
            <TextField label="Search" value={q} onChange={setQ} placeholder="Search title or description" autoComplete="off" />
          </Grid>
        </Card>

        <Text as="p" variant="bodySm" tone="subdued">
          {total} request{total === 1 ? "" : "s"}
        </Text>

        {loading ? (
          <Card>
            <div style={{ textAlign: "center", padding: 32 }}>
              <Spinner accessibilityLabel="Loading queue" />
            </div>
          </Card>
        ) : (
          <RequestList
            requests={requests}
            showOrg
            emptyTitle="No requests match"
            emptyBody="Try clearing the filters, or wait for clients to submit their first request."
          />
        )}
      </BlockStack>
    </Page>
  );
}
