import { and, count, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { attachments, changeRequests, comments, organization } from "@/db/schema";
import { db } from "@/lib/db";
import { badRequest, json, route } from "@/lib/http";
import { apiLimiter, checkLimit, uploadLimiter } from "@/lib/ratelimit";
import { getOrgStaff, getSuperAdminUsers } from "@/lib/request-helpers";
import { requireUser, resolveOrgId } from "@/lib/rbac";
import { createRequestSchema, listRequestsSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";
import { appUrl, requestCreatedEmail } from "@/lib/email";
import { createInAppNotification, enqueueEmail, flushOutbox } from "@/lib/notifications";
import { UPLOAD_MAX_BYTES, UPLOAD_MAX_FILES } from "@/lib/constants";
import { saveFile } from "@/lib/storage";

/* GET /api/change-requests — org-scoped list with filters */
export const GET = route(async (req: NextRequest) => {
  const user = await requireUser();
  await checkLimit(apiLimiter, `api:${user.id}`);

  const raw = Object.fromEntries(req.nextUrl.searchParams);
  const query = listRequestsSchema.parse(raw);

  // Non-staff users must scope to one of their orgs.
  const orgId =
    user.globalRole === "super_admin" ? query.orgId : await resolveOrgId(user, query.orgId);
  if (user.globalRole !== "super_admin" && !orgId) throw badRequest("orgId is required");

  const conditions = [];
  if (orgId) conditions.push(eq(changeRequests.orgId, orgId));
  if (query.status) conditions.push(eq(changeRequests.status, query.status));
  if (query.priority) conditions.push(eq(changeRequests.priority, query.priority));
  if (query.assignee) conditions.push(eq(changeRequests.assignedTo, query.assignee));
  if (query.q) {
    const term = `%${query.q}%`;
    conditions.push(
      or(ilike(changeRequests.title, term), ilike(changeRequests.description, term)),
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const offset = (query.page - 1) * query.pageSize;

  const commentSub = db
    .select({ requestId: comments.changeRequestId, count: count().as("comment_count") })
    .from(comments)
    .groupBy(comments.changeRequestId)
    .as("comment_counts");
  const attachmentSub = db
    .select({ requestId: attachments.changeRequestId, count: count().as("attachment_count") })
    .from(attachments)
    .groupBy(attachments.changeRequestId)
    .as("attachment_counts");

  const rows = await db
    .select({
      ...getTableColumns(changeRequests),
      orgName: sql<string>`(select name from organization where id = ${changeRequests.orgId})`,
      commentCount: commentSub.count,
      attachmentCount: attachmentSub.count,
    })
    .from(changeRequests)
    .leftJoin(commentSub, eq(changeRequests.id, commentSub.requestId))
    .leftJoin(attachmentSub, eq(changeRequests.id, attachmentSub.requestId))
    .where(where)
    .orderBy(sql`${changeRequests.createdAt} desc`)
    .limit(query.pageSize)
    .offset(offset);

  const totalRows = await db.select({ n: count() }).from(changeRequests).where(where);

  return json({
    requests: rows.map((r) => ({
      id: r.id,
      orgId: r.orgId,
      orgName: r.orgName,
      title: r.title,
      type: r.type,
      priority: r.priority,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      commentCount: Number(r.commentCount ?? 0),
      attachmentCount: Number(r.attachmentCount ?? 0),
    })),
    total: totalRows[0]?.n ?? 0,
    page: query.page,
    pageSize: query.pageSize,
  });
});

/* POST /api/change-requests — multipart form with files */
export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  await checkLimit(apiLimiter, `api:${user.id}`);

  const form = await req.formData();
  const field = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : undefined;
  };

  const parsed = createRequestSchema.parse({
    orgId: field("orgId"),
    title: field("title"),
    description: field("description"),
    type: field("type") ?? undefined,
    priority: field("priority") ?? undefined,
    storeId: field("storeId") || null,
    referenceUrl: field("referenceUrl") || undefined,
    targetSection: field("targetSection") || "",
    dueDate: field("dueDate") || undefined,
  });

  const orgId = await resolveOrgId(user, parsed.orgId);

  const org = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);
  if (!org[0]) throw badRequest("Organization not found");

  // Validate uploaded files
  const files = form
    .getAll("files")
    .filter((v): v is File => typeof v !== "string" && typeof v.arrayBuffer === "function");
  if (files.length > UPLOAD_MAX_FILES) throw badRequest(`Max ${UPLOAD_MAX_FILES} files per request`);
  for (const f of files) {
    if (f.size > UPLOAD_MAX_BYTES) throw badRequest(`File "${f.name}" exceeds the 10 MB limit`);
  }
  if (files.length) await checkLimit(uploadLimiter, `upload:${user.id}`);

  const requestId = crypto.randomUUID();
  await db.insert(changeRequests).values({
    id: requestId,
    orgId,
    storeId: parsed.storeId ?? null,
    createdBy: user.id,
    title: parsed.title,
    description: parsed.description,
    type: parsed.type,
    priority: parsed.priority,
    referenceUrl: parsed.referenceUrl ?? null,
    targetSection: parsed.targetSection || null,
    dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
  });

  // Persist uploads
  const saved: { id: string; url: string; fileName: string }[] = [];
  for (const f of files) {
    const buffer = Buffer.from(await f.arrayBuffer());
    const stored = await saveFile({
      fileName: f.name,
      contentType: f.type || "application/octet-stream",
      buffer,
    });
    const attId = crypto.randomUUID();
    await db.insert(attachments).values({
      id: attId,
      changeRequestId: requestId,
      fileUrl: stored.url,
      fileName: f.name,
      fileType: f.type || null,
      fileSize: f.size,
      uploadedBy: user.id,
    });
    saved.push({ id: attId, url: stored.url, fileName: f.name });
  }

  await audit({
    orgId,
    actorUserId: user.id,
    action: "request.create",
    entityType: "request",
    entityId: requestId,
    metadata: { title: parsed.title, priority: parsed.priority, type: parsed.type },
  });

  // Notify staff (org owners/admins + super admins) of the new request.
  // Dedupe by userId — a super admin who is also an org owner appears in both lists.
  const staff = await getOrgStaff(orgId);
  const supers = await getSuperAdminUsers();
  const url = `${appUrl()}/requests/${requestId}`;
  const orgName = org[0].name;
  const recipients = new Map<string, { userId: string; name: string; email: string }>();
  for (const s of [...staff, ...supers]) {
    if (s.userId !== user.id) recipients.set(s.userId, s);
  }

  for (const s of recipients.values()) {
    await createInAppNotification({
      userId: s.userId,
      orgId,
      type: "request_created",
      title: `New request from ${orgName}`,
      body: `${user.name} submitted: ${parsed.title}`,
      payload: { requestId: requestId, url },
    });
    const mail = requestCreatedEmail({
      orgName,
      title: parsed.title,
      requesterName: user.name,
      url,
    });
    await enqueueEmail({
      orgId,
      userId: s.userId,
      to: s.email,
      subject: mail.subject,
      html: mail.html,
      kind: "request_created",
      idempotencyKey: `request-created:${requestId}:${s.userId}`,
    });
  }
  await flushOutbox(orgId);

  return json(
    {
      id: requestId,
      orgId,
      title: parsed.title,
      attachments: saved,
    },
    { status: 201 },
  );
});
