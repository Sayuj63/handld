import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, organization } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";

import { db } from "@/lib/db";

/* Permission vocabulary + per-org roles (PRD §4 RBAC matrix). */
const ac = createAccessControl({
  organization: ["create", "read", "update", "delete"],
  member: ["create", "read", "update", "delete"],
  invitation: ["create", "read", "cancel"],
  team: ["create", "read", "update", "delete"],
  ac: ["create", "read", "update", "delete"],
});

/**
 * Per-org roles:
 *  - owner  → Client Owner (primary contact): manages their org's users
 *  - admin  → Team Member assigned to this org: triage/status/comment only
 *  - member → Client Member: submit + view, cannot manage users
 * Super Admin gets an `owner` membership everywhere it operates and is
 * additionally gated by `globalRole === "super_admin"` in our routes.
 */
const roles = {
  owner: ac.newRole({
    organization: ["read", "update", "delete"],
    member: ["create", "read", "update", "delete"],
    invitation: ["create", "read", "cancel"],
    team: ["read"],
    ac: ["read"],
  }),
  admin: ac.newRole({
    organization: ["read", "update"],
    member: ["read"],
    invitation: ["read"],
    team: ["read"],
    ac: ["read"],
  }),
  member: ac.newRole({
    organization: ["read"],
    member: ["read"],
    invitation: ["read"],
    team: [],
    ac: ["read"],
  }),
};

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg" }),
  trustedOrigins: [process.env.BETTER_AUTH_URL].filter(Boolean) as string[],

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Account-level emails (invite, password reset) are sent by our own
    // notification engine, so Better Auth's built-in email sending is off.
    sendResetPassword: async () => {},
  },

  user: {
    additionalFields: {
      /**
       * Global (cross-org) role, distinct from per-org membership roles:
       *  - "super_admin" — platform owner, sees every org
       *  - "team_member" — hired help, scoped to orgs they are a member of
       *  - "user"       — default for everyone else (client staff)
       */
      globalRole: {
        type: "string",
        required: true,
        defaultValue: "user",
        input: false,
      },
    },
  },

  session: {
    cookieCache: { enabled: true, maxAge: 60 },
  },

  // Brute-force protection on auth endpoints (login/reset) — see §8.3 of PRD.
  rateLimit: {
    enabled: true,
    window: 60 * 15, // 15 minutes
    max: 100,
  },

  plugins: [
    organization({
      creatorRole: "owner",
      allowMultipleOrganizations: true,
      ac,
      roles,
    }),
    admin(),
    nextCookies(),
  ],
});

export type Auth = typeof auth;
