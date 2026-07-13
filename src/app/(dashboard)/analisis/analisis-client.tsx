"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  CalendarClock,
  ChevronRight,
  DollarSign,
  FileDown,
  FileText,
  Gauge,
  Gift,
  Minus,
  PieChart,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SensitiveValue } from "@/components/privacy/sensitive-value";
import { formatCurrencyARS } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { getBenefitTypeLabel } from "@/lib/utils/benefit-types";
import type {
  DashboardSummary,
  MonthlyHistoryRow,
  DashboardGlobals,
  DashboardAnalytics,
  AnalysisInsights,
} from "@/lib/services/dashboard.service";

// Análisis: pensado para responder de un vistazo tres preguntas
//   1. ¿Cuánto ganó el sindicato?  2. ¿Cuánto le deben?  3. ¿Cuánto ya cobró?
// El resto (mes, evolución, seguimiento) viene después, en ese orden.

interface AnalysisClientProps {
  initialMonth: number;
  initialYear: number;
  periodLabel: string;
  summary: DashboardSummary;
  monthlyHistory: MonthlyHistoryRow[];
  globals: DashboardGlobals;
  analytics: DashboardAnalytics;
  insights: AnalysisInsights;
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function AnalysisClient({
  initialMonth,
  initialYear,
  periodLabel,
  summary: initSummary,
  monthlyHistory: initHistory,
  globals: initGlobals,
  analytics: initAnalytics,
  insights,
}: AnalysisClientProps) {
  const router = useRouter();
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [label, setLabel] = useState(periodLabel);
  const [summary, setSummary] = useState(initSummary);
  const [history, setHistory] = useState(initHistory);
  const [globals, setGlobals] = useState(initGlobals);
  const [analytics, setAnalytics] = useState(initAnalytics);
  const [isLoading, startTransition] = useTransition();

  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => currentYear - 2 + i);
  const p = `month=${month}&year=${year}`;

  function loadPeriod(m: number, y: number) {
    startTransition(async () => {
      const res = await fetch(`/api/dashboard?month=${m}&year=${y}`);
      const json = await res.json();
      if (json.ok) {
        setSummary(json.summary);
        setHistory(json.monthlyHistory);
        setGlobals(json.globals);
        setAnalytics(json.analytics);
        setLabel(json.period.label);
      }
    });
    router.replace(`/analisis?month=${m}&year=${y}`, { scroll: false });
  }

  function handleMonth(m: number) { setMonth(m); loadPeriod(m, year); }
  function handleYear(y: number) { setYear(y); loadPeriod(month, y); }
  function setQuick(mOffset: number) {
    const d = new Date(now.getFullYear(), now.getMonth() - mOffset, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    setMonth(m); setYear(y); loadPeriod(m, y);
  }

  // Mes anterior (para las flechas de variación)
  const prevDate = new Date(year, month - 2, 1);
  const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const prev = history.find((r) => r.month === prevKey);

  return (
    <div className="space-y-8">
      {/* ── Encabezado ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Análisis
          </h1>
          <p className="mt-0.5 text-sm text-[hsl(var(--muted-foreground))]">
            La situación financiera del sindicato, de un vistazo.
          </p>
        </div>
        {isLoading && (
          <span className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Actualizando…
          </span>
        )}
      </div>

      {/* ════════════ LA FOTO DE HOY ════════════ */}
      <HeroFinanciero globals={globals} />

      {/* Alerta de mora (solo si hay) */}
      {globals.overdueInstallmentsCount > 0 && (
        <Link
          href="/cobranzas?status=overdue"
          className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 transition-colors hover:bg-red-100/70"
        >
          <span className="flex items-center gap-2.5 text-sm font-medium text-red-800">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
            <span>
              <SensitiveValue value={formatCurrencyARS(globals.totalOverdue)} /> vencidos en{" "}
              {globals.overdueInstallmentsCount} cuota{globals.overdueInstallmentsCount !== 1 ? "s" : ""} de{" "}
              {globals.affectedOverdueAffiliates} afiliado{globals.affectedOverdueAffiliates !== 1 ? "s" : ""} — revisá la cobranza
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-red-600" />
        </Link>
      )}

      {/* ════════════ EL MES ELEGIDO ════════════ */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionTitle
            title={`El mes: ${label}`}
            subtitle="Solo los beneficios otorgados en este mes. Las flechas comparan con el mes anterior."
          />
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <select value={month} onChange={(e) => handleMonth(Number(e.target.value))} aria-label="Mes"
              className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1.5 text-sm font-medium">
              {MONTHS.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
            </select>
            <select value={year} onChange={(e) => handleYear(Number(e.target.value))} aria-label="Año"
              className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1.5 text-sm font-medium">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/reportes/mensual?${p}`} target="_blank"><FileText className="h-4 w-4" />Reporte PDF</Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 print:hidden">
          {[
            { text: "Este mes", offset: 0 },
            { text: "Mes anterior", offset: 1 },
            { text: "Hace 3 meses", offset: 3 },
            { text: "Hace 6 meses", offset: 6 },
          ].map(({ text, offset }) => (
            <button key={offset} onClick={() => setQuick(offset)}
              className="rounded-full border px-2.5 py-0.5 text-xs transition-colors hover:bg-[hsl(var(--accent))]">
              {text}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ClickCard href={`/analisis/capital-entregado?${p}`} icon={<DollarSign className="h-5 w-5 text-blue-600" />} iconBg="bg-blue-50"
            label="Otorgado en el mes" value={formatCurrencyARS(summary.capitalDelivered)}
            sub={`${summary.benefitsCount} beneficio${summary.benefitsCount !== 1 ? "s" : ""}`}
            delta={pctDelta(summary.capitalDelivered, prev?.capitalDelivered)} />
          <ClickCard href={`/analisis/cobrado?${p}`} icon={<WalletCards className="h-5 w-5 text-green-600" />} iconBg="bg-green-50"
            label="Cobrado del mes" value={formatCurrencyARS(summary.paidAmount)}
            sub={`${summary.paidInstallmentsCount} cuota${summary.paidInstallmentsCount !== 1 ? "s" : ""}`}
            delta={pctDelta(summary.paidAmount, prev?.paidAmount)} />
          <ClickCard href={`/analisis/ganancia-estimada?${p}`} icon={<TrendingUp className="h-5 w-5 text-orange-600" />} iconBg="bg-orange-50"
            label="Ganancia del mes" value={formatCurrencyARS(summary.unionProfit)}
            sub={`Intereses ${formatCurrencyARS(summary.estimatedProfit)} · Comercios ${formatCurrencyARS(summary.commerceRetentionProfit)}`}
            delta={pctDelta(summary.unionProfit, prev?.unionProfit)} />
          <ClickCard href={`/analisis/falta-cobrar?${p}`} icon={<CalendarClock className="h-5 w-5 text-amber-600" />} iconBg="bg-amber-50"
            label="Queda por cobrar" value={formatCurrencyARS(summary.pendingToCollect)}
            sub={`${summary.pendingInstallmentsCount} cuota${summary.pendingInstallmentsCount !== 1 ? "s" : ""} pendiente${summary.pendingInstallmentsCount !== 1 ? "s" : ""}`}
            alert={summary.overdueInstallmentsCount > 0} />
        </div>

        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          En {year} van{" "}
          <span className="font-semibold text-[hsl(var(--foreground))]">
            <SensitiveValue value={formatCurrencyARS(summary.amountRetainedThisYear)} />
          </span>{" "}
          de ganancia con {summary.benefitsThisYear} beneficio{summary.benefitsThisYear !== 1 ? "s" : ""} otorgado{summary.benefitsThisYear !== 1 ? "s" : ""}.
        </p>
      </section>

      {/* ════════════ EVOLUCIÓN Y ORIGEN ════════════ */}
      <section className="space-y-4">
        <SectionTitle title="Evolución y origen de la ganancia" subtitle="Últimos 6 meses y de dónde sale la plata." />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4 text-teal-600" /> Evolución (6 meses)</CardTitle>
            </CardHeader>
            <CardContent><MiniAreaChart rows={historyRows(history)} /></CardContent>
          </Card>
          <DonutCard title="¿Qué se otorga más?" icon={<PieChart className="h-4 w-4 text-blue-600" />}
            rows={analytics.benefitsByType.map((r) => ({ label: r.label, value: r.amount, caption: formatCurrencyARS(r.amount) }))}
            emptyText="Sin beneficios en el período." />
          <CommerceRankingCard title="Top comercios del período" rows={analytics.topCommerces} />
        </div>

        {/* Historial mensual */}
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                  <th className="px-4 py-2.5 text-left font-semibold">Mes</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Beneficios</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Otorgado</th>
                  <th className="hidden px-3 py-2.5 text-right font-semibold md:table-cell">Cobrado</th>
                  <th className="hidden px-3 py-2.5 text-right font-semibold md:table-cell">Ganancia</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Falta cobrar</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.map((row) => {
                  const isSelected = row.month === `${year}-${String(month).padStart(2, "0")}`;
                  const [hy, hm] = row.month.split("-");
                  return (
                    <tr key={row.month}
                      className={`cursor-pointer transition-colors hover:bg-[hsl(var(--accent))]/40 ${isSelected ? "bg-blue-50 font-medium" : ""}`}
                      onClick={() => { handleMonth(Number(hm)); handleYear(Number(hy)); }}>
                      <td className="px-4 py-2.5 capitalize">
                        {row.monthLabel}
                        {isSelected && <span className="ml-2 text-xs font-normal text-blue-600">seleccionado</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[hsl(var(--muted-foreground))]">{row.benefitsCount}</td>
                      <td className="px-3 py-2.5 text-right font-medium"><SensitiveValue value={formatCurrencyARS(row.capitalDelivered)} /></td>
                      <td className="hidden px-3 py-2.5 text-right text-green-700 md:table-cell"><SensitiveValue value={formatCurrencyARS(row.paidAmount)} /></td>
                      <td className="hidden px-3 py-2.5 text-right text-orange-600 md:table-cell"><SensitiveValue value={formatCurrencyARS(row.unionProfit)} /></td>
                      <td className="px-3 py-2.5 text-right font-semibold"><SensitiveValue value={formatCurrencyARS(row.pendingToCollect)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      {/* ════════════ PARA MIRAR DE CERCA ════════════ */}
      <section className="space-y-4">
        <SectionTitle
          title="Para mirar de cerca"
          subtitle="Afiliados cerca de su límite, beneficios por terminar y quiénes más usan el sistema."
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <NearLimitCard rows={insights.nearLimitAffiliates} />
          <EndingSoonCard rows={insights.endingSoonBenefits} />
          <TopUsageCard rows={insights.topUsageAffiliates} />
        </div>
      </section>

      {/* ── Exportes ── */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <FileDown className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="font-semibold">Exportes mensuales</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                El archivo para la municipalidad se genera y controla desde Exportar.
              </p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href="/exportar">Ir a Exportar<ChevronRight className="h-4 w-4" /></Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── La foto de hoy ───────────────────────────────────────────────────────────
// Un solo bloque que cuenta la historia de la plata en orden natural:
// prestó → va ganando → ya cobró → le deben. Toda la cartera, no depende
// del mes elegido.

function HeroFinanciero({ globals }: { globals: DashboardGlobals }) {
  const gananciaTotal = globals.totalInterestGenerated + globals.commerceRetentionTotal;
  const gananciaEnMano = globals.totalInterestCollected + globals.commerceRetentionTotal;

  const collectedPct = globals.totalToCollect > 0
    ? (globals.totalCollected / globals.totalToCollect) * 100
    : 0;
  const overduePct = globals.totalToCollect > 0
    ? (globals.totalOverdue / globals.totalToCollect) * 100
    : 0;
  const pendingPct = Math.max(0, 100 - collectedPct - overduePct);

  return (
    <Card className="border-2">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Resumen financiero general</h2>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Toda la cartera, al día de hoy</span>
        </div>

        {/* La historia en una frase */}
        <p className="rounded-lg bg-[hsl(var(--muted))]/40 px-4 py-3 text-sm leading-relaxed">
          El sindicato prestó{" "}
          <strong><SensitiveValue value={formatCurrencyARS(globals.totalCapitalDelivered)} /></strong>{" "}
          y va a recuperar{" "}
          <strong><SensitiveValue value={formatCurrencyARS(globals.totalToCollect)} /></strong>.
          Ya cobró{" "}
          <strong className="text-green-700"><SensitiveValue value={formatCurrencyARS(globals.totalCollected)} /></strong>{" "}
          y le deben{" "}
          <strong className="text-amber-700"><SensitiveValue value={formatCurrencyARS(globals.totalPending)} /></strong>.
          Su ganancia es{" "}
          <strong className="text-orange-700"><SensitiveValue value={formatCurrencyARS(gananciaTotal)} /></strong>
          {gananciaTotal > 0 && (
            <>
              , de la cual{" "}
              <strong><SensitiveValue value={formatCurrencyARS(gananciaEnMano)} /></strong> ya está en mano
            </>
          )}.
        </p>

        {/* Los 4 números, en orden: prestó → gana → cobró → le deben */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <BigNumber
            href="/analisis/capital-entregado?scope=all"
            icon={<DollarSign className="h-5 w-5 text-blue-600" />}
            label="Prestó"
            value={formatCurrencyARS(globals.totalCapitalDelivered)}
            tone="text-blue-700"
            detail={<>Capital entregado en beneficios ({globals.activeBenefits} activos)</>}
          />
          <BigNumber
            href="/analisis/ganancia-estimada?scope=all"
            icon={<TrendingUp className="h-5 w-5 text-orange-600" />}
            label="Va ganando"
            value={formatCurrencyARS(gananciaTotal)}
            tone="text-orange-700"
            highlight
            detail={
              <>
                Intereses <SensitiveValue value={formatCurrencyARS(globals.totalInterestGenerated)} /> + comercios{" "}
                <SensitiveValue value={formatCurrencyARS(globals.commerceRetentionTotal)} />
                <br />
                Ya en mano: <strong><SensitiveValue value={formatCurrencyARS(gananciaEnMano)} /></strong>
              </>
            }
          />
          <BigNumber
            href="/analisis/cobrado?scope=all"
            icon={<WalletCards className="h-5 w-5 text-green-600" />}
            label="Ya cobró"
            value={formatCurrencyARS(globals.totalCollected)}
            tone="text-green-700"
            detail={
              <>
                de <SensitiveValue value={formatCurrencyARS(globals.totalToCollect)} /> a recuperar (capital + interés)
              </>
            }
          />
          <BigNumber
            href="/analisis/falta-cobrar?scope=all"
            icon={<CalendarClock className="h-5 w-5 text-amber-600" />}
            label="Le deben"
            value={formatCurrencyARS(globals.totalPending)}
            tone="text-amber-700"
            detail={
              globals.totalOverdue > 0 ? (
                <span className="font-medium text-red-700">
                  Incluye <SensitiveValue value={formatCurrencyARS(globals.totalOverdue)} /> vencido
                </span>
              ) : (
                <>Sin cuotas vencidas · {globals.pendingInstallmentsCount} cuotas por vencer</>
              )
            }
          />
        </div>

        {/* Una sola barra de cobranza */}
        <div className="space-y-2">
          <div className="flex h-3 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
            <div className="bg-green-500" style={{ width: `${collectedPct}%` }} />
            <div className="bg-yellow-400" style={{ width: `${pendingPct}%` }} />
            <div className="bg-red-500" style={{ width: `${overduePct}%` }} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[hsl(var(--muted-foreground))]">
            <div className="flex flex-wrap gap-4">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500" />Cobrado {Math.round(collectedPct)}%</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />Por vencer {Math.round(pendingPct)}%</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />Vencido {Math.round(overduePct)}%</span>
            </div>
            <span className="inline-flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5" />
              Cumplimiento de cobro: <strong className="text-[hsl(var(--foreground))]">{globals.collectionComplianceRate}%</strong>
            </span>
          </div>
        </div>

        {/* Contexto mínimo */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t pt-3 text-xs text-[hsl(var(--muted-foreground))]">
          <span>
            <Gift className="mr-1 inline h-3.5 w-3.5" />
            {globals.activeBenefits} beneficios activos · {globals.finishedBenefits} finalizados
          </span>
          <span>
            {globals.commercesCount} comercios adheridos
            {globals.averageCommerceRetentionRate > 0 ? ` · retención promedio ${globals.averageCommerceRetentionRate.toFixed(1)}%` : ""}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function BigNumber({ href, icon, label, value, tone, detail, highlight = false }: {
  href: string;
  icon: ReactNode;
  label: string;
  value: string;
  tone: string;
  detail: ReactNode;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group block rounded-xl border p-4 transition-all hover:shadow-md ${
        highlight
          ? "border-orange-200 bg-orange-50/70 hover:border-orange-300"
          : "bg-[hsl(var(--card))] hover:border-[hsl(var(--primary))]/30"
      }`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{label}</p>
        <ChevronRight className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className={`mt-1.5 text-2xl font-bold tracking-tight xl:text-3xl ${tone}`}>
        <SensitiveValue value={value} />
      </p>
      <p className="mt-1 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">{detail}</p>
    </Link>
  );
}

// ─── Seguimiento ──────────────────────────────────────────────────────────────

function NearLimitCard({ rows }: { rows: AnalysisInsights["nearLimitAffiliates"] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="h-4 w-4 text-red-600" />
          Afiliados cerca del límite
        </CardTitle>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">Usan el 80% o más de su tope mensual del 30%.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="py-4 text-sm text-[hsl(var(--muted-foreground))]">Ningún afiliado está cerca de su límite.</p>
        ) : rows.map((r) => (
          <Link key={r.affiliateId} href={`/beneficios/afiliado/${r.affiliateId}`}
            className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-[hsl(var(--accent))]/40">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{r.fullName}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Cupo libre: <SensitiveValue value={formatCurrencyARS(r.availableAmount)} />
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${r.usagePercent >= 100 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
              {r.usagePercent}%
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function EndingSoonCard({ rows }: { rows: AnalysisInsights["endingSoonBenefits"] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4 text-blue-600" />
          Beneficios por terminar
        </CardTitle>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">Les queda una sola cuota por cobrar.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="py-4 text-sm text-[hsl(var(--muted-foreground))]">No hay beneficios por terminar.</p>
        ) : rows.map((r) => (
          <Link key={r.id} href={`/beneficios/${r.id}`}
            className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-[hsl(var(--accent))]/40">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{r.fullName}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {getBenefitTypeLabel(r.type)}{r.commerce ? ` · ${r.commerce}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Última cuota</p>
              <p className="text-sm font-semibold">{r.lastDueDate ? formatDate(r.lastDueDate) : "—"}</p>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function TopUsageCard({ rows }: { rows: AnalysisInsights["topUsageAffiliates"] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Award className="h-4 w-4 text-amber-600" />
          Mayor uso de beneficios
        </CardTitle>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">Afiliados con más dinero comprometido en cuotas.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="py-4 text-sm text-[hsl(var(--muted-foreground))]">Sin cuotas comprometidas.</p>
        ) : rows.map((r, index) => (
          <Link key={r.affiliateId} href={`/beneficios/afiliado/${r.affiliateId}`}
            className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-[hsl(var(--accent))]/40">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{index + 1}. {r.fullName}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {r.activeBenefits} beneficio{r.activeBenefits !== 1 ? "s" : ""} activo{r.activeBenefits !== 1 ? "s" : ""}
              </p>
            </div>
            <p className="shrink-0 text-sm font-bold"><SensitiveValue value={formatCurrencyARS(r.totalCommitted)} /></p>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pctDelta(current: number, previous: number | undefined): number | null {
  if (previous == null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold">{title}</h2>
      {subtitle && <p className="text-sm text-[hsl(var(--muted-foreground))]">{subtitle}</p>}
    </div>
  );
}

function historyRows(history: MonthlyHistoryRow[]) {
  return [...history].reverse().map((row) => ({
    label: row.monthLabel.slice(0, 3),
    value: row.unionProfit,
    secondary: row.capitalDelivered,
    paid: row.paidAmount,
    pending: row.pendingToCollect,
    benefits: row.benefitsCount,
    period: row.monthLabel,
  }));
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta == null) return null;
  if (delta === 0)
    return <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[hsl(var(--muted-foreground))]"><Minus className="h-3 w-3" />0%</span>;
  const up = delta > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? "text-green-700" : "text-red-600"}`}>
      {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {up ? "+" : ""}{delta}%
    </span>
  );
}

function ClickCard({ href, icon, iconBg, label, value, sub, alert = false, delta = null }: {
  href: string;
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
  delta?: number | null;
}) {
  return (
    <Link
      href={href}
      title={`${label}${sub ? ` — ${sub}` : ""}`}
      className={`group block cursor-pointer rounded-xl border bg-[hsl(var(--card))] p-4 transition-all hover:border-[hsl(var(--primary))]/30 hover:shadow-md ${alert ? "border-red-200 bg-red-50/40" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
        {delta != null ? <DeltaBadge delta={delta} /> : <ChevronRight className="mt-0.5 h-4 w-4 text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity group-hover:opacity-100" />}
      </div>
      <div className="mt-3 space-y-0.5">
        <p className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{label}</p>
        <p className={`text-xl font-bold ${alert ? "text-red-700" : ""}`}>
          {value.trim().startsWith("$") ? <SensitiveValue value={value} /> : value}
        </p>
        {sub && <p className="text-xs text-[hsl(var(--muted-foreground))]">{sub}</p>}
      </div>
    </Link>
  );
}

const DONUT_PALETTE = ["#2563eb", "#9333ea", "#0d9488", "#d97706", "#dc2626", "#64748b"];

function DonutCard({ title, icon, rows, palette = DONUT_PALETTE, emptyText }: {
  title: string;
  icon?: ReactNode;
  rows: Array<{ label: string; value: number; caption: string }>;
  palette?: string[];
  emptyText?: string;
}) {
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  const gradient = total > 0
    ? rows.reduce<{ parts: string[]; start: number }>((acc, row, i) => {
        const pct = (row.value / total) * 100;
        const end = acc.start + pct;
        acc.parts.push(`${palette[i % palette.length]} ${acc.start}% ${end}%`);
        acc.start = end;
        return acc;
      }, { parts: [], start: 0 }).parts.join(", ")
    : "#e5e7eb 0% 100%";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <div className="relative h-36 w-36 rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
            <div className="absolute inset-8 rounded-full bg-[hsl(var(--card))]" />
          </div>
        </div>
        <div className="space-y-2">
          {rows.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">{emptyText ?? "Sin datos."}</p>
          ) : rows.map((row, i) => {
            const pct = total > 0 ? Math.round((row.value / total) * 100) : 0;
            return (
              <div key={row.label} className="flex items-center gap-3 text-sm" title={`${row.label}: ${row.caption} (${pct}%)`}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette[i % palette.length] }} />
                <span className="min-w-0 flex-1 truncate">{row.label}</span>
                <span className="font-semibold">{pct}%</span>
                <span className="text-[hsl(var(--muted-foreground))]">{row.caption.startsWith("$") ? <SensitiveValue value={row.caption} /> : row.caption}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function CommerceRankingCard({ title, rows }: { title: string; rows: Array<{ commerce: string; count: number; amount: number; profit: number }> }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Award className="h-4 w-4 text-amber-600" />{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Sin comercios en el período.</p>
        ) : rows.slice(0, 5).map((row, index) => (
          <div key={row.commerce} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
            title={`${row.commerce}: ${row.count} beneficio(s) · ${formatCurrencyARS(row.amount)} · ganancia ${formatCurrencyARS(row.profit)}`}>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{index + 1}. {row.commerce}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{row.count} beneficio{row.count !== 1 ? "s" : ""} · <SensitiveValue value={formatCurrencyARS(row.amount)} /></p>
            </div>
            <p className="shrink-0 text-sm font-bold text-emerald-700"><SensitiveValue value={formatCurrencyARS(row.profit)} /></p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MiniAreaChart({ rows }: { rows: Array<{ label: string; value: number; secondary: number; paid: number; pending: number; benefits: number; period: string }> }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const max = Math.max(...rows.flatMap((row) => [row.paid, row.secondary]), 1);
  const activeRow = hoveredIndex != null ? rows[hoveredIndex] : null;

  return (
    <div className="relative h-60 overflow-visible pt-2">
      <div className="absolute inset-x-0 top-2 h-44">
        {[1, 0.75, 0.5, 0.25, 0].map((mark) => (
          <div key={mark} className="absolute left-0 right-0 border-t border-dashed border-[hsl(var(--border))]" style={{ top: `${(1 - mark) * 100}%` }}>
            <span className="absolute -top-2 left-0 bg-[hsl(var(--card))] pr-2 text-[10px] text-[hsl(var(--muted-foreground))]">{mark === 0 ? "0" : compactCurrency(max * mark)}</span>
          </div>
        ))}
      </div>
      <div className="relative flex h-48 items-end gap-3 pl-8">
        {rows.map((row, index) => {
          const paidHeight = Math.max(row.paid > 0 ? 4 : 0, (row.paid / max) * 100);
          const secondaryHeight = Math.max(row.secondary > 0 ? 4 : 0, (row.secondary / max) * 100);
          const isActive = hoveredIndex === index;
          return (
            <button key={`${row.period}-${row.label}`} type="button"
              className="group flex min-w-0 flex-1 flex-col items-center gap-2 outline-none"
              onMouseEnter={() => setHoveredIndex(index)} onMouseLeave={() => setHoveredIndex(null)}
              onFocus={() => setHoveredIndex(index)} onBlur={() => setHoveredIndex(null)}
              aria-label={`${row.period}: cobrado ${formatCurrencyARS(row.paid)}, entregado ${formatCurrencyARS(row.secondary)}`}>
              <div className={`flex h-44 w-full items-end justify-center gap-1.5 rounded-md px-1 py-1 transition-colors ${isActive ? "bg-slate-100" : "bg-[hsl(var(--muted))]/20"}`}>
                <div className="w-3 rounded-t bg-emerald-600 transition-all group-hover:bg-emerald-500" style={{ height: `${paidHeight}%` }} />
                <div className="w-3 rounded-t bg-blue-600 transition-all group-hover:bg-blue-500" style={{ height: `${secondaryHeight}%` }} />
              </div>
              <span className="text-xs capitalize text-[hsl(var(--muted-foreground))]">{row.label}</span>
            </button>
          );
        })}
      </div>
      {activeRow && (
        <div className="pointer-events-none absolute top-7 z-20 w-56 rounded-md border bg-[hsl(var(--card))] p-3 text-sm shadow-lg"
          style={{ left: `min(calc(100% - 14rem), max(2rem, calc(${((hoveredIndex ?? 0) + 0.5) / Math.max(rows.length, 1) * 100}% - 7rem)))` }}>
          <p className="font-semibold capitalize">{activeRow.period}</p>
          <div className="mt-2 space-y-1">
            <TooltipLine color="bg-emerald-600" label="Cobrado" value={formatCurrencyARS(activeRow.paid)} />
            <TooltipLine color="bg-blue-600" label="Entregado" value={formatCurrencyARS(activeRow.secondary)} />
            <TooltipLine color="bg-yellow-500" label="Pendiente" value={formatCurrencyARS(activeRow.pending)} />
            <TooltipLine color="bg-orange-500" label="Ganancia sindicato" value={formatCurrencyARS(activeRow.value)} />
            <div className="flex justify-between gap-3 pt-1 text-xs text-[hsl(var(--muted-foreground))]">
              <span>Beneficios</span>
              <span className="font-medium text-[hsl(var(--foreground))]">{activeRow.benefits}</span>
            </div>
          </div>
        </div>
      )}
      <div className="mt-2 flex justify-center gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5 text-emerald-700"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />Cobrado</span>
        <span className="inline-flex items-center gap-1.5 text-blue-700"><span className="h-2.5 w-2.5 rounded-sm bg-blue-600" />Entregado</span>
      </div>
    </div>
  );
}

function TooltipLine({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]"><span className={`h-2 w-2 rounded-full ${color}`} />{label}</span>
      <span className="font-semibold">{value.startsWith("$") ? <SensitiveValue value={value} /> : value}</span>
    </div>
  );
}

function compactCurrency(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(Math.round(value));
}
