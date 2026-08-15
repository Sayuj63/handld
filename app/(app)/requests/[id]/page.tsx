"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  InlineStack,
  Page,
  Select,
  Spinner,
  Text,
  TextField,
} from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { CommentThread } from "@/components/comment-thread";
import { PriorityBadge, StatusBadge, TypeLabel } from "@/components/status-badge";
import { api } from "@/lib/api-client";
import { STATUS_LABELS, STATUS_TRANSITIONS } from "@/lib/constants";
import type { MeResponse, OrgDetailResponse, RequestDetailResponse } from "@/lib/types";

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const requestId = params.id;

  const [data, setData] = useState<RequestDetailResponse | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [members, setMembers] = useState<OrgDetailResponse["members"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusTarget, setStatusTarget] = useState("");
  const [note, setNote] = useState("");
  const [assigneeId, setAssigneeId] = useState("none");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [detail, meRes] = await Promise.all([
        api<RequestDetailResponse>(`/api/change-requests/${requestId}`),
        api<MeResponse>("/api/me"),
      ]);
      setData(detail);
      setMe(meRes);
      setAssigneeId(detail.request.assignee?.id ?? "none");
      const org = await api<OrgDetailResponse>(`/api/orgs/${detail.request.orgId}`).catch(() => null);
      if (org?.members) setMembers(org.members);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load request");
    }
  }, [requestId]);

  useEffect(() => {
    load();
  }, [load]);

  const canManage = useMemo(() => {
    if (!me || !data) return false;
    if (me.isSuperAdmin) return true;
    const role = me.orgs.find((o) => o.orgId === data.request.orgId)?.role;
    return role === "owner" || role === "admin";
  }, [me, data]);

  const nextStatuses: string[] = data
    ? (STATUS_TRANSITIONS[data.request.status as keyof typeof STATUS_TRANSITIONS] ?? [])
    : [];

  async function updateStatus() {
    if (!statusTarget) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/change-requests/${requestId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: statusTarget, note: note.trim() }),
      });
      setNote("");
      setStatusTarget("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update status");
    } finally {
      setBusy(false);
    }
  }

  async function reassign() {
    if (!canManage) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/change-requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ assignedTo: assigneeId === "none" ? null : assigneeId }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reassign");
    } finally {
      setBusy(false);
    }
  }

  async function deleteRequest() {
    if (!window.confirm("Delete this request permanently? This cannot be undone.")) return;
    setBusy(true);
    try {
      await api(`/api/change-requests/${requestId}`, { method: "DELETE" });
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete");
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <Page>
        <Banner tone="critical">{loadError}</Banner>
      </Page>
    );
  }

  if (!data) {
    return (
      <Page>
        <Spinner accessibilityLabel="Loading request" />
      </Page>
    );
  }

  const r = data.request;
  const canDelete =
    me?.isSuperAdmin ||
    (r.creator.id === me?.user.id && ["submitted", "acknowledged"].includes(r.status));

  return (
    <Page
      title={r.title}
      subtitle={`${r.orgName}${r.store ? ` · ${r.store.label || r.store.shopifyDomain}` : ""}`}
      backAction={{ content: "Back", onAction: () => router.back() }}
      secondaryActions={
        canDelete
          ? [{ content: "Delete", destructive: true, icon: DeleteIcon, onAction: deleteRequest }]
          : []
      }
    >
      <BlockStack gap="400">
        {error && <Banner tone="critical">{error}</Banner>}

        <InlineStack gap="200" wrap>
          <StatusBadge status={r.status} />
          <PriorityBadge priority={r.priority} />
          <Text as="span" variant="bodyMd" tone="subdued">
            <TypeLabel type={r.type} />
          </Text>
          <Text as="span" variant="bodySm" tone="subdued">
            Opened {new Date(r.createdAt).toLocaleDateString()} by {r.creator.name || r.creator.email}
          </Text>
          {r.assignee && (
            <Text as="span" variant="bodySm" tone="subdued">
              · Assigned to {r.assignee.name}
            </Text>
          )}
        </InlineStack>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Description
                </Text>
                <div className="cd-prose">{r.description}</div>
                {(r.referenceUrl || r.targetSection) && (
                  <Box paddingBlockStart="200" borderBlockStartWidth="0165" borderColor="border">
                    <InlineStack gap="400" wrap>
                      {r.referenceUrl && (
                        <Text as="span" variant="bodyMd">
                          <Link href={r.referenceUrl} target="_blank" rel="noreferrer" style={{ color: "#2c6ecb" }}>
                            Reference ↗
                          </Link>
                        </Text>
                      )}
                      {r.targetSection && (
                        <Text as="span" variant="bodyMd" tone="subdued">
                          Target: {r.targetSection}
                        </Text>
                      )}
                    </InlineStack>
                  </Box>
                )}
              </BlockStack>
            </Card>

            {data.attachments.length > 0 && (
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Attachments
                  </Text>
                  <InlineStack gap="200" wrap>
                    {data.attachments.map((a) => (
                      <a key={a.id} href={a.url} target="_blank" rel="noreferrer" title={a.fileName}>
                        <div
                          style={{
                            border: "1px solid #e4e5e7",
                            borderRadius: 8,
                            padding: "8px 12px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Text as="span" variant="bodySm">
                            📎 {a.fileName.length > 30 ? a.fileName.slice(0, 30) + "…" : a.fileName}
                          </Text>
                        </div>
                      </a>
                    ))}
                  </InlineStack>
                </BlockStack>
              </Card>
            )}

            <CommentThread
              requestId={requestId}
              initialComments={data.comments}
              initialAttachments={data.attachments}
            />
          </BlockStack>

          <BlockStack gap="400">
            {canManage && (
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Manage
                  </Text>
                  {nextStatuses.length > 0 ? (
                    <>
                      <Select
                        label="Move to status"
                        options={[
                          { label: "Choose…", value: "" },
                          ...nextStatuses.map((s) => ({ label: STATUS_LABELS[s as keyof typeof STATUS_LABELS], value: s })),
                        ]}
                        value={statusTarget}
                        onChange={setStatusTarget}
                      />
                      <TextField
                        label="Note (optional)"
                        value={note}
                        onChange={setNote}
                        multiline={2}
                        placeholder="Visible to the client"
                        autoComplete="off"
                      />
                      <Button variant="primary" loading={busy} disabled={!statusTarget} onClick={updateStatus}>
                        Update status
                      </Button>
                    </>
                  ) : (
                    <Text as="p" variant="bodyMd" tone="subdued">
                      {r.status === "completed" ? "This request is completed 🎉" : "This request is closed."}
                    </Text>
                  )}
                  <Box borderBlockStartWidth="0165" borderColor="border" paddingBlockStart="300">
                    <BlockStack gap="200">
                      <Select
                        label="Assignee"
                        options={[
                          { label: "Unassigned", value: "none" },
                          ...members
                            .filter((m) => ["owner", "admin"].includes(m.role))
                            .map((m) => ({ label: m.name || m.email, value: m.userId })),
                        ]}
                        value={assigneeId}
                        onChange={setAssigneeId}
                      />
                      <Button onClick={reassign} disabled={assigneeId === (r.assignee?.id ?? "none")}>
                        Assign
                      </Button>
                    </BlockStack>
                  </Box>
                </BlockStack>
              </Card>
            )}

            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Activity
                </Text>
                {data.timeline.length === 0 ? (
                  <Text as="p" variant="bodySm" tone="subdued">
                    No activity recorded.
                  </Text>
                ) : (
                  data.timeline.map((t) => (
                    <BlockStack key={t.id} gap="100">
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodySm" fontWeight="semibold">
                          {timelineLabel(t.action, t.metadata)}
                        </Text>
                        <Text as="span" variant="bodySm" tone="subdued">
                          {new Date(t.createdAt).toLocaleString()}
                        </Text>
                      </InlineStack>
                      <Text as="span" variant="bodySm" tone="subdued">
                        {t.actor || "System"}
                      </Text>
                    </BlockStack>
                  ))
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </div>
      </BlockStack>
    </Page>
  );
}

function timelineLabel(action: string, metadata: Record<string, unknown> | null) {
  switch (action) {
    case "request.create":
      return "Request submitted";
    case "request.status": {
      const from = metadata?.from ? STATUS_LABELS[metadata.from as keyof typeof STATUS_LABELS] : "?";
      const to = metadata?.to ? STATUS_LABELS[metadata.to as keyof typeof STATUS_LABELS] : "?";
      return `Status: ${from} → ${to}`;
    }
    case "request.assign":
      return "Assignment changed";
    case "request.update":
      return "Request updated";
    case "request.delete":
      return "Request deleted";
    case "comment.create":
      return "Comment added";
    default:
      return action.replace(/\./g, " ");
  }
}
