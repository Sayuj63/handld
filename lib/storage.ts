import { randomUUID } from "node:crypto";
import { mkdir, readFile as fsReadFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Attachment storage. Local disk in dev; Cloudflare R2 (S3-compatible)
 * when R2_* env vars are set. Uploads are always private — files are
 * served through the authenticated /api/attachments/[key] proxy route,
 * so storage is never publicly writable (PRD §11).
 */

export type StoredFile = { key: string; url: string };

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

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

const SAFE_EXT = /\.([a-z0-9]{1,10})$/i;

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
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, key), input.buffer);
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

  try {
    const buffer = await fsReadFile(path.join(UPLOAD_DIR, key));
    return { buffer, contentType: "application/octet-stream" };
  } catch {
    return null;
  }
}

export async function deleteFile(key: string): Promise<void> {
  if (r2Configured()) {
    await getS3().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }));
  } else {
    const { rm } = await import("node:fs/promises");
    await rm(path.join(UPLOAD_DIR, key), { force: true });
  }
}
