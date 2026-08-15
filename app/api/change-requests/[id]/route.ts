import { eq, getTableColumns } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { NextRequest } from "next/server";

import { attachments, auditLogs, changeRequests, comments, user as userTable } from "@/db/schema";
import { db } from "@/lib/db";
import { badRequest, forbidden, json, route } from "@/lib/http";
import { apiLimiter, checkLimit } from "@/lib/ratelimit";
import { getRequestOrThrow, serializeRequest } from "@/lib/request-helpers";
import { requireOrgAccess, requireUser } from "@/lib/rbac";
import { updateRequestSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";
import { appUrl, assignmentChangedEmail } from "@/lib/email";
import { createInAppNotification, enqueueEmail, flushOutbox } from "@/lib/notifications";
import { deleteFile } from "@/lib/storage";

const commenter = alias(userTable, "commenter");

export const GET = route(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  await checkLimit(apiLimiter, `api:${user.id}`);

  const { id } = (await ctx.params) as { id: string };
  const requestRow = await getRequestOrThrow(id);
  await requireOrgAccess(user, requestRow.orgId);

  const [commentRows, attachmentRows, timeline] = await Promise.all([
    db
      .select({
        ...getTableColumns(comments),
        authorName: commenter.name,
        authorEmail: commenter.email,
      })
      .from(comments)
      .leftJoin(commenter, eq(comments.userId, commenter.id))
      .where(eq(comments.changeRequestId, requestRow.id))
      .orderBy(comments.createdAt),
    db
      .select()
      .from(attachments)
      .where(eq(attachments.changeRequestId, requestRow.id))
      .orderBy(attachments.createdAt),
    db
      .select({
        ...getTableColumns(auditLogs),
        actorName: commenter.name,
      })
      .from(auditLogs)
      .leftJoin(commenter, eq(auditLogs.actorUserId, commenter.id))
      .where(eq(auditLogs.entityId, requestRow.id))
      .orderBy(auditLogs.createdAt),
  ]);

  return json({
    request: serializeRequest(requestRow),
    comments: commentRows.map((c) => ({
      id: c.id,
      parentId: c.parentId,
      body: c.body,
      createdAt: c.createdAt,
      author: { id: c.userId, name: c.authorName, email: c.authorEmail },
    })),
    attachments: attachmentRows.map((a) => ({
      id: a.id,
      url: a.fileUrl,
      fileName: a.fileName,
      fileType: a.fileType,
      fileSize: a.fileSize,
      commentId: a.commentId,
      createdAt: a.createdAt,
    })),
    timeline: timeline.map((t) => ({
      id: t.id,
      action: t.action,
      actor: t.actorName,
      metadata: t.metadata,
      createdAt: t.createdAt,
    })),
  });
});

/* PATCH /api/change-requests/[id] — edit fields / reassign */
export const PATCH = route(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  await checkLimit(apiLimiter, `api:${user.id}`);

  const { id } = (await ctx.params) as { id: string };
  const requestRow = await getRequestOrThrow(id);
  const role = await requireOrgAccess(user, requestRow.orgId);

  const body = updateRequestSchema.parse(await req.json());

  // Permission: staff / org managers, or the creator while pre-acknowledged.
  const isStaffLike = user.globalRole === "super_admin" || role === "owner" || role === "admin";
  const preAcknowledged = ["submitted", "acknowledged"].includes(requestRow.status);
  if (!isStaffLike && !(requestRow.createdBy === user.id && preAcknowledged)) {
    throw forbidden("You can only edit your own request before it is acknowledged");
  }

  const changes: Record<string, unknown> = {};

  // Assignment changes are staff-only (PRD matrix).
  let assignmentChanged = false;
  if (body.assignedTo !== undefined) {
    if (!isStaffLike && body.assignedTo !== requestRow.assignedTo) {
      throw forbidden("Only staff can reassign requests");
    }
    if (body.assignedTo !== requestRow.assignedTo) {
      changes.assignedTo = body.assignedTo;
      assignmentChanged = true;
    }
  }

  for (const key of [
    "title",
    "description",
    "type",
    "priority",
    "storeId",
    "referenceUrl",
    "targetSection",
    "dueDate",
  ] as const) {
    if (body[key] !== undefined) changes[key] = body[key];
  }

  if (!Object.keys(changes).length) throw badRequest("Nothing to update");

  const update: Record<string, unknown> = { ...changes, updatedAt: new Date() };
  await db.update(changeRequests).set(update).where(eq(changeRequests.id, requestRow.id));

  await audit({
    orgId: requestRow.orgId,
    actorUserId: user.id,
    action: "request.update",
    entityType: "request",
    entityId: requestRow.id,
    metadata: { fields: Object.keys(changes) },
  });

  // Notify the new assignee.
  if (assignmentChanged && body.assignedTo) {
    const assigneeUser = await db
      .select({ id: userTable.id, name: userTable.name, email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, body.assignedTo))
      .limit(1);
    if (assigneeUser[0]) {
      const url = `${appUrl()}/requests/${requestRow.id}`;
      await createInAppNotification({
        userId: assigneeUser[0].id,
        orgId: requestRow.orgId,
        type: "assignment_changed",
        title: `Assigned: ${requestRow.title}`,
        body: `${user.name} assigned this request to you.`,
        payload: { requestId: requestRow.id, url },
      });
      const mail = assignmentChangedEmail({
        title: requestRow.title,
        assigneeName: assigneeUser[0].name,
        url,
      });
      await enqueueEmail({
        orgId: requestRow.orgId,
        userId: assigneeUser[0].id,
        to: assigneeUser[0].email,
        subject: mail.subject,
        html: mail.html,
        kind: "assignment_changed",
        idempotencyKey: `assignment:${requestRow.id}:${assigneeUser[0].id}`,
      });
      await audit({
        orgId: requestRow.orgId,
        actorUserId: user.id,
        action: "request.assign",
        entityType: "request",
        entityId: requestRow.id,
        metadata: { to: assigneeUser[0].id },
      });
    }
  }
  await flushOutbox(requestRow.orgId);

  const updated = await getRequestOrThrow(requestRow.id);
  return json({ request: serializeRequest(updated) });
});

/* DELETE /api/change-requests/[id] — creator (pre-acknowledged) or super admin */
export const DELETE = route(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  await checkLimit(apiLimiter, `api:${user.id}`);

  const { id } = (await ctx.params) as { id: string };
  const requestRow = await getRequestOrThrow(id);
  await requireOrgAccess(user, requestRow.orgId);

  const canDelete =
    user.globalRole === "super_admin" ||
    (requestRow.createdBy === user.id && ["submitted", "acknowledged"].includes(requestRow.status));
  if (!canDelete) throw forbidden("Requests can only be deleted before they are acknowledged");

  // Best-effort cleanup of stored files.
  const files = await db
    .select({ fileUrl: attachments.fileUrl })
    .from(attachments)
    .where(eq(attachments.changeRequestId, requestRow.id));
  for (const f of files) {
    const key = f.fileUrl.split("/").pop();
    if (key) await deleteFile(key).catch(() => {});
  }

  await db.delete(changeRequests).where(eq(changeRequests.id, requestRow.id));

  await audit({
    orgId: requestRow.orgId,
    actorUserId: user.id,
    action: "request.delete",
    entityType: "request",
    entityId: requestRow.id,
    metadata: { title: requestRow.title },
  });

  return json({ ok: true });
});
