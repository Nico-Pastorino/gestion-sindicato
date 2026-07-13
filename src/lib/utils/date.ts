import { format, addMonths, subMonths, subDays, parseISO, isValid, endOfMonth, setDate } from "date-fns";
import { es } from "date-fns/locale";

// ─── Regla de corte día 19 ────────────────────────────────────────────────────
//
// Los afiliados cobran el ÚLTIMO DÍA del mes.
// La municipalidad retiene el descuento en ese mismo pago.
//
// Regla (igual que el período municipal, que corre del 20 al 19):
//   - Si el beneficio se otorga entre día 1 y día 19 (inclusive):
//     → la primera cuota se cobra el último día de ESE MISMO mes.
//   - Si el beneficio se otorga desde el día 20 en adelante:
//     → la primera cuota se cobra el último día del MES SIGUIENTE.
//   - Las cuotas siguientes son siempre el último día de cada mes subsiguiente.
//
// Coincide con el período de liquidación municipal (20 del mes anterior → 19
// del mes actual): lo otorgado desde el día 20 entra en la liquidación siguiente.
//
// Ejemplos:
//   10/05/2026 → 31/05, 30/06, 31/07
//   19/05/2026 → 31/05, 30/06, 31/07
//   20/05/2026 → 30/06, 31/07, 31/08
//   25/05/2026 → 30/06, 31/07, 31/08

/**
 * Dado el día de otorgamiento, devuelve la fecha de la primera cuota.
 * La primera cuota siempre cae el ÚLTIMO DÍA del mes correspondiente.
 */
export function getFirstInstallmentDueDate(grantDate: Date): Date {
  const day = grantDate.getDate();
  if (day <= 19) {
    // Día 1–19: la primera cuota cae el último día del mismo mes
    return endOfMonth(grantDate);
  } else {
    // Día 20 en adelante: la primera cuota pasa al último día del mes siguiente
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
 * Último día hábil (lunes a viernes) del mes correspondiente a `date`.
 * Si el último día calendario cae sábado o domingo, retrocede al viernes.
 */
function lastBusinessDayOfMonth(date: Date): Date {
  let d = endOfMonth(date);
  const dayOfWeek = d.getDay(); // 0 = domingo, 6 = sábado
  if (dayOfWeek === 0) d = subDays(d, 2);
  else if (dayOfWeek === 6) d = subDays(d, 1);
  return d;
}

/**
 * True si `date` es el último día hábil de su mes.
 * Función pura: no depende de la hora actual ni de I/O.
 */
export function isLastBusinessDayOfMonth(date: Date): boolean {
  const last = lastBusinessDayOfMonth(date);
  return (
    date.getFullYear() === last.getFullYear() &&
    date.getMonth() === last.getMonth() &&
    date.getDate() === last.getDate()
  );
}

/**
 * Regla de cobro automático (último día hábil del mes):
 * - El cron corre todos los días entre el 25 y el 31 (por si el mes es más
 *   corto o el último día hábil cae antes del 31), pero solo actúa si
 *   `processDate` ES el último día hábil de su mes.
 * - Ese día se pagan las cuotas con vencimiento hasta el último día
 *   CALENDARIO de ese mismo mes (no del mes anterior).
 *
 * Ejemplos:
 *   Último día hábil = 31/07/2026 (viernes) → cutoff = 31/07/2026.
 *   Último día hábil = 30/01/2026 (viernes, el 31 cae sábado) → cutoff = 31/01/2026.
 */
export function getCutoffDateForAutoPayment(processDate: Date = new Date()): string | null {
  if (!isLastBusinessDayOfMonth(processDate)) return null;
  return format(endOfMonth(processDate), "yyyy-MM-dd");
}

/**
 * Fecha de pago = el día que corre el proceso (el último día hábil del mes).
 */
export function getPaidDateForAutoPayment(processDate: Date = new Date()): string | null {
  if (!isLastBusinessDayOfMonth(processDate)) return null;
  return format(processDate, "yyyy-MM-dd");
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
