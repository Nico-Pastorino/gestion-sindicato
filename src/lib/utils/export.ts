import * as XLSX from "xlsx";
import { formatDate, formatMonthYear } from "./date";
import { formatCurrency } from "./credit";

export interface ExportColumn {
  key: string;
  header: string;
  format?: (value: unknown) => string;
}

// Función genérica para exportar cualquier dataset a Excel
export function exportToExcel(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  sheetName: string,
  filename: string
): void {
  const rows = data.map((row) =>
    Object.fromEntries(
      columns.map((col) => {
        const value = row[col.key];
        const formatted = col.format ? col.format(value) : String(value ?? "");
        return [col.header, formatted];
      })
    )
  );

  const ws = XLSX.utils.json_to_sheet(rows);

  // Ajustar ancho de columnas automáticamente
  const colWidths = columns.map((col) => {
    const maxLen = Math.max(
      col.header.length,
      ...rows.map((r) => String(r[col.header] ?? "").length)
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── Configuraciones de exportación por módulo ────────────────────────────────

export const AFFILIATES_COLUMNS: ExportColumn[] = [
  { key: "fullName", header: "Apellido y Nombre" },
  { key: "dni", header: "DNI" },
  { key: "legajo", header: "Legajo" },
  { key: "area", header: "Área Municipal" },
  {
    key: "grossSalary",
    header: "Salario Bruto",
    format: (v) => formatCurrency(String(v ?? 0)),
  },
  {
    key: "creditLimit30",
    header: "Tope 30%",
    format: (v) => formatCurrency(String(v ?? 0)),
  },
  {
    key: "activeDiscounts",
    header: "Descuentos Activos",
    format: (v) => formatCurrency(String(v ?? 0)),
  },
  {
    key: "availableAmount",
    header: "Disponible",
    format: (v) => formatCurrency(String(v ?? 0)),
  },
  { key: "status", header: "Estado" },
  { key: "phone", header: "Teléfono" },
];

export const BENEFITS_COLUMNS: ExportColumn[] = [
  { key: "affiliateName", header: "Afiliado" },
  { key: "affiliateDni", header: "DNI" },
  { key: "date", header: "Fecha", format: (v) => formatDate(String(v)) },
  { key: "type", header: "Tipo" },
  { key: "commerce", header: "Comercio" },
  {
    key: "totalAmount",
    header: "Monto Total",
    format: (v) => formatCurrency(String(v ?? 0)),
  },
  { key: "installmentsCount", header: "Cuotas" },
  {
    key: "installmentAmount",
    header: "Monto por Cuota",
    format: (v) => formatCurrency(String(v ?? 0)),
  },
  { key: "status", header: "Estado" },
];

export const INSTALLMENTS_COLUMNS: ExportColumn[] = [
  { key: "affiliateName", header: "Apellido y Nombre" },
  { key: "affiliateDni", header: "DNI" },
  { key: "affiliateLegajo", header: "Legajo" },
  { key: "affiliateArea", header: "Área" },
  { key: "commerce", header: "Comercio Adherido" },
  {
    key: "amount",
    header: "Monto a Descontar",
    format: (v) => formatCurrency(String(v ?? 0)),
  },
  {
    key: "dueDate",
    header: "Fecha",
    format: (v) => formatDate(String(v)),
  },
  { key: "installmentNumber", header: "Cuota N°" },
  { key: "totalInstallments", header: "Total de Cuotas" },
  { key: "status", header: "Estado" },
  { key: "paidDate", header: "Fecha de Pago", format: (v) => formatDate(v ? String(v) : null) },
];
