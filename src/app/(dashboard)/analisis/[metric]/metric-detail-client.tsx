"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, RefreshCw, AlertCircle, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InstallmentStatusBadge, BenefitStatusBadge, BenefitTypeBadge } from "@/components/ui/badge";
import { SensitiveText, SensitiveValue } from "@/components/privacy/sensitive-value";
import { SimpleDonut } from "@/components/charts/simple-donut";
import { formatCurrencyARS } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import type {
  CapitalEntregadoData, TotalACobrarData, CobradoData,
  FaltaCobrarData, GananciaEstimadaData, GananciaPendienteData,
} from "@/lib/services/dashboard-detail.service";

type ValidMetric = "capital-entregado" | "total-a-cobrar" | "cobrado" | "falta-cobrar" | "ganancia-estimada" | "ganancia-pendiente";

interface Props {
  metric: ValidMetric;
  title: string;
  subtitle: string;
  initialMonth: number;
  initialYear: number;
  periodLabel: string;
  initialData: unknown;
}

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export function MetricDetailClient({ metric, title, subtitle, initialMonth, initialYear, periodLabel, initialData }: Props) {
  const router = useRouter();
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [label, setLabel] = useState(periodLabel);
  const [data, setData] = useState(initialData);
  const [isLoading, startTransition] = useTransition();
  const now = new Date();
  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - 2 + i);

  function loadPeriod(m: number, y: number) {
    startTransition(async () => {
      const res = await fetch(`/api/dashboard/${metric}?month=${m}&year=${y}`);
      const json = await res.json();
      if (json.ok) { setData(json.data); setLabel(json.period.label); }
    });
    router.replace(`/analisis/${metric}?month=${m}&year=${y}`, { scroll: false });
  }

  function handleMonth(m: number) { setMonth(m); loadPeriod(m, year); }
  function handleYear(y: number) { setYear(y); loadPeriod(month, y); }
  function setQuick(mOffset: number) {
    const d = new Date(now.getFullYear(), now.getMonth() - mOffset, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    setMonth(m);
    setYear(y);
    loadPeriod(m, y);
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <Link
          href={`/analisis?month=${month}&year=${year}`}
          className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mb-3 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver al Inicio
        </Link>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">{subtitle}</p>
      </div>

      {/* ── Selector período ── */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={month}
                  onChange={(e) => handleMonth(Number(e.target.value))}
                  className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1.5 text-sm font-medium"
                >
                  {MONTHS.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
                </select>
                <select
                  value={year}
                  onChange={(e) => handleYear(Number(e.target.value))}
                  className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1.5 text-sm font-medium"
                >
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <span className="hidden h-6 w-px bg-[hsl(var(--border))] sm:block" />
                {[
                  { label: "Este mes", offset: 0 },
                  { label: "Mes anterior", offset: 1 },
                  { label: "Hace 3 meses", offset: 3 },
                  { label: "Hace 6 meses", offset: 6 },
                ].map(({ label: quickLabel, offset }) => (
                  <button
                    key={offset}
                    onClick={() => setQuick(offset)}
                    className="rounded-full border px-2.5 py-0.5 text-xs hover:bg-[hsl(var(--accent))] transition-colors"
                  >
                    {quickLabel}
                  </button>
                ))}
                {isLoading && <RefreshCw className="h-4 w-4 animate-spin text-[hsl(var(--muted-foreground))]" />}
              </div>
              <span className="block text-sm font-semibold">{label}</span>
            </div>
            <Button variant="outline" asChild>
              <Link href={`/exportar?month=${month}&year=${year}`}>
                <FileText className="h-4 w-4" />
                Reporte PDF
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Contenido por métrica ── */}
      {metric === "capital-entregado"  && <CapitalEntregadoView  data={data as CapitalEntregadoData}  month={month} year={year} />}
      {metric === "total-a-cobrar"     && <TotalACobrarView      data={data as TotalACobrarData}      month={month} year={year} />}
      {metric === "cobrado"            && <CobradoView           data={data as CobradoData}           month={month} year={year} />}
      {metric === "falta-cobrar"       && <FaltaCobrarView       data={data as FaltaCobrarData}       month={month} year={year} />}
      {metric === "ganancia-estimada"  && <GananciaEstimadaView  data={data as GananciaEstimadaData}  month={month} year={year} />}
      {metric === "ganancia-pendiente" && <GananciaPendienteView data={data as GananciaPendienteData} month={month} year={year} />}
    </div>
  );
}

// ─── Componentes compartidos ──────────────────────────────────────────────────

function SummaryCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "blue" | "green" | "yellow" | "orange" | "red" }) {
  const colors = { blue: "text-blue-700", green: "text-green-700", yellow: "text-yellow-700", orange: "text-orange-600", red: "text-red-700" };
  return (
    <div className="rounded-xl border bg-[hsl(var(--card))] p-4">
      <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${accent ? colors[accent] : ""}`}><SensitiveValue value={value} /></p>
      {sub && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{sub}</p>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <AlertCircle className="h-8 w-8 text-[hsl(var(--muted-foreground))] opacity-40" />
      <p className="text-sm text-[hsl(var(--muted-foreground))]">{message}</p>
    </div>
  );
}

const TYPE_LABEL_COLORS: Record<string, string> = {
  "Ayuda Económica": "#2563eb",
  "Comercio": "#9333ea",
  "Otro": "#64748b",
};
const FALLBACK_COLORS = ["#0d9488", "#ea580c", "#ca8a04"];

/** Torta + barras por tipo de beneficio, lado a lado */
function ByTypeSection({ title, items }: { title: string; items: { label: string; amount: number; count: number }[] }) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:items-center">
          <SimpleDonut
            data={items.map((item, i) => ({
              name: item.label,
              value: item.amount,
              count: item.count,
              color: TYPE_LABEL_COLORS[item.label] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
            }))}
          />
          <ByTypeChart items={items} />
        </div>
      </CardContent>
    </Card>
  );
}

function ByTypeChart({ items }: { items: { label: string; amount: number; count: number }[] }) {
  const max = Math.max(...items.map(i => i.amount), 1);
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{item.label}</span>
            <span className="text-[hsl(var(--muted-foreground))]">
              <SensitiveValue value={formatCurrencyARS(item.amount)} /> · {item.count} {item.count === 1 ? "beneficio" : "beneficios"}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-[hsl(var(--muted))]">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${Math.round((item.amount / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Vista 1: Capital entregado ───────────────────────────────────────────────

function CapitalEntregadoView({ data, month, year }: { data: CapitalEntregadoData; month: number; year: number }) {
  if (!data || data.benefitsCount === 0) {
    return <EmptyState message="No hay beneficios otorgados en este período." />;
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Capital entregado" value={formatCurrencyARS(data.totalCapital)} accent="blue" />
        <SummaryCard label="Beneficios" value={String(data.benefitsCount)} sub="otorgados" />
        <SummaryCard label="Promedio por beneficio" value={formatCurrencyARS(data.avgPerBenefit)} />
        <SummaryCard label="Tipos" value={String(data.byType.length)} sub="distintos" />
      </div>

      <ByTypeSection title="Por tipo de beneficio" items={data.byType} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Beneficios incluidos — {data.benefitsCount}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs uppercase text-[hsl(var(--muted-foreground))]">
              <th className="text-left py-2 px-4">Fecha</th>
              <th className="text-left py-2 px-3">Afiliado</th>
              <th className="text-left py-2 px-3 hidden sm:table-cell">DNI</th>
              <th className="text-left py-2 px-3 hidden md:table-cell">Tipo</th>
              <th className="text-right py-2 px-3">Capital</th>
              <th className="text-center py-2 px-3 hidden sm:table-cell">Cuotas</th>
              <th className="text-right py-2 px-3 hidden md:table-cell">Por cuota</th>
              <th className="text-left py-2 px-3">Estado</th>
              <th className="py-2 px-4" />
            </tr></thead>
            <tbody className="divide-y">
              {data.rows.map((r) => (
                <tr key={r.id} className="hover:bg-[hsl(var(--accent))]/40 transition-colors">
                  <td className="py-2.5 px-4 text-[hsl(var(--muted-foreground))]">{formatDate(r.date)}</td>
                  <td className="py-2.5 px-3 font-medium">{r.fullName}</td>
                  <td className="py-2.5 px-3 hidden sm:table-cell text-[hsl(var(--muted-foreground))]"><SensitiveText value={r.dni} type="dni" /></td>
                  <td className="py-2.5 px-3 hidden md:table-cell">
                    <BenefitTypeBadge type={r.type as "ayuda_economica" | "supermercado" | "otro"} />
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold"><SensitiveValue value={formatCurrencyARS(r.totalAmount)} /></td>
                  <td className="py-2.5 px-3 text-center hidden sm:table-cell text-[hsl(var(--muted-foreground))]">
                    {r.paidCount}/{r.installmentsCount}
                  </td>
                  <td className="py-2.5 px-3 text-right hidden md:table-cell"><SensitiveValue value={formatCurrencyARS(r.installmentAmount)} /></td>
                  <td className="py-2.5 px-3">
                    <BenefitStatusBadge status={r.status as "active" | "finished" | "cancelled"} />
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <Link href={`/beneficios/${r.id}`} className="text-xs text-[hsl(var(--primary))] hover:underline">Ver</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Vista 2: Total a cobrar ──────────────────────────────────────────────────

function TotalACobrarView({ data, month, year }: { data: TotalACobrarData; month: number; year: number }) {
  if (!data || data.installmentsCount === 0) {
    return <EmptyState message="No hay cuotas generadas en este período." />;
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Total a cobrar" value={formatCurrencyARS(data.totalToCollect)} accent="blue" />
        <SummaryCard label="Capital" value={formatCurrencyARS(data.capitalPart)} sub="parte de capital" />
        <SummaryCard label="Interés incluido" value={formatCurrencyARS(data.interestPart)} accent="orange" sub="ganancia estimada" />
        <SummaryCard label="Cuotas generadas" value={String(data.installmentsCount)} sub={`${data.benefitsCount} beneficios`} />
      </div>

      <ByTypeSection title="Por tipo de beneficio" items={data.byType} />

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Cuotas del período — {data.installmentsCount}</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs uppercase text-[hsl(var(--muted-foreground))]">
              <th className="text-left py-2 px-4">Afiliado</th>
              <th className="text-left py-2 px-3 hidden sm:table-cell">DNI</th>
              <th className="text-left py-2 px-3 hidden md:table-cell">Tipo</th>
              <th className="text-center py-2 px-3">Cuota</th>
              <th className="text-right py-2 px-3">Monto</th>
              <th className="text-left py-2 px-3 hidden sm:table-cell">Vencimiento</th>
              <th className="text-left py-2 px-3">Estado</th>
            </tr></thead>
            <tbody className="divide-y">
              {data.rows.map((r) => (
                <tr key={r.id} className="hover:bg-[hsl(var(--accent))]/40 transition-colors">
                  <td className="py-2.5 px-4 font-medium">{r.fullName}</td>
                  <td className="py-2.5 px-3 hidden sm:table-cell text-[hsl(var(--muted-foreground))]"><SensitiveText value={r.dni} type="dni" /></td>
                  <td className="py-2.5 px-3 hidden md:table-cell">
                    <BenefitTypeBadge type={r.type as "ayuda_economica" | "supermercado" | "otro"} />
                  </td>
                  <td className="py-2.5 px-3 text-center text-[hsl(var(--muted-foreground))]">{r.installmentNumber}/{r.totalInstallments}</td>
                  <td className="py-2.5 px-3 text-right font-semibold"><SensitiveValue value={formatCurrencyARS(r.amount)} /></td>
                  <td className="py-2.5 px-3 hidden sm:table-cell text-[hsl(var(--muted-foreground))]">{formatDate(r.dueDate)}</td>
                  <td className="py-2.5 px-3">
                    <InstallmentStatusBadge status={r.status as "pending" | "paid" | "overdue" | "cancelled"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Vista 3: Cobrado hasta ahora ─────────────────────────────────────────────

function CobradoView({ data, month, year }: { data: CobradoData; month: number; year: number }) {
  if (!data || data.installmentsCount === 0) {
    return <EmptyState message="No hay cuotas cobradas en este período." />;
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Total cobrado" value={formatCurrencyARS(data.totalPaid)} accent="green" />
        <SummaryCard label="Cuotas cobradas" value={String(data.installmentsCount)} />
        <SummaryCard label="Interés cobrado" value={formatCurrencyARS(data.earnedInterest)} accent="orange" />
        <SummaryCard label="Último cobro" value={data.lastPaymentDate ? formatDate(data.lastPaymentDate) : "—"} />
      </div>

      <ByTypeSection title="Cobrado por tipo" items={data.byType} />

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Cuotas cobradas — {data.installmentsCount}</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs uppercase text-[hsl(var(--muted-foreground))]">
              <th className="text-left py-2 px-4">Fecha de pago</th>
              <th className="text-left py-2 px-3">Afiliado</th>
              <th className="text-left py-2 px-3 hidden sm:table-cell">DNI</th>
              <th className="text-left py-2 px-3 hidden md:table-cell">Tipo</th>
              <th className="text-center py-2 px-3">Cuota</th>
              <th className="text-right py-2 px-3">Monto cobrado</th>
              <th className="text-right py-2 px-3 hidden md:table-cell">Interés de la cuota</th>
            </tr></thead>
            <tbody className="divide-y">
              {data.rows.map((r) => (
                <tr key={r.id} className="hover:bg-[hsl(var(--accent))]/40 transition-colors">
                  <td className="py-2.5 px-4 text-[hsl(var(--muted-foreground))]">{r.paidDate ? formatDate(r.paidDate) : "—"}</td>
                  <td className="py-2.5 px-3 font-medium">{r.fullName}</td>
                  <td className="py-2.5 px-3 hidden sm:table-cell text-[hsl(var(--muted-foreground))]"><SensitiveText value={r.dni} type="dni" /></td>
                  <td className="py-2.5 px-3 hidden md:table-cell">
                    <BenefitTypeBadge type={r.type as "ayuda_economica" | "supermercado" | "otro"} />
                  </td>
                  <td className="py-2.5 px-3 text-center text-[hsl(var(--muted-foreground))]">{r.installmentNumber}/{r.totalInstallments}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-green-700"><SensitiveValue value={formatCurrencyARS(r.amount)} /></td>
                  <td className="py-2.5 px-3 text-right hidden md:table-cell text-orange-600"><SensitiveValue value={formatCurrencyARS(r.earnedInterest)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Vista 4: Falta cobrar ────────────────────────────────────────────────────

function FaltaCobrarView({ data, month, year }: { data: FaltaCobrarData; month: number; year: number }) {
  const [filter, setFilter] = useState<"all" | "pending" | "overdue">("all");
  if (!data || data.pendingCount === 0) {
    return <EmptyState message="No hay cuotas pendientes en este período." />;
  }
  const filtered = filter === "all" ? data.rows : data.rows.filter(r => r.status === filter);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Total pendiente" value={formatCurrencyARS(data.totalPending)} accent="yellow" />
        <SummaryCard label="Cuotas pendientes" value={String(data.pendingCount)} />
        <SummaryCard label="Cuotas vencidas" value={String(data.overdueCount)} accent={data.overdueCount > 0 ? "red" : undefined} />
        <SummaryCard label="Próximo vencimiento" value={data.nextDueDate ? formatDate(data.nextDueDate) : "—"} />
      </div>

      {/* Barra cobrado vs pendiente */}
      {data.pendingInterest > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">
              Interés pendiente de cobrar
            </p>
            <p className="text-lg font-bold text-yellow-700"><SensitiveValue value={formatCurrencyARS(data.pendingInterest)} /></p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              Este es el interés incluido en las cuotas que todavía no se cobraron.
            </p>
          </CardContent>
        </Card>
      )}

      <ByTypeSection title="Pendiente por tipo" items={data.byType} />

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm">Cuotas pendientes — {filtered.length}</CardTitle>
            <div className="flex gap-1.5">
              {(["all","pending","overdue"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${filter === f ? "bg-blue-600 text-white border-blue-600" : "hover:bg-[hsl(var(--accent))]"}`}
                >
                  {f === "all" ? "Todas" : f === "pending" ? "Pendientes" : "Vencidas"}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Sin resultados para el filtro seleccionado.</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b text-xs uppercase text-[hsl(var(--muted-foreground))]">
                <th className="text-left py-2 px-4">Afiliado</th>
                <th className="text-left py-2 px-3 hidden sm:table-cell">DNI</th>
                <th className="text-left py-2 px-3 hidden lg:table-cell">Legajo</th>
                <th className="text-left py-2 px-3 hidden md:table-cell">Tipo</th>
                <th className="text-center py-2 px-3">Cuota</th>
                <th className="text-right py-2 px-3">Monto</th>
                <th className="text-left py-2 px-3 hidden sm:table-cell">Vencimiento</th>
                <th className="text-left py-2 px-3">Estado</th>
                <th className="text-right py-2 px-3 hidden md:table-cell">Días</th>
                <th className="py-2 px-4" />
              </tr></thead>
              <tbody className="divide-y">
                {filtered.map((r) => (
                  <tr key={r.id} className={`hover:bg-[hsl(var(--accent))]/40 transition-colors ${r.status === "overdue" ? "bg-red-50/40" : ""}`}>
                    <td className="py-2.5 px-4 font-medium">{r.fullName}</td>
                    <td className="py-2.5 px-3 hidden sm:table-cell text-[hsl(var(--muted-foreground))]"><SensitiveText value={r.dni} type="dni" /></td>
                    <td className="py-2.5 px-3 hidden lg:table-cell text-[hsl(var(--muted-foreground))]">{r.legajo ?? "—"}</td>
                    <td className="py-2.5 px-3 hidden md:table-cell">
                      <BenefitTypeBadge type={r.type as "ayuda_economica" | "supermercado" | "otro"} />
                    </td>
                    <td className="py-2.5 px-3 text-center text-[hsl(var(--muted-foreground))]">{r.installmentNumber}/{r.totalInstallments}</td>
                    <td className="py-2.5 px-3 text-right font-semibold"><SensitiveValue value={formatCurrencyARS(r.amount)} /></td>
                    <td className="py-2.5 px-3 hidden sm:table-cell text-[hsl(var(--muted-foreground))]">{formatDate(r.dueDate)}</td>
                    <td className="py-2.5 px-3">
                      <InstallmentStatusBadge status={r.status as "pending" | "overdue" | "paid" | "cancelled"} />
                    </td>
                    <td className="py-2.5 px-3 text-right hidden md:table-cell text-xs">
                      {r.daysOverdue > 0
                        ? <span className="text-red-600">{r.daysOverdue}d venc.</span>
                        : r.daysOverdue < 0
                        ? <span className="text-green-600">{Math.abs(r.daysOverdue)}d</span>
                        : <span>Hoy</span>}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <Link href={`/afiliados/${r.affiliateId}`} className="text-xs text-[hsl(var(--primary))] hover:underline">Ver</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Vista 5: Ganancia estimada ───────────────────────────────────────────────

function GananciaEstimadaView({ data, month, year }: { data: GananciaEstimadaData; month: number; year: number }) {
  if (!data || data.benefitsCount === 0) {
    return <EmptyState message="No hay interés registrado en este período." />;
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Interés total" value={formatCurrencyARS(data.totalProfit)} accent="orange" />
        <SummaryCard label="Capital entregado" value={formatCurrencyARS(data.totalCapital)} accent="blue" />
        <SummaryCard label="Total a devolver" value={formatCurrencyARS(data.totalRepayment)} />
        <SummaryCard label="Tasa promedio" value={`${data.avgRate.toFixed(2)}%`} sub="interés promedio" accent="orange" />
      </div>

      {/* Explicación */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-sm font-medium">¿Cómo se calcula?</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Interés = Total a devolver − Capital entregado.
            Es el interés aplicado sobre cada beneficio otorgado.
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <span><span className="font-semibold"><SensitiveValue value={formatCurrencyARS(data.totalRepayment)} /></span> <span className="text-[hsl(var(--muted-foreground))]">a devolver</span></span>
            <span className="text-[hsl(var(--muted-foreground))]">−</span>
            <span><span className="font-semibold"><SensitiveValue value={formatCurrencyARS(data.totalCapital)} /></span> <span className="text-[hsl(var(--muted-foreground))]">capital</span></span>
            <span className="text-[hsl(var(--muted-foreground))]">=</span>
            <span className="font-bold text-orange-600"><SensitiveValue value={formatCurrencyARS(data.totalProfit)} /> de interés</span>
          </div>
        </CardContent>
      </Card>

      <ByTypeSection title="Interés por tipo" items={data.byType} />

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Beneficios con interés — {data.benefitsCount}</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs uppercase text-[hsl(var(--muted-foreground))]">
              <th className="text-left py-2 px-4">Afiliado</th>
              <th className="text-left py-2 px-3 hidden sm:table-cell">DNI</th>
              <th className="text-left py-2 px-3 hidden md:table-cell">Tipo</th>
              <th className="text-right py-2 px-3">Capital</th>
              <th className="text-right py-2 px-3">Total devolver</th>
              <th className="text-right py-2 px-3 font-semibold text-orange-600">Interés</th>
              <th className="text-right py-2 px-3 hidden md:table-cell">%</th>
              <th className="text-center py-2 px-3 hidden sm:table-cell">Cuotas</th>
              <th className="py-2 px-4" />
            </tr></thead>
            <tbody className="divide-y">
              {data.rows.map((r) => (
                <tr key={r.id} className="hover:bg-[hsl(var(--accent))]/40 transition-colors">
                  <td className="py-2.5 px-4 font-medium">{r.fullName}</td>
                  <td className="py-2.5 px-3 hidden sm:table-cell text-[hsl(var(--muted-foreground))]"><SensitiveText value={r.dni} type="dni" /></td>
                  <td className="py-2.5 px-3 hidden md:table-cell">
                    <BenefitTypeBadge type={r.type as "ayuda_economica" | "supermercado" | "otro"} />
                  </td>
                  <td className="py-2.5 px-3 text-right"><SensitiveValue value={formatCurrencyARS(r.totalAmount)} /></td>
                  <td className="py-2.5 px-3 text-right"><SensitiveValue value={formatCurrencyARS(r.totalRepaymentAmount)} /></td>
                  <td className="py-2.5 px-3 text-right font-semibold text-orange-600"><SensitiveValue value={formatCurrencyARS(r.interestAmount)} /></td>
                  <td className="py-2.5 px-3 text-right hidden md:table-cell text-[hsl(var(--muted-foreground))]">{Number(r.interestRate).toFixed(2)}%</td>
                  <td className="py-2.5 px-3 text-center hidden sm:table-cell text-[hsl(var(--muted-foreground))]">
                    {r.paidCount}/{r.installmentsCount}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <Link href={`/beneficios/${r.id}`} className="text-xs text-[hsl(var(--primary))] hover:underline">Ver</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Vista 6: Ganancia pendiente ──────────────────────────────────────────────

function GananciaPendienteView({ data, month, year }: { data: GananciaPendienteData; month: number; year: number }) {
  if (!data || data.totalEstimatedInterest === 0) {
    return <EmptyState message="No hay interés por cobrar en este período." />;
  }
  const earnedPercent = data.totalEstimatedInterest > 0
    ? Math.min(100, Math.round((data.totalEarnedInterest / data.totalEstimatedInterest) * 100))
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Interés por cobrar" value={formatCurrencyARS(data.totalPendingInterest)} accent="yellow" />
        <SummaryCard label="Interés cobrado" value={formatCurrencyARS(data.totalEarnedInterest)} accent="green" />
        <SummaryCard label="Interés total" value={formatCurrencyARS(data.totalEstimatedInterest)} />
        <SummaryCard label="Pendiente" value={`${data.pendingPercent}%`} sub="del interés total" accent="yellow" />
      </div>

      {/* Barra de progreso */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-green-700 font-medium">{earnedPercent}% cobrado</span>
            <span className="text-yellow-700 font-medium">{100 - earnedPercent}% pendiente</span>
          </div>
          <div className="h-3 w-full rounded-full bg-[hsl(var(--muted))]">
            <div className="h-3 rounded-full bg-green-500 transition-all duration-500" style={{ width: `${earnedPercent}%` }} />
          </div>
          <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))]">
            <span><SensitiveValue value={formatCurrencyARS(data.totalEarnedInterest)} /></span>
            <span><SensitiveValue value={formatCurrencyARS(data.totalPendingInterest)} /></span>
          </div>
        </CardContent>
      </Card>

      <ByTypeSection title="Interés por cobrar, por tipo" items={data.byType} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Cuotas con interés por cobrar — {data.pendingInstallmentsCount}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {data.rows.length === 0 ? (
            <div className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Sin cuotas con interés por cobrar.</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b text-xs uppercase text-[hsl(var(--muted-foreground))]">
                <th className="text-left py-2 px-4">Afiliado</th>
                <th className="text-left py-2 px-3 hidden sm:table-cell">DNI</th>
                <th className="text-left py-2 px-3 hidden md:table-cell">Tipo</th>
                <th className="text-center py-2 px-3">Cuota</th>
                <th className="text-right py-2 px-3">Monto cuota</th>
                <th className="text-right py-2 px-3 text-orange-600">Interés cuota</th>
                <th className="text-left py-2 px-3 hidden sm:table-cell">Vencimiento</th>
                <th className="text-left py-2 px-3">Estado</th>
                <th className="py-2 px-4" />
              </tr></thead>
              <tbody className="divide-y">
                {data.rows.map((r) => (
                  <tr key={r.id} className="hover:bg-[hsl(var(--accent))]/40 transition-colors">
                    <td className="py-2.5 px-4 font-medium">{r.fullName}</td>
                    <td className="py-2.5 px-3 hidden sm:table-cell text-[hsl(var(--muted-foreground))]"><SensitiveText value={r.dni} type="dni" /></td>
                    <td className="py-2.5 px-3 hidden md:table-cell">
                      <BenefitTypeBadge type={r.type as "ayuda_economica" | "supermercado" | "otro"} />
                    </td>
                    <td className="py-2.5 px-3 text-center text-[hsl(var(--muted-foreground))]">{r.installmentNumber}/{r.totalInstallments}</td>
                    <td className="py-2.5 px-3 text-right font-semibold"><SensitiveValue value={formatCurrencyARS(r.amount)} /></td>
                    <td className="py-2.5 px-3 text-right text-orange-600 font-semibold"><SensitiveValue value={formatCurrencyARS(r.interestPerInstallment)} /></td>
                    <td className="py-2.5 px-3 hidden sm:table-cell text-[hsl(var(--muted-foreground))]">{formatDate(r.dueDate)}</td>
                    <td className="py-2.5 px-3">
                      <InstallmentStatusBadge status={r.status as "pending" | "overdue" | "paid" | "cancelled"} />
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <Link href={`/afiliados/${r.affiliateId}`} className="text-xs text-[hsl(var(--primary))] hover:underline">Ver</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
