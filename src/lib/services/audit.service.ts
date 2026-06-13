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

// ─── Listado paginado y filtrado (vista de auditoría) ────────────────────────

export async function listAuditLogs(params: {
  action?: string;
  entityType?: string;
  page?: number;
  limit?: number;
}) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 50;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (params.action) conditions.push(eq(auditLogs.action, params.action));
  if (params.entityType) conditions.push(eq(auditLogs.entityType, params.entityType));
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, countRows] = await Promise.all([
    db.query.auditLogs.findMany({
      where,
      with: { user: { columns: { id: true, name: true, email: true } } },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit,
      offset,
    }),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(auditLogs)
      .where(where),
  ]);

  const total = countRows[0]?.count ?? 0;

  const data: AuditLogRow[] = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user?.name ?? null,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    oldValue: r.oldValue as Record<string, unknown> | null,
    newValue: r.newValue as Record<string, unknown> | null,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
  }));

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ─── Actividad de un afiliado (timeline del legajo) ──────────────────────────
// Reúne los eventos del propio afiliado + de sus beneficios + de sus cuotas.

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
