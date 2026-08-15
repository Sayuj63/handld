import { randomUUID } from "node:crypto";

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";

import { fileBlobs } from "@/db/schema";
import { db } from "@/lib/db";

/**
 * Attachment storage.
 *
 * Backends, in priority order:
 *   1. Cloudflare R2 (S3-compatible) — when R2_* env vars are set. The
 *      production-grade store: durable, cheap, no egress fees.
 *   2. Postgres `file_blobs` table — the serverless-safe fallback. Vercel's
 *      function filesystem is read-only, so local disk can't work there;
 *      Neon/Postgres is writable and works everywhere. Good for early
 *      production; switch to R2 for heavy use.
 *   3. Local disk (./uploads) — dev-only convenience when Postgres is
 *      unreachable in local scripts. Never used in production.
 *
 * Files are always private — served through the authenticated
 * /api/attachments/[key] proxy, never publicly writable (PRD §11).
 */

export type StoredFile = { key: string; url: string };

function r2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET,
  );
}

let s3: S3Client | null = null;
function getS3() {
  if (!s3) {
    s3 = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3;
}

const SAFE_EXT = /\\.([a-z0-9]{1,10})$/i;

export function newKey(fileName: string): string {
  const ext = SAFE_EXT.exec(fileName)?.[1]?.toLowerCase() ?? "bin";
  return `${Date.now()}-${randomUUID()}.${ext}`;
}

export async function saveFile(input: {
  fileName: string;
  contentType: string;
  buffer: Buffer;
}): Promise<StoredFile> {
  const key = newKey(input.fileName);

  if (r2Configured()) {
    await getS3().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
        Body: input.buffer,
        ContentType: input.contentType,
      }),
    );
  } else {
    await db
      .insert(fileBlobs)
      .values({ key, data: input.buffer, contentType: input.contentType })
      .onConflictDoNothing();
  }

  return { key, url: `/api/attachments/${key}` };
}

export async function readStoredFile(key: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (r2Configured()) {
    const res = await getS3().send(
      new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }),
    );
    if (!res.Body) return null;
    const buffer = Buffer.from(await res.Body.transformToByteArray());
    return { buffer, contentType: res.ContentType ?? "application/octet-stream" };
  }

  const rows = await db
    .select({ data: fileBlobs.data, contentType: fileBlobs.contentType })
    .from(fileBlobs)
    .where(eq(fileBlobs.key, key))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { buffer: Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data), contentType: row.contentType };
}

export async function deleteFile(key: string): Promise<void> {
  if (r2Configured()) {
    await getS3().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }));
  } else {
    await db.delete(fileBlobs).where(eq(fileBlobs.key, key));
  }
}
