/* Domain vocabulary + UI labels. Single source of truth. */

export const REQUEST_TYPES = ["bug", "content", "design", "new_feature", "other"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const REQUEST_STATUSES = [
  "submitted",
  "acknowledged",
  "in_progress",
  "in_review",
  "on_hold",
  "rejected",
  "completed",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** Allowed transitions per the PRD state diagram. */
export const STATUS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  submitted: ["acknowledged", "rejected"],
  acknowledged: ["in_progress", "on_hold", "rejected"],
  in_progress: ["in_review", "on_hold"],
  in_review: ["completed", "in_progress"],
  on_hold: ["in_progress"],
  rejected: [],
  completed: [],
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: "Submitted",
  acknowledged: "Acknowledged",
  in_progress: "In progress",
  in_review: "In review",
  on_hold: "On hold",
  rejected: "Rejected",
  completed: "Completed",
};

/** Polaris Badge tones — status readable at a glance. */
export const STATUS_TONES: Record<RequestStatus, string> = {
  submitted: "info",
  acknowledged: "attention",
  in_progress: "attention",
  in_review: "info",
  on_hold: "warning",
  rejected: "critical",
  completed: "success",
};

export const TYPE_LABELS: Record<RequestType, string> = {
  bug: "Bug",
  content: "Content",
  design: "Design",
  new_feature: "New feature",
  other: "Other",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const PRIORITY_TONES: Record<Priority, string> = {
  low: "read-only",
  medium: "info",
  high: "warning",
  urgent: "critical",
};

export const ORG_ROLES = ["owner", "admin", "member"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Client owner",
  admin: "Team member",
  member: "Client member",
};

export const NOTIFICATION_MODES = ["instant", "hourly_digest", "daily_digest", "off"] as const;
export type NotificationMode = (typeof NOTIFICATION_MODES)[number];

export const NOTIFICATION_MODE_LABELS: Record<NotificationMode, string> = {
  instant: "Instant",
  hourly_digest: "Hourly digest",
  daily_digest: "Daily digest",
  off: "Off",
};

/** Email rate-limit knobs (§8.1) */
export const ORG_EMAIL_HOURLY_CAP = 30; // max notification emails/org/hour
export const EMAIL_DEBOUNCE_MS = 5 * 60 * 1000; // collapse events within 5 min
export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024; // 10 MB per file
export const UPLOAD_MAX_FILES = 5; // per request
