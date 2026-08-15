import { json, route } from "@/lib/http";
import { requireStaff } from "@/lib/rbac";
import { flushOutbox, sendDigests } from "@/lib/notifications";

/** POST /api/email/flush — send queued emails + digests now (staff only) */
export const POST = route(async () => {
  await requireStaff();
  await flushOutbox();
  await sendDigests(true);
  return json({ ok: true });
});
