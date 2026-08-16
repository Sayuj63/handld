"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Banner,
  BlockStack,
  Button,
  Card,
  DropZone,
  FormLayout,
  InlineStack,
  Select,
  Text,
  TextField,
  Thumbnail,
} from "@shopify/polaris";
import { XIcon } from "@shopify/polaris-icons";
import { useRouter } from "next/navigation";

import { ImageEditor } from "@/components/image-editor";
import { api } from "@/lib/api-client";
import { compressImageFiles } from "@/lib/compress-image";
import { PRIORITIES, PRIORITY_LABELS, REQUEST_TYPES, TYPE_LABELS } from "@/lib/constants";
import type { OrgLite } from "@/lib/types";

type Store = { id: string; shopifyDomain: string; label: string | null };

export function RequestForm({ orgs, initialOrgId }: { orgs: OrgLite[]; initialOrgId?: string }) {
  const router = useRouter();

  const [orgId, setOrgId] = useState(initialOrgId || orgs[0]?.orgId || "");
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("design");
  const [priority, setPriority] = useState("medium");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [targetSection, setTargetSection] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadStores = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await api<{ stores: Store[] }>(`/api/orgs/${orgId}`);
      setStores(res.stores ?? []);
      if (!res.stores?.length) setStoreId("");
    } catch {
      /* ignore */
    }
  }, [orgId]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  // Paste-from-clipboard support.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const pasted = Array.from(e.clipboardData?.files ?? []);
      if (pasted.length) {
        void compressImageFiles(pasted.slice(0, 5)).then((compressed) =>
          setFiles((prev) => [...prev, ...compressed].slice(0, 5)),
        );
        e.preventDefault();
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const form = new FormData();
      form.set("orgId", orgId);
      form.set("title", title.trim());
      form.set("description", description.trim());
      form.set("type", type);
      form.set("priority", priority);
      if (storeId) form.set("storeId", storeId);
      if (referenceUrl.trim()) form.set("referenceUrl", referenceUrl.trim());
      if (targetSection.trim()) form.set("targetSection", targetSection.trim());
      // Re-compress anything that was added before the submit click, so the
      // multipart body stays under Vercel's request-size cap.
      const ready = await compressImageFiles(files);
      for (const f of ready) form.append("files", f);

      const res = await api<{ id: string }>("/api/change-requests", {
        method: "POST",
        body: form,
      });
      router.push(`/requests/${res.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't submit the request");
      setSubmitting(false);
    }
  }

  return (
    <BlockStack gap="400">
      {error && <Banner tone="critical">{error}</Banner>}

      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            What needs to change?
          </Text>
          <FormLayout>
            {orgs.length > 1 && (
              <Select
                label="Organization"
                options={orgs.map((o) => ({ label: o.orgName, value: o.orgId }))}
                value={orgId}
                onChange={setOrgId}
              />
            )}
            {stores.length > 0 && (
              <Select
                label="Store"
                options={[{ label: "All stores", value: "" }, ...stores.map((s) => ({ label: s.label || s.shopifyDomain, value: s.id }))]}
                value={storeId}
                onChange={setStoreId}
              />
            )}
            <TextField label="Title" value={title} onChange={setTitle} placeholder="e.g. Update hero image on homepage" maxLength={200} autoComplete="off" />
            <TextField
              label="Description"
              value={description}
              onChange={setDescription}
              multiline={6}
              autoComplete="off"
              placeholder="Describe what should change, where, and why. Be specific — 'this button, right here' beats 'make it nicer'."
            />
            <InlineStack gap="300" wrap>
              <div style={{ flex: 1, minWidth: 180 }}>
                <Select label="Type" options={REQUEST_TYPES.map((t) => ({ label: TYPE_LABELS[t], value: t }))} value={type} onChange={setType} />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <Select label="Priority" options={PRIORITIES.map((p) => ({ label: PRIORITY_LABELS[p], value: p }))} value={priority} onChange={setPriority} />
              </div>
            </InlineStack>
            <TextField label="Reference link (optional)" value={referenceUrl} onChange={setReferenceUrl} placeholder="https://… inspiration or competitor page" type="url" autoComplete="url" />
            <TextField label="Target page or section (optional)" value={targetSection} onChange={setTargetSection} placeholder="e.g. Homepage hero, Product page description" autoComplete="off" />
          </FormLayout>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="300">            <Text as="h2" variant="headingMd">
              Screenshots <Text as="span" tone="subdued">(up to 5, auto-compressed)</Text>
            </Text>
          <DropZone
            accept="image/*"
            allowMultiple
            onDrop={(dropped) => {
              setFiles((prev) => [...prev, ...dropped].slice(0, 5));
            }}
          >
            <DropZone.FileUpload actionTitle="Add screenshots" actionHint="or drag & drop, or paste from clipboard" />
          </DropZone>
          {files.length > 0 && (
            <InlineStack gap="200" wrap>
              {files.map((f, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <button
                    type="button"
                    title="Click to edit & mark up"
                    onClick={() => setEditingIdx(i)}
                    style={{ border: 0, background: "none", padding: 0, cursor: "pointer", borderRadius: 8 }}
                  >
                    <Thumbnail size="medium" alt={f.name} source={URL.createObjectURL(f)} />
                  </button>
                  <div
                    style={{ position: "absolute", top: -6, right: -6, cursor: "pointer", background: "#fff", borderRadius: 999, border: "1px solid #c9cccf" }}
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <XIcon width={14} height={14} />
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      bottom: -6,
                      left: -6,
                      background: "#fff",
                      borderRadius: 999,
                      border: "1px solid #c9cccf",
                      padding: "1px 6px",
                      fontSize: 11,
                      color: "#333",
                    }}
                  >
                    ✏️ edit
                  </div>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {f.name.length > 24 ? f.name.slice(0, 24) + "…" : f.name}
                  </Text>
                </div>
              ))}
            </InlineStack>
          )}
        </BlockStack>
      </Card>

      <Button
        variant="primary"
        size="large"
        loading={submitting}
        disabled={!title.trim() || description.trim().length < 5 || !orgId}
        onClick={onSubmit}
      >
        Submit change request
      </Button>

      <ImageEditor
        open={editingIdx !== null}
        file={editingIdx !== null ? (files[editingIdx] ?? null) : null}
        onClose={() => setEditingIdx(null)}
        onSave={(edited) => {
          if (editingIdx !== null) {
            setFiles((prev) => prev.map((f, j) => (j === editingIdx ? edited : f)));
          }
          setEditingIdx(null);
        }}
      />
    </BlockStack>
  );
}
