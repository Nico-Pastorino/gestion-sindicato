import { db } from "@/lib/db";
import { benefits, installments, auditLogs } from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { checkAndFinishBenefit } from "./benefits.service";
import type { PayInstallmentInput, InstallmentFiltersInput, BulkUnpayInput } from "@/lib/validations/installment.schema";
import { UNCOLLECTED_REASONS } from "@/lib/validations/installment.schema";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { getCutoffDateForAutoPayment } from "@/lib/utils/date";

// ─── Marcar cuota como pagada ─────────────────────────────────────────────────

export async function payInstallment(input: PayInstallmentInput, userId?: string) {
  const existing = await db.query.installments.findFirst({
    where: eq(installments.id, input.id),
    with: {
      affiliate: { columns: { id: true, fullName: true, dni: true } },
      benefit: { columns: { id: true, status: true } },
    },
  });

  if (!existing) throw new Error("Cuota no encontrada");
  if (existing.status === "paid") throw new Error("La cuota ya está pagada");
  if (existing.status === "cancelled") throw new Error("La cuota está cancelada");

  const paidDate = input.paidDate ?? new Date().toISOString().split("T")[0];

  await db.transaction(async (tx) => {
    await tx
      .update(installments)
      .set({ status: "paid", paidDate, autoPaid: false, paidBy: "operator" })
      .where(eq(installments.id, input.id));

    await tx.insert(auditLogs).values({
      userId: userId ?? null,
      action: "installment_paid",
      entityType: "installment",
      entityId: input.id,
      oldValue: { status: existing.status, paidDate: existing.paidDate } as Record<string, unknown>,
      newValue: { status: "paid", paidDate } as Record<string, unknown>,
    });
  });

  await checkAndFinishBenefit(existing.benefitId, userId);

  return { ...existing, status: "paid" as const, paidDate };
}

// ─── Revertir cuota pagada a no cobrada ──────────────────────────────────────

export async function unpayInstallment(id: string, userId?: string) {
  const existing = await db.query.installments.findFirst({
    where: eq(installments.id, id),
    with: {
      benefit: { columns: { id: true, status: true } },
    },
  });

  if (!existing) throw new Error("Cuota no encontrada");
  if (existing.status !== "paid") throw new Error("La cuota no está pagada");
  if (existing.benefit?.status === "cancelled") {
    throw new Error("No se puede modificar una cuota de un beneficio cancelado");
  }

  const today = new Date().toISOString().split("T")[0];
  const nextStatus = existing.dueDate < today ? "overdue" : "pending";

  await db.transaction(async (tx) => {
    await tx
      .update(installments)
      .set({
        status: nextStatus,
        paidDate: null,
        autoPaid: false,
        paidBy: null,
      })
      .where(eq(installments.id, id));

    if (existing.benefit?.status === "finished") {
      await tx
        .update(benefits)
        .set({ status: "active" })
        .where(eq(benefits.id, existing.benefitId));

      await tx.insert(auditLogs).values({
        userId: userId ?? null,
        action: "benefit_updated",
        entityType: "benefit",
        entityId: existing.benefitId,
        oldValue: { status: "finished", reason: "installment_unpaid" } as Record<string, unknown>,
        newValue: { status: "active", reason: "installment_unpaid" } as Record<string, unknown>,
      });
    }

    await tx.insert(auditLogs).values({
      userId: userId ?? null,
      action: "installment_unpaid",
      entityType: "installment",
      entityId: id,
      oldValue: {
        status: existing.status,
        paidDate: existing.paidDate,
        autoPaid: existing.autoPaid,
        paidBy: existing.paidBy,
        benefitStatus: existing.benefit?.status,
      } as Record<string, unknown>,
      newValue: {
        status: nextStatus,
        paidDate: null,
        autoPaid: false,
        paidBy: null,
        benefitStatus: existing.benefit?.status === "finished" ? "active" : existing.benefit?.status,
      } as Record<string, unknown>,
    });
  });

  return { ...existing, status: nextStatus, paidDate: null, autoPaid: false, paidBy: null };
}

// ─── Conciliación masiva: revertir varias cuotas con un motivo ───────────────
// Para el flujo del día 5: la municipalidad informa qué NO retuvo y se revierten
// en lote esas cuotas auto-cobradas, dejando asentado el motivo.

export async function bulkUnpayInstallments(input: BulkUnpayInput, userId?: string) {
  const reasonLabel = UNCOLLECTED_REASONS[input.reason];
  const reasonText = input.note ? `${reasonLabel} — ${input.note}` : reasonLabel;
  const today = new Date().toISOString().split("T")[0];
  const uncollectedAt = new Date();

  const rows = await db
    .select({
      id: installments.id,
      benefitId: installments.benefitId,
      dueDate: installments.dueDate,
      status: installments.status,
      paidDate: installments.paidDate,
      autoPaid: installments.autoPaid,
      paidBy: installments.paidBy,
      benefitStatus: benefits.status,
    })
    .from(installments)
    .innerJoin(benefits, eq(benefits.id, installments.benefitId))
    .where(inArray(installments.id, input.ids));

  // Solo se pueden revertir cuotas pagadas de beneficios no cancelados.
  const eligible = rows.filter(
    (r) => r.status === "paid" && r.benefitStatus !== "cancelled"
  );
  const skipped = rows.length - eligible.length;

  if (eligible.length === 0) {
    return { reverted: 0, skipped: input.ids.length, reason: reasonText };
  }

  await db.transaction(async (tx) => {
    for (const row of eligible) {
      const nextStatus = row.dueDate < today ? "overdue" : "pending";

      await tx
        .update(installments)
        .set({
          status: nextStatus,
          paidDate: null,
          autoPaid: false,
          paidBy: null,
          uncollectedReason: reasonText,
          uncollectedAt,
        })
        .where(eq(installments.id, row.id));

      if (row.benefitStatus === "finished") {
        await tx
          .update(benefits)
          .set({ status: "active" })
          .where(eq(benefits.id, row.benefitId));
      }

      await tx.insert(auditLogs).values({
        userId: userId ?? null,
        action: "installment_unpaid",
        entityType: "installment",
        entityId: row.id,
        oldValue: {
          status: row.status,
          paidDate: row.paidDate,
          autoPaid: row.autoPaid,
          paidBy: row.paidBy,
        } as Record<string, unknown>,
        newValue: {
          status: nextStatus,
          paidDate: null,
          autoPaid: false,
          paidBy: null,
          uncollectedReason: reasonText,
          source: "bulk_reconciliation",
        } as Record<string, unknown>,
      });
    }
  });

  const benefitIds = [...new Set(eligible.map((r) => r.benefitId))];
  for (const benefitId of benefitIds) {
    await checkAndFinishBenefit(benefitId);
  }

  return { reverted: eligible.length, skipped, reason: reasonText };
}

// ─── Listar cuotas auto-cobradas (para conciliación) ─────────────────────────
// Cuotas marcadas como pagadas por el cron (auto_paid=true), filtrables por el
// mes en que se registró el cobro (paid_date). Por defecto el mes corriente.

export interface AutoPaidInstallmentRow {
  id: string;
  benefitId: string;
  affiliateId: string;
  affiliateName: string;
  affiliateDni: string;
  affiliateLegajo: string | null;
  affiliateArea: string | null;
  benefitType: string;
  commerce: string | null;
  installmentNumber: number;
  totalInstallments: number;
  dueDate: string;
  paidDate: string | null;
  amount: string;
}

export async function listAutoPaidInstallments(params: {
  month?: number;
  year?: number;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 50;
  const offset = (page - 1) * limit;

  let where = sql`i.auto_paid = true AND i.status = 'paid'`;
  if (params.month && params.year) {
    where = sql`${where} AND EXTRACT(MONTH FROM i.paid_date) = ${params.month} AND EXTRACT(YEAR FROM i.paid_date) = ${params.year}`;
  }
  if (params.search) {
    where = sql`${where} AND (
      a.full_name ILIKE ${"%" + params.search + "%"}
      OR a.dni ILIKE ${"%" + params.search + "%"}
      OR a.legajo ILIKE ${"%" + params.search + "%"}
    )`;
  }

  const [rows, countResult, totalsResult] = await Promise.all([
    db.execute(sql`
      SELECT
        i.id,
        i.benefit_id        AS "benefitId",
        i.affiliate_id      AS "affiliateId",
        a.full_name         AS "affiliateName",
        a.dni               AS "affiliateDni",
        a.legajo            AS "affiliateLegajo",
        a.area              AS "affiliateArea",
        b.type              AS "benefitType",
        b.commerce,
        i.installment_number AS "installmentNumber",
        i.total_installments AS "totalInstallments",
        i.due_date          AS "dueDate",
        i.paid_date         AS "paidDate",
        i.amount
      FROM installments i
      JOIN affiliates a ON a.id = i.affiliate_id
      JOIN benefits   b ON b.id = i.benefit_id
      WHERE ${where}
      ORDER BY a.full_name ASC, i.due_date ASC
      LIMIT ${limit} OFFSET ${offset}
    `),
    db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM installments i
      JOIN affiliates a ON a.id = i.affiliate_id
      WHERE ${where}
    `),
    db.execute(sql`
      SELECT COALESCE(SUM(i.amount::numeric), 0) AS total
      FROM installments i
      JOIN affiliates a ON a.id = i.affiliate_id
      WHERE ${where}
    `),
  ]);

  const total = (countResult.rows[0] as { count: number })?.count ?? 0;

  return {
    data: rows.rows as unknown as AutoPaidInstallmentRow[],
    total,
    totalAmount: Number((totalsResult.rows[0] as { total: string })?.total ?? 0),
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ─── Marcar cuotas como pagadas automáticamente ──────────────────────────────

export async function autoPayDueInstallments(processDate = new Date()) {
  const cutoffDate = getCutoffDateForAutoPayment(processDate);
  const paidDate = processDate.toISOString().split("T")[0];

  const updated = await db.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: installments.id,
        benefitId: installments.benefitId,
        previousStatus: installments.status,
        dueDate: installments.dueDate,
        amount: installments.amount,
      })
      .from(installments)
      .where(
        and(
          inArray(installments.status, ["pending", "overdue"]),
          sql`${installments.dueDate} <= ${cutoffDate}`
        )
      );

    if (rows.length === 0) return rows;

    await tx
      .update(installments)
      .set({
        status: "paid",
        paidDate,
        autoPaid: true,
        paidBy: "system",
      })
      .where(inArray(installments.id, rows.map((row) => row.id)));

    await tx.insert(auditLogs).values(
      rows.map((row) => ({
        userId: null,
        action: "installment_auto_paid",
        entityType: "installment",
        entityId: row.id,
        oldValue: {
          status: row.previousStatus,
          dueDate: row.dueDate,
          amount: row.amount,
        } as Record<string, unknown>,
        newValue: {
          status: "paid",
          paidDate,
          autoPaid: true,
          paidBy: "system",
          cutoffDate,
        } as Record<string, unknown>,
      }))
    );

    return rows;
  });

  const benefitIds = [...new Set(updated.map((row) => row.benefitId))];
  for (const benefitId of benefitIds) {
    await checkAndFinishBenefit(benefitId);
  }

  return {
    processedAt: paidDate,
    cutoffDate,
    updatedCount: updated.length,
    benefitIds,
  };
}

// ─── Listar cuotas con filtros (parametrizado, sin SQL injection) ─────────────

export async function listInstallments(input: InstallmentFiltersInput) {
  const { affiliateId, benefitId, status, month, year, area, search, page, limit } = input;
  const offset = (page - 1) * limit;

  // Construimos con sql tagged template para parametrización segura
  let baseWhere = sql`1=1`;

  if (affiliateId) baseWhere = sql`${baseWhere} AND i.affiliate_id = ${affiliateId}`;
  if (benefitId) baseWhere = sql`${baseWhere} AND i.benefit_id = ${benefitId}`;
  if (status === "unpaid") {
    baseWhere = sql`${baseWhere} AND i.status IN ('pending', 'overdue')`;
  } else if (status) {
    baseWhere = sql`${baseWhere} AND i.status = ${status}`;
  }
  if (month) baseWhere = sql`${baseWhere} AND EXTRACT(MONTH FROM i.due_date) = ${month}`;
  if (year) baseWhere = sql`${baseWhere} AND EXTRACT(YEAR FROM i.due_date) = ${year}`;
  if (area) baseWhere = sql`${baseWhere} AND a.area ILIKE ${'%' + area + '%'}`;
  if (search) {
    baseWhere = sql`${baseWhere} AND (
      a.full_name ILIKE ${'%' + search + '%'}
      OR a.dni ILIKE ${'%' + search + '%'}
      OR a.legajo ILIKE ${'%' + search + '%'}
    )`;
  }

  const [rows, countResult] = await Promise.all([
    db.execute(sql`
      SELECT
        i.id,
        i.benefit_id        AS "benefitId",
        i.affiliate_id      AS "affiliateId",
        a.full_name         AS "affiliateName",
        a.dni               AS "affiliateDni",
        a.legajo            AS "affiliateLegajo",
        a.area              AS "affiliateArea",
        b.commerce,
        b.type              AS "benefitType",
        i.installment_number AS "installmentNumber",
        i.total_installments AS "totalInstallments",
        i.due_date          AS "dueDate",
        i.paid_date         AS "paidDate",
        i.amount,
        i.status,
        i.auto_paid         AS "autoPaid",
        i.paid_by           AS "paidBy",
        i.uncollected_reason AS "uncollectedReason",
        i.created_at        AS "createdAt",
        i.updated_at        AS "updatedAt"
      FROM installments i
      JOIN affiliates a ON a.id = i.affiliate_id
      JOIN benefits   b ON b.id = i.benefit_id
      WHERE ${baseWhere}
      ORDER BY i.due_date ASC, a.full_name ASC
      LIMIT ${limit} OFFSET ${offset}
    `),
    db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM installments i
      JOIN affiliates a ON a.id = i.affiliate_id
      JOIN benefits   b ON b.id = i.benefit_id
      WHERE ${baseWhere}
    `),
  ]);

  return {
    data: rows.rows,
    total: (countResult.rows[0] as { count: number })?.count ?? 0,
    page,
    limit,
    totalPages: Math.ceil(((countResult.rows[0] as { count: number })?.count ?? 0) / limit),
  };
}

// ─── Marcar cuotas vencidas automáticamente ───────────────────────────────────

export async function markOverdueInstallments() {
  const today = new Date().toISOString().split("T")[0];

  const result = await db
    .update(installments)
    .set({ status: "overdue" })
    .where(and(eq(installments.status, "pending"), sql`due_date < ${today}`))
    .returning({ id: installments.id });

  return result.length;
}

// ─── Resumen de cobranzas (cuotas no cobradas) ───────────────────────────────

export interface CollectionsSummary {
  pendingCount: number;
  overdueCount: number;
  pendingTotal: number;
  overdueTotal: number;
  affiliatesCount: number;
  oldestDueDate: string | null;
}

/**
 * Resumen de cuotas pendientes/vencidas. Si se pasa mes/año filtra por
 * vencimiento en ese mes; si no, considera todas las no cobradas.
 */
export async function getCollectionsSummary(
  month?: number,
  year?: number
): Promise<CollectionsSummary> {
  let where = sql`i.status IN ('pending', 'overdue')`;
  if (month && year) {
    where = sql`${where} AND EXTRACT(MONTH FROM i.due_date) = ${month} AND EXTRACT(YEAR FROM i.due_date) = ${year}`;
  }

  const result = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE i.status = 'pending')::int AS pending_count,
      COUNT(*) FILTER (WHERE i.status = 'overdue')::int AS overdue_count,
      COALESCE(SUM(i.amount::numeric) FILTER (WHERE i.status = 'pending'), 0) AS pending_total,
      COALESCE(SUM(i.amount::numeric) FILTER (WHERE i.status = 'overdue'), 0) AS overdue_total,
      COUNT(DISTINCT i.affiliate_id)::int AS affiliates_count,
      MIN(i.due_date) AS oldest_due_date
    FROM installments i
    WHERE ${where}
  `);

  const row = result.rows[0] as {
    pending_count: number; overdue_count: number;
    pending_total: string; overdue_total: string;
    affiliates_count: number; oldest_due_date: string | null;
  };

  return {
    pendingCount: row?.pending_count ?? 0,
    overdueCount: row?.overdue_count ?? 0,
    pendingTotal: Number(row?.pending_total ?? 0),
    overdueTotal: Number(row?.overdue_total ?? 0),
    affiliatesCount: row?.affiliates_count ?? 0,
    oldestDueDate: row?.oldest_due_date ?? null,
  };
}

// ─── Resumen de cuotas por mes ────────────────────────────────────────────────

export async function getInstallmentsSummaryByMonth(year: number, month: number) {
  const monthDate = new Date(year, month - 1, 1);
  const mStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
  const mEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");

  const result = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending')   AS pending_count,
      COUNT(*) FILTER (WHERE status = 'paid')      AS paid_count,
      COUNT(*) FILTER (WHERE status = 'overdue')   AS overdue_count,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_count,
      COALESCE(SUM(amount) FILTER (WHERE status IN ('pending','overdue')), 0) AS total_pending,
      COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS total_paid
    FROM installments
    WHERE due_date BETWEEN ${mStart} AND ${mEnd}
  `);

  return result.rows[0];
}
