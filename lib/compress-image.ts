"use client";

/**
 * Client-side screenshot compression.
 *
 * Vercel Serverless Functions cap the request body at ~4.5 MB (413
 * FUNCTION_PAYLOAD_TOO_LARGE), so we can't rely on the 10 MB per-file limit
 * advertised by the server. Instead, screenshots are re-encoded in the
 * browser to a max dimension + JPEG quality that keeps each file small and
 * the whole multipart body well under the platform cap.
 *
 * Non-images and files that are already small pass through untouched. If the
 * browser can't decode a format (e.g. HEIC), the original is kept — the
 * server's own limit still applies.
 */

export const MAX_IMAGE_DIMENSION = 2400; // px on the longest edge
export const JPEG_QUALITY = 0.82;
// Keep originals below this size untouched; only re-encode bigger ones.
const SMALL_FILE_CUTOFF = 1.5 * 1024 * 1024; // 1.5 MB

export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= SMALL_FILE_CUTOFF) return file;

  try {
    const original = await loadImage(file);
    const { width, height } = fitWithin(original.width, original.height, MAX_IMAGE_DIMENSION);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(original, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;

    // Keep a sensible name/extension for downstream display.
    const base = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    // Unreadable format — let the server decide.
    return file;
  }
}

export async function compressImageFiles(files: File[]): Promise<File[]> {
  return Promise.all(files.map(compressImageFile));
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  if (width <= max && height <= max) return { width, height };
  const scale = Math.min(max / width, max / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
