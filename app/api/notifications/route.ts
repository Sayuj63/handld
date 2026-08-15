import { and, count, desc, eq, isNull } from "drizzle-orm";

import { notifications } from "@/db/schema";
import { db } from "@/lib/db";
import { json, route } from "@/lib/http";
import { apiLimiter, checkLimit } from "@/lib/ratelimit";
import { requireUser } from "@/lib/rbac";

/** GET /api/notifications — the caller's notifications (latest 50) + unread count */
export const GET = route(async () => {
  const user = await requireUser();
  await checkLimit(apiLimiter, `api:${user.id}`);

  const [rows, unreadRows] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50),
    db
      .select({ n: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt))),
  ]);

  return json({
    notifications: rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      payload: n.payload,
      read: Boolean(n.readAt),
      createdAt: n.createdAt,
    })),
    unread: unreadRows[0]?.n ?? 0,
  });
});
