"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banner,
  BlockStack,
  Button,
  Card,
  Grid,
  InlineStack,
  Page,
  Select,
  Spinner,
  Text,
} from "@shopify/polaris";
import { useRouter } from "next/navigation";

import { RequestList } from "@/components/request-list";
import { api } from "@/lib/api-client";
import { REQUEST_STATUSES, STATUS_LABELS } from "@/lib/constants";
import type { OrgLite, RequestLite, RequestListResponse } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<OrgLite[]>([]);
  const [orgId, setOrgId] = useState<string>("");
  const [requests, setRequests] = useState<RequestLite[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrgs = useCallback(async () => {
    try {
      const res = await api<{ orgs: OrgLite[] }>("/api/orgs");
      setOrgs(res.orgs);
      if (res.orgs[0]) setOrgId(res.orgs[0].orgId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  const loadRequests = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ orgId, pageSize: "50" });
      if (status) params.set("status", status);
      const res = await api<RequestListResponse>(`/api/change-requests?${params}`);
      setRequests(res.requests);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [orgId, status]);

  useEffect(() => {
    loadOrgs();
  }, [loadOrgs]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const org = orgs.find((o) => o.orgId === orgId);

  const counts = useMemo(() => {
    const open = requests.filter((r) => !["completed", "rejected"].includes(r.status)).length;
    return { open, total };
  }, [requests, total]);

  if (error && !orgs.length) {
    return (
      <Page>
        <Banner tone="critical">{error}</Banner>
      </Page>
    );
  }

  return (
    <Page
      fullWidth
      title={org ? org.orgName : "Dashboard"}
      subtitle="Track and submit change requests for your site"
      primaryAction={
        <Button variant="primary" onClick={() => router.push(`/dashboard/new${orgId ? `?orgId=${orgId}` : ""}`)}>
          New request
        </Button>
      }
    >
      <BlockStack gap="400">
        {orgs.length > 1 && (
          <Card padding="300">
            <div style={{ maxWidth: 320 }}>
              <Select
                label="Organization"
                options={orgs.map((o) => ({ label: o.orgName, value: o.orgId }))}
                value={orgId}
                onChange={setOrgId}
              />
            </div>
          </Card>
        )}

        <Grid columns={{ xs: 2, md: 2, xl: 4 }} gap={{ xs: "16px", md: "16px" }}>
          {[
            { label: "Open", value: counts.open },
            { label: "Total", value: total },
            {
              label: "In review",
              value: requests.filter((r) => r.status === "in_review").length,
            },
            {
              label: "Completed",
              value: requests.filter((r) => r.status === "completed").length,
            },
          ].map((card) => (
            <Card key={card.label} padding="400">
              <BlockStack gap="100">
                <Text as="p" variant="bodyMd" tone="subdued">
                  {card.label}
                </Text>
                <Text as="p" variant="heading2xl">
                  {String(card.value)}
                </Text>
              </BlockStack>
            </Card>
          ))}
        </Grid>

        <InlineStack gap="200" wrap>
          <Select
            label=""
            options={[{ label: "All statuses", value: "" }, ...REQUEST_STATUSES.map((s) => ({ label: STATUS_LABELS[s], value: s }))]}
            value={status}
            onChange={setStatus}
          />
        </InlineStack>

        {loading ? (
          <div style={{ textAlign: "center", padding: 32 }}>
            <Spinner accessibilityLabel="Loading requests" />
          </div>
        ) : (
          <RequestList
            requests={requests}
            emptyTitle="Submit your first change"
            emptyBody="Anything you need changed on your store — a bug, a content tweak, a new feature — starts here."
            emptyAction={{ content: "New request", url: `/dashboard/new${orgId ? `?orgId=${orgId}` : ""}` }}
          />
        )}
      </BlockStack>
    </Page>
  );
}
