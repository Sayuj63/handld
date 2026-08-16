"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient, organizationClient } from "better-auth/client/plugins";

/**
 * In the browser, always call same-origin — the app serves /api/auth on its
 * own domain, so we never need to send auth requests cross-origin. This
 * makes the client immune to NEXT_PUBLIC_APP_URL being stale/wrong in the
 * bundle (previous bug: it was baked to changedesk.vercel.app, so browsers
 * at handld.atrey.dev tried to POST across origins → "Failed to fetch").
 *
 * For SSR (no window), fall back to the env var.
 */
const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL;

export const authClient = createAuthClient({
  baseURL,
  plugins: [organizationClient(), adminClient()],
});

export const { signIn, signUp, signOut, useSession, getSession, organization } = authClient;
