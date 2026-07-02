import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import type { AuditAction } from "@/types";
import type { AuditLogRow } from "@/lib/utils/audit-labels";

export type { AuditLogRow } from "@/lib/utils/audit-labels";

interface LogAuditParams {
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  await db.insert(auditLogs).values({
    userId: params.userId ?? null,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId ?? null,
    oldValue: params.oldValue ? (params.oldValue as Record<string, unknown>) : null,
    newValue: params.newValue ? (params.newValue as Record<string, unknown>) : null,
  });
}

export async function getAuditLogs(params: {
  entityType?: string;
  entityId?: string;
  action?: AuditAction;
  limit?: number;
  offset?: number;
}) {
  const { entityType, entityId, action, limit = 50, offset = 0 } = params;

  const conditions = [];

  if (entityType) {
    conditions.push(eq(auditLogs.entityType, entityType));
  }
  if (entityId) {
    conditions.push(eq(auditLogs.entityId, entityId));
  }
  if (action) {
    conditions.push(eq(auditLogs.action, action));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  return db.query.auditLogs.findMany({
    where,
    with: { user: { columns: { id: true, name: true, email: true } } },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit,
    offset,
  });
}

export async function getAffiliateActivity(
  affiliateId: string,
  limit = 60
): Promise<AuditLogRow[]> {
  const result = await db.execute(sql`
    SELECT
      al.id,
      al.user_id      AS "userId",
      u.name          AS "userName",
      al.action,
      al.entity_type  AS "entityType",
      al.entity_id    AS "entityId",
      al.old_value    AS "oldValue",
      al.new_value    AS "newValue",
      al.created_at   AS "createdAt"
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE
      (al.entity_type = 'affiliate' AND al.entity_id = ${affiliateId})
      OR (al.entity_type = 'benefit' AND al.entity_id IN (
        SELECT id FROM benefits WHERE affiliate_id = ${affiliateId}
      ))
      OR (al.entity_type = 'installment' AND al.entity_id IN (
        SELECT id FROM installments WHERE affiliate_id = ${affiliateId}
      ))
    ORDER BY al.created_at DESC
    LIMIT ${limit}
  `);

  return result.rows as unknown as AuditLogRow[];
}
