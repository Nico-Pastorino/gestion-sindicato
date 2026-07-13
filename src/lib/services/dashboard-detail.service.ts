import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { roundMoney } from "@/lib/utils/currency";
import { getBenefitTypeLabel } from "@/lib/utils/benefit-types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Alcance del detalle: mes elegido, año completo o todo el historial. */
export type MetricScope = "month" | "year" | "all";

function bounds(month: number, year: number) {
  const d = new Date(year, month - 1, 1);
  return {
    start: format(startOfMonth(d), "yyyy-MM-dd"),
    end: format(endOfMonth(d), "yyyy-MM-dd"),
  };
}

/** Filtro por fecha del beneficio según el alcance (siempre sobre el alias b). */
function benefitDateFilter(month: number, year: number, scope: MetricScope) {
  if (scope === "all") return sql`TRUE`;
  if (scope === "year") {
    return sql`b.date BETWEEN ${`${year}-01-01`} AND ${`${year}-12-31`}`;
  }
  const { start, end } = bounds(month, year);
  return sql`b.date BETWEEN ${start} AND ${end}`;
}

function byTypeAgg(rows: Array<{ type: string; amount: number; count: number }>) {
  const map = new Map<string, { label: string; amount: number; count: number }>();
  for (const r of rows) {
    const key = r.type;
    const existing = map.get(key);
    if (existing) {
      existing.amount = roundMoney(existing.amount + r.amount);
      existing.count += r.count;
    } else {
      map.set(key, { label: getBenefitTypeLabel(r.type), amount: r.amount, count: r.count });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

// ─── 1. Capital entregado ─────────────────────────────────────────────────────

export interface CapitalEntregadoRow {
  id: string; affiliateId: string; fullName: string; dni: string;
  legajo: string | null; type: string; typeLabel: string;
  commerce: string | null; date: string;
  totalAmount: string; installmentsCount: number;
  installmentAmount: string; paidCount: number; pendingCount: number;
  status: string;
}

export interface CapitalEntregadoData {
  totalCapital: number;
  benefitsCount: number;
  avgPerBenefit: number;
  byType: { label: string; amount: number; count: number }[];
  rows: CapitalEntregadoRow[];
}

export async function getCapitalEntregadoDetail(month: number, year: number, scope: MetricScope = "month"): Promise<CapitalEntregadoData> {
  const dateFilter = benefitDateFilter(month, year, scope);
  const result = await db.execute(sql`
    SELECT
      b.id, b.affiliate_id, a.full_name, a.dni, a.legajo,
      b.type, b.commerce, b.date,
      b.total_amount::numeric AS total_amount,
      b.installments_count, b.installment_amount::numeric AS installment_amount,
      b.status,
      COALESCE(COUNT(i.id) FILTER (WHERE i.status = 'paid'), 0)::int AS paid_count,
      COALESCE(COUNT(i.id) FILTER (WHERE i.status IN ('pending','overdue')), 0)::int AS pending_count
    FROM benefits b
    JOIN affiliates a ON a.id = b.affiliate_id
    LEFT JOIN installments i ON i.benefit_id = b.id
    WHERE ${dateFilter} AND b.status != 'cancelled'
    GROUP BY b.id, a.full_name, a.dni, a.legajo
    ORDER BY b.date DESC, a.full_name ASC
  `);

  type R = { id: string; affiliate_id: string; full_name: string; dni: string; legajo: string | null; type: string; commerce: string | null; date: string; total_amount: string; installments_count: number; installment_amount: string; paid_count: number; pending_count: number; status: string; };
  const rows = result.rows as R[];
  const totalCapital = roundMoney(rows.reduce((s, r) => s + Number(r.total_amount), 0));
  const benefitsCount = rows.length;

  return {
    totalCapital,
    benefitsCount,
    avgPerBenefit: benefitsCount > 0 ? roundMoney(totalCapital / benefitsCount) : 0,
    byType: byTypeAgg(rows.map(r => ({ type: r.type, amount: Number(r.total_amount), count: 1 }))),
    rows: rows.map(r => ({
      id: r.id, affiliateId: r.affiliate_id, fullName: r.full_name, dni: r.dni,
      legajo: r.legajo, type: r.type, typeLabel: getBenefitTypeLabel(r.type),
      commerce: r.commerce, date: r.date, totalAmount: r.total_amount,
      installmentsCount: r.installments_count, installmentAmount: r.installment_amount,
      paidCount: r.paid_count, pendingCount: r.pending_count, status: r.status,
    })),
  };
}

// ─── 2. Total a cobrar ────────────────────────────────────────────────────────

export interface TotalACobrarRow {
  id: string; benefitId: string; affiliateId: string;
  fullName: string; dni: string; type: string; typeLabel: string;
  commerce: string | null; installmentNumber: number; totalInstallments: number;
  amount: string; dueDate: string; status: string;
}

export interface TotalACobrarData {
  totalToCollect: number; capitalPart: number; interestPart: number;
  installmentsCount: number; benefitsCount: number;
  byType: { label: string; amount: number; count: number }[];
  rows: TotalACobrarRow[];
}

export async function getTotalACobrarDetail(month: number, year: number, scope: MetricScope = "month"): Promise<TotalACobrarData> {
  const dateFilter = benefitDateFilter(month, year, scope);
  const result = await db.execute(sql`
    SELECT
      i.id, i.benefit_id, a.id AS affiliate_id, a.full_name, a.dni,
      b.type, b.commerce,
      i.installment_number, i.total_installments,
      i.amount::numeric AS amount, i.due_date, i.status,
      b.total_amount::numeric AS capital, b.interest_amount::numeric AS interest
    FROM installments i
    JOIN benefits b ON b.id = i.benefit_id
    JOIN affiliates a ON a.id = i.affiliate_id
    WHERE ${dateFilter} AND b.status != 'cancelled'
    ORDER BY i.due_date ASC, a.full_name ASC
  `);

  type R = { id: string; benefit_id: string; affiliate_id: string; full_name: string; dni: string; type: string; commerce: string | null; installment_number: number; total_installments: number; amount: string; due_date: string; status: string; capital: string; interest: string; };
  const rows = result.rows as R[];

  const totalToCollect = roundMoney(rows.reduce((s, r) => s + Number(r.amount), 0));
  const uniqueBenefits = new Set(rows.map(r => r.benefit_id));
  const capitalPart = roundMoney(rows.reduce((s, r) => {
    const installments = r.total_installments || 1;
    return s + Number(r.capital) / installments;
  }, 0));

  return {
    totalToCollect,
    capitalPart,
    interestPart: roundMoney(totalToCollect - capitalPart),
    installmentsCount: rows.length,
    benefitsCount: uniqueBenefits.size,
    byType: byTypeAgg(rows.map(r => ({ type: r.type, amount: Number(r.amount), count: 1 }))),
    rows: rows.map(r => ({
      id: r.id, benefitId: r.benefit_id, affiliateId: r.affiliate_id,
      fullName: r.full_name, dni: r.dni, type: r.type,
      typeLabel: getBenefitTypeLabel(r.type), commerce: r.commerce,
      installmentNumber: r.installment_number, totalInstallments: r.total_installments,
      amount: r.amount, dueDate: r.due_date, status: r.status,
    })),
  };
}

// ─── 3. Cobrado hasta ahora ───────────────────────────────────────────────────

export interface CobradoRow {
  id: string; benefitId: string; affiliateId: string;
  fullName: string; dni: string; type: string; typeLabel: string;
  installmentNumber: number; totalInstallments: number;
  amount: string; paidDate: string | null; earnedInterest: number;
  installmentsCount: number; interestAmount: string;
}

export interface CobradoData {
  totalPaid: number; installmentsCount: number; earnedInterest: number;
  lastPaymentDate: string | null;
  byType: { label: string; amount: number; count: number }[];
  rows: CobradoRow[];
}

export async function getCobradoDetail(month: number, year: number, scope: MetricScope = "month"): Promise<CobradoData> {
  const dateFilter = benefitDateFilter(month, year, scope);
  const result = await db.execute(sql`
    SELECT
      i.id, i.benefit_id, a.id AS affiliate_id, a.full_name, a.dni,
      b.type, i.installment_number, i.total_installments,
      i.amount::numeric AS amount, i.paid_date,
      b.interest_amount::numeric AS interest_amount,
      b.installments_count
    FROM installments i
    JOIN benefits b ON b.id = i.benefit_id
    JOIN affiliates a ON a.id = i.affiliate_id
    WHERE i.status = 'paid' AND ${dateFilter}
    ORDER BY i.paid_date DESC, a.full_name ASC
  `);

  type R = { id: string; benefit_id: string; affiliate_id: string; full_name: string; dni: string; type: string; installment_number: number; total_installments: number; amount: string; paid_date: string | null; interest_amount: string; installments_count: number; };
  const rows = result.rows as R[];

  const totalPaid = roundMoney(rows.reduce((s, r) => s + Number(r.amount), 0));
  const earnedInterest = roundMoney(rows.reduce((s, r) => {
    const ipp = Number(r.interest_amount) / (r.installments_count || 1);
    return s + ipp;
  }, 0));
  const dates = rows.map(r => r.paid_date).filter(Boolean) as string[];

  return {
    totalPaid, installmentsCount: rows.length, earnedInterest,
    lastPaymentDate: dates.length > 0 ? dates.sort().at(-1) ?? null : null,
    byType: byTypeAgg(rows.map(r => ({ type: r.type, amount: Number(r.amount), count: 1 }))),
    rows: rows.map(r => ({
      id: r.id, benefitId: r.benefit_id, affiliateId: r.affiliate_id,
      fullName: r.full_name, dni: r.dni, type: r.type,
      typeLabel: getBenefitTypeLabel(r.type),
      installmentNumber: r.installment_number, totalInstallments: r.total_installments,
      amount: r.amount, paidDate: r.paid_date,
      earnedInterest: roundMoney(Number(r.interest_amount) / (r.installments_count || 1)),
      installmentsCount: r.installments_count, interestAmount: r.interest_amount,
    })),
  };
}

// ─── 4. Falta cobrar ──────────────────────────────────────────────────────────

export interface FaltaCobrarRow {
  id: string; benefitId: string; affiliateId: string;
  fullName: string; dni: string; legajo: string | null;
  type: string; typeLabel: string; commerce: string | null;
  installmentNumber: number; totalInstallments: number;
  amount: string; dueDate: string; status: string; daysOverdue: number;
}

export interface FaltaCobrarData {
  totalPending: number; pendingCount: number; overdueCount: number;
  nextDueDate: string | null; pendingInterest: number;
  byType: { label: string; amount: number; count: number }[];
  rows: FaltaCobrarRow[];
}

export async function getFaltaCobrarDetail(month: number, year: number, scope: MetricScope = "month"): Promise<FaltaCobrarData> {
  const dateFilter = benefitDateFilter(month, year, scope);
  const result = await db.execute(sql`
    SELECT
      i.id, i.benefit_id, a.id AS affiliate_id, a.full_name, a.dni, a.legajo,
      b.type, b.commerce,
      i.installment_number, i.total_installments,
      i.amount::numeric AS amount, i.due_date, i.status,
      b.interest_amount::numeric AS interest_amount,
      b.installments_count,
      (CURRENT_DATE - i.due_date::date)::int AS days_overdue
    FROM installments i
    JOIN benefits b ON b.id = i.benefit_id
    JOIN affiliates a ON a.id = i.affiliate_id
    WHERE i.status IN ('pending','overdue')
      AND ${dateFilter}
    ORDER BY i.status DESC, i.due_date ASC, a.full_name ASC
  `);

  type R = { id: string; benefit_id: string; affiliate_id: string; full_name: string; dni: string; legajo: string | null; type: string; commerce: string | null; installment_number: number; total_installments: number; amount: string; due_date: string; status: string; interest_amount: string; installments_count: number; days_overdue: number; };
  const rows = result.rows as R[];

  const totalPending = roundMoney(rows.reduce((s, r) => s + Number(r.amount), 0));
  const overdueCount = rows.filter(r => r.status === "overdue").length;
  const pendingInterest = roundMoney(rows.reduce((s, r) => {
    return s + Number(r.interest_amount) / (r.installments_count || 1);
  }, 0));
  const futureDates = rows.filter(r => r.days_overdue <= 0).map(r => r.due_date).sort();

  return {
    totalPending, pendingCount: rows.length, overdueCount,
    nextDueDate: futureDates[0] ?? null, pendingInterest,
    byType: byTypeAgg(rows.map(r => ({ type: r.type, amount: Number(r.amount), count: 1 }))),
    rows: rows.map(r => ({
      id: r.id, benefitId: r.benefit_id, affiliateId: r.affiliate_id,
      fullName: r.full_name, dni: r.dni, legajo: r.legajo,
      type: r.type, typeLabel: getBenefitTypeLabel(r.type),
      commerce: r.commerce, installmentNumber: r.installment_number,
      totalInstallments: r.total_installments, amount: r.amount,
      dueDate: r.due_date, status: r.status, daysOverdue: r.days_overdue,
    })),
  };
}

// ─── 5. Ganancia estimada ─────────────────────────────────────────────────────

export interface GananciaEstimadaRow {
  id: string; affiliateId: string; fullName: string; dni: string;
  type: string; typeLabel: string; totalAmount: string;
  totalRepaymentAmount: string; interestAmount: string;
  interestRate: string; installmentsCount: number;
  paidCount: number; status: string;
}

export interface GananciaEstimadaData {
  totalProfit: number; totalCapital: number; totalRepayment: number;
  /** Retención a comercios (parte de la ganancia que no es interés). */
  totalRetention: number;
  /** Ganancia total del sindicato = intereses + retención. */
  totalUnionProfit: number;
  avgRate: number; benefitsCount: number;
  byType: { label: string; amount: number; count: number }[];
  rows: GananciaEstimadaRow[];
}

export async function getGananciaEstimadaDetail(month: number, year: number, scope: MetricScope = "month"): Promise<GananciaEstimadaData> {
  const dateFilter = benefitDateFilter(month, year, scope);
  const result = await db.execute(sql`
    SELECT
      b.id, a.id AS affiliate_id, a.full_name, a.dni, b.type,
      b.total_amount::numeric AS total_amount,
      b.total_repayment_amount::numeric AS total_repayment,
      b.interest_amount::numeric AS interest_amount,
      b.interest_rate::numeric AS interest_rate,
      COALESCE(b.union_profit_amount, b.interest_amount, 0)::numeric AS union_profit,
      b.installments_count, b.status,
      COALESCE(COUNT(i.id) FILTER (WHERE i.status = 'paid'), 0)::int AS paid_count
    FROM benefits b
    JOIN affiliates a ON a.id = b.affiliate_id
    LEFT JOIN installments i ON i.benefit_id = b.id
    WHERE ${dateFilter}
      AND b.status != 'cancelled'
      AND COALESCE(b.union_profit_amount, b.interest_amount, 0)::numeric > 0
    GROUP BY b.id, a.id, a.full_name, a.dni
    ORDER BY COALESCE(b.union_profit_amount, b.interest_amount, 0)::numeric DESC
  `);

  type R = { id: string; affiliate_id: string; full_name: string; dni: string; type: string; total_amount: string; total_repayment: string; interest_amount: string; interest_rate: string; union_profit: string; installments_count: number; paid_count: number; status: string; };
  const rows = result.rows as R[];

  const totalProfit = roundMoney(rows.reduce((s, r) => s + Number(r.interest_amount), 0));
  const totalCapital = roundMoney(rows.reduce((s, r) => s + Number(r.total_amount), 0));
  const totalRepayment = roundMoney(rows.reduce((s, r) => s + Number(r.total_repayment), 0));
  const totalUnionProfit = roundMoney(rows.reduce((s, r) => s + Number(r.union_profit), 0));
  const totalRetention = roundMoney(Math.max(0, totalUnionProfit - totalProfit));
  const avgRate = rows.length > 0
    ? roundMoney(rows.reduce((s, r) => s + Number(r.interest_rate), 0) / rows.length)
    : 0;

  return {
    totalProfit, totalCapital, totalRepayment, totalRetention, totalUnionProfit,
    avgRate, benefitsCount: rows.length,
    byType: byTypeAgg(rows.map(r => ({ type: r.type, amount: Number(r.interest_amount), count: 1 }))),
    rows: rows.map(r => ({
      id: r.id, affiliateId: r.affiliate_id, fullName: r.full_name, dni: r.dni,
      type: r.type, typeLabel: getBenefitTypeLabel(r.type),
      totalAmount: r.total_amount, totalRepaymentAmount: r.total_repayment,
      interestAmount: r.interest_amount, interestRate: r.interest_rate,
      installmentsCount: r.installments_count, paidCount: r.paid_count, status: r.status,
    })),
  };
}

// ─── 6. Ganancia pendiente ────────────────────────────────────────────────────

export interface GananciaPendienteRow {
  id: string; benefitId: string; affiliateId: string;
  fullName: string; dni: string; type: string; typeLabel: string;
  installmentNumber: number; totalInstallments: number;
  amount: string; dueDate: string; status: string;
  interestPerInstallment: number; interestAmount: string;
}

export interface GananciaPendienteData {
  totalPendingInterest: number; totalEarnedInterest: number;
  totalEstimatedInterest: number; pendingPercent: number;
  pendingInstallmentsCount: number;
  byType: { label: string; amount: number; count: number }[];
  rows: GananciaPendienteRow[];
}

export async function getGananciaPendienteDetail(month: number, year: number, scope: MetricScope = "month"): Promise<GananciaPendienteData> {
  const dateFilter = benefitDateFilter(month, year, scope);
  const result = await db.execute(sql`
    SELECT
      i.id, i.benefit_id, a.id AS affiliate_id, a.full_name, a.dni,
      b.type, i.installment_number, i.total_installments,
      i.amount::numeric AS amount, i.due_date, i.status,
      b.interest_amount::numeric AS interest_amount,
      b.installments_count
    FROM installments i
    JOIN benefits b ON b.id = i.benefit_id
    JOIN affiliates a ON a.id = i.affiliate_id
    WHERE i.status IN ('pending','overdue')
      AND ${dateFilter}
      AND b.interest_amount::numeric > 0
    ORDER BY i.due_date ASC, a.full_name ASC
  `);

  const paidResult = await db.execute(sql`
    SELECT
      COALESCE(SUM(b.interest_amount::numeric / NULLIF(b.installments_count, 0)), 0) AS earned
    FROM installments i
    JOIN benefits b ON b.id = i.benefit_id
    WHERE i.status = 'paid'
      AND ${dateFilter}
  `);

  const totalResult = await db.execute(sql`
    SELECT COALESCE(SUM(b.interest_amount::numeric), 0) AS total
    FROM benefits b
    WHERE ${dateFilter} AND b.status != 'cancelled'
  `);

  type R = { id: string; benefit_id: string; affiliate_id: string; full_name: string; dni: string; type: string; installment_number: number; total_installments: number; amount: string; due_date: string; status: string; interest_amount: string; installments_count: number; };
  const rows = result.rows as R[];

  const totalPendingInterest = roundMoney(rows.reduce((s, r) => {
    return s + Number(r.interest_amount) / (r.installments_count || 1);
  }, 0));
  const totalEarnedInterest = roundMoney(Number((paidResult.rows[0] as { earned: string })?.earned ?? 0));
  const totalEstimatedInterest = roundMoney(Number((totalResult.rows[0] as { total: string })?.total ?? 0));
  const pendingPercent = totalEstimatedInterest > 0
    ? Math.round((totalPendingInterest / totalEstimatedInterest) * 100)
    : 0;

  return {
    totalPendingInterest, totalEarnedInterest, totalEstimatedInterest,
    pendingPercent, pendingInstallmentsCount: rows.length,
    byType: byTypeAgg(rows.map(r => ({
      type: r.type,
      amount: roundMoney(Number(r.interest_amount) / (r.installments_count || 1)),
      count: 1,
    }))),
    rows: rows.map(r => ({
      id: r.id, benefitId: r.benefit_id, affiliateId: r.affiliate_id,
      fullName: r.full_name, dni: r.dni, type: r.type,
      typeLabel: getBenefitTypeLabel(r.type),
      installmentNumber: r.installment_number, totalInstallments: r.total_installments,
      amount: r.amount, dueDate: r.due_date, status: r.status,
      interestPerInstallment: roundMoney(Number(r.interest_amount) / (r.installments_count || 1)),
      interestAmount: r.interest_amount,
    })),
  };
}
