import * as XLSX from "xlsx";
import { formatDate } from "./date";
import { formatCurrencyARS } from "./currency";
import type { MunicipalityPreviewSummary } from "@/lib/services/exports.service";

import { getBenefitTypeLabel } from "./benefit-types";

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

  // Filas de datos — solo columnas para Municipalidad
  const dataRows = rows.map((r, idx) => ({
    "N°": idx + 1,
    "Apellido y Nombre": r.fullName,
    "DNI": r.dni,
    "Legajo": r.legajo ?? "",
    "Tipo de Beneficio": getBenefitTypeLabel(r.type),
    "Fecha de Otorgamiento": formatDate(r.grantDate),
    "Cantidad de Cuotas": r.installmentsCount,
    "Cuota N°": r.installmentNumber,
    "Total de Cuotas": r.totalInstallments,
    "Monto a Descontar": formatCurrencyARS(r.installmentAmount),
  }));

  // Fila de totales — solo Monto a Descontar
  const totalsRow = {
    "N°": "",
    "Apellido y Nombre": "TOTALES",
    "DNI": "",
    "Legajo": `${preview.benefitsCount} beneficio${preview.benefitsCount !== 1 ? "s" : ""}`,
    "Tipo de Beneficio": "",
    "Fecha de Otorgamiento": "",
    "Cantidad de Cuotas": preview.recordsCount,
    "Cuota N°": "",
    "Total de Cuotas": "",
    "Monto a Descontar": formatCurrencyARS(preview.totalInstallment),
  };

  // Crear hoja: 2 filas de encabezado + datos + totales
  const wb = XLSX.utils.book_new();

  // Hoja vacía con metadatos arriba
  const headerData = [
    { "N°": "SINDICATO — LIQUIDACIÓN MUNICIPAL" },
    { "N°": `Período: ${periodLabel}` },
    { "N°": `Fecha de generación: ${generatedAt}` },
    { "N°": `Beneficios incluidos: ${preview.benefitsCount}  |  Cuotas: ${preview.recordsCount}  |  Total a descontar: ${formatCurrencyARS(preview.totalInstallment)}` },
    {}, // fila vacía separadora
    ...dataRows,
    {}, // fila vacía antes de totales
    totalsRow,
  ];

  const ws = XLSX.utils.json_to_sheet(headerData, { skipHeader: false });

  // Anchos de columna (10 columnas)
  ws["!cols"] = [
    { wch: 5 },  // N°
    { wch: 30 }, // Apellido y Nombre
    { wch: 12 }, // DNI
    { wch: 10 }, // Legajo
    { wch: 20 }, // Tipo de Beneficio
    { wch: 20 }, // Fecha de Otorgamiento
    { wch: 16 }, // Cantidad de Cuotas
    { wch: 10 }, // Cuota N°
    { wch: 14 }, // Total de Cuotas
    { wch: 18 }, // Monto a Descontar
  ];

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
