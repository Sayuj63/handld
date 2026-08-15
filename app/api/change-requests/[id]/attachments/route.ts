import { NextRequest } from "next/server";

import { attachments } from "@/db/schema";
import { db } from "@/lib/db";
import { badRequest, json, route } from "@/lib/http";
import { checkLimit, uploadLimiter } from "@/lib/ratelimit";
import { getRequestOrThrow } from "@/lib/request-helpers";
import { requireOrgAccess, requireUser } from "@/lib/rbac";
import { UPLOAD_MAX_BYTES, UPLOAD_MAX_FILES } from "@/lib/constants";
import { saveFile } from "@/lib/storage";

/** POST /api/change-requests/[id]/attachments — upload files for a request */
export const POST = route(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  await checkLimit(uploadLimiter, `upload:${user.id}`);

  const { id } = (await ctx.params) as { id: string };
  const requestRow = await getRequestOrThrow(id);
  await requireOrgAccess(user, requestRow.orgId);

  const form = await req.formData();
  const files = form
    .getAll("files")
    .filter((v): v is File => typeof v !== "string" && typeof v.arrayBuffer === "function");

  if (!files.length) throw badRequest("No files uploaded");
  if (files.length > UPLOAD_MAX_FILES) throw badRequest(`Max ${UPLOAD_MAX_FILES} files per request`);
  for (const f of files) {
    if (f.size > UPLOAD_MAX_BYTES) throw badRequest(`File "${f.name}" exceeds the 10 MB limit`);
  }

  const saved: { id: string; url: string; fileName: string; fileType: string | null }[] = [];
  for (const f of files) {
    const stored = await saveFile({
      fileName: f.name,
      contentType: f.type || "application/octet-stream",
      buffer: Buffer.from(await f.arrayBuffer()),
    });
    const attId = crypto.randomUUID();
    await db.insert(attachments).values({
      id: attId,
      changeRequestId: requestRow.id,
      fileUrl: stored.url,
      fileName: f.name,
      fileType: f.type || null,
      fileSize: f.size,
      uploadedBy: user.id,
    });
    saved.push({ id: attId, url: stored.url, fileName: f.name, fileType: f.type || null });
  }

  return json({ attachments: saved }, { status: 201 });
});
