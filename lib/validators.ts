import { z } from "zod";

import { ORG_ROLES, PRIORITIES, REQUEST_STATUSES, REQUEST_TYPES } from "@/lib/constants";

const optionalUrl = z
  .union([z.literal(""), z.string().trim().url("Must be a valid URL")])
  .optional()
  .transform((v) => (v ? v : undefined));

export const createRequestSchema = z.object({
  orgId: z.string().min(1, "orgId is required"),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().min(5, "Description is too short").max(20_000),
  type: z.enum(REQUEST_TYPES).default("other"),
  priority: z.enum(PRIORITIES).default("medium"),
  storeId: z.string().optional().nullable(),
  referenceUrl: optionalUrl,
  targetSection: z.string().trim().max(200).optional().default(""),
  dueDate: z.string().datetime().optional().nullable(),
});

export const updateRequestSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(5).max(20_000).optional(),
  type: z.enum(REQUEST_TYPES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  storeId: z.string().nullable().optional(),
  referenceUrl: optionalUrl,
  targetSection: z.string().trim().max(200).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  assignedTo: z.string().nullable().optional(),
});

export const statusChangeSchema = z.object({
  status: z.enum(REQUEST_STATUSES, { message: "Invalid status" }),
  note: z.string().trim().max(2_000).optional().default(""),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty").max(5_000),
  parentId: z.string().optional().nullable(),
  attachmentIds: z.array(z.string()).max(5).optional().default([]),
});

export const createOrgSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and dashes")
    .optional(),
  logo: z.string().trim().optional().nullable(),
});

export const updateOrgSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  logo: z.string().trim().nullable().optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
  role: z.enum(ORG_ROLES).default("member"),
});

export const addStoreSchema = z.object({
  shopifyDomain: z
    .string()
    .trim()
    .min(1, "Store domain is required")
    .regex(/^[a-z0-9-]+\.myshopify\.com$|^[a-z0-9.-]+\.[a-z]{2,}$/, "Enter a valid domain (e.g. mystore.myshopify.com)"),
  label: z.string().trim().max(100).optional().default(""),
});

export const notificationPrefsSchema = z.object({
  mode: z.enum(["instant", "hourly_digest", "daily_digest", "off"]),
});

export const listRequestsSchema = z.object({
  orgId: z.string().optional(),
  status: z.enum(REQUEST_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assignee: z.string().optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
