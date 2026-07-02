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
  unionProfit: number;
  commerceRetentionProfit: number;
  collectedProfit: number;
  pendingProfit: number;
  pendingToCollect: number;
  paidAmount: number;
  benefitsCount: number;
  pendingInstallmentsCount: number;
  paidInstallmentsCount: number;
  overdueInstallmentsCount: number;
  benefitsThisYear: number;
  newAffiliatesCount: number;
  commercesUsedCount: number;
  amountRetainedThisMonth: number;
  amountRetainedThisYear: number;
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
  commerceRetentionProfit: number;
  unionProfit: number;
}

export interface DashboardGlobals {
  totalAffiliates: number;
  activeAffiliates: number;
  affiliatesWithActiveBenefit: number;
  newAffiliatesThisMonth: number;
  retirees: number;
  permanentStaff: number;
  temporaryStaff: number;
  commercesCount: number;
  commerceBenefitsCount: number;
  activeBenefits: number;
  finishedBenefits: number;
  affiliatesWithoutCredit: number;
  topCommerce: string | null;
  topBenefitType: string | null;
  totalCapitalDelivered: number;
  totalInterestGenerated: number;
  totalInterestCollected: number;
  totalToCollect: number;
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  pendingInstallmentsCount: number;
  overdueInstallmentsCount: number;
  affectedOverdueAffiliates: number;
  collectionComplianceRate: number;
  commerceRetentionTotal: number;
  averageCommerceRetentionRate: number;
}

export interface DashboardAnalytics {
  affiliatesBySex: Array<{ label: string; value: number }>;
  affiliatesByEmploymentType: Array<{ label: string; value: number }>;
  affiliatesByStatus: Array<{ label: string; value: number }>;
  benefitsByType: Array<{ label: string; value: number; amount: number }>;
  topCommerces: Array<{ commerce: string; count: number; amount: number; profit: number }>;
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
      COALESCE(b.union_profit_amount, b.interest_amount, 0)::numeric AS union_profit,
      COALESCE(b.commerce_retention_rate, 0)::numeric AS commerce_retention_rate,
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
    capital: string; total_repayment: string; interest: string; union_profit: string; commerce_retention_rate: string;
    installments_count: number; paid_count: number; pending_count: number;
    overdue_count: number; paid_amount: string; pending_amount: string;
  };

  const benefitRows = rows.rows as BRow[];

  let capitalDelivered = 0, totalToCollect = 0, estimatedProfit = 0, unionProfit = 0, commerceRetentionProfit = 0;
  let collectedProfit = 0, paidAmount = 0, pendingToCollect = 0;
  let pendingInstallmentsCount = 0, paidInstallmentsCount = 0, overdueInstallmentsCount = 0;

  for (const b of benefitRows) {
    const capital = Number(b.capital);
    const totalRepayment = Number(b.total_repayment);
    const interest = Number(b.interest);
    const rowUnionProfit = Number(b.union_profit);
    const rowCommerceProfit = Math.max(0, rowUnionProfit - interest);
    const count = b.installments_count || 1;
    const interestPerInstallment = interest / count;

    capitalDelivered += capital;
    totalToCollect += totalRepayment;
    estimatedProfit += interest;
    unionProfit += rowUnionProfit;
    commerceRetentionProfit += rowCommerceProfit;
    collectedProfit += b.paid_count * interestPerInstallment;
    paidAmount += Number(b.paid_amount);
    pendingToCollect += Number(b.pending_amount);
    pendingInstallmentsCount += b.pending_count;
    paidInstallmentsCount += b.paid_count;
    overdueInstallmentsCount += b.overdue_count;
  }

  const [retainedYearRows, selectedMonthAffiliates, selectedMonthCommerces] = await Promise.all([
    db.execute(sql`
      SELECT
        COALESCE(SUM(union_profit_amount::numeric), 0) AS retained_year,
        COUNT(*)::int AS benefits_year
      FROM benefits
      WHERE date BETWEEN ${`${year}-01-01`} AND ${`${year}-12-31`}
        AND status != 'cancelled'
    `),
    db.select({ count: sql<number>`count(*)::int` }).from(affiliates).where(sql`created_at BETWEEN ${start} AND ${end}`),
    db.execute(sql`
      SELECT COUNT(DISTINCT commerce)::int AS count
      FROM benefits
      WHERE date BETWEEN ${start} AND ${end}
        AND status != 'cancelled'
        AND commerce IS NOT NULL
        AND commerce <> ''
    `),
  ]);
  const retainedYear = retainedYearRows.rows[0] as { retained_year: string; benefits_year: number };

  const pendingProfit = roundMoney(unionProfit - collectedProfit);

  return {
    capitalDelivered: roundMoney(capitalDelivered),
    totalToCollect: roundMoney(totalToCollect),
    estimatedProfit: roundMoney(estimatedProfit),
    unionProfit: roundMoney(unionProfit),
    commerceRetentionProfit: roundMoney(commerceRetentionProfit),
    collectedProfit: roundMoney(collectedProfit),
    pendingProfit,
    pendingToCollect: roundMoney(pendingToCollect),
    paidAmount: roundMoney(paidAmount),
    benefitsCount: benefitRows.length,
    pendingInstallmentsCount,
    paidInstallmentsCount,
    overdueInstallmentsCount,
    benefitsThisYear: retainedYear?.benefits_year ?? 0,
    newAffiliatesCount: selectedMonthAffiliates[0]?.count ?? 0,
    commercesUsedCount: (selectedMonthCommerces.rows[0] as { count: number })?.count ?? 0,
    amountRetainedThisMonth: roundMoney(unionProfit),
    amountRetainedThisYear: roundMoney(Number(retainedYear?.retained_year ?? 0)),
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
        COALESCE(b.union_profit_amount, b.interest_amount, 0)::numeric AS union_profit,
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
      capital: string; interest: string; union_profit: string; installments_count: number;
      paid_count: number; paid_amount: string; pending_amount: string;
    };

    let capitalDelivered = 0, estimatedProfit = 0, collectedProfit = 0, unionProfit = 0;
    let paidAmount = 0, pendingToCollect = 0;

    for (const b of rows.rows as HR[]) {
      const interest = Number(b.interest);
      const count = b.installments_count || 1;
      capitalDelivered += Number(b.capital);
      estimatedProfit += interest;
      unionProfit += Number(b.union_profit);
      collectedProfit += b.paid_count * (interest / count);
      paidAmount += Number(b.paid_amount);
      pendingToCollect += Number(b.pending_amount);
    }

    results.push({
      month: `${y}-${String(m).padStart(2, "0")}`,
      monthLabel: format(d, "MMMM yyyy", { locale: es }),
      capitalDelivered: roundMoney(capitalDelivered),
      estimatedProfit: roundMoney(estimatedProfit),
      commerceRetentionProfit: roundMoney(unionProfit - estimatedProfit),
      unionProfit: roundMoney(unionProfit),
      collectedProfit: roundMoney(collectedProfit),
      pendingProfit: roundMoney(estimatedProfit - collectedProfit),
      paidAmount: roundMoney(paidAmount),
      pendingToCollect: roundMoney(pendingToCollect),
      benefitsCount: rows.rows.length,
    });
  }

  return results;
}

// ─── Datos globales (no dependen del período) ─────────────────────────────────

export async function getDashboardGlobals(): Promise<DashboardGlobals> {
  const now = new Date();
  const { start, end } = monthBounds(now.getMonth() + 1, now.getFullYear());

  const [
    totalAff,
    activeAff,
    affiliatesWithActiveBenefit,
    newAff,
    retirees,
    permanent,
    temporary,
    commerces,
    commerceBenefits,
    activeBen,
    finishedBen,
    noCredit,
    topCommerce,
    topBenefitType,
    financials,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(affiliates),
    db.select({ count: sql<number>`count(*)::int` }).from(affiliates).where(eq(affiliates.status, "active")),
    db.execute(sql`
      SELECT COUNT(DISTINCT affiliate_id)::int AS count
      FROM benefits
      WHERE status = 'active'
    `),
    db.select({ count: sql<number>`count(*)::int` }).from(affiliates).where(sql`created_at BETWEEN ${start} AND ${end}`),
    db.select({ count: sql<number>`count(*)::int` }).from(affiliates).where(sql`employment_type = 'jubilado'`),
    db.select({ count: sql<number>`count(*)::int` }).from(affiliates).where(sql`employment_type = 'planta_permanente'`),
    db.select({ count: sql<number>`count(*)::int` }).from(affiliates).where(sql`employment_type = 'planta_temporaria'`),
    db.execute(sql`SELECT COUNT(DISTINCT commerce)::int AS count FROM benefits WHERE commerce IS NOT NULL AND commerce <> ''`),
    db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM benefits
      WHERE type = 'supermercado' AND status != 'cancelled'
    `),
    db.select({ count: sql<number>`count(*)::int` }).from(benefits).where(eq(benefits.status, "active")),
    db.select({ count: sql<number>`count(*)::int` }).from(benefits).where(eq(benefits.status, "finished")),
    db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM affiliate_credit_summary
      WHERE available_amount <= 0 AND gross_salary IS NOT NULL AND status = 'active'
    `),
    db.execute(sql`
      SELECT commerce, COUNT(*)::int AS count
      FROM benefits
      WHERE commerce IS NOT NULL AND commerce <> '' AND status != 'cancelled'
      GROUP BY commerce
      ORDER BY count DESC
      LIMIT 1
    `),
    db.execute(sql`
      SELECT type, COUNT(*)::int AS count
      FROM benefits
      WHERE status != 'cancelled'
      GROUP BY type
      ORDER BY count DESC
      LIMIT 1
    `),
    db.execute(sql`
      WITH benefit_rollup AS (
        SELECT
          b.id,
          b.total_amount::numeric AS capital,
          b.total_repayment_amount::numeric AS total_repayment,
          b.interest_amount::numeric AS interest,
          COALESCE(b.union_profit_amount, b.interest_amount, 0)::numeric AS union_profit,
          COALESCE(b.commerce_retention_rate, 0)::numeric AS retention_rate,
          b.installments_count,
          COALESCE(COUNT(i.id) FILTER (WHERE i.status = 'paid'), 0)::int AS paid_count,
          COALESCE(SUM(i.amount::numeric) FILTER (WHERE i.status = 'paid'), 0) AS paid_amount,
          COALESCE(SUM(i.amount::numeric) FILTER (WHERE i.status IN ('pending','overdue')), 0) AS pending_amount,
          COALESCE(SUM(i.amount::numeric) FILTER (WHERE i.status = 'overdue'), 0) AS overdue_amount,
          COALESCE(COUNT(i.id) FILTER (WHERE i.status IN ('pending','overdue')), 0)::int AS pending_installments,
          COALESCE(COUNT(i.id) FILTER (WHERE i.status = 'overdue'), 0)::int AS overdue_installments
        FROM benefits b
        LEFT JOIN installments i ON i.benefit_id = b.id
        WHERE b.status != 'cancelled'
        GROUP BY b.id
      )
      SELECT
        COALESCE(SUM(capital), 0) AS total_capital,
        COALESCE(SUM(total_repayment), 0) AS total_to_collect,
        COALESCE(SUM(interest), 0) AS total_interest,
        COALESCE(SUM((interest / NULLIF(installments_count, 0)) * paid_count), 0) AS interest_collected,
        COALESCE(SUM(paid_amount), 0) AS total_collected,
        COALESCE(SUM(pending_amount), 0) AS total_pending,
        COALESCE(SUM(overdue_amount), 0) AS total_overdue,
        COALESCE(SUM(pending_installments), 0)::int AS pending_installments_count,
        COALESCE(SUM(overdue_installments), 0)::int AS overdue_installments_count,
        COALESCE(SUM(GREATEST(union_profit - interest, 0)), 0) AS commerce_retention_total,
        COALESCE(AVG(NULLIF(retention_rate, 0)), 0) AS average_retention_rate
      FROM benefit_rollup
    `),
  ]);

  const overdueAffiliates = await db.execute(sql`
    SELECT COUNT(DISTINCT affiliate_id)::int AS count
    FROM installments
    WHERE status = 'overdue'
  `);
  const globalFinancials = financials.rows[0] as {
    total_capital: string;
    total_to_collect: string;
    total_interest: string;
    interest_collected: string;
    total_collected: string;
    total_pending: string;
    total_overdue: string;
    pending_installments_count: number;
    overdue_installments_count: number;
    commerce_retention_total: string;
    average_retention_rate: string;
  };
  const totalCollected = roundMoney(Number(globalFinancials?.total_collected ?? 0));
  const totalToCollect = roundMoney(Number(globalFinancials?.total_to_collect ?? 0));

  return {
    totalAffiliates: totalAff[0]?.count ?? 0,
    activeAffiliates: activeAff[0]?.count ?? 0,
    affiliatesWithActiveBenefit: (affiliatesWithActiveBenefit.rows[0] as { count: number })?.count ?? 0,
    newAffiliatesThisMonth: newAff[0]?.count ?? 0,
    retirees: retirees[0]?.count ?? 0,
    permanentStaff: permanent[0]?.count ?? 0,
    temporaryStaff: temporary[0]?.count ?? 0,
    commercesCount: (commerces.rows[0] as { count: number })?.count ?? 0,
    commerceBenefitsCount: (commerceBenefits.rows[0] as { count: number })?.count ?? 0,
    activeBenefits: activeBen[0]?.count ?? 0,
    finishedBenefits: finishedBen[0]?.count ?? 0,
    affiliatesWithoutCredit: (noCredit.rows[0] as { count: number })?.count ?? 0,
    topCommerce: (topCommerce.rows[0] as { commerce?: string } | undefined)?.commerce ?? null,
    topBenefitType: (topBenefitType.rows[0] as { type?: string } | undefined)?.type ?? null,
    totalCapitalDelivered: roundMoney(Number(globalFinancials?.total_capital ?? 0)),
    totalInterestGenerated: roundMoney(Number(globalFinancials?.total_interest ?? 0)),
    totalInterestCollected: roundMoney(Number(globalFinancials?.interest_collected ?? 0)),
    totalToCollect,
    totalCollected,
    totalPending: roundMoney(Number(globalFinancials?.total_pending ?? 0)),
    totalOverdue: roundMoney(Number(globalFinancials?.total_overdue ?? 0)),
    pendingInstallmentsCount: globalFinancials?.pending_installments_count ?? 0,
    overdueInstallmentsCount: globalFinancials?.overdue_installments_count ?? 0,
    affectedOverdueAffiliates: (overdueAffiliates.rows[0] as { count: number })?.count ?? 0,
    collectionComplianceRate: totalToCollect > 0 ? Math.round((totalCollected / totalToCollect) * 100) : 100,
    commerceRetentionTotal: roundMoney(Number(globalFinancials?.commerce_retention_total ?? 0)),
    averageCommerceRetentionRate: roundMoney(Number(globalFinancials?.average_retention_rate ?? 0)),
  };
}

export async function getDashboardAnalytics(month: number, year: number): Promise<DashboardAnalytics> {
  const { start, end } = monthBounds(month, year);

  const [sexRows, employmentRows, statusRows, benefitRows, commerceRows] = await Promise.all([
    db.execute(sql`
      SELECT COALESCE(sex, 'sin_dato') AS label, COUNT(*)::int AS value
      FROM affiliates
      GROUP BY COALESCE(sex, 'sin_dato')
      ORDER BY value DESC
    `),
    db.execute(sql`
      SELECT COALESCE(employment_type, 'sin_dato') AS label, COUNT(*)::int AS value
      FROM affiliates
      GROUP BY COALESCE(employment_type, 'sin_dato')
      ORDER BY value DESC
    `),
    db.execute(sql`
      SELECT status AS label, COUNT(*)::int AS value
      FROM affiliates
      GROUP BY status
      ORDER BY value DESC
    `),
    db.execute(sql`
      SELECT type AS label, COUNT(*)::int AS value, COALESCE(SUM(total_amount::numeric), 0) AS amount
      FROM benefits
      WHERE date BETWEEN ${start} AND ${end}
        AND status != 'cancelled'
      GROUP BY type
      ORDER BY value DESC
    `),
    db.execute(sql`
      SELECT
        commerce,
        COUNT(*)::int AS count,
        COALESCE(SUM(total_amount::numeric), 0) AS amount,
        COALESCE(SUM(union_profit_amount::numeric), 0) AS profit
      FROM benefits
      WHERE date BETWEEN ${start} AND ${end}
        AND status != 'cancelled'
        AND commerce IS NOT NULL
        AND commerce <> ''
      GROUP BY commerce
      ORDER BY profit DESC, count DESC
      LIMIT 8
    `),
  ]);

  return {
    affiliatesBySex: (sexRows.rows as Array<{ label: string; value: number }>).map(normalizeAnalyticsLabel),
    affiliatesByEmploymentType: (employmentRows.rows as Array<{ label: string; value: number }>).map(normalizeAnalyticsLabel),
    affiliatesByStatus: (statusRows.rows as Array<{ label: string; value: number }>).map(normalizeAnalyticsLabel),
    benefitsByType: (benefitRows.rows as Array<{ label: string; value: number; amount: string }>).map((r) => ({
      label: normalizeLabel(r.label),
      value: r.value,
      amount: roundMoney(Number(r.amount)),
    })),
    topCommerces: (commerceRows.rows as Array<{ commerce: string; count: number; amount: string; profit: string }>).map((r) => ({
      commerce: r.commerce,
      count: r.count,
      amount: roundMoney(Number(r.amount)),
      profit: roundMoney(Number(r.profit)),
    })),
  };
}

function normalizeAnalyticsLabel(row: { label: string; value: number }) {
  return { label: normalizeLabel(row.label), value: row.value };
}

function normalizeLabel(value: string) {
  const labels: Record<string, string> = {
    masculino: "Masculino",
    femenino: "Femenino",
    otro: "Otro",
    prefiero_no_responder: "Prefiere no responder",
    sin_dato: "Sin dato",
    planta_permanente: "Planta Permanente",
    planta_temporaria: "Planta Temporaria",
    jubilado: "Jubilado",
    active: "Activo",
    inactive: "Inactivo",
    ayuda_economica: "Ayuda Económica",
    supermercado: "Comercio",
  };

  return labels[value] ?? value;
}
