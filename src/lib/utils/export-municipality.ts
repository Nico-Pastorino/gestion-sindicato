import * as XLSX from "xlsx";
import { formatDate } from "./date";
import { formatCurrencyARS } from "./currency";
import type { MunicipalityPreviewSummary } from "@/lib/services/exports.service";

const TYPE_LABELS: Record<string, string> = {
  ayuda_economica: "Ayuda Económica",
  supermercado: "Supermercado / Orden de Compra",
  otro: "Otro",
};

export interface MunicipalityExportResult {
  buffer: Buffer;
  fileName: string;
  recordsCount: number;
  benefitsCount: number;
  totalPrincipal: number;
  totalInstallment: number;
  totalInterest: number;
  periodStart: string;
  periodEnd: string;
}

/**
 * Genera el Excel de liquidación municipal a partir del preview ya cargado.
 * Incluye encabezado del período, tabla con N° de fila y fila de totales.
 */
export function buildMunicipalityExcel(
  preview: MunicipalityPreviewSummary
): MunicipalityExportResult {
  const { rows, periodStart, periodEnd } = preview;
  const [y, m] = periodEnd.split("-");
  const fileName = `liquidacion_municipal_${y}_${m}.xlsx`;
  const sheetName = `Liquidación ${m}-${y}`;

  const periodLabel = `${formatDate(periodStart)} al ${formatDate(periodEnd)}`;
  const generatedAt = formatDate(new Date().toISOString().split("T")[0]);

  // Filas de datos
  const dataRows = rows.map((r, idx) => ({
    "N°": idx + 1,
    "Apellido y Nombre": r.fullName,
    "DNI": r.dni,
    "Legajo": r.legajo ?? "",
    "Área Municipal": r.area ?? "",
    "Tipo": TYPE_LABELS[r.type] ?? r.type,
    "Comercio / Concepto": r.commerce ?? "",
    "Fecha Otorgamiento": formatDate(r.grantDate),
    "Capital Otorgado": formatCurrencyARS(r.totalAmount),
    "Cant. Cuotas": r.installmentsCount,
    "Cuota N°": r.installmentNumber,
    "Total Cuotas": r.totalInstallments,
    "Monto a Descontar": formatCurrencyARS(r.installmentAmount),
    "Fecha Descuento": formatDate(r.dueDate),
    "Total a Devolver": formatCurrencyARS(r.totalRepaymentAmount),
    "Interés Total": formatCurrencyARS(r.interestAmount),
    "Observaciones": r.observations ?? "",
  }));

  // Fila de totales
  const totalsRow = {
    "N°": "",
    "Apellido y Nombre": "TOTALES",
    "DNI": "",
    "Legajo": "",
    "Área Municipal": `${preview.benefitsCount} beneficios`,
    "Tipo": "",
    "Comercio / Concepto": "",
    "Fecha Otorgamiento": "",
    "Capital Otorgado": formatCurrencyARS(preview.totalPrincipal),
    "Cant. Cuotas": preview.recordsCount,
    "Cuota N°": "",
    "Total Cuotas": "",
    "Monto a Descontar": formatCurrencyARS(preview.totalInstallment),
    "Fecha Descuento": "",
    "Total a Devolver": formatCurrencyARS(preview.totalInstallment),
    "Interés Total": formatCurrencyARS(preview.totalInterest),
    "Observaciones": "",
  };

  // Crear hoja: 2 filas de encabezado + datos + totales
  const wb = XLSX.utils.book_new();

  // Hoja vacía con metadatos arriba
  const headerData = [
    { "N°": "SINDICATO — LIQUIDACIÓN MUNICIPAL" },
    { "N°": `Período: ${periodLabel}` },
    { "N°": `Fecha de generación: ${generatedAt}` },
    { "N°": `Beneficios incluidos: ${preview.benefitsCount}  |  Cuotas: ${preview.recordsCount}  |  Capital: ${formatCurrencyARS(preview.totalPrincipal)}  |  Total a descontar: ${formatCurrencyARS(preview.totalInstallment)}` },
    {}, // fila vacía separadora
    ...dataRows,
    {}, // fila vacía antes de totales
    totalsRow,
  ];

  const ws = XLSX.utils.json_to_sheet(headerData, { skipHeader: false });

  // Anchos de columna
  ws["!cols"] = [
    { wch: 5 },  // N°
    { wch: 28 }, // Nombre
    { wch: 11 }, // DNI
    { wch: 9 },  // Legajo
    { wch: 22 }, // Área
    { wch: 26 }, // Tipo
    { wch: 22 }, // Comercio
    { wch: 18 }, // Fecha otorg.
    { wch: 16 }, // Capital
    { wch: 10 }, // Cant cuotas
    { wch: 9 },  // Cuota N°
    { wch: 10 }, // Total cuotas
    { wch: 16 }, // Monto desc.
    { wch: 16 }, // Fecha desc.
    { wch: 16 }, // Total devolver
    { wch: 14 }, // Interés
    { wch: 28 }, // Obs
  ];

  // Congelar la fila de encabezados de columna (fila 6 = índice 5 + 1 header)
  ws["!freeze"] = { xSplit: 0, ySplit: 6 };

  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const buffer = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

  return {
    buffer,
    fileName,
    recordsCount: rows.length,
    benefitsCount: preview.benefitsCount,
    totalPrincipal: preview.totalPrincipal,
    totalInstallment: preview.totalInstallment,
    totalInterest: preview.totalInterest,
    periodStart,
    periodEnd,
  };
}
