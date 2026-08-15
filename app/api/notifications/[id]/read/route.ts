import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { notifications } from "@/db/schema";
import { db } from "@/lib/db";
import { json, route } from "@/lib/http";
import { requireUser } from "@/lib/rbac";

/** PATCH /api/notifications/[id]/read — mark one of the caller's notifications read */
export const PATCH = route(async (req: NextRequest, ctx) => {
  const user = await requireUser();

  const { id } = (await ctx.params) as { id: string };
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));

  return json({ ok: true });
});
