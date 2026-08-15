import { and, eq, isNull } from "drizzle-orm";

import { notifications } from "@/db/schema";
import { db } from "@/lib/db";
import { json, route } from "@/lib/http";
import { requireUser } from "@/lib/rbac";

export const POST = route(async () => {
  const user = await requireUser();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  return json({ ok: true });
});
