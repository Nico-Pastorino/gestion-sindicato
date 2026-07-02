"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Gauge,
  Gift,
  Landmark,
  Minus,
  PieChart,
  RefreshCw,
  Store,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SensitiveValue } from "@/components/privacy/sensitive-value";
import { formatCurrencyARS } from "@/lib/utils/currency";
import type {
  DashboardSummary,
  MonthlyHistoryRow,
  DashboardGlobals,
  DashboardAnalytics,
} from "@/lib/services/dashboard.service";

interface DashboardClientProps {
  initialMonth: number;
  initialYear: number;
  periodLabel: string;
  summary: DashboardSummary;
  monthlyHistory: MonthlyHistoryRow[];
  globals: DashboardGlobals;
  analytics: DashboardAnalytics;
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function DashboardClient({
  initialMonth,
  initialYear,
  periodLabel,
  summary: initSummary,
  monthlyHistory: initHistory,
  globals: initGlobals,
  analytics: initAnalytics,
}: DashboardClientProps) {
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
    router.replace(`/dashboard?month=${m}&year=${y}`, { scroll: false });
  }

  function handleMonth(m: number) { setMonth(m); loadPeriod(m, year); }
  function handleYear(y: number) { setYear(y); loadPeriod(month, y); }
  function setQuick(mOffset: number) {
    const d = new Date(now.getFullYear(), now.getMonth() - mOffset, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    setMonth(m); setYear(y); loadPeriod(m, y);
  }

  const collectedPct = globals.totalToCollect > 0
    ? Math.round((globals.totalCollected / globals.totalToCollect) * 100)
    : 0;

  // Mes anterior (para variación)
  const prevDate = new Date(year, month - 2, 1);
  const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const prev = history.find((r) => r.month === prevKey);

  // Estado general
  const overdueCount = globals.overdueInstallmentsCount;
  const status: "ok" | "warn" | "alert" =
    overdueCount > 0 ? "alert" : globals.collectionComplianceRate < 70 ? "warn" : "ok";

  // Acciones de hoy
  const actions: Array<{ tone: "alert" | "warn"; title: string; href: string }> = [];
  if (overdueCount > 0)
    actions.push({ tone: "alert", title: `${overdueCount} cuota${overdueCount !== 1 ? "s" : ""} vencida${overdueCount !== 1 ? "s" : ""} · revisá la cobranza`, href: "/cobranza?status=overdue" });
  if (globals.affiliatesWithoutCredit > 0)
    actions.push({ tone: "warn", title: `${globals.affiliatesWithoutCredit} afiliado${globals.affiliatesWithoutCredit !== 1 ? "s" : ""} sin cupo disponible`, href: "/afiliados" });
  if (summary.pendingInstallmentsCount > 0)
    actions.push({ tone: "warn", title: `${summary.pendingInstallmentsCount} cuota${summary.pendingInstallmentsCount !== 1 ? "s" : ""} por cobrar este mes`, href: `/cobranza?status=pending&${p}` });

  return (
    <div className="space-y-8">
      {/* ── Encabezado ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inicio</h1>
          <p className="mt-0.5 text-sm text-[hsl(var(--muted-foreground))]">Centro de control del sindicato</p>
        </div>
        {isLoading && (
          <span className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Actualizando…
          </span>
        )}
      </div>

      {/* ── ¿Cómo está el sindicato? + Qué hacer hoy ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <StatusBanner status={status} globals={globals} />
        </div>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Qué hacer hoy</h2>
          <Card className="h-[calc(100%-1.75rem)]">
            <CardContent className="p-3">
              {actions.length === 0 ? (
                <div className="flex h-full items-center gap-3 px-2 py-3">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600" />
                  <div>
                    <p className="font-medium">Todo al día</p>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">No hay tareas urgentes.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {actions.map((a) => (
                    <Link key={a.href + a.title} href={a.href}
                      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors hover:bg-[hsl(var(--accent))] ${a.tone === "alert" ? "border-red-200 bg-red-50/50" : "border-amber-200 bg-amber-50/50"}`}>
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <AlertTriangle className={`h-4 w-4 shrink-0 ${a.tone === "alert" ? "text-red-600" : "text-amber-600"}`} />
                        {a.title}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      {/* ════════════ ESTADO GENERAL ════════════ */}
      <section className="space-y-4">
        <SectionTitle
          title="Estado general del sindicato"
          subtitle="Foto completa de la cartera al día de hoy. No depende del mes seleccionado."
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ClickCard href="/afiliados?status=active" icon={<Users className="h-5 w-5 text-blue-600" />} iconBg="bg-blue-50"
            label="Afiliados activos" value={String(globals.activeAffiliates)} sub={`${globals.affiliatesWithActiveBenefit} con beneficio activo`} />
          <ClickCard href="/cobranza?status=overdue" icon={<AlertTriangle className="h-5 w-5 text-red-600" />} iconBg="bg-red-50"
            label="En mora (vencido)" value={formatCurrencyARS(globals.totalOverdue)}
            sub={`${globals.overdueInstallmentsCount} cuotas · ${globals.affectedOverdueAffiliates} afiliados`} alert={globals.overdueInstallmentsCount > 0} />
          <ClickCard href="/dashboard/total-a-cobrar" icon={<WalletCards className="h-5 w-5 text-indigo-600" />} iconBg="bg-indigo-50"
            label="Total a cobrar" value={formatCurrencyARS(globals.totalToCollect)} sub={`${formatCurrencyARS(globals.totalCollected)} ya cobrado`} />
          <GaugeCard label="Cumplimiento global" percent={globals.collectionComplianceRate} sub="cuotas cobradas sobre el total" href="/cobranza" />
        </div>

        <CollectionHealth globals={globals} collectedPct={collectedPct} />

        {/* Composición de afiliados */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <ClickCard href="/afiliados" compact icon={<Briefcase className="h-5 w-5 text-slate-600" />} iconBg="bg-slate-100"
            label="Planta permanente" value={String(globals.permanentStaff)} />
          <ClickCard href="/afiliados" compact icon={<Briefcase className="h-5 w-5 text-slate-600" />} iconBg="bg-slate-100"
            label="Planta temporaria" value={String(globals.temporaryStaff)} />
          <ClickCard href="/afiliados" compact icon={<Users className="h-5 w-5 text-slate-600" />} iconBg="bg-slate-100"
            label="Jubilados" value={String(globals.retirees)} />
          <ClickCard href="/beneficios?type=supermercado" compact icon={<Store className="h-5 w-5 text-emerald-700" />} iconBg="bg-emerald-50"
            label="Comercios adheridos" value={String(globals.commercesCount)} sub={globals.topCommerce ? `Líder: ${globals.topCommerce}` : undefined} />
        </div>

        {/* Capital, interés y ganancia (histórico) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ClickCard href="/dashboard/capital-entregado" icon={<DollarSign className="h-5 w-5 text-blue-600" />} iconBg="bg-blue-50"
            label="Capital otorgado histórico" value={formatCurrencyARS(globals.totalCapitalDelivered)} sub={`${globals.activeBenefits} beneficios activos`} />
          <ClickCard href="/dashboard/ganancia-estimada" icon={<TrendingUp className="h-5 w-5 text-orange-600" />} iconBg="bg-orange-50"
            label="Interés total generado" value={formatCurrencyARS(globals.totalInterestGenerated)} sub={`${formatCurrencyARS(globals.totalInterestCollected)} cobrado`} />
          <ClickCard href="/beneficios?type=supermercado" icon={<Landmark className="h-5 w-5 text-emerald-700" />} iconBg="bg-emerald-50"
            label="Ganancia por retención" value={formatCurrencyARS(globals.commerceRetentionTotal)} sub={`${globals.averageCommerceRetentionRate.toFixed(1)}% promedio`} />
          <ClickCard href="/beneficios?status=active" icon={<Gift className="h-5 w-5 text-purple-600" />} iconBg="bg-purple-50"
            label="Beneficios activos" value={String(globals.activeBenefits)} sub={`${globals.finishedBenefits} finalizados`} />
        </div>
      </section>

      {/* ════════════ ANÁLISIS DEL MES ════════════ */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionTitle title="Análisis del mes" subtitle={`Detalle del período seleccionado: ${label}. Las flechas comparan con el mes anterior.`} />
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

        {/* KPIs del mes (con variación) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <ClickCard href={`/afiliados?${p}`} icon={<UserPlus className="h-5 w-5 text-cyan-700" />} iconBg="bg-cyan-50"
            label="Nuevos afiliados" value={String(summary.newAffiliatesCount)} sub={label} />
          <ClickCard href={`/dashboard/capital-entregado?${p}`} icon={<DollarSign className="h-5 w-5 text-blue-600" />} iconBg="bg-blue-50"
            label="Capital del mes" value={formatCurrencyARS(summary.capitalDelivered)}
            sub={`${summary.benefitsCount} beneficio${summary.benefitsCount !== 1 ? "s" : ""}`}
            delta={pctDelta(summary.capitalDelivered, prev?.capitalDelivered)} />
          <ClickCard href={`/dashboard/ganancia-estimada?${p}`} icon={<TrendingUp className="h-5 w-5 text-orange-600" />} iconBg="bg-orange-50"
            label="Interés del mes" value={formatCurrencyARS(summary.estimatedProfit)} sub={`${formatCurrencyARS(summary.collectedProfit)} cobrado`}
            delta={pctDelta(summary.estimatedProfit, prev?.estimatedProfit)} />
          <ClickCard href={`/cobranza?status=pending&${p}`} icon={<Clock className="h-5 w-5 text-amber-600" />} iconBg="bg-amber-50"
            label="Pendiente del mes" value={formatCurrencyARS(summary.pendingToCollect)} sub={`${summary.pendingInstallmentsCount} cuotas pendientes`}
            alert={summary.overdueInstallmentsCount > 0} />
          <ClickCard href={`/beneficios?type=supermercado&${p}`} icon={<Store className="h-5 w-5 text-purple-700" />} iconBg="bg-purple-50"
            label="Comercios usados" value={String(summary.commercesUsedCount)} sub="con movimiento en el mes" />
          <ClickCard href={`/beneficios?type=supermercado&${p}`} icon={<WalletCards className="h-5 w-5 text-emerald-700" />} iconBg="bg-emerald-50"
            label="Ganancia del sindicato" value={formatCurrencyARS(summary.unionProfit)} sub={`${formatCurrencyARS(summary.commerceRetentionProfit)} por retención`} />
        </div>

        {/* Retenciones / acumulados del período */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Retenido este mes" value={formatCurrencyARS(summary.amountRetainedThisMonth)} />
          <MiniStat label="Retenido en el año" value={formatCurrencyARS(summary.amountRetainedThisYear)} />
          <MiniStat label="Beneficios este mes" value={String(summary.benefitsCount)} />
          <MiniStat label="Beneficios en el año" value={String(summary.benefitsThisYear)} />
        </div>

        {/* Gráficos — fila 1 */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <DonutCard title="¿Qué se otorga más?" icon={<PieChart className="h-4 w-4 text-blue-600" />}
            rows={analytics.benefitsByType.map((r) => ({ label: r.label, value: r.amount, caption: formatCurrencyARS(r.amount) }))}
            emptyText="Sin beneficios en el período." />
          <DonutCard title="Afiliados por sexo" icon={<Users className="h-4 w-4 text-purple-600" />}
            rows={analytics.affiliatesBySex.map((r) => ({ label: r.label, value: r.value, caption: String(r.value) }))}
            palette={["#2563eb", "#db2777", "#0d9488", "#64748b"]} emptyText="Sin datos de sexo cargados." />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4 text-teal-600" /> Evolución (6 meses)</CardTitle>
            </CardHeader>
            <CardContent><MiniAreaChart rows={historyRows(history)} /></CardContent>
          </Card>
        </div>

        {/* Gráficos — fila 2 */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <BarsCard title="Afiliados por situación" icon={<Briefcase className="h-4 w-4 text-slate-600" />} rows={analytics.affiliatesByEmploymentType} />
          <BarsCard title="Beneficios más usados" icon={<Gift className="h-4 w-4 text-purple-600" />} rows={analytics.benefitsByType.map((r) => ({ label: r.label, value: r.value }))} />
          <CommerceRankingCard title="Top comercios del período" rows={analytics.topCommerces} />
        </div>
      </section>

      {/* ── Historial mensual ── */}
      <section>
        <SectionTitle title="Historial mensual" subtitle="Últimos 6 meses. Clic en una fila para verla en el análisis." />
        <Card className="mt-3">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                  <th className="px-4 py-2.5 text-left font-semibold">Mes</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Beneficios</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Capital entregado</th>
                  <th className="hidden px-3 py-2.5 text-right font-semibold md:table-cell">Interés total</th>
                  <th className="hidden px-3 py-2.5 text-right font-semibold md:table-cell">Interés cobrado</th>
                  <th className="hidden px-3 py-2.5 text-right font-semibold lg:table-cell">Interés por cobrar</th>
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
                        {isSelected && <span className="ml-2 text-xs font-normal text-blue-600">actual</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[hsl(var(--muted-foreground))]">{row.benefitsCount}</td>
                      <td className="px-3 py-2.5 text-right font-medium"><SensitiveValue value={formatCurrencyARS(row.capitalDelivered)} /></td>
                      <td className="hidden px-3 py-2.5 text-right text-orange-600 md:table-cell"><SensitiveValue value={formatCurrencyARS(row.estimatedProfit)} /></td>
                      <td className="hidden px-3 py-2.5 text-right text-green-700 md:table-cell"><SensitiveValue value={formatCurrencyARS(row.collectedProfit)} /></td>
                      <td className="hidden px-3 py-2.5 text-right text-yellow-700 lg:table-cell"><SensitiveValue value={formatCurrencyARS(row.pendingProfit)} /></td>
                      <td className="px-3 py-2.5 text-right font-semibold"><SensitiveValue value={formatCurrencyARS(row.pendingToCollect)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      {/* ── Accesos a módulos ── */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">¿A dónde vas?</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <ModuleCard href="/afiliados" icon={<Users className="h-5 w-5 text-blue-600" />} iconBg="bg-blue-50" label="Afiliados" detail={`${globals.activeAffiliates} activos`} />
          <ModuleCard href="/beneficios" icon={<Gift className="h-5 w-5 text-purple-600" />} iconBg="bg-purple-50" label="Beneficios" detail={`${globals.activeBenefits} activos`} />
          <ModuleCard href="/cobranza" icon={<WalletCards className="h-5 w-5 text-emerald-700" />} iconBg="bg-emerald-50" label="Cobranzas" detail={overdueCount > 0 ? `${overdueCount} vencidas` : "al día"} alert={overdueCount > 0} />
          <ModuleCard href={`/reportes/mensual?${p}`} icon={<FileText className="h-5 w-5 text-slate-600" />} iconBg="bg-slate-100" label="Reportes" detail="ver análisis" newTab />
        </div>
      </section>
    </div>
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

function CollectionHealth({ globals, collectedPct }: { globals: DashboardGlobals; collectedPct: number }) {
  const collected = collectedPct;
  const overdue = globals.totalToCollect > 0 ? (globals.totalOverdue / globals.totalToCollect) * 100 : 0;
  const pending = Math.max(0, 100 - collected - overdue);

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">¿Cómo viene la cobranza?</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Distribución de toda la cartera: cobrado, pendiente y vencido.</p>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Total a cobrar: <span className="font-semibold text-[hsl(var(--foreground))]"><SensitiveValue value={formatCurrencyARS(globals.totalToCollect)} /></span>
          </p>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
          <div className="bg-green-500" style={{ width: `${collected}%` }} title={`Cobrado: ${formatCurrencyARS(globals.totalCollected)}`} />
          <div className="bg-yellow-400" style={{ width: `${pending}%` }} title={`Pendiente: ${formatCurrencyARS(globals.totalPending)}`} />
          <div className="bg-red-500" style={{ width: `${overdue}%` }} title={`Vencido: ${formatCurrencyARS(globals.totalOverdue)}`} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <HealthLegend label="Cobrado" value={formatCurrencyARS(globals.totalCollected)} percent={Math.round(collected)} tone="green" />
          <HealthLegend label="Pendiente" value={formatCurrencyARS(globals.totalPending)} percent={Math.round(pending)} tone="yellow" />
          <HealthLegend label="Vencido" value={formatCurrencyARS(globals.totalOverdue)} percent={Math.round(overdue)} tone="red" />
        </div>
      </CardContent>
    </Card>
  );
}

function HealthLegend({ label, value, percent, tone }: { label: string; value: string; percent: number; tone: "green" | "yellow" | "red" }) {
  const color = { green: "bg-green-500", yellow: "bg-yellow-400", red: "bg-red-500" }[tone];
  return (
    <div className="text-center">
      <div className="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}
      </div>
      <p className="mt-1 font-semibold"><SensitiveValue value={value} /></p>
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{percent}%</p>
    </div>
  );
}

function StatusBanner({ status, globals }: { status: "ok" | "warn" | "alert"; globals: DashboardGlobals }) {
  const cfg = {
    ok: { box: "border-green-200 bg-green-50", text: "text-green-800", title: "El sindicato está al día", icon: <CheckCircle2 className="h-7 w-7 text-green-600" /> },
    warn: { box: "border-amber-200 bg-amber-50", text: "text-amber-900", title: "Cobranza con margen de mejora", icon: <Clock className="h-7 w-7 text-amber-600" /> },
    alert: { box: "border-red-200 bg-red-50", text: "text-red-900", title: `Hay ${globals.overdueInstallmentsCount} cuota${globals.overdueInstallmentsCount !== 1 ? "s" : ""} vencida${globals.overdueInstallmentsCount !== 1 ? "s" : ""} en mora`, icon: <AlertTriangle className="h-7 w-7 text-red-600" /> },
  }[status];

  return (
    <Card className={`h-full ${cfg.box}`}>
      <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          {cfg.icon}
          <div>
            <p className={`text-lg font-bold ${cfg.text}`}>{cfg.title}</p>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Estado general de la cartera al día de hoy.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 border-t border-black/5 pt-4">
          <BannerStat label="En mora" value={formatCurrencyARS(globals.totalOverdue)} tone={globals.totalOverdue > 0 ? "red" : undefined} />
          <BannerStat label="A cobrar" value={formatCurrencyARS(globals.totalToCollect)} />
          <BannerStat label="Cumplimiento" value={`${globals.collectionComplianceRate}%`} />
        </div>
      </CardContent>
    </Card>
  );
}

function BannerStat({ label, value, tone }: { label: string; value: string; tone?: "red" }) {
  return (
    <div>
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${tone === "red" ? "text-red-700" : ""}`}>
        {value.trim().startsWith("$") ? <SensitiveValue value={value} /> : value}
      </p>
    </div>
  );
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

function ClickCard({ href, icon, iconBg, label, value, sub, alert = false, compact = false, money = false, delta = null }: {
  href: string;
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
  compact?: boolean;
  money?: boolean;
  delta?: number | null;
}) {
  return (
    <Link
      href={href}
      title={`${label}${sub ? ` — ${sub}` : ""}`}
      className={`group block cursor-pointer rounded-xl border bg-[hsl(var(--card))] ${compact ? "p-3.5" : "p-4"} transition-all hover:border-[hsl(var(--primary))]/30 hover:shadow-md ${alert ? "border-red-200 bg-red-50/40" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
        {delta != null ? <DeltaBadge delta={delta} /> : <ChevronRight className="mt-0.5 h-4 w-4 text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity group-hover:opacity-100" />}
      </div>
      <div className="mt-3 space-y-0.5">
        <p className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{label}</p>
        <p className={`${compact ? "text-lg" : "text-xl"} font-bold ${alert ? "text-red-700" : ""}`}>
          {money || value.trim().startsWith("$") ? <SensitiveValue value={value} /> : value}
        </p>
        {sub && <p className="text-xs text-[hsl(var(--muted-foreground))]">{sub}</p>}
      </div>
    </Link>
  );
}

function GaugeCard({ label, percent, sub, href }: { label: string; percent: number; sub?: string; href: string }) {
  const tone = percent >= 90 ? "text-green-700" : percent >= 70 ? "text-amber-600" : "text-red-600";
  const bar = percent >= 90 ? "bg-green-500" : percent >= 70 ? "bg-amber-500" : "bg-red-500";
  return (
    <Link href={href} className="group block cursor-pointer rounded-xl border bg-[hsl(var(--card))] p-4 transition-all hover:border-[hsl(var(--primary))]/30 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100"><Gauge className={`h-5 w-5 ${tone}`} /></div>
        <span className={`text-2xl font-bold ${tone}`}>{percent}%</span>
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{label}</p>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
      {sub && <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{sub}</p>}
    </Link>
  );
}

function ModuleCard({ href, icon, iconBg, label, detail, alert = false, newTab = false }: {
  href: string; icon: ReactNode; iconBg: string; label: string; detail: string; alert?: boolean; newTab?: boolean;
}) {
  return (
    <Link href={href} {...(newTab ? { target: "_blank" } : {})}
      className={`group flex items-center gap-3 rounded-xl border bg-[hsl(var(--card))] p-4 transition-all hover:border-[hsl(var(--primary))]/30 hover:shadow-md ${alert ? "border-red-200 bg-red-50/40" : ""}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{label}</p>
        <p className={`truncate text-xs ${alert ? "font-medium text-red-700" : "text-[hsl(var(--muted-foreground))]"}`}>{detail}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

function MiniStat({ label, value, money = false }: { label: string; value: string; money?: boolean }) {
  return (
    <div className="rounded-lg border bg-[hsl(var(--muted))]/30 px-3 py-3">
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className="mt-1 text-base font-bold">{money || value.trim().startsWith("$") ? <SensitiveValue value={value} /> : value}</p>
    </div>
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

function BarsCard({ title, icon, rows }: { title: string; icon?: ReactNode; rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Sin datos para mostrar.</p>
        ) : rows.map((row) => (
          <div key={row.label} className="space-y-1" title={`${row.label}: ${row.value}`}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{row.label}</span>
              <span className="font-semibold">{row.value}</span>
            </div>
            <div className="h-2 rounded-full bg-[hsl(var(--muted))]">
              <div className="h-2 rounded-full bg-[hsl(var(--primary))]" style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} />
            </div>
          </div>
        ))}
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
