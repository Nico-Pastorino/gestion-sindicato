import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import type { AuditAction } from "@/types";

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
    conditions.push(`entity_type = '${entityType}'`);
  }
  if (entityId) {
    conditions.push(`entity_id = '${entityId}'`);
  }
  if (action) {
    conditions.push(`action = '${action}'`);
  }

  return db.query.auditLogs.findMany({
    with: { user: { columns: { id: true, name: true, email: true } } },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit,
    offset,
  });
}
