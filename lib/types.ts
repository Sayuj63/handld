export type OrgLite = { orgId: string; orgName: string; role: string };

export type RequestLite = {
  id: string;
  orgId: string;
  orgName: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
  attachmentCount: number;
};

export type RequestListResponse = {
  requests: RequestLite[];
  total: number;
  page: number;
  pageSize: number;
};

export type AttachmentLite = {
  id: string;
  url: string;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
  commentId: string | null;
  createdAt: string;
};

export type CommentLite = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  author: { id: string; name: string | null; email: string | null };
};

export type TimelineItem = {
  id: string;
  action: string;
  actor: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type RequestDetail = {
  id: string;
  orgId: string;
  orgName: string;
  store: { id: string; label: string | null; shopifyDomain: string } | null;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  referenceUrl: string | null;
  targetSection: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  creator: { id: string; name: string | null; email: string | null };
  assignee: { id: string; name: string | null } | null;
};

export type RequestDetailResponse = {
  request: RequestDetail;
  comments: CommentLite[];
  attachments: AttachmentLite[];
  timeline: TimelineItem[];
};

export type OrgDetailResponse = {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    createdAt: string;
  } | null;
  members: { userId: string; name: string | null; email: string; role: string; isManager: boolean }[];
  stores: { id: string; shopifyDomain: string; label: string | null; createdAt: string }[];
  stats: { total: number; open: number };
  invitations: { id: string; email: string; role: string | null; status: string; expiresAt: string }[];
};

export type OrgAnalytics = {
  orgId: string;
  totals: {
    total: number;
    completed: number;
    rejected: number;
    open: number;
    overdue: number;
    completionRate: number;
    avgTurnaroundDays: number | null;
  };
  byStatus: { key: string; n: number }[];
  byType: { key: string; n: number }[];
  byPriority: { key: string; n: number }[];
  monthly: { month: string; n: number }[];
};

export type MeResponse = {
  user: { id: string; name: string; email: string; globalRole: string };
  orgs: OrgLite[];
  staff: boolean;
  isSuperAdmin: boolean;
};

export type NotificationsResponse = {
  notifications: {
    id: string;
    type: string;
    title: string;
    body: string | null;
    payload: Record<string, unknown> | null;
    read: boolean;
    createdAt: string;
  }[];
  unread: number;
};
