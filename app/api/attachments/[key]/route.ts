import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { attachments, changeRequests } from "@/db/schema";
import { db } from "@/lib/db";
import { notFound, route } from "@/lib/http";
import { requireOrgAccess, requireUser } from "@/lib/rbac";
import { readStoredFile } from "@/lib/storage";

/**
 * GET /api/attachments/[key]
 * Files are private — every read goes through this route, which verifies
 * the caller belongs to the request's org before streaming the bytes.
 */
export const GET = route(async (req: NextRequest, ctx) => {
  const user = await requireUser();

  const { key } = (await ctx.params) as { key: string };
  const fileUrl = `/api/attachments/${key}`;

  const att = await db
    .select({ changeRequestId: attachments.changeRequestId, fileName: attachments.fileName })
    .from(attachments)
    .where(eq(attachments.fileUrl, fileUrl))
    .limit(1);
  if (!att[0]) throw notFound("File not found");

  const requestRow = await db
    .select({ orgId: changeRequests.orgId })
    .from(changeRequests)
    .where(eq(changeRequests.id, att[0].changeRequestId))
    .limit(1);
  if (!requestRow[0]) throw notFound("File not found");
  await requireOrgAccess(user, requestRow[0].orgId);

  const file = await readStoredFile(key);
  if (!file) throw notFound("File not found");

  const disposition = /^image\//.test(file.contentType) ? "inline" : "attachment";
  return new Response(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `${disposition}; filename="${att[0].fileName.replace(/["\\]/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
});
