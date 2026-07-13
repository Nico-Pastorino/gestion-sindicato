/**
 * Casos de prueba para la nueva regla del cron de cobro automático
 * (último día hábil del mes). No usa un framework de testing porque el
 * proyecto no tiene uno configurado; corre standalone con:
 *
 *   npx tsx scripts/test-cron-fin-de-mes.ts
 *
 * Verifica: isLastBusinessDayOfMonth, getCutoffDateForAutoPayment y
 * getPaidDateForAutoPayment para fin de mes en viernes, sábado, domingo,
 * febrero y el corte diciembre → enero.
 */
import {
  isLastBusinessDayOfMonth,
  getCutoffDateForAutoPayment,
  getPaidDateForAutoPayment,
} from "../src/lib/utils/date";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "OK  " : "FAIL"} ${label} → ${JSON.stringify(actual)}${ok ? "" : ` (esperado ${JSON.stringify(expected)})`}`);
  if (!ok) failures++;
}

function d(y: number, m: number, day: number) {
  return new Date(y, m - 1, day);
}

console.log("── Fin de mes en VIERNES (enero 2025: 31/01 es viernes) ──");
check("30/01 (jueves) NO es último hábil", isLastBusinessDayOfMonth(d(2025, 1, 30)), false);
check("31/01 (viernes) SÍ es último hábil", isLastBusinessDayOfMonth(d(2025, 1, 31)), true);
check("cutoff en 31/01", getCutoffDateForAutoPayment(d(2025, 1, 31)), "2025-01-31");
check("paidDate = mismo día (31/01)", getPaidDateForAutoPayment(d(2025, 1, 31)), "2025-01-31");
check("30/01 no dispara (cutoff null)", getCutoffDateForAutoPayment(d(2025, 1, 30)), null);

console.log("\n── Fin de mes en SÁBADO (mayo 2025: 31/05 es sábado) ──");
check("30/05 (viernes) SÍ es último hábil", isLastBusinessDayOfMonth(d(2025, 5, 30)), true);
check("31/05 (sábado) NO es último hábil", isLastBusinessDayOfMonth(d(2025, 5, 31)), false);
check("cutoff en 30/05 → 31/05 (fin de mes calendario)", getCutoffDateForAutoPayment(d(2025, 5, 30)), "2025-05-31");
check("paidDate = 30/05 (el día que corre, no el 31)", getPaidDateForAutoPayment(d(2025, 5, 30)), "2025-05-30");
check("31/05 no dispara (cutoff null)", getCutoffDateForAutoPayment(d(2025, 5, 31)), null);

console.log("\n── Fin de mes en DOMINGO (agosto 2025: 31/08 es domingo) ──");
check("29/08 (viernes) SÍ es último hábil", isLastBusinessDayOfMonth(d(2025, 8, 29)), true);
check("31/08 (domingo) NO es último hábil", isLastBusinessDayOfMonth(d(2025, 8, 31)), false);
check("cutoff en 29/08 → 31/08 (fin de mes calendario)", getCutoffDateForAutoPayment(d(2025, 8, 29)), "2025-08-31");
check("paidDate = 29/08", getPaidDateForAutoPayment(d(2025, 8, 29)), "2025-08-29");

console.log("\n── Febrero (2025: 28/02 es viernes; 2026: 28/02 es sábado, año no bisiesto) ──");
check("28/02/2025 (viernes) SÍ es último hábil", isLastBusinessDayOfMonth(d(2025, 2, 28)), true);
check("cutoff en 28/02/2025", getCutoffDateForAutoPayment(d(2025, 2, 28)), "2025-02-28");
check("27/02/2026 (viernes, 28 cae sábado) SÍ es último hábil", isLastBusinessDayOfMonth(d(2026, 2, 27)), true);
check("cutoff en 27/02/2026 → 28/02/2026", getCutoffDateForAutoPayment(d(2026, 2, 27)), "2026-02-28");
check("28/02/2026 (sábado) NO es último hábil", isLastBusinessDayOfMonth(d(2026, 2, 28)), false);

console.log("\n── Diciembre → enero (2025: 31/12 es miércoles, no afecta enero) ──");
check("31/12/2025 (miércoles) SÍ es último hábil", isLastBusinessDayOfMonth(d(2025, 12, 31)), true);
check("cutoff en 31/12/2025 (no confunde con enero)", getCutoffDateForAutoPayment(d(2025, 12, 31)), "2025-12-31");
check("01/01/2026 NO es último hábil de enero", isLastBusinessDayOfMonth(d(2026, 1, 1)), false);
check("30/01/2026 (viernes, 31 cae sábado) SÍ es último hábil de enero", isLastBusinessDayOfMonth(d(2026, 1, 30)), true);
check("cutoff en 30/01/2026 → 31/01/2026", getCutoffDateForAutoPayment(d(2026, 1, 30)), "2026-01-31");

console.log(`\n${failures === 0 ? "TODOS LOS CASOS PASARON" : `${failures} CASO(S) FALLARON`}`);
process.exit(failures === 0 ? 0 : 1);
