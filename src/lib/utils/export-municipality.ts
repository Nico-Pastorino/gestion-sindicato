import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { formatDate } from "./date";
import { formatCurrencyARS } from "./currency";

const TYPE_LABELS: Record<string, string> = {
  ayuda_economica: "Ayuda Económica",
  supermercado: "Supermercado / Orden de Compra",
  otro: "Otro",
};

export interface MunicipalityExportResult {
  buffer: Buffer;
  fileName: string;
  recordsCount: number;
  periodStart: string;
  periodEnd: string;
}

/**
 * Genera el Excel de liquidación municipal.
 * Incluye todos los beneficios otorgados en el período (día 20 anterior → día 19 actual).
 * Cada cuota es una fila del Excel.
 */
export async function generateMunicipalityExcel(
  periodStart: string,
  periodEnd: string
): Promise<MunicipalityExportResult> {
  const rows = await db.execute(sql`
    SELECT
      a.full_name           AS full_name,
      a.dni                 AS dni,
      a.legajo              AS legajo,
      a.area                AS area,
      b.type                AS type,
      b.commerce            AS commerce,
      b.date                AS grant_date,
      b.total_amount        AS total_amount,
      b.installments_count  AS installments_count,
      i.installment_number  AS installment_number,
      i.total_installments  AS total_installments,
      i.amount              AS installment_amount,
      i.due_date            AS due_date,
      b.total_repayment_amount AS total_repayment_amount,
      b.interest_amount     AS interest_amount,
      b.observations        AS observations
    FROM benefits b
    JOIN affiliates a ON a.id = b.affiliate_id
    JOIN installments i ON i.benefit_id = b.id
    WHERE b.date BETWEEN ${periodStart} AND ${periodEnd}
      AND b.status != 'cancelled'
    ORDER BY a.full_name ASC, b.date ASC, i.installment_number ASC
  `);

  type Row = {
    full_name: string;
    dni: string;
    legajo: string | null;
    area: string | null;
    type: string;
    commerce: string | null;
    grant_date: string;
    total_amount: string;
    installments_count: number;
    installment_number: number;
    total_installments: number;
    installment_amount: string;
    due_date: string;
    total_repayment_amount: string;
    interest_amount: string;
    observations: string | null;
  };

  const data = (rows.rows as Row[]).map((r) => ({
    "Apellido y Nombre": r.full_name,
    "DNI": r.dni,
    "Legajo": r.legajo ?? "",
    "Área Municipal": r.area ?? "",
    "Tipo de Beneficio": TYPE_LABELS[r.type] ?? r.type,
    "Comercio / Proveedor": r.commerce ?? "",
    "Fecha de Otorgamiento": formatDate(r.grant_date),
    "Monto Otorgado": formatCurrencyARS(r.total_amount),
    "Cant. Cuotas": r.installments_count,
    "Cuota N°": r.installment_number,
    "Total Cuotas": r.total_installments,
    "Monto a Descontar": formatCurrencyARS(r.installment_amount),
    "Fecha de Descuento": formatDate(r.due_date),
    "Total a Devolver": formatCurrencyARS(r.total_repayment_amount),
    "Interés Total": formatCurrencyARS(r.interest_amount),
    "Observaciones": r.observations ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);

  // Anchos de columna
  ws["!cols"] = [
    { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 22 },
    { wch: 26 }, { wch: 24 }, { wch: 20 }, { wch: 18 },
    { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 18 },
    { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 30 },
  ];

  const wb = XLSX.utils.book_new();
  const [y, m] = periodEnd.split("-");
  const sheetName = `Liquidación ${m}-${y}`;
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const buffer = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
  const fileName = `liquidacion_municipal_${y}_${m}.xlsx`;

  return { buffer, fileName, recordsCount: data.length, periodStart, periodEnd };
}
