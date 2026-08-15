import { auditLogs } from "@/db/schema";
import { db } from "@/lib/db";

export type AuditMetadata = Record<string, unknown>;

/**
 * Append-only audit trail (PRD §11): never updated, never deleted.
 * Action vocabulary: request.create, request.update, request.delete,
 * request.status, request.assign, comment.create, org.create, org.update,
 * store.create, member.invite, member.remove, invitation.cancel.
 */
export async function audit(input: {
  orgId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: AuditMetadata;
}) {
  await db.insert(auditLogs).values({
    orgId: input.orgId ?? null,
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });
}
