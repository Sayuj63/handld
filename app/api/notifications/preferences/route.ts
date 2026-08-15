import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { notificationPreferences } from "@/db/schema";
import { db } from "@/lib/db";
import { json, route } from "@/lib/http";
import { requireUser } from "@/lib/rbac";
import { notificationPrefsSchema } from "@/lib/validators";

export const GET = route(async () => {
  const user = await requireUser();

  const rows = await db
    .select({ mode: notificationPreferences.mode })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, user.id))
    .limit(1);

  return json({ preferences: { mode: rows[0]?.mode ?? "instant" } });
});

export const PATCH = route(async (req: NextRequest) => {
  const user = await requireUser();
  const body = notificationPrefsSchema.parse(await req.json());

  await db
    .insert(notificationPreferences)
    .values({ userId: user.id, mode: body.mode })
    .onConflictDoUpdate({
      target: notificationPreferences.userId,
      set: { mode: body.mode, updatedAt: new Date() },
    });

  return json({ preferences: { mode: body.mode } });
});
