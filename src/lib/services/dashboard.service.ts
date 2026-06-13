import { db } from "@/lib/db";
import { affiliates, benefits } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { roundMoney } from "@/lib/utils/currency";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  capitalDelivered: number;
  totalToCollect: number;
  estimatedProfit: number;
  collectedProfit: number;
  pendingProfit: number;
  pendingToCollect: number;
  paidAmount: number;
  benefitsCount: number;
  pendingInstallmentsCount: number;
  paidInstallmentsCount: number;
  overdueInstallmentsCount: number;
}

export interface PendingInstallmentRow {
  id: string;
  affiliateId: string;
  fullName: string;
  dni: string;
  legajo: string | null;
  benefitType: string;
  commerce: string | null;
  installmentNumber: number;
  totalInstallments: number;
  amount: string;
  dueDate: string;
  status: string;
}

export interface MonthlyHistoryRow {
  month: string;
  monthLabel: string;
  capitalDelivered: number;
  estimatedProfit: number;
  collectedProfit: number;
  pendingProfit: number;
  paidAmount: number;
  pendingToCollect: number;
  benefitsCount: number;
}

export interface DashboardGlobals {
  totalAffiliates: number;
  activeBenefits: number;
  finishedBenefits: number;
  affiliatesWithoutCredit: number;
}

export interface BenefitTypeSlice {
  type: string;
  count: number;
  totalAmount: number;
}

export interface CommerceSlice {
  commerce: string;
  count: number;
  totalAmount: number;
}

export interface DashboardBreakdowns {
  byType: BenefitTypeSlice[];
  byCommerce: CommerceSlice[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function monthBounds(month: number, year: number) {
  const d = new Date(year, month - 1, 1);
  return {
    start: format(startOfMonth(d), "yyyy-MM-dd"),
    end: format(endOfMonth(d), "yyyy-MM-dd"),
  };
}

// ─── Resumen financiero del período ──────────────────────────────────────────

export async function getDashboardSummary(
  month: number,
  year: number
): Promise<DashboardSummary> {
  const { start, end } = monthBounds(month, year);

  // Benefits del período con agregados de cuotas
  const rows = await db.execute(sql`
    SELECT
      b.total_amount::numeric           AS capital,
      b.total_repayment_amount::numeric AS total_repayment,
      b.interest_amount::numeric        AS interest,
      b.installments_count              AS installments_count,
      COALESCE(COUNT(i.id) FILTER (WHERE i.status = 'paid'), 0)::int           AS paid_count,
      COALESCE(COUNT(i.id) FILTER (WHERE i.status IN ('pending','overdue')), 0)::int AS pending_count,
      COALESCE(COUNT(i.id) FILTER (WHERE i.status = 'overdue'), 0)::int        AS overdue_count,
      COALESCE(SUM(i.amount::numeric) FILTER (WHERE i.status = 'paid'), 0)     AS paid_amount,
      COALESCE(SUM(i.amount::numeric) FILTER (WHERE i.status IN ('pending','overdue')), 0) AS pending_amount
    FROM benefits b
    LEFT JOIN installments i ON i.benefit_id = b.id
    WHERE b.date BETWEEN ${start} AND ${end}
      AND b.status != 'cancelled'
    GROUP BY b.id, b.total_amount, b.total_repayment_amount, b.interest_amount, b.installments_count
  `);

  type BRow = {
    capital: string; total_repayment: string; interest: string;
    installments_count: number; paid_count: number; pending_count: number;
    overdue_count: number; paid_amount: string; pending_amount: string;
  };

  const benefitRows = rows.rows as BRow[];

  let capitalDelivered = 0, totalToCollect = 0, estimatedProfit = 0;
  let collectedProfit = 0, paidAmount = 0, pendingToCollect = 0;
  let pendingInstallmentsCount = 0, paidInstallmentsCount = 0, overdueInstallmentsCount = 0;

  for (const b of benefitRows) {
    const capital = Number(b.capital);
    const totalRepayment = Number(b.total_repayment);
    const interest = Number(b.interest);
    const count = b.installments_count || 1;
    const interestPerInstallment = interest / count;

    capitalDelivered += capital;
    totalToCollect += totalRepayment;
    estimatedProfit += interest;
    collectedProfit += b.paid_count * interestPerInstallment;
    paidAmount += Number(b.paid_amount);
    pendingToCollect += Number(b.pending_amount);
    pendingInstallmentsCount += b.pending_count;
    paidInstallmentsCount += b.paid_count;
    overdueInstallmentsCount += b.overdue_count;
  }

  const pendingProfit = roundMoney(estimatedProfit - collectedProfit);

  return {
    capitalDelivered: roundMoney(capitalDelivered),
    totalToCollect: roundMoney(totalToCollect),
    estimatedProfit: roundMoney(estimatedProfit),
    collectedProfit: roundMoney(collectedProfit),
    pendingProfit,
    pendingToCollect: roundMoney(pendingToCollect),
    paidAmount: roundMoney(paidAmount),
    benefitsCount: benefitRows.length,
    pendingInstallmentsCount,
    paidInstallmentsCount,
    overdueInstallmentsCount,
  };
}

// ─── Cuotas pendientes / vencidas del período (due_date en el mes) ────────────

export async function getPendingInstallmentsForPeriod(
  month: number,
  year: number,
  limit = 50
): Promise<PendingInstallmentRow[]> {
  const { start, end } = monthBounds(month, year);

  const result = await db.execute(sql`
    SELECT
      i.id,
      a.id              AS affiliate_id,
      a.full_name       AS full_name,
      a.dni,
      a.legajo,
      b.type            AS benefit_type,
      b.commerce,
      i.installment_number,
      i.total_installments,
      i.amount,
      i.due_date,
      i.status
    FROM installments i
    JOIN benefits   b ON b.id = i.benefit_id
    JOIN affiliates a ON a.id = i.affiliate_id
    WHERE i.status IN ('pending', 'overdue')
      AND i.due_date BETWEEN ${start} AND ${end}
    ORDER BY i.status DESC, i.due_date ASC, a.full_name ASC
    LIMIT ${limit}
  `);

  type RR = {
    id: string; affiliate_id: string; full_name: string; dni: string;
    legajo: string | null; benefit_type: string; commerce: string | null;
    installment_number: number; total_installments: number;
    amount: string; due_date: string; status: string;
  };

  return (result.rows as RR[]).map((r) => ({
    id: r.id, affiliateId: r.affiliate_id, fullName: r.full_name,
    dni: r.dni, legajo: r.legajo, benefitType: r.benefit_type,
    commerce: r.commerce, installmentNumber: r.installment_number,
    totalInstallments: r.total_installments, amount: r.amount,
    dueDate: r.due_date, status: r.status,
  }));
}

// ─── Historial mensual (últimos N meses) ─────────────────────────────────────

export async function getMonthlyHistory(monthsBack = 6): Promise<MonthlyHistoryRow[]> {
  const results: MonthlyHistoryRow[] = [];
  const now = new Date();

  for (let i = 0; i < monthsBack; i++) {
    const d = subMonths(now, i);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const { start, end } = monthBounds(m, y);

    const rows = await db.execute(sql`
      SELECT
        b.total_amount::numeric           AS capital,
        b.interest_amount::numeric        AS interest,
        b.installments_count,
        COALESCE(COUNT(i.id) FILTER (WHERE i.status = 'paid'), 0)::int  AS paid_count,
        COALESCE(SUM(i.amount::numeric) FILTER (WHERE i.status = 'paid'), 0) AS paid_amount,
        COALESCE(SUM(i.amount::numeric) FILTER (WHERE i.status IN ('pending','overdue')), 0) AS pending_amount
      FROM benefits b
      LEFT JOIN installments i ON i.benefit_id = b.id
      WHERE b.date BETWEEN ${start} AND ${end}
        AND b.status != 'cancelled'
      GROUP BY b.id, b.total_amount, b.interest_amount, b.installments_count
    `);

    type HR = {
      capital: string; interest: string; installments_count: number;
      paid_count: number; paid_amount: string; pending_amount: string;
    };

    let capitalDelivered = 0, estimatedProfit = 0, collectedProfit = 0;
    let paidAmount = 0, pendingToCollect = 0;

    for (const b of rows.rows as HR[]) {
      const interest = Number(b.interest);
      const count = b.installments_count || 1;
      capitalDelivered += Number(b.capital);
      estimatedProfit += interest;
      collectedProfit += b.paid_count * (interest / count);
      paidAmount += Number(b.paid_amount);
      pendingToCollect += Number(b.pending_amount);
    }

    results.push({
      month: `${y}-${String(m).padStart(2, "0")}`,
      monthLabel: format(d, "MMMM yyyy", { locale: es }),
      capitalDelivered: roundMoney(capitalDelivered),
      estimatedProfit: roundMoney(estimatedProfit),
      collectedProfit: roundMoney(collectedProfit),
      pendingProfit: roundMoney(estimatedProfit - collectedProfit),
      paidAmount: roundMoney(paidAmount),
      pendingToCollect: roundMoney(pendingToCollect),
      benefitsCount: rows.rows.length,
    });
  }

  return results;
}

// ─── Desglose para gráficos: por tipo y por comercio ──────────────────────────

export async function getBenefitBreakdowns(
  month: number,
  year: number
): Promise<DashboardBreakdowns> {
  const { start, end } = monthBounds(month, year);

  const [typeRows, commerceRows] = await Promise.all([
    db.execute(sql`
      SELECT
        type,
        COUNT(*)::int AS count,
        COALESCE(SUM(total_amount::numeric), 0) AS total
      FROM benefits
      WHERE date BETWEEN ${start} AND ${end}
        AND status != 'cancelled'
      GROUP BY type
      ORDER BY total DESC
    `),
    db.execute(sql`
      SELECT
        COALESCE(NULLIF(TRIM(commerce), ''), 'Sin comercio') AS commerce,
        COUNT(*)::int AS count,
        COALESCE(SUM(total_amount::numeric), 0) AS total
      FROM benefits
      WHERE date BETWEEN ${start} AND ${end}
        AND status != 'cancelled'
      GROUP BY 1
      ORDER BY total DESC
      LIMIT 6
    `),
  ]);

  type Row = { type?: string; commerce?: string; count: number; total: string };

  return {
    byType: (typeRows.rows as Row[]).map((r) => ({
      type: r.type ?? "otro",
      count: r.count,
      totalAmount: roundMoney(Number(r.total)),
    })),
    byCommerce: (commerceRows.rows as Row[]).map((r) => ({
      commerce: r.commerce ?? "Sin comercio",
      count: r.count,
      totalAmount: roundMoney(Number(r.total)),
    })),
  };
}

// ─── Datos globales (no dependen del período) ─────────────────────────────────

export async function getDashboardGlobals(): Promise<DashboardGlobals> {
  const [totalAff, activeBen, finishedBen, noCredit] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(affiliates).where(eq(affiliates.status, "active")),
    db.select({ count: sql<number>`count(*)::int` }).from(benefits).where(eq(benefits.status, "active")),
    db.select({ count: sql<number>`count(*)::int` }).from(benefits).where(eq(benefits.status, "finished")),
    db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM affiliate_credit_summary
      WHERE available_amount <= 0 AND gross_salary IS NOT NULL AND status = 'active'
    `),
  ]);

  return {
    totalAffiliates: totalAff[0]?.count ?? 0,
    activeBenefits: activeBen[0]?.count ?? 0,
    finishedBenefits: finishedBen[0]?.count ?? 0,
    affiliatesWithoutCredit: (noCredit.rows[0] as { count: number })?.count ?? 0,
  };
}
