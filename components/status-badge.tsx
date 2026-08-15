"use client";

import { Badge } from "@shopify/polaris";

import { PRIORITY_LABELS, PRIORITY_TONES, STATUS_LABELS, STATUS_TONES } from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status;
  const tone = STATUS_TONES[status as keyof typeof STATUS_TONES] as
    | "info"
    | "success"
    | "warning"
    | "critical"
    | "attention"
    | "new"
    | "read-only"
    | "enabled";
  return <Badge tone={tone}>{label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const label = PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS] ?? priority;
  const tone = PRIORITY_TONES[priority as keyof typeof PRIORITY_TONES] as
    | "info"
    | "success"
    | "warning"
    | "critical"
    | "attention"
    | "new"
    | "read-only"
    | "enabled";
  return <Badge tone={tone}>{label}</Badge>;
}

export function TypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    bug: "Bug",
    content: "Content",
    design: "Design",
    new_feature: "New feature",
    other: "Other",
  };
  return <>{labels[type] ?? type}</>;
}
