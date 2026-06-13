import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { auth } from "@/lib/auth";
import {
  getDashboardSummary,
  getBenefitBreakdowns,
  getDashboardGlobals,
} from "@/lib/services/dashboard.service";
import { getCollectionsSummary } from "@/lib/services/installments.service";
import { formatCurrencyARS } from "@/lib/utils/currency";
import { getBenefitTypeLabel } from "@/lib/utils/benefit-types";
import { ReportControls } from "./report-controls";

export const metadata: Metadata = { title: "Reporte mensual" };
export const dynamic = "force-dynamic";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const TYPE_COLORS: Record<string, string> = {
  ayuda_economica: "#4f46e5",
  supermercado: "#0d9488",
  otro: "#6b7280",
};

interface PageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function ReporteMensualPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const now = new Date();
  const month = sp.month ? Math.min(12, Math.max(1, Number(sp.month))) : now.getMonth() + 1;
  const year = sp.year ? Number(sp.year) : now.getFullYear();

  const [summary, breakdowns, globals, collections] = await Promise.all([
    getDashboardSummary(month, year),
    getBenefitBreakdowns(month, year),
    getDashboardGlobals(),
    getCollectionsSummary(month, year),
  ]);

  const periodLabel = `${MONTHS[month - 1]} ${year}`;
  const generatedAt = now.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
  const totalUncollected = collections.pendingTotal + collections.overdueTotal;

  const byType = breakdowns.byType;
  const typeTotal = byType.reduce((acc, t) => acc + t.totalAmount, 0);
  const topCommerce = breakdowns.byCommerce.slice(0, 6);
  const maxCommerce = Math.max(1, ...topCommerce.map((c) => c.totalAmount));

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

        {/* Indicadores globales */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <Stat label="Afiliados totales" value={String(globals.totalAffiliates)} />
          <Stat label="Beneficios activos" value={String(globals.activeBenefits)} />
          <Stat label="Beneficios finalizados" value={String(globals.finishedBenefits)} />
        </div>

        {/* Resumen financiero del período */}
        <SectionTitle>Resumen financiero — {periodLabel}</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Metric label="Capital entregado" value={formatCurrencyARS(summary.capitalDelivered)} sub={`${summary.benefitsCount} beneficios`} />
          <Metric label="Total a cobrar" value={formatCurrencyARS(summary.totalToCollect)} sub="capital + intereses" />
          <Metric label="Cobrado" value={formatCurrencyARS(summary.paidAmount)} accent="green" sub={`${summary.paidInstallmentsCount} cuotas`} />
          <Metric label="Falta cobrar" value={formatCurrencyARS(summary.pendingToCollect)} accent="yellow" sub={`${summary.pendingInstallmentsCount} cuotas`} />
          <Metric label="Ganancia estimada" value={formatCurrencyARS(summary.estimatedProfit)} accent="orange" />
          <Metric label="Ganancia cobrada" value={formatCurrencyARS(summary.collectedProfit)} accent="green" />
        </div>

        {/* Distribución por tipo */}
        <SectionTitle>Distribución por tipo de beneficio</SectionTitle>
        {byType.length === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Sin beneficios otorgados en el período.</p>
        ) : (
          <div className="flex items-center gap-6 flex-wrap">
            <Donut slices={byType.map((t) => ({ value: t.totalAmount, color: TYPE_COLORS[t.type] ?? "#6b7280" }))} />
            <div className="flex-1 min-w-[220px] space-y-2">
              {byType.map((t) => {
                const pct = typeTotal > 0 ? Math.round((t.totalAmount / typeTotal) * 100) : 0;
                return (
                  <div key={t.type} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: TYPE_COLORS[t.type] ?? "#6b7280" }} />
                      {getBenefitTypeLabel(t.type)}
                    </span>
                    <span className="text-[hsl(var(--muted-foreground))]">
                      {pct}% · {formatCurrencyARS(t.totalAmount)} · {t.count} benef.
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top comercios */}
        {topCommerce.length > 0 && (
          <>
            <SectionTitle>Top comercios / destinos</SectionTitle>
            <div className="space-y-2">
              {topCommerce.map((c) => (
                <div key={c.commerce} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{c.commerce}</span>
                    <span className="text-[hsl(var(--muted-foreground))]">
                      {formatCurrencyARS(c.totalAmount)} · {c.count}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${Math.round((c.totalAmount / maxCommerce) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Cobranzas */}
        <SectionTitle>Situación de cobranzas</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          <Metric label="Total sin cobrar" value={formatCurrencyARS(totalUncollected)} sub={`${collections.pendingCount + collections.overdueCount} cuotas`} />
          <Metric label="Vencidas (mora)" value={formatCurrencyARS(collections.overdueTotal)} accent={collections.overdueCount > 0 ? "red" : undefined} sub={`${collections.overdueCount} cuotas`} />
          <Metric label="Afiliados afectados" value={String(collections.affiliatesCount)} sub={collections.oldestDueDate ? "con deuda pendiente" : "sin deuda"} />
        </div>

        {/* Pie de página */}
        <div className="mt-8 border-t pt-3 text-xs text-[hsl(var(--muted-foreground))] flex justify-between">
          <span>Sistema Sindical · Reporte de cierre {periodLabel}</span>
          <span>Documento generado el {generatedAt}</span>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mt-6 mb-3">{children}</h2>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{label}</p>
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
      <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wide font-medium">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${accent ? colors[accent] : ""}`}>{value}</p>
      {sub && <p className="text-xs text-[hsl(var(--muted-foreground))]">{sub}</p>}
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
