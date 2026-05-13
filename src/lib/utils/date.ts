import { format, addMonths, subMonths, parseISO, isValid, endOfMonth, startOfMonth, setDate } from "date-fns";
import { es } from "date-fns/locale";

// ─── Regla de corte día 20 ────────────────────────────────────────────────────
//
// Los afiliados cobran el ÚLTIMO DÍA del mes.
// La municipalidad retiene el descuento en ese mismo pago.
//
// Regla:
//   - Si el beneficio se otorga entre día 1 y día 20 (inclusive):
//     → la primera cuota se cobra el último día de ESE MISMO mes.
//   - Si el beneficio se otorga desde el día 21 en adelante:
//     → la primera cuota se cobra el último día del MES SIGUIENTE.
//   - Las cuotas siguientes son siempre el último día de cada mes subsiguiente.
//
// Ejemplos:
//   10/05/2026 → 31/05, 30/06, 31/07
//   20/05/2026 → 31/05, 30/06, 31/07
//   21/05/2026 → 30/06, 31/07, 31/08
//   25/05/2026 → 30/06, 31/07, 31/08

/**
 * Dado el día de otorgamiento, devuelve la fecha de la primera cuota.
 * La primera cuota siempre cae el ÚLTIMO DÍA del mes correspondiente.
 */
export function getFirstInstallmentDueDate(grantDate: Date): Date {
  const day = grantDate.getDate();
  if (day <= 19) {
    // Día 1–19: la primera cuota cae en el mismo mes
    return endOfMonth(grantDate);
  } else {
    // Día 20 en adelante: la primera cuota pasa al mes siguiente
    return endOfMonth(addMonths(grantDate, 1));
  }
}

/**
 * Genera las fechas de vencimiento de N cuotas a partir de la fecha de otorgamiento.
 * Cada cuota cae el último día del mes correspondiente.
 *
 * @param grantDateStr  Fecha de otorgamiento en formato "YYYY-MM-DD"
 * @param count         Cantidad de cuotas
 * @returns             Array de fechas "YYYY-MM-DD" (último día de cada mes)
 */
export function generateInstallmentDueDates(grantDateStr: string, count: number): string[] {
  const grantDate = parseISO(grantDateStr);
  if (!isValid(grantDate)) {
    throw new Error(`Fecha de otorgamiento inválida: ${grantDateStr}`);
  }
  if (count < 1 || count > 36) {
    throw new Error(`Cantidad de cuotas inválida: ${count}`);
  }

  const firstDue = getFirstInstallmentDueDate(grantDate);

  return Array.from({ length: count }, (_, i) =>
    format(endOfMonth(addMonths(firstDue, i)), "yyyy-MM-dd")
  );
}

// Mantener compatibilidad con código anterior que usa generateInstallmentDates
// @deprecated Usar generateInstallmentDueDates en su lugar
export function generateInstallmentDates(baseDateStr: string, count: number): string[] {
  return generateInstallmentDueDates(baseDateStr, count);
}

// ─── Formateo ─────────────────────────────────────────────────────────────────

export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "-";
  const d = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
  if (!isValid(d)) return "-";
  return format(d, "dd/MM/yyyy", { locale: es });
}

export function formatMonthYear(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "-";
  const d = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
  if (!isValid(d)) return "-";
  return format(d, "MMMM yyyy", { locale: es });
}

export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function toISODate(date: Date = new Date()): string {
  return format(date, "yyyy-MM-dd");
}

export function isOverdue(dueDateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseISO(dueDateStr);
  return isValid(due) && due < today;
}

// ─── Utilidades para el cron de pagos automáticos ────────────────────────────

/**
 * Dado el día de proceso, devuelve el último día del mes anterior.
 * Las cuotas con due_date <= este valor se consideran vencidas y pagables.
 *
 * Ejemplo: processDate = 01/06/2026 → cutoffDate = 31/05/2026
 */
export function getCutoffDateForAutoPayment(processDate: Date = new Date()): string {
  return format(endOfMonth(subMonths(processDate, 1)), "yyyy-MM-dd");
}

/**
 * Devuelve el período de liquidación municipal para un mes/año dado.
 * Período: día 20 del mes anterior → día 19 del mes indicado.
 *
 * Ejemplo: month=5, year=2026 → { start: "2026-04-20", end: "2026-05-19" }
 */
export function getMunicipalityPeriod(month: number, year: number): { start: string; end: string } {
  const endDate = new Date(year, month - 1, 19);
  const startDate = setDate(subMonths(endDate, 1), 20);
  return {
    start: format(startDate, "yyyy-MM-dd"),
    end: format(endDate, "yyyy-MM-dd"),
  };
}
