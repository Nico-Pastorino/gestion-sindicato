// ─── Score de cumplimiento de pagos por afiliado ─────────────────────────────
// Mide qué porcentaje de las cuotas que YA vencieron fueron efectivamente
// cobradas (retenidas por la municipalidad o pagadas manualmente). Las cuotas
// todavía no vencidas y las canceladas no cuentan, porque no aportan información
// sobre el cumplimiento histórico.

export type ComplianceLevel =
  | "excellent"
  | "good"
  | "warning"
  | "critical"
  | "none";

export interface ComplianceScore {
  /** Porcentaje 0-100, o null si no hay cuotas vencidas todavía. */
  score: number | null;
  /** Cuotas vencidas consideradas (cobradas + no cobradas). */
  total: number;
  /** Cuotas vencidas cobradas. */
  collected: number;
  /** Cuotas vencidas sin cobrar (mora). */
  uncollected: number;
  level: ComplianceLevel;
}

interface InstallmentLike {
  status: string;
  dueDate: string;
}

export function calculateComplianceScore(
  installments: InstallmentLike[],
  today: string = new Date().toISOString().split("T")[0]
): ComplianceScore {
  // Solo cuotas ya vencidas (due_date <= hoy) y no canceladas.
  const due = installments.filter(
    (i) => i.status !== "cancelled" && i.dueDate <= today
  );

  const total = due.length;
  const collected = due.filter((i) => i.status === "paid").length;
  const uncollected = total - collected;

  if (total === 0) {
    return { score: null, total: 0, collected: 0, uncollected: 0, level: "none" };
  }

  const score = Math.round((collected / total) * 100);

  let level: ComplianceLevel;
  if (score >= 95) level = "excellent";
  else if (score >= 85) level = "good";
  else if (score >= 70) level = "warning";
  else level = "critical";

  return { score, total, collected, uncollected, level };
}

export function complianceLevelLabel(level: ComplianceLevel): string {
  switch (level) {
    case "excellent":
      return "Excelente";
    case "good":
      return "Bueno";
    case "warning":
      return "A vigilar";
    case "critical":
      return "Riesgoso";
    case "none":
      return "Sin historial";
  }
}
