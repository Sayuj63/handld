"use client";

import { AttachmentIcon, ChatIcon } from "@shopify/polaris-icons";
import { Box, Button, Card, InlineStack, Text } from "@shopify/polaris";
import Link from "next/link";

import { PriorityBadge, StatusBadge, TypeLabel } from "@/components/status-badge";
import type { RequestLite } from "@/lib/types";

function timeAgo(date: string | Date) {
  const ms = Date.now() - new Date(date).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export function RequestList({
  requests,
  showOrg,
  emptyTitle = "No change requests yet",
  emptyBody = "Submit your first change request and it will show up here.",
  emptyAction,
}: {
  requests: RequestLite[];
  showOrg?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  emptyAction?: { content: string; url: string };
}) {
  if (!requests.length) {
    return (
      <Card>
        <Box padding="600">
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <Text as="h2" variant="headingMd">
              {emptyTitle}
            </Text>
            <div style={{ marginTop: 8, marginBottom: 16 }}>
              <Text as="p" variant="bodyMd" tone="subdued">
                {emptyBody}
              </Text>
            </div>
            {emptyAction && (
              <Link href={emptyAction.url} style={{ textDecoration: "none" }}>
                <Button variant="primary">{emptyAction.content}</Button>
              </Link>
            )}
          </div>
        </Box>
      </Card>
    );
  }

  return (
    <Card padding="0">
      {requests.map((r, i) => (
        <Link
          key={r.id}
          href={`/requests/${r.id}`}
          style={{ textDecoration: "none", color: "inherit", display: "block" }}
        >
          <Box
            paddingBlock="300"
            paddingInline="400"
            borderBlockStartWidth={i > 0 ? "0165" : undefined}
            borderColor="border"
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <div style={{ minWidth: 0 }}>
                <Text as="span" variant="bodyLg" fontWeight="semibold">
                  {r.title}
                </Text>
                <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <StatusBadge status={r.status} />
                  <PriorityBadge priority={r.priority} />
                  <Text as="span" variant="bodySm" tone="subdued">
                    <TypeLabel type={r.type} />
                  </Text>
                  {showOrg && (
                    <Text as="span" variant="bodySm" tone="subdued">
                      · {r.orgName}
                    </Text>
                  )}
                  <Text as="span" variant="bodySm" tone="subdued">
                    · {timeAgo(r.updatedAt)}
                  </Text>
                  {(r.commentCount > 0 || r.attachmentCount > 0) && (
                    <InlineStack gap="200" align="center">
                      {r.commentCount > 0 && (
                        <Text as="span" variant="bodySm" tone="subdued">
                          <ChatIcon width={14} height={14} style={{ verticalAlign: "middle" }} />{" "}
                          {r.commentCount}
                        </Text>
                      )}
                      {r.attachmentCount > 0 && (
                        <Text as="span" variant="bodySm" tone="subdued">
                          <AttachmentIcon width={14} height={14} style={{ verticalAlign: "middle" }} />{" "}
                          {r.attachmentCount}
                        </Text>
                      )}
                    </InlineStack>
                  )}
                </div>
              </div>
            </div>
          </Box>
        </Link>
      ))}
    </Card>
  );
}
