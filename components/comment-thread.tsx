"use client";

import { useState } from "react";
import {
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  DropZone,
  InlineStack,
  Text,
  TextField,
  Thumbnail,
} from "@shopify/polaris";
import { XIcon } from "@shopify/polaris-icons";

import { api } from "@/lib/api-client";
import type { AttachmentLite, CommentLite } from "@/lib/types";

export function CommentThread({
  requestId,
  initialComments,
  initialAttachments,
}: {
  requestId: string;
  initialComments: CommentLite[];
  initialAttachments: AttachmentLite[];
}) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!body.trim() && !files.length) return;
    setError(null);
    setSending(true);
    try {
      let attachmentIds: string[] = [];
      if (files.length) {
        const form = new FormData();
        for (const f of files) form.append("files", f);
        const up = await api<{ attachments: { id: string; url: string; fileName: string }[] }>(
          `/api/change-requests/${requestId}/attachments`,
          { method: "POST", body: form },
        );
        attachmentIds = up.attachments.map((a) => a.id);
      }

      const res = await api<{
        id: string;
        body: string;
        parentId: string | null;
        createdAt: string;
        author: { id: string; name: string | null; email: string | null };
      }>(`/api/change-requests/${requestId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: body.trim(), attachmentIds }),
      });

      setComments((prev) => [...prev, res]);
      setBody("");
      setFiles([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't post comment");
    } finally {
      setSending(false);
    }
  }

  return (
    <BlockStack gap="300">
      <Text as="h2" variant="headingMd">
        Comments
      </Text>

      <Card>
        <BlockStack gap="300">
          {error && <Banner tone="critical">{error}</Banner>}
          <TextField
            label="Add a comment"
            value={body}
            onChange={setBody}
            multiline={3}
            autoComplete="off"
            placeholder="Questions, clarifications, revised instructions…"
          />
          <InlineStack gap="200" blockAlign="center">
            <DropZone
              accept="image/*"
              allowMultiple
              onDrop={(dropped) => setFiles((prev) => [...prev, ...dropped].slice(0, 5))}
              label="Attach files"
            >
              <DropZone.FileUpload actionTitle="Attach" actionHint="or paste" />
            </DropZone>
            {files.map((f, i) => (
              <div key={i} style={{ position: "relative" }}>
                <Thumbnail size="small" alt={f.name} source={URL.createObjectURL(f)} />
                <div
                  style={{ position: "absolute", top: -6, right: -6, cursor: "pointer" }}
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                >
                  <XIcon width={14} height={14} />
                </div>
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <Button variant="primary" loading={sending} disabled={!body.trim() && !files.length} onClick={submit}>
              Post
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>

      {comments.length === 0 ? (
        <Text as="p" variant="bodyMd" tone="subdued">
          No comments yet — start the conversation.
        </Text>
      ) : (
        <BlockStack gap="200">
          {comments.map((c) => (
            <Card key={c.id} padding="400">
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="span" variant="bodyMd" fontWeight="semibold">
                    {c.author.name || c.author.email || "Someone"}
                  </Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    {new Date(c.createdAt).toLocaleString()}
                  </Text>
                </InlineStack>
                <Box>
                  <Text as="p" variant="bodyMd">
                    {c.body}
                  </Text>
                </Box>
                {initialAttachments.filter((a) => a.commentId === c.id).map((a) => (
                  <Box key={a.id}>
                    <a href={a.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                      <Text as="span" variant="bodySm" tone="subdued">
                        📎 {a.fileName}
                      </Text>
                    </a>
                  </Box>
                ))}
              </BlockStack>
            </Card>
          ))}
        </BlockStack>
      )}
    </BlockStack>
  );
}
