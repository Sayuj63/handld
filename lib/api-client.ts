"use client";

export class ApiClientError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    if (res.status === 413) {
      message = "File too large for upload — try a smaller screenshot (under ~4 MB)";
    } else {
      try {
        const body = await res.json();
        if (body?.error) message = body.error;
      } catch {
        /* not json */
      }
    }
    throw new ApiClientError(message, res.status);
  }
  return res.json() as Promise<T>;
}
