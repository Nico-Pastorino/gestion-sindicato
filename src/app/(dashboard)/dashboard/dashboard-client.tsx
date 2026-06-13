"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DollarSign, TrendingUp, CheckCircle, Clock, AlertTriangle,
  Users, Gift, ChevronRight, ArrowRight, RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { InstallmentStatusBadge, BenefitTypeBadge } from "@/components/ui/badge";
import { SensitiveText, SensitiveValue } from "@/components/privacy/sensitive-value";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { formatCurrencyARS } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { getBenefitTypeLabel } from "@/lib/utils/benefit-types";
import type {
  DashboardSummary,
  PendingInstallmentRow,
  MonthlyHistoryRow,
  DashboardGlobals,
  DashboardBreakdowns,
} from "@/lib/services/dashboard.service";

interface DashboardClientProps {
  initialMonth: number;
  initialYear: number;
  periodLabel: string;
  summary: DashboardSummary;
  pendingInstallments: PendingInstallmentRow[];
  monthlyHistory: MonthlyHistoryRow[];
  globals: DashboardGlobals;
  breakdowns: DashboardBreakdowns;
}

const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

export function DashboardClient({
  initialMonth, initialYear, periodLabel,
  summary: initSummary, pendingInstallments: initPending,
  monthlyHistory: initHistory, globals,
  breakdowns: initBreakdowns,
}: DashboardClientProps) {
  const router = useRouter();
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [label, setLabel] = useState(periodLabel);
  const [summary, setSummary] = useState(initSummary);
  const [pending, setPending] = useState(initPending);
  const [history, setHistory] = useState(initHistory);
  const [breakdowns, setBreakdowns] = useState(initBreakdowns);
  const [isLoading, startTransition] = useTransition();

  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => currentYear - 2 + i);

  function loadPeriod(m: number, y: number) {
    startTransition(async () => {
      const res = await fetch(`/api/dashboard?month=${m}&year=${y}`);
      const json = await res.json();
      if (json.ok) {
        setSummary(json.summary);
        setPending(json.pendingInstallments);
        setHistory(json.monthlyHistory);
        setBreakdowns(json.breakdowns);
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

  // Parámetros para links de navegación
  const p = `month=${month}&year=${year}`;

  const profitPercent = summary.estimatedProfit > 0
    ? Math.min(100, Math.round((summary.collectedProfit / summary.estimatedProfit) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
            Resumen del sistema sindical
          </p>
        </div>

        {/* Globales */}
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/afiliados" className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 hover:bg-[hsl(var(--accent))] transition-colors">
            <Users className="h-3.5 w-3.5 text-blue-600" />
            <span className="font-semibold">{globals.totalAffiliates}</span>
            <span className="text-[hsl(var(--muted-foreground))]">afiliados</span>
          </Link>
          <Link href="/beneficios?status=active" className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 hover:bg-[hsl(var(--accent))] transition-colors">
            <Gift className="h-3.5 w-3.5 text-purple-600" />
            <span className="font-semibold">{globals.activeBenefits}</span>
            <span className="text-[hsl(var(--muted-foreground))]">activos</span>
          </Link>
          <Link href="/beneficios?status=finished" className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 hover:bg-[hsl(var(--accent))] transition-colors">
            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
            <span className="font-semibold">{globals.finishedBenefits}</span>
            <span className="text-[hsl(var(--muted-foreground))]">finalizados</span>
          </Link>
        </div>
      </div>

      {/* ── Alerta sin disponible ── */}
      {globals.affiliatesWithoutCredit > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-800">
            <strong>{globals.affiliatesWithoutCredit} afiliado{globals.affiliatesWithoutCredit !== 1 ? "s" : ""}</strong>{" "}
            sin cupo mensual disponible.
          </p>
        </div>
      )}

      {/* ── Selector de período ── */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <select
                value={month}
                onChange={(e) => handleMonth(Number(e.target.value))}
                className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1.5 text-sm font-medium"
              >
                {MONTHS.map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => handleYear(Number(e.target.value))}
                className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1.5 text-sm font-medium"
              >
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              {isLoading && <RefreshCw className="h-4 w-4 animate-spin text-[hsl(var(--muted-foreground))]" />}
            </div>

            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            {/* Accesos rápidos */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Este mes", offset: 0 },
                { label: "Mes anterior", offset: 1 },
                { label: "Hace 3 meses", offset: 3 },
                { label: "Hace 6 meses", offset: 6 },
              ].map(({ label: l, offset }) => (
                <button
                  key={offset}
                  onClick={() => setQuick(offset)}
                  className="rounded-full border px-2.5 py-0.5 text-xs hover:bg-[hsl(var(--accent))] transition-colors"
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-2 text-sm font-semibold text-[hsl(var(--foreground))]">
            {label}
            {summary.benefitsCount === 0 && (
              <span className="ml-2 text-xs font-normal text-[hsl(var(--muted-foreground))]">
                — Sin beneficios otorgados en este período
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* ── 1. Resumen del período ── */}
      <section>
        <h2 className="text-base font-semibold mb-3 text-[hsl(var(--foreground))]">Resumen del período</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ClickCard
            href={`/dashboard/capital-entregado?${p}`}
            icon={<DollarSign className="h-5 w-5 text-blue-600" />}
            iconBg="bg-blue-50"
            label="Capital entregado"
            value={<SensitiveValue value={formatCurrencyARS(summary.capitalDelivered)} />}
            sub={`${summary.benefitsCount} beneficio${summary.benefitsCount !== 1 ? "s" : ""} otorgado${summary.benefitsCount !== 1 ? "s" : ""}`}
            description="Monto total entregado en el período"
          />
          <ClickCard
            href={`/dashboard/total-a-cobrar?${p}`}
            icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
            iconBg="bg-purple-50"
            label="Total a cobrar"
            value={<SensitiveValue value={formatCurrencyARS(summary.totalToCollect)} />}
            sub="capital + intereses"
            description="Suma de todas las cuotas generadas"
          />
          <ClickCard
            href={`/dashboard/cobrado?${p}`}
            icon={<CheckCircle className="h-5 w-5 text-green-600" />}
            iconBg="bg-green-50"
            label="Cobrado hasta ahora"
            value={<SensitiveValue value={formatCurrencyARS(summary.paidAmount)} />}
            sub={`${summary.paidInstallmentsCount} cuota${summary.paidInstallmentsCount !== 1 ? "s" : ""} pagada${summary.paidInstallmentsCount !== 1 ? "s" : ""}`}
            description="Cuotas efectivamente cobradas"
          />
          <ClickCard
            href={`/dashboard/falta-cobrar?${p}`}
            icon={<Clock className="h-5 w-5 text-yellow-600" />}
            iconBg="bg-yellow-50"
            label="Falta cobrar"
            value={<SensitiveValue value={formatCurrencyARS(summary.pendingToCollect)} />}
            sub={`${summary.pendingInstallmentsCount} cuota${summary.pendingInstallmentsCount !== 1 ? "s" : ""} pendiente${summary.pendingInstallmentsCount !== 1 ? "s" : ""}`}
            description="Cuotas pendientes o vencidas"
            alert={summary.overdueInstallmentsCount > 0}
          />
          <ClickCard
            href={`/dashboard/ganancia-estimada?${p}`}
            icon={<TrendingUp className="h-5 w-5 text-orange-600" />}
            iconBg="bg-orange-50"
            label="Ganancia estimada"
            value={<SensitiveValue value={formatCurrencyARS(summary.estimatedProfit)} />}
            sub="interés total del período"
            description="Ganancia por intereses aplicados"
          />
          <ClickCard
            href={`/dashboard/ganancia-pendiente?${p}`}
            icon={<DollarSign className="h-5 w-5 text-teal-600" />}
            iconBg="bg-teal-50"
            label="Ganancia pendiente"
            value={<SensitiveValue value={formatCurrencyARS(summary.pendingProfit)} />}
            sub="interés aún no cobrado"
            description="Parte del interés que falta cobrar"
          />
        </div>
      </section>

      {/* ── 1b. Gráficos del período ── */}
      <DashboardCharts breakdowns={breakdowns} history={history} />

      {/* ── 2. Ganancia del sindicato ── */}
      {summary.estimatedProfit > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              Ganancia del sindicato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Total estimada</p>
                <p className="text-base font-bold"><SensitiveValue value={formatCurrencyARS(summary.estimatedProfit)} /></p>
              </div>
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Cobrada</p>
                <p className="text-base font-bold text-green-700"><SensitiveValue value={formatCurrencyARS(summary.collectedProfit)} /></p>
              </div>
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Pendiente</p>
                <p className="text-base font-bold text-yellow-700"><SensitiveValue value={formatCurrencyARS(summary.pendingProfit)} /></p>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))]">
                <span>{profitPercent}% cobrado</span>
                <span>{100 - profitPercent}% pendiente</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[hsl(var(--muted))]">
                <div
                  className="h-2.5 rounded-full bg-green-500 transition-all duration-500"
                  style={{ width: `${profitPercent}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              La ganancia se calcula a partir del interés aplicado a los beneficios otorgados.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── 3. Cuotas pendientes del período ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Cuotas pendientes — {label}</h2>
          {pending.length > 0 && (
            <Link
              href={`/beneficios?status=active`}
              className="text-xs text-[hsl(var(--primary))] flex items-center gap-1 hover:underline"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            {pending.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">Sin cuotas pendientes</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  No hay cuotas vencidas ni pendientes para este período.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-[hsl(var(--muted-foreground))] text-xs uppercase tracking-wide">
                      <th className="text-left py-2.5 px-4 font-semibold">Afiliado</th>
                      <th className="text-left py-2.5 px-3 font-semibold hidden sm:table-cell">DNI</th>
                      <th className="text-left py-2.5 px-3 font-semibold hidden lg:table-cell">Legajo</th>
                      <th className="text-left py-2.5 px-3 font-semibold hidden md:table-cell">Tipo</th>
                      <th className="text-left py-2.5 px-3 font-semibold">Cuota</th>
                      <th className="text-right py-2.5 px-3 font-semibold">Monto</th>
                      <th className="text-left py-2.5 px-3 font-semibold hidden sm:table-cell">Vencimiento</th>
                      <th className="text-left py-2.5 px-3 font-semibold">Estado</th>
                      <th className="py-2.5 px-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pending.map((row) => (
                      <tr key={row.id} className={`hover:bg-[hsl(var(--accent))]/40 transition-colors ${row.status === "overdue" ? "bg-red-50/40" : ""}`}>
                        <td className="py-2.5 px-4 font-medium">{row.fullName}</td>
                        <td className="py-2.5 px-3 text-[hsl(var(--muted-foreground))] hidden sm:table-cell">
                          <SensitiveText value={row.dni} type="dni" />
                        </td>
                        <td className="py-2.5 px-3 text-[hsl(var(--muted-foreground))] hidden lg:table-cell">{row.legajo ?? "—"}</td>
                        <td className="py-2.5 px-3 hidden md:table-cell">
                          <BenefitTypeBadge type={row.benefitType as "ayuda_economica" | "supermercado" | "otro"} />
                        </td>
                        <td className="py-2.5 px-3 text-[hsl(var(--muted-foreground))]">
                          {row.installmentNumber}/{row.totalInstallments}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold">
                          <SensitiveValue value={formatCurrencyARS(row.amount)} />
                        </td>
                        <td className="py-2.5 px-3 hidden sm:table-cell text-[hsl(var(--muted-foreground))]">{formatDate(row.dueDate)}</td>
                        <td className="py-2.5 px-3">
                          <InstallmentStatusBadge status={row.status as "pending" | "overdue" | "paid" | "cancelled"} />
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <Link
                            href={`/afiliados/${row.affiliateId}`}
                            className="text-xs text-[hsl(var(--primary))] hover:underline flex items-center gap-0.5 justify-end"
                          >
                            Ver <ChevronRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── 4. Historial mensual ── */}
      <section>
        <h2 className="text-base font-semibold mb-3">Historial mensual</h2>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-[hsl(var(--muted-foreground))] text-xs uppercase tracking-wide">
                  <th className="text-left py-2.5 px-4 font-semibold">Mes</th>
                  <th className="text-right py-2.5 px-3 font-semibold">Beneficios</th>
                  <th className="text-right py-2.5 px-3 font-semibold">Capital entregado</th>
                  <th className="text-right py-2.5 px-3 font-semibold hidden md:table-cell">Ganancia estimada</th>
                  <th className="text-right py-2.5 px-3 font-semibold hidden md:table-cell">Ganancia cobrada</th>
                  <th className="text-right py-2.5 px-3 font-semibold hidden lg:table-cell">Ganancia pendiente</th>
                  <th className="text-right py-2.5 px-3 font-semibold">Falta cobrar</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.map((row) => {
                  const isSelected = row.month === `${year}-${String(month).padStart(2, "0")}`;
                  const [hy, hm] = row.month.split("-");
                  return (
                    <tr
                      key={row.month}
                      className={`transition-colors cursor-pointer hover:bg-[hsl(var(--accent))]/40 ${isSelected ? "bg-blue-50 font-medium" : ""}`}
                      onClick={() => { handleMonth(Number(hm)); handleYear(Number(hy)); }}
                    >
                      <td className="py-2.5 px-4 capitalize">
                        {row.monthLabel}
                        {isSelected && <span className="ml-2 text-xs text-blue-600 font-normal">← actual</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[hsl(var(--muted-foreground))]">{row.benefitsCount}</td>
                      <td className="py-2.5 px-3 text-right font-medium"><SensitiveValue value={formatCurrencyARS(row.capitalDelivered)} /></td>
                      <td className="py-2.5 px-3 text-right text-orange-600 hidden md:table-cell"><SensitiveValue value={formatCurrencyARS(row.estimatedProfit)} /></td>
                      <td className="py-2.5 px-3 text-right text-green-700 hidden md:table-cell"><SensitiveValue value={formatCurrencyARS(row.collectedProfit)} /></td>
                      <td className="py-2.5 px-3 text-right text-yellow-700 hidden lg:table-cell"><SensitiveValue value={formatCurrencyARS(row.pendingProfit)} /></td>
                      <td className="py-2.5 px-3 text-right font-semibold"><SensitiveValue value={formatCurrencyARS(row.pendingToCollect)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
          Clic en una fila para ver ese mes en el resumen. Muestra los últimos 6 meses de beneficios otorgados.
        </p>
      </section>
    </div>
  );
}

// ─── Card clickeable ──────────────────────────────────────────────────────────

function ClickCard({
  href, icon, iconBg, label, value, sub, description, alert = false,
}: {
  href: string; icon: React.ReactNode; iconBg: string;
  label: string; value: React.ReactNode; sub?: string;
  description?: string; alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group block rounded-xl border bg-[hsl(var(--card))] p-4 transition-all hover:shadow-md hover:border-[hsl(var(--primary))]/30 cursor-pointer ${alert ? "border-red-200 bg-red-50/40" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
        <ChevronRight className="h-4 w-4 text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
      </div>
      <div className="mt-3 space-y-0.5">
        <p className="text-xs text-[hsl(var(--muted-foreground))] font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-xl font-bold ${alert ? "text-red-700" : ""}`}>{value}</p>
        {sub && <p className="text-xs text-[hsl(var(--muted-foreground))]">{sub}</p>}
        {description && (
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5">{description}</p>
        )}
      </div>
    </Link>
  );
}
