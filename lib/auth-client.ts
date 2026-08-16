"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient, organizationClient } from "better-auth/client/plugins";

/**
 * baseURL priority:
 *  1. NEXT_PUBLIC_APP_URL (explicit override — required for local dev only)
 *  2. window.location.origin — same-origin call, works everywhere the app
 *     serves its own /api/auth routes (which is always, so this is the safe
 *     default for prod). Fixes "Failed to fetch" when NEXT_PUBLIC_APP_URL
 *     was baked as localhost on a Vercel build.
 */
const baseURL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (typeof window !== "undefined" ? window.location.origin : undefined);

export const authClient = createAuthClient({
  baseURL,
  plugins: [organizationClient(), adminClient()],
});

export const { signIn, signUp, signOut, useSession, getSession, organization } = authClient;
