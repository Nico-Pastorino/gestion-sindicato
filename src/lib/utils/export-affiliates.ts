import * as XLSX from "xlsx";
import { formatDate } from "./date";
import { formatEmploymentType } from "./labels";
import type { AffiliateExportRow } from "@/lib/services/affiliates.service";

export interface AffiliatesExportResult {
  buffer: Buffer;
  fileName: string;
  recordsCount: number;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  inactive: "Inactivo",
};

const DOC_LABELS: Record<string, string> = {
  complete: "Completa",
  pending: "Pendiente",
  missing: "Faltante",
};

/**
 * Genera el Excel del listado de afiliados filtrado. El sueldo bruto no se
 * incluye acá: se carga y se ve desde Beneficios.
 */
export function buildAffiliatesExcel(
  rows: AffiliateExportRow[]
): AffiliatesExportResult {
  const today = new Date().toISOString().split("T")[0];
  const fileName = `afiliados_${today}.xlsx`;

  const dataRows = rows.map((r, idx) => ({
    "N°": idx + 1,
    "Apellido y Nombre": r.fullName,
    "DNI": r.dni,
    "CUIL": r.cuil ?? "",
    "Legajo": r.legajo ?? "",
    "Área": r.area ?? "",
    "Sector": r.sector ?? "",
    "Cargo": r.position ?? "",
    "Vínculo": r.employmentType ? formatEmploymentType(r.employmentType) : "",
    "Turno": r.workShift ?? "",
    "Teléfono": r.phone ?? "",
    "Tel. alternativo": r.alternatePhone ?? "",
    "Email": r.email ?? "",
    "Domicilio": [r.streetAddress, r.addressNumber].filter(Boolean).join(" "),
    "Barrio": r.neighborhood ?? "",
    "Localidad": r.city ?? "",
    "Provincia": r.province ?? "",
    "CP": r.postalCode ?? "",
    "Estado": STATUS_LABELS[r.status] ?? r.status,
    "Documentación": DOC_LABELS[r.documentationStatus] ?? r.documentationStatus,
    "Ingreso": r.hireDate ? formatDate(r.hireDate) : "",
    "Afiliado desde": r.affiliationDate ? formatDate(r.affiliationDate) : "",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(
    dataRows.length > 0
      ? dataRows
      : [{ "N°": "", "Apellido y Nombre": "Sin afiliados para los filtros aplicados" }]
  );

  ws["!cols"] = [
    { wch: 5 },  // N°
    { wch: 30 }, // Apellido y Nombre
    { wch: 12 }, // DNI
    { wch: 14 }, // CUIL
    { wch: 10 }, // Legajo
    { wch: 18 }, // Área
    { wch: 18 }, // Sector
    { wch: 18 }, // Cargo
    { wch: 18 }, // Vínculo
    { wch: 14 }, // Turno
    { wch: 14 }, // Teléfono
    { wch: 14 }, // Tel. alternativo
    { wch: 26 }, // Email
    { wch: 26 }, // Domicilio
    { wch: 16 }, // Barrio
    { wch: 16 }, // Localidad
    { wch: 16 }, // Provincia
    { wch: 8 },  // CP
    { wch: 10 }, // Estado
    { wch: 14 }, // Documentación
    { wch: 14 }, // Ingreso
    { wch: 14 }, // Afiliado desde
  ];

  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  XLSX.utils.book_append_sheet(wb, ws, "Afiliados");
  const buffer = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

  return { buffer, fileName, recordsCount: rows.length };
}
