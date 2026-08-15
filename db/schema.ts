import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

/* ─────────────────────────────────────────────────────────────
 * AUTH TABLES (Better Auth)
 * Generated verbatim by `npx @better-auth/cli generate` for
 * better-auth@1.6.29 + organization/admin plugins + the
 * `globalRole` custom user field. Column names are snake_case,
 * matching the Drizzle adapter's default field transform.
 * Do not rename tables or columns.
 * ───────────────────────────────────────────────────────────── */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  /** Admin plugin */
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  /** Custom: "super_admin" | "team_member" | "user" */
  globalRole: text("global_role").default("user").notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Organization plugin */
    activeOrganizationId: text("active_organization_id"),
    /** Admin plugin */
    impersonatedBy: text("impersonated_by"),
  },
  (t) => [index("session_userId_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("account_userId_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

export const organization = pgTable(
  "organization",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    createdAt: timestamp("created_at").notNull(),
    metadata: text("metadata"),
  },
  (t) => [uniqueIndex("organization_slug_uidx").on(t.slug)],
);

export const member = pgTable(
  "member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** "owner" | "admin" | "member" */
    role: text("role").default("member").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (t) => [
    index("member_organizationId_idx").on(t.organizationId),
    index("member_userId_idx").on(t.userId),
    // Prevent duplicate memberships (Better Auth dedupes in code; this is belt & braces)
    uniqueIndex("member_org_user_uidx").on(t.organizationId, t.userId),
  ],
);

export const invitation = pgTable(
  "invitation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("invitation_organizationId_idx").on(t.organizationId),
    index("invitation_email_idx").on(t.email),
  ],
);

/* ─────────────────────────────────────────────────────────────
 * APP TABLES (ChangeDesk domain)
 * ───────────────────────────────────────────────────────────── */

/** Shopify stores belonging to an org (multi-store support) */
export const stores = pgTable(
  "stores",
  {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    shopifyDomain: text("shopify_domain").notNull(),
    label: text("label"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("stores_org_idx").on(t.orgId)],
);

export const changeRequests = pgTable(
  "change_requests",
  {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    storeId: text("store_id").references(() => stores.id, { onDelete: "set null" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    assignedTo: text("assigned_to").references(() => user.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    /** bug | content | design | new_feature | other */
    type: text("type").notNull().default("other"),
    /** low | medium | high | urgent */
    priority: text("priority").notNull().default("medium"),
    /**
     * submitted → acknowledged → in_progress → in_review → completed
     *           ↘ rejected        → on_hold ↗
     */
    status: text("status").notNull().default("submitted"),
    referenceUrl: text("reference_url"),
    targetSection: text("target_section"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("change_requests_org_status_idx").on(t.orgId, t.status),
    index("change_requests_assigned_idx").on(t.assignedTo),
    index("change_requests_created_idx").on(t.createdAt),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    changeRequestId: text("change_request_id")
      .notNull()
      .references(() => changeRequests.id, { onDelete: "cascade" }),
    /** Optional parent for threaded replies */
    parentId: text("parent_id").references((): AnyPgColumn => comments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("comments_request_idx").on(t.changeRequestId)],
);

export const attachments = pgTable(
  "attachments",
  {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    changeRequestId: text("change_request_id")
      .notNull()
      .references(() => changeRequests.id, { onDelete: "cascade" }),
    /** Set when the file was re-attached inside a comment */
    commentId: text("comment_id").references(() => comments.id, { onDelete: "cascade" }),
    fileUrl: text("file_url").notNull(),
    fileName: text("file_name").notNull(),
    fileType: text("file_type"),
    fileSize: integer("file_size"),
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("attachments_request_idx").on(t.changeRequestId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    orgId: text("org_id").references(() => organization.id, { onDelete: "cascade" }),
    /** request_created | status_changed | comment_added | assignment_changed | invite | system */
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

export const notificationPreferences = pgTable("notification_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  /** instant | hourly_digest | daily_digest | off */
  mode: text("mode").notNull().default("instant"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Append-only. Never update or delete. */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    orgId: text("org_id").references(() => organization.id, { onDelete: "set null" }),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    /** request.create | request.status | request.assign | comment.create | org.create | member.invite ... */
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_logs_org_idx").on(t.orgId, t.createdAt)],
);

/** Email queue — idempotent, debounced, rate-capped per org. */
export const emailOutbox = pgTable(
  "email_outbox",
  {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    orgId: text("org_id").references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    to: text("to").notNull(),
    subject: text("subject").notNull(),
    html: text("html").notNull(),
    /** invite | request_created | status_changed | comment_added | assignment_changed | digest */
    kind: text("kind").notNull(),
    /**
     * pending | sent | failed | debounced (collapsed into another email)
     * | digest (queued into next digest) | skipped (user opted out)
     */
    status: text("status").notNull().default("pending"),
    debounceKey: text("debounce_key"),
    idempotencyKey: text("idempotency_key").unique(),
    attemptCount: integer("attempt_count").notNull().default(0),
    error: text("error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("email_outbox_status_idx").on(t.status),
    index("email_outbox_org_idx").on(t.orgId),
  ],
);

/* ─────────────────────────────────────────────────────────────
 * RELATIONS
 * ───────────────────────────────────────────────────────────── */

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  members: many(member),
  invitations: many(invitation),
  notifications: many(notifications),
  comments: many(comments),
  createdRequests: many(changeRequests, { relationName: "createdBy" }),
  assignedRequests: many(changeRequests, { relationName: "assignedTo" }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  invitations: many(invitation),
  stores: many(stores),
  requests: many(changeRequests),
}));

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, { fields: [member.userId], references: [user.id] }),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
  user: one(user, { fields: [invitation.inviterId], references: [user.id] }),
}));

export const changeRequestsRelations = relations(changeRequests, ({ one, many }) => ({
  org: one(organization, { fields: [changeRequests.orgId], references: [organization.id] }),
  store: one(stores, { fields: [changeRequests.storeId], references: [stores.id] }),
  creator: one(user, {
    fields: [changeRequests.createdBy],
    references: [user.id],
    relationName: "createdBy",
  }),
  assignee: one(user, {
    fields: [changeRequests.assignedTo],
    references: [user.id],
    relationName: "assignedTo",
  }),
  comments: many(comments),
  attachments: many(attachments),
}));
