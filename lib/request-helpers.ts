import { and, eq, getTableColumns, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import {
  changeRequests,
  member,
  organization,
  stores,
  user,
} from "@/db/schema";
import { db } from "@/lib/db";
import { notFound } from "@/lib/http";

export const creator = alias(user, "creator");
export const assignee = alias(user, "assignee");

export type RequestWithJoins = NonNullable<Awaited<ReturnType<typeof getRequestById>>>;

export async function getRequestById(id: string) {
  const rows = await db
    .select({
      ...getTableColumns(changeRequests),
      orgName: organization.name,
      storeLabel: stores.label,
      storeDomain: stores.shopifyDomain,
      creatorName: creator.name,
      creatorEmail: creator.email,
      assigneeName: assignee.name,
    })
    .from(changeRequests)
    .leftJoin(creator, eq(changeRequests.createdBy, creator.id))
    .leftJoin(assignee, eq(changeRequests.assignedTo, assignee.id))
    .leftJoin(organization, eq(changeRequests.orgId, organization.id))
    .leftJoin(stores, eq(changeRequests.storeId, stores.id))
    .where(eq(changeRequests.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getRequestOrThrow(id: string): Promise<RequestWithJoins> {
  const row = await getRequestById(id);
  if (!row) throw notFound("Change request not found");
  return row;
}

/** Org staff (owner + admin roles) — notified of client activity. */
export async function getOrgStaff(orgId: string) {
  return db
    .select({ userId: member.userId, name: user.name, email: user.email })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(and(eq(member.organizationId, orgId), inArray(member.role, ["owner", "admin"])));
}

export async function getSuperAdminUsers() {
  return db
    .select({ userId: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.globalRole, "super_admin"));
}

export function serializeRequest(row: RequestWithJoins) {
  return {
    id: row.id,
    orgId: row.orgId,
    orgName: row.orgName,
    store: row.storeId
      ? { id: row.storeId, label: row.storeLabel, shopifyDomain: row.storeDomain }
      : null,
    title: row.title,
    description: row.description,
    type: row.type,
    priority: row.priority,
    status: row.status,
    referenceUrl: row.referenceUrl,
    targetSection: row.targetSection,
    dueDate: row.dueDate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
    creator: { id: row.createdBy, name: row.creatorName, email: row.creatorEmail },
    assignee: row.assignedTo
      ? { id: row.assignedTo, name: row.assigneeName }
      : null,
  };
}
