import { and, eq, getTableColumns, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { NextRequest } from "next/server";

import { attachments, comments, user as userTable } from "@/db/schema";
import { db } from "@/lib/db";
import { json, route } from "@/lib/http";
import { apiLimiter, checkLimit } from "@/lib/ratelimit";
import { getRequestOrThrow } from "@/lib/request-helpers";
import { requireOrgAccess, requireUser } from "@/lib/rbac";
import { commentSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";
import { appUrl, commentAddedEmail } from "@/lib/email";
import { createInAppNotification, enqueueEmail, flushOutbox } from "@/lib/notifications";

const commenter = alias(userTable, "commenter");

export const GET = route(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  await checkLimit(apiLimiter, `api:${user.id}`);

  const { id } = (await ctx.params) as { id: string };
  const requestRow = await getRequestOrThrow(id);
  await requireOrgAccess(user, requestRow.orgId);

  const rows = await db
    .select({
      ...getTableColumns(comments),
      authorName: commenter.name,
      authorEmail: commenter.email,
    })
    .from(comments)
    .leftJoin(commenter, eq(comments.userId, commenter.id))
    .where(eq(comments.changeRequestId, requestRow.id))
    .orderBy(comments.createdAt);

  return json({
    comments: rows.map((c) => ({
      id: c.id,
      parentId: c.parentId,
      body: c.body,
      createdAt: c.createdAt,
      author: { id: c.userId, name: c.authorName, email: c.authorEmail },
    })),
  });
});

export const POST = route(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  await checkLimit(apiLimiter, `api:${user.id}`);

  const { id } = (await ctx.params) as { id: string };
  const requestRow = await getRequestOrThrow(id);
  await requireOrgAccess(user, requestRow.orgId);

  const body = commentSchema.parse(await req.json());

  const commentId = crypto.randomUUID();
  await db.insert(comments).values({
    id: commentId,
    changeRequestId: requestRow.id,
    parentId: body.parentId ?? null,
    userId: user.id,
    body: body.body,
  });

  // Link any files that were uploaded alongside this comment.
  if (body.attachmentIds.length) {
    await db
      .update(attachments)
      .set({ commentId })
      .where(and(inArray(attachments.id, body.attachmentIds), eq(attachments.changeRequestId, requestRow.id)));
  }

  await audit({
    orgId: requestRow.orgId,
    actorUserId: user.id,
    action: "comment.create",
    entityType: "request",
    entityId: requestRow.id,
    metadata: { commentId },
  });

  // Notify the other party: creator and/or assignee.
  const url = `${appUrl()}/requests/${requestRow.id}`;
  const mail = commentAddedEmail({ title: requestRow.title, commenter: user.name, url });
  const targets = new Set<string>([requestRow.createdBy, requestRow.assignedTo ?? ""]);
  targets.delete(user.id);
  targets.delete("");

  for (const targetId of targets) {
    const target = await db
      .select({ id: userTable.id, name: userTable.name, email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, targetId))
      .limit(1);
    if (!target[0]) continue;
    await createInAppNotification({
      userId: target[0].id,
      orgId: requestRow.orgId,
      type: "comment_added",
      title: `New comment on "${requestRow.title}"`,
      body: `${user.name}: ${body.body.slice(0, 200)}`,
      payload: { requestId: requestRow.id, url },
    });
    await enqueueEmail({
      orgId: requestRow.orgId,
      userId: target[0].id,
      to: target[0].email,
      subject: mail.subject,
      html: mail.html,
      kind: "comment_added",
      idempotencyKey: `comment:${commentId}:${target[0].id}`,
    });
  }
  await flushOutbox(requestRow.orgId);

  return json(
    {
      id: commentId,
      changeRequestId: requestRow.id,
      body: body.body,
      parentId: body.parentId ?? null,
      createdAt: new Date(),
      author: { id: user.id, name: user.name, email: user.email },
    },
    { status: 201 },
  );
});
