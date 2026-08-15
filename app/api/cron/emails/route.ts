import { NextRequest } from "next/server";

import { forbidden, json, route } from "@/lib/http";
import { flushOutbox, sendDigests } from "@/lib/notifications";

/**
 * GET /api/cron/emails
 * Invoked by a scheduler (Vercel Cron / external). Protected by CRON_SECRET
 * when configured; in dev (no secret set) it runs unrestricted.
 */
export const GET = route(async (req: NextRequest) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    throw forbidden("Invalid cron secret");
  }
  await flushOutbox();
  await sendDigests(false);
  return json({ ok: true });
});
