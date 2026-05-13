import { db } from "@/lib/db";
import { exportLogs } from "@/lib/db/schema";
import { sql, desc, eq } from "drizzle-orm";
import type { ExportLog } from "@/types";

// ─── Preview data ─────────────────────────────────────────────────────────────

export interface MunicipalityPreviewRow {
  fullName: string;
  dni: string;
  legajo: string | null;
  area: string | null;
  type: string;
  commerce: string | null;
  grantDate: string;
  totalAmount: string;
  installmentsCount: number;
  installmentNumber: number;
  totalInstallments: number;
  installmentAmount: string;
  dueDate: string;
  totalRepaymentAmount: string;
  interestAmount: string;
  observations: string | null;
}

export interface MunicipalityPreviewSummary {
  rows: MunicipalityPreviewRow[];
  benefitsCount: number;
  recordsCount: number;
  totalPrincipal: number;
  totalInstallment: number;
  totalInterest: number;
  periodStart: string;
  periodEnd: string;
}

export async function getMunicipalityPreview(
  periodStart: string,
  periodEnd: string
): Promise<MunicipalityPreviewSummary> {
  const result = await db.execute(sql`
    SELECT
      a.full_name             AS full_name,
      a.dni                   AS dni,
      a.legajo                AS legajo,
      a.area                  AS area,
      b.type                  AS type,
      b.commerce              AS commerce,
      b.date                  AS grant_date,
      b.total_amount          AS total_amount,
      b.installments_count    AS installments_count,
      i.installment_number    AS installment_number,
      i.total_installments    AS total_installments,
      i.amount                AS installment_amount,
      i.due_date              AS due_date,
      b.total_repayment_amount AS total_repayment_amount,
      b.interest_amount       AS interest_amount,
      b.observations          AS observations
    FROM benefits b
    JOIN affiliates a ON a.id = b.affiliate_id
    JOIN installments i ON i.benefit_id = b.id
    WHERE b.date BETWEEN ${periodStart} AND ${periodEnd}
      AND b.status != 'cancelled'
    ORDER BY a.full_name ASC, b.date ASC, i.installment_number ASC
  `);

  type RawRow = {
    full_name: string; dni: string; legajo: string | null; area: string | null;
    type: string; commerce: string | null; grant_date: string; total_amount: string;
    installments_count: number; installment_number: number; total_installments: number;
    installment_amount: string; due_date: string; total_repayment_amount: string;
    interest_amount: string; observations: string | null;
  };

  const rows = (result.rows as RawRow[]).map((r) => ({
    fullName: r.full_name, dni: r.dni, legajo: r.legajo, area: r.area,
    type: r.type, commerce: r.commerce, grantDate: r.grant_date,
    totalAmount: r.total_amount, installmentsCount: r.installments_count,
    installmentNumber: r.installment_number, totalInstallments: r.total_installments,
    installmentAmount: r.installment_amount, dueDate: r.due_date,
    totalRepaymentAmount: r.total_repayment_amount, interestAmount: r.interest_amount,
    observations: r.observations,
  }));

  // Aggregate per unique benefit
  const uniqueBenefits = new Set(
    rows.map((r) => `${r.fullName}-${r.grantDate}-${r.totalAmount}`)
  );

  const totalPrincipal = [...uniqueBenefits].reduce((sum, key) => {
    const row = rows.find((r) => `${r.fullName}-${r.grantDate}-${r.totalAmount}` === key);
    return sum + Number(row?.totalAmount ?? 0);
  }, 0);

  const totalInstallment = rows.reduce((sum, r) => sum + Number(r.installmentAmount), 0);
  const totalInterest = [...uniqueBenefits].reduce((sum, key) => {
    const row = rows.find((r) => `${r.fullName}-${r.grantDate}-${r.totalAmount}` === key);
    return sum + Number(row?.interestAmount ?? 0);
  }, 0);

  return {
    rows,
    benefitsCount: uniqueBenefits.size,
    recordsCount: rows.length,
    totalPrincipal: Math.round(totalPrincipal * 100) / 100,
    totalInstallment: Math.round(totalInstallment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    periodStart,
    periodEnd,
  };
}

// ─── Log de exportaciones ─────────────────────────────────────────────────────

export interface CreateExportLogInput {
  type?: string;
  periodStart: string;
  periodEnd: string;
  fileName?: string;
  recordsCount: number;
  benefitsCount: number;
  totalPrincipal: number;
  totalInstallment: number;
  totalInterest: number;
  sentByEmail?: boolean;
  emailTo?: string;
  emailCc?: string;
  status: "generated" | "sent" | "failed";
  errorMessage?: string;
  createdBy?: string;
}

export async function createExportLog(input: CreateExportLogInput): Promise<ExportLog> {
  const [log] = await db
    .insert(exportLogs)
    .values({
      type: input.type ?? "municipality",
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      fileName: input.fileName ?? null,
      recordsCount: input.recordsCount,
      benefitsCount: input.benefitsCount,
      totalPrincipal: String(input.totalPrincipal),
      totalInstallment: String(input.totalInstallment),
      totalInterest: String(input.totalInterest),
      sentByEmail: input.sentByEmail ?? false,
      emailTo: input.emailTo ?? null,
      emailCc: input.emailCc ?? null,
      status: input.status,
      errorMessage: input.errorMessage ?? null,
      createdBy: input.createdBy ?? null,
      sentAt: input.sentByEmail ? new Date() : null,
    })
    .returning();

  return log;
}

export async function updateExportLogStatus(
  id: string,
  status: "sent" | "failed",
  errorMessage?: string
): Promise<void> {
  await db
    .update(exportLogs)
    .set({
      status,
      errorMessage: errorMessage ?? null,
      sentAt: status === "sent" ? new Date() : null,
      sentByEmail: status === "sent",
    })
    .where(eq(exportLogs.id, id));
}

export async function listExportLogs(limit = 20): Promise<ExportLog[]> {
  return db
    .select()
    .from(exportLogs)
    .orderBy(desc(exportLogs.createdAt))
    .limit(limit);
}
