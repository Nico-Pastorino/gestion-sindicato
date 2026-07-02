import { db } from "@/lib/db";
// Importación estática — no usar dynamic import() dentro de transacciones
import { benefits, installments, auditLogs } from "@/lib/db/schema";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import { notifyBenefitCompleted } from "./whatsapp.service";
import { getAffiliateCreditSummary } from "./affiliates.service";
import { generateInstallmentDueDates } from "@/lib/utils/date";
import { roundMoney, formatCurrencyARS } from "@/lib/utils/currency";
import type { CreateBenefitInput, CancelBenefitInput, BenefitFiltersInput, MonthlyConflict, CreditProjectionResult } from "@/lib/validations/benefit.schema";
import { format, addMonths, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

// ─── Tipos ────────────────────────────────────────────────────────────────────

class CreditLimitError extends Error {
  constructor(
    message: string,
    public readonly details: {
      conflicts: MonthlyConflict[];
      creditLimit30: number;
      affiliateName?: string;
      grossSalary?: number;
      firstConflict?: MonthlyConflict;
    }
  ) {
    super(message);
    this.name = "CreditLimitError";
  }
}

// ─── Validación mensual acumulativa ──────────────────────────────────────────

export async function getMonthlyProjection(
  affiliateId: string,
  installmentAmount: number,
  installmentsCount: number,
  firstDueDate: string,
  grossSalary: number
): Promise<CreditProjectionResult> {
  const creditLimit30 = roundMoney(grossSalary * 0.30);
  const baseDate = parseISO(firstDueDate);
  const conflicts: MonthlyConflict[] = [];

  const months: CreditProjectionResult["months"] = [];

  for (let i = 0; i < installmentsCount; i++) {
    const monthDate = addMonths(baseDate, i);
    const mStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
    const mEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");

    const result = await db.execute(sql`
      SELECT COALESCE(SUM(amount), 0)::numeric AS total
      FROM installments
      WHERE affiliate_id = ${affiliateId}
        AND status IN ('pending', 'overdue')
        AND due_date BETWEEN ${mStart} AND ${mEnd}
    `);

    const existingDiscounts = roundMoney(Number((result.rows[0] as { total: string })?.total ?? 0));
    const projectedTotal = roundMoney(existingDiscounts + installmentAmount);
    const availableAfter = roundMoney(creditLimit30 - projectedTotal);
    const isOk = projectedTotal <= creditLimit30;

    const monthEntry = {
      month: format(monthDate, "yyyy-MM"),
      monthLabel: format(monthDate, "MMMM yyyy", { locale: es }),
      creditLimit30,
      activeDiscounts: existingDiscounts,
      newInstallment: installmentAmount,
      projectedTotal,
      availableAfter,
      ok: isOk,
    };

    months.push(monthEntry);

    if (!isOk) {
      conflicts.push({
        month: monthEntry.month,
        monthLabel: monthEntry.monthLabel,
        creditLimit30,
        activeDiscounts: existingDiscounts,
        newInstallment: installmentAmount,
        projectedTotal,
        availableBefore: roundMoney(creditLimit30 - existingDiscounts),
        availableAfter: roundMoney(creditLimit30 - projectedTotal),
        excess: roundMoney(projectedTotal - creditLimit30),
      });
    }
  }

  return { valid: conflicts.length === 0, creditLimit30, months, conflicts };
}

// ─── Crear beneficio con cuotas (transacción real) ────────────────────────────

export async function createBenefit(input: CreateBenefitInput, userId?: string) {
  // 1. Verificar que el afiliado existe y tiene salario
  const creditSummary = await getAffiliateCreditSummary(input.affiliateId);
  if (!creditSummary) {
    throw new Error("Afiliado no encontrado");
  }

  const grossSalary = Number(creditSummary.grossSalary);
  if (!grossSalary || grossSalary <= 0) {
    throw new Error("El afiliado no tiene salario bruto registrado. Actualizá el perfil antes de cargar un beneficio.");
  }

  // 2. Calcular fechas de cuotas automáticamente (regla día 20)
  const dueDates = generateInstallmentDueDates(input.date, input.installmentsCount);
  const calculatedFirstDueDate = dueDates[0];
  const creditLimit30 = roundMoney(grossSalary * 0.30);
  const affiliateName = creditSummary.fullName;

  // 3. Validación mensual acumulativa — USA LA FUNCIÓN SQL DIRECTA
  // Esto garantiza que el cálculo se hace contra el estado actual de la DB
  // en el momento exacto de la creación, evitando cualquier inconsistencia.
  const validationResult = await db.execute(sql`
    SELECT validate_monthly_credit(
      ${input.affiliateId}::uuid,
      ${String(input.installmentAmount)}::numeric,
      ${input.installmentsCount}::integer,
      ${calculatedFirstDueDate}::date
    ) AS conflicts
  `);

  const rawConflicts = (validationResult.rows[0] as { conflicts: Array<Record<string, unknown>> })?.conflicts ?? [];

  if (rawConflicts.length > 0) {
    const conflicts: MonthlyConflict[] = rawConflicts.map((c) => ({
      month: String(c.month ?? ""),
      monthLabel: String(c.monthLabel ?? c.month ?? ""),
      creditLimit30,
      activeDiscounts: roundMoney(Number(c.activeDiscounts ?? 0)),
      newInstallment: roundMoney(Number(c.newInstallment ?? input.installmentAmount)),
      projectedTotal: roundMoney(Number(c.projectedTotal ?? 0)),
      availableBefore: roundMoney(creditLimit30 - Number(c.activeDiscounts ?? 0)),
      availableAfter: roundMoney(creditLimit30 - Number(c.projectedTotal ?? 0)),
      excess: roundMoney(Number(c.excess ?? 0)),
    }));

    const firstConflict = conflicts[0];
    const conflictMonths = conflicts.map((c) => c.monthLabel).join(", ");

    throw new CreditLimitError(
      `No se puede cargar este beneficio. En ${conflictMonths} supera el tope mensual del 30% (${formatCurrencyARS(creditLimit30)}).`,
      {
        conflicts,
        creditLimit30,
        affiliateName,
        grossSalary,
        firstConflict,
      }
    );
  }

  // 5. Calcular campos derivados de interés y retención comercial
  const totalRepaymentAmount = roundMoney(input.installmentAmount * input.installmentsCount);
  const interestAmount = roundMoney(Math.max(0, totalRepaymentAmount - input.totalAmount));
  const interestRate = input.totalAmount > 0
    ? roundMoney((interestAmount / input.totalAmount) * 100)
    : 0;
  const commerceRetentionRate = input.type === "supermercado"
    ? roundMoney(input.commerceRetentionRate ?? 0)
    : 0;
  const commerceRetentionAmount = input.type === "supermercado"
    ? roundMoney(input.totalAmount * (commerceRetentionRate / 100))
    : 0;
  const unionProfitAmount = roundMoney(interestAmount + commerceRetentionAmount);

  // 6. Transacción atómica: benefit + installments + audit
  const result = await db.transaction(async (tx) => {
    const [benefit] = await tx
      .insert(benefits)
      .values({
        affiliateId: input.affiliateId,
        date: input.date,
        type: input.type,
        commerce: input.commerce ?? null,
        totalAmount: String(input.totalAmount),
        installmentsCount: input.installmentsCount,
        installmentAmount: String(input.installmentAmount),
        totalRepaymentAmount: String(totalRepaymentAmount),
        interestAmount: String(interestAmount),
        interestRate: String(interestRate),
        commerceRetentionRate: String(commerceRetentionRate),
        unionProfitAmount: String(unionProfitAmount),
        firstDueDate: calculatedFirstDueDate,
        status: "active",
        observations: input.observations ?? null,
        createdBy: userId ?? null,
      })
      .returning();

    const installmentRows = dueDates.map((dueDate, index) => ({
      benefitId: benefit.id,
      affiliateId: input.affiliateId,
      installmentNumber: index + 1,
      totalInstallments: input.installmentsCount,
      dueDate,
      amount: String(input.installmentAmount),
      status: "pending" as const,
    }));

    const createdInstallments = await tx
      .insert(installments)
      .values(installmentRows)
      .returning();

    // Auditoría con importación estática
    await tx.insert(auditLogs).values({
      userId: userId ?? null,
      action: "benefit_created",
      entityType: "benefit",
      entityId: benefit.id,
      newValue: {
        benefitId: benefit.id,
        affiliateId: input.affiliateId,
        type: input.type,
        totalAmount: input.totalAmount,
        installmentAmount: input.installmentAmount,
        installmentsCount: input.installmentsCount,
        totalRepaymentAmount,
        interestAmount,
        interestRate,
        commerceRetentionRate,
        commerceRetentionAmount,
        unionProfitAmount,
      } as Record<string, unknown>,
    });

    return { benefit, installments: createdInstallments };
  });

  return result;
}

// ─── Cancelar beneficio ───────────────────────────────────────────────────────

export async function cancelBenefit(input: CancelBenefitInput, userId?: string) {
  const existing = await db.query.benefits.findFirst({
    where: eq(benefits.id, input.id),
  });

  if (!existing) throw new Error("Beneficio no encontrado");
  if (existing.status === "cancelled") throw new Error("El beneficio ya está cancelado");
  if (existing.status === "finished") throw new Error("No se puede cancelar un beneficio finalizado");

  await db.transaction(async (tx) => {
    await tx.update(benefits).set({ status: "cancelled" }).where(eq(benefits.id, input.id));

    await tx
      .update(installments)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(installments.benefitId, input.id),
          inArray(installments.status, ["pending", "overdue"])
        )
      );

    await tx.insert(auditLogs).values({
      userId: userId ?? null,
      action: "benefit_cancelled",
      entityType: "benefit",
      entityId: input.id,
      oldValue: { status: existing.status } as Record<string, unknown>,
      newValue: { status: "cancelled", reason: input.reason ?? null } as Record<string, unknown>,
    });
  });
}

// ─── Obtener beneficio por ID ─────────────────────────────────────────────────

export async function getBenefitById(id: string) {
  return db.query.benefits.findFirst({
    where: eq(benefits.id, id),
    with: {
      affiliate: true,
      installments: { orderBy: (t, { asc }) => [asc(t.installmentNumber)] },
      createdByUser: { columns: { id: true, name: true, email: true } },
    },
  });
}

// ─── Listar beneficios ────────────────────────────────────────────────────────

export async function listBenefits(input: BenefitFiltersInput) {
  const { affiliateId, type, status, dateFrom, dateTo, page, limit } = input;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (affiliateId) conditions.push(eq(benefits.affiliateId, affiliateId));
  if (type) conditions.push(eq(benefits.type, type));
  if (status) conditions.push(eq(benefits.status, status));
  if (dateFrom) conditions.push(gte(benefits.date, dateFrom));
  if (dateTo) conditions.push(lte(benefits.date, dateTo));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db.query.benefits.findMany({
      where: whereClause,
      with: { affiliate: { columns: { id: true, fullName: true, dni: true, area: true } } },
      orderBy: (t, { desc }) => [desc(t.date)],
      limit,
      offset,
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(benefits).where(whereClause),
  ]);

  return {
    data: rows,
    total: countResult[0]?.count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((countResult[0]?.count ?? 0) / limit),
  };
}

// ─── Verificar y finalizar beneficio si todas las cuotas están pagadas ────────

export async function checkAndFinishBenefit(benefitId: string, userId?: string): Promise<boolean> {
  const benefit = await db.query.benefits.findFirst({
    where: eq(benefits.id, benefitId),
    with: {
      installments: true,
      affiliate: { columns: { id: true, fullName: true, dni: true } },
    },
  });

  if (!benefit || benefit.status !== "active") return false;

  const allDone = benefit.installments.every(
    (i) => i.status === "paid" || i.status === "cancelled"
  );
  const hasPaid = benefit.installments.some((i) => i.status === "paid");
  if (!allDone || !hasPaid) return false;

  await db.transaction(async (tx) => {
    await tx.update(benefits).set({ status: "finished" }).where(eq(benefits.id, benefitId));

    await tx.insert(auditLogs).values({
      userId: userId ?? null,
      action: "benefit_updated",
      entityType: "benefit",
      entityId: benefitId,
      oldValue: { status: "active" } as Record<string, unknown>,
      newValue: { status: "finished" } as Record<string, unknown>,
    });
  });

  notifyBenefitCompleted({
    affiliateId: benefit.affiliateId,
    affiliateName: benefit.affiliate!.fullName,
    affiliateDni: benefit.affiliate!.dni,
    benefitId: benefit.id,
    benefitType: benefit.type as import("@/types").BenefitType,
    totalAmount: benefit.totalAmount,
    commerce: benefit.commerce,
  }).catch(console.error);

  return true;
}

// Re-export de CreditLimitError para usarlo en la API route
export { CreditLimitError };
