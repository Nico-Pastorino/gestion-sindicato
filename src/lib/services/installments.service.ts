import { db } from "@/lib/db";
import { installments, auditLogs } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { checkAndFinishBenefit } from "./benefits.service";
import type { PayInstallmentInput, InstallmentFiltersInput } from "@/lib/validations/installment.schema";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";

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
      .set({ status: "paid", paidDate })
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

// ─── Listar cuotas con filtros (parametrizado, sin SQL injection) ─────────────

export async function listInstallments(input: InstallmentFiltersInput) {
  const { affiliateId, benefitId, status, month, year, area, page, limit } = input;
  const offset = (page - 1) * limit;

  // Construimos con sql tagged template para parametrización segura
  let baseWhere = sql`1=1`;

  if (affiliateId) baseWhere = sql`${baseWhere} AND i.affiliate_id = ${affiliateId}`;
  if (benefitId) baseWhere = sql`${baseWhere} AND i.benefit_id = ${benefitId}`;
  if (status) baseWhere = sql`${baseWhere} AND i.status = ${status}`;
  if (month) baseWhere = sql`${baseWhere} AND EXTRACT(MONTH FROM i.due_date) = ${month}`;
  if (year) baseWhere = sql`${baseWhere} AND EXTRACT(YEAR FROM i.due_date) = ${year}`;
  if (area) baseWhere = sql`${baseWhere} AND a.area ILIKE ${'%' + area + '%'}`;

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

// ─── Proceso automático de pago mensual (cron) ────────────────────────────────
//
// Lógica:
//   Cada 1° del mes, las cuotas con due_date <= último día del mes anterior
//   se consideran retenidas en los haberes y se marcan como pagadas.
//
// Idempotente: solo toca cuotas con status pending u overdue.
// Si ya está pagada, no la modifica.

export interface AutoPayResult {
  processedDate: string;
  cutoffDate: string;
  installmentsMarkedAsPaid: number;
  benefitsFinished: number;
  alertsCreated: number;
}

export async function markDueInstallmentsAsPaid(
  processDate: Date = new Date()
): Promise<AutoPayResult> {
  const processedDate = toISODate(processDate);
  const cutoffDate = getCutoffDateForAutoPayment(processDate);

  // Buscar cuotas a pagar (solo pending y overdue, con due_date ya vencida)
  const toMark = await db
    .select({ id: installments.id, benefitId: installments.benefitId })
    .from(installments)
    .where(
      and(
        inArray(installments.status, ["pending", "overdue"]),
        lte(installments.dueDate, cutoffDate)
      )
    );

  if (toMark.length === 0) {
    return { processedDate, cutoffDate, installmentsMarkedAsPaid: 0, benefitsFinished: 0, alertsCreated: 0 };
  }

  const ids = toMark.map((i) => i.id);
  const benefitIds = [...new Set(toMark.map((i) => i.benefitId))];

  // Actualizar en bulk + auditoría en una transacción
  await db.transaction(async (tx) => {
    // Bulk update
    await tx
      .update(installments)
      .set({
        status: "paid",
        paidDate: processedDate,
        autoPaid: true,
        paidBy: "system",
      })
      .where(inArray(installments.id, ids));

    // Auditoría por cada cuota marcada
    for (const inst of toMark) {
      await tx.insert(auditLogs).values({
        userId: null,
        action: "installment_paid",
        entityType: "installment",
        entityId: inst.id,
        newValue: {
          status: "paid",
          paidDate: processedDate,
          autoPaid: true,
          paidBy: "system",
          source: "cron",
        } as Record<string, unknown>,
      });
    }
  });

  // Verificar beneficios que podrían haber finalizado
  let benefitsFinished = 0;
  for (const benefitId of benefitIds) {
    const finished = await checkAndFinishBenefit(benefitId);
    if (finished) benefitsFinished++;
  }

  return {
    processedDate,
    cutoffDate,
    installmentsMarkedAsPaid: toMark.length,
    benefitsFinished,
    alertsCreated: benefitsFinished, // cada beneficio finalizado genera alerta WhatsApp
  };
}
