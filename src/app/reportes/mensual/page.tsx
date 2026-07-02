import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import {
  getDashboardSummary,
  getDashboardGlobals,
  getDashboardAnalytics,
  getMonthlyHistory,
} from "@/lib/services/dashboard.service";
import { getInstallmentsSummaryByMonth } from "@/lib/services/installments.service";
import { formatCurrencyARS } from "@/lib/utils/currency";
import { ReportControls } from "./report-controls";

export const metadata: Metadata = { title: "Reporte mensual" };
export const dynamic = "force-dynamic";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const TYPE_PALETTE = ["#4f46e5", "#0d9488", "#d97706", "#db2777", "#6b7280"];

interface PageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function ReporteMensualPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const now = new Date();
  const month = sp.month ? Math.min(12, Math.max(1, Number(sp.month))) : now.getMonth() + 1;
  const year = sp.year ? Number(sp.year) : now.getFullYear();

  const [summary, globals, analytics, history, inst] = await Promise.all([
    getDashboardSummary(month, year),
    getDashboardGlobals(),
    getDashboardAnalytics(month, year),
    getMonthlyHistory(6),
    getInstallmentsSummaryByMonth(year, month),
  ]);

  const periodLabel = `${MONTHS[month - 1]} ${year}`;
  const generatedAt = now.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });

  // Cobranza del mes (cuotas que vencían en el período)
  const paidCount = Number(inst?.paid_count ?? 0);
  const pendingCount = Number(inst?.pending_count ?? 0);
  const overdueCount = Number(inst?.overdue_count ?? 0);
  const totalPaid = Number(inst?.total_paid ?? 0);
  const totalPending = Number(inst?.total_pending ?? 0);
  const uncollectedCount = pendingCount + overdueCount;
  const dueCount = paidCount + pendingCount + overdueCount;
  const collectedPct = dueCount > 0 ? Math.round((paidCount / dueCount) * 100) : 0;

  // Distribución por tipo (del mes)
  const byType = analytics.benefitsByType;
  const typeTotal = byType.reduce((acc, t) => acc + t.amount, 0);

  // Top comercios (del mes)
  const topCommerce = analytics.topCommerces.slice(0, 6);
  const maxCommerce = Math.max(1, ...topCommerce.map((c) => c.amount));

  // Evolución (cronológica, últimos 6 meses)
  const evolution = [...history].reverse().map((r) => ({
    label: r.monthLabel.split(" ")[0]?.slice(0, 3) ?? r.month,
    full: r.monthLabel,
    entregado: r.capitalDelivered,
    cobrado: r.paidAmount,
    beneficios: r.benefitsCount,
  }));

  return (
    <div
      className="mx-auto max-w-4xl p-6 print:p-0"
      style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" } as React.CSSProperties}
    >
      <ReportControls month={month} year={year} />

      {/* Documento */}
      <div className="mt-4 rounded-lg border bg-white p-8 print:border-0 print:p-0 print:shadow-none">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">Sistema Sindical</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Reporte mensual de cierre</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">{periodLabel}</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Generado el {generatedAt}</p>
          </div>
        </div>

        {/* Indicadores del mes */}
        <SectionTitle>Lo que pasó en {periodLabel}</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Afiliados nuevos" value={`+${summary.newAffiliatesCount}`} tone="blue" />
          <Stat label="Beneficios otorgados" value={String(summary.benefitsCount)} />
          <Stat label="Cuotas cobradas" value={String(paidCount)} tone="green" />
          <Stat label="Cuotas sin cobrar" value={String(uncollectedCount)} tone={uncollectedCount > 0 ? "red" : undefined} />
        </div>
        <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
          Cartera global: {globals.totalAffiliates} afiliados · {globals.activeBenefits} beneficios activos · {globals.finishedBenefits} finalizados.
        </p>

        {/* Resumen financiero del período */}
        <SectionTitle>Resumen financiero — {periodLabel}</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Metric label="Capital entregado" value={formatCurrencyARS(summary.capitalDelivered)} sub={`${summary.benefitsCount} beneficios`} />
          <Metric label="Total a cobrar" value={formatCurrencyARS(summary.totalToCollect)} sub="capital + intereses" />
          <Metric label="Interés total" value={formatCurrencyARS(summary.estimatedProfit)} accent="orange" />
          <Metric label="Interés cobrado" value={formatCurrencyARS(summary.collectedProfit)} accent="green" />
          <Metric label="Retenido a comercios" value={formatCurrencyARS(summary.amountRetainedThisMonth)} accent="green" sub="ganancia por retención" />
          <Metric label="Falta cobrar (período)" value={formatCurrencyARS(summary.pendingToCollect)} accent="yellow" sub={`${summary.pendingInstallmentsCount} cuotas`} />
        </div>

        {/* Cobranza del mes */}
        <SectionTitle>Cobranza del mes — ¿se cobraron las cuotas?</SectionTitle>
        {dueCount === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">No había cuotas con vencimiento en {periodLabel}.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Cobradas" value={formatCurrencyARS(totalPaid)} accent="green" sub={`${paidCount} cuotas`} />
              <Metric label="Pendientes" value={formatCurrencyARS(Math.max(0, totalPending))} accent="yellow" sub={`${pendingCount} cuotas`} />
              <Metric label="Vencidas (no cobradas)" value={String(overdueCount)} accent={overdueCount > 0 ? "red" : undefined} sub={overdueCount > 0 ? "requieren seguimiento" : "sin mora"} />
            </div>
            {/* Barra de cumplimiento */}
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-[hsl(var(--muted-foreground))]">
                <span>{collectedPct}% cobrado</span>
                <span>{dueCount} cuotas con vencimiento en el mes</span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="bg-emerald-500" style={{ width: `${dueCount ? (paidCount / dueCount) * 100 : 0}%` }} />
                <div className="bg-yellow-400" style={{ width: `${dueCount ? (pendingCount / dueCount) * 100 : 0}%` }} />
                <div className="bg-red-500" style={{ width: `${dueCount ? (overdueCount / dueCount) * 100 : 0}%` }} />
              </div>
              <div className="mt-1.5 flex gap-4 text-xs">
                <Legend color="bg-emerald-500" label={`Cobradas (${paidCount})`} />
                <Legend color="bg-yellow-400" label={`Pendientes (${pendingCount})`} />
                <Legend color="bg-red-500" label={`Vencidas (${overdueCount})`} />
              </div>
            </div>
          </>
        )}

        {/* Distribución por tipo */}
        <SectionTitle>¿En qué se otorgaron los beneficios?</SectionTitle>
        {byType.length === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Sin beneficios otorgados en el período.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-6">
            <Donut slices={byType.map((t, i) => ({ value: t.amount, color: TYPE_PALETTE[i % TYPE_PALETTE.length] }))} />
            <div className="min-w-[220px] flex-1 space-y-2">
              {byType.map((t, i) => {
                const pct = typeTotal > 0 ? Math.round((t.amount / typeTotal) * 100) : 0;
                return (
                  <div key={t.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: TYPE_PALETTE[i % TYPE_PALETTE.length] }} />
                      {t.label}
                    </span>
                    <span className="text-[hsl(var(--muted-foreground))]">
                      {pct}% · {formatCurrencyARS(t.amount)} · {t.value} benef.
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Evolución 6 meses */}
        <SectionTitle>Evolución de los últimos 6 meses</SectionTitle>
        <MonthlyBars rows={evolution} />

        {/* Top comercios */}
        {topCommerce.length > 0 && (
          <>
            <SectionTitle>Top comercios / destinos</SectionTitle>
            <div className="space-y-2">
              {topCommerce.map((c) => (
                <div key={c.commerce} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="truncate font-medium">{c.commerce}</span>
                    <span className="text-[hsl(var(--muted-foreground))]">{formatCurrencyARS(c.amount)} · {c.count}</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.round((c.amount / maxCommerce) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Mora global (contexto) */}
        {globals.overdueInstallmentsCount > 0 && (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <strong>Mora acumulada de la cartera:</strong> {formatCurrencyARS(globals.totalOverdue)} en {globals.overdueInstallmentsCount} cuotas vencidas (todos los períodos).
          </p>
        )}

        {/* Pie de página */}
        <div className="mt-8 flex justify-between border-t pt-3 text-xs text-[hsl(var(--muted-foreground))]">
          <span>Sistema Sindical · Reporte de cierre {periodLabel}</span>
          <span>Documento generado el {generatedAt}</span>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 mt-6 text-sm font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{children}</h2>;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "blue" | "green" | "red" }) {
  const styles = {
    blue: { box: "border-blue-200 bg-blue-50/60", text: "text-blue-700" },
    green: { box: "border-emerald-200 bg-emerald-50/60", text: "text-emerald-700" },
    red: { box: "border-red-200 bg-red-50/60", text: "text-red-700" },
  };
  const s = tone ? styles[tone] : null;
  return (
    <div className={`rounded-lg border p-3 text-center ${s ? s.box : ""}`}>
      <p className={`text-2xl font-bold ${s ? s.text : ""}`}>{value}</p>
      <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
    </div>
  );
}

function Metric({
  label, value, sub, accent,
}: {
  label: string; value: string; sub?: string; accent?: "green" | "yellow" | "orange" | "red";
}) {
  const colors = {
    green: "text-green-700",
    yellow: "text-yellow-700",
    orange: "text-orange-600",
    red: "text-red-700",
  };
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${accent ? colors[accent] : ""}`}>{value}</p>
      {sub && <p className="text-xs text-[hsl(var(--muted-foreground))]">{sub}</p>}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]">
      <span className={`h-2.5 w-2.5 rounded-sm ${color}`} />
      {label}
    </span>
  );
}

function MonthlyBars({ rows }: { rows: Array<{ label: string; full: string; entregado: number; cobrado: number; beneficios: number }> }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.entregado, r.cobrado]));
  return (
    <div>
      <div className="flex items-end gap-3" style={{ height: "160px" }}>
        {rows.map((r) => (
          <div key={r.full} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-end justify-center gap-1.5" style={{ height: "140px" }}>
              <div
                className="w-3.5 rounded-t bg-blue-500"
                style={{ height: `${Math.max(r.entregado > 0 ? 3 : 0, (r.entregado / max) * 100)}%` }}
                title={`${r.full} — Entregado: ${formatCurrencyARS(r.entregado)} · ${r.beneficios} beneficios`}
              />
              <div
                className="w-3.5 rounded-t bg-emerald-500"
                style={{ height: `${Math.max(r.cobrado > 0 ? 3 : 0, (r.cobrado / max) * 100)}%` }}
                title={`${r.full} — Cobrado: ${formatCurrencyARS(r.cobrado)}`}
              />
            </div>
            <span className="text-[10px] capitalize text-[hsl(var(--muted-foreground))]">{r.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-center gap-4 text-xs">
        <Legend color="bg-blue-500" label="Capital entregado" />
        <Legend color="bg-emerald-500" label="Cobrado" />
      </div>
    </div>
  );
}

function Donut({ slices }: { slices: { value: number; color: string }[] }) {
  const total = slices.reduce((acc, s) => acc + s.value, 0);
  const r = 52;
  const c = 2 * Math.PI * r;
  let cumulative = 0;

  return (
    <svg width={140} height={140} viewBox="0 0 140 140" className="shrink-0">
      <g transform="translate(70,70) rotate(-90)">
        <circle r={r} fill="none" stroke="#f1f5f9" strokeWidth={20} />
        {total > 0 &&
          slices.map((s, i) => {
            const frac = s.value / total;
            const dash = frac * c;
            const offset = -(cumulative / total) * c;
            cumulative += s.value;
            return (
              <circle
                key={i}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={20}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={offset}
              />
            );
          })}
      </g>
    </svg>
  );
}
