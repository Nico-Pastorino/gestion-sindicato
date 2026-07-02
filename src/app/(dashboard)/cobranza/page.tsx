import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, ClipboardCheck, Search, WalletCards } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SensitiveValue } from "@/components/privacy/sensitive-value";
import { CollectionsTable } from "@/components/cobranza/collections-table";
import { Pagination } from "@/components/shared/pagination";
import { formatCurrency } from "@/lib/utils/credit";
import { getCurrentMonthYear } from "@/lib/utils/date";
import {
  getInstallmentsSummaryByMonth,
  listInstallments,
} from "@/lib/services/installments.service";
import type { BenefitType, InstallmentStatus } from "@/types";

export const metadata: Metadata = { title: "Cobranza" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    month?: string;
    year?: string;
    status?: string;
    area?: string;
    page?: string;
  }>;
}

interface InstallmentRow {
  id: string;
  benefitId: string;
  affiliateId: string;
  affiliateName: string;
  affiliateDni: string;
  affiliateLegajo: string | null;
  affiliateArea: string | null;
  commerce: string | null;
  benefitType: BenefitType;
  installmentNumber: number;
  totalInstallments: number;
  dueDate: string;
  paidDate: string | null;
  amount: string;
  status: InstallmentStatus;
}

const MONTHS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

const STATUS_OPTIONS: Array<{ value: InstallmentStatus; label: string }> = [
  { value: "pending", label: "Pendientes" },
  { value: "overdue", label: "Vencidas" },
  { value: "paid", label: "Cobradas" },
  { value: "cancelled", label: "Canceladas" },
];

export default async function CollectionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const current = getCurrentMonthYear();
  const month = clampNumber(Number(params.month ?? current.month), 1, 12, current.month);
  const year = clampNumber(Number(params.year ?? current.year), 2000, 2100, current.year);
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = 25;
  const status = parseStatus(params.status);
  const area = params.area?.trim() || undefined;

  const [summary, result] = await Promise.all([
    getInstallmentsSummaryByMonth(year, month),
    listInstallments({
      month,
      year,
      status,
      area,
      page,
      limit,
    }),
  ]);

  const rows = result.data as unknown as InstallmentRow[];
  const pendingCount = Number(summary?.pending_count ?? 0);
  const overdueCount = Number(summary?.overdue_count ?? 0);
  const paidCount = Number(summary?.paid_count ?? 0);
  const totalPending = Number(summary?.total_pending ?? 0);
  const totalPaid = Number(summary?.total_paid ?? 0);
  const selectedMonth = MONTHS.find((item) => item.value === month)?.label ?? "Mes";
  const totalOverdueAmount = rows
    .filter((row) => row.status === "overdue")
    .reduce((acc, row) => acc + Number(row.amount), 0);
  const topDebtors = buildTopDebtors(rows);
  const riskLevel = overdueCount > 0 ? "alto" : pendingCount > 0 ? "medio" : "bajo";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <WalletCards className="h-6 w-6" />
            Cobranza
          </h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            Cuotas de {selectedMonth.toLowerCase()} {year}: {result.total} registro{result.total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/cobranza/revisar?month=${month}&year=${year}`}>
              <ClipboardCheck className="h-4 w-4" />
              Revisar cobros del mes
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/exportar">
              <CalendarDays className="h-4 w-4" />
              Liquidaciones
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          title="Pendiente de cobro"
          value={formatCurrency(totalPending)}
          detail={`${pendingCount + overdueCount} cuota${pendingCount + overdueCount !== 1 ? "s" : ""} por cobrar`}
          tone="amber"
        />
        <SummaryCard
          title="Cobrado"
          value={formatCurrency(totalPaid)}
          detail={`${paidCount} cuota${paidCount !== 1 ? "s" : ""} cobradas`}
          tone="green"
        />
        <SummaryCard
          title="Vencidas"
          value={String(overdueCount)}
          detail="Cuotas con fecha vencida"
          tone="red"
        />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-3">
        <Card className="flex h-full flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Composición de deuda</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col pb-4">
            <DebtComposition pending={Math.max(0, totalPending - totalOverdueAmount)} overdue={totalOverdueAmount} />
          </CardContent>
        </Card>
        <Card className="flex h-full flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Semáforo de riesgo</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <RiskSemaphore level={riskLevel} overdueCount={overdueCount} pendingCount={pendingCount} />
          </CardContent>
        </Card>
        <Card className="flex h-full flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Mayor deuda del mes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-4">
            {topDebtors.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">No hay deuda para el filtro seleccionado.</p>
            ) : (
              topDebtors.map((debtor, index) => (
                <div key={debtor.affiliateId} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 rounded-lg border px-3 py-2.5">
                  <Link
                    href={`/afiliados/${debtor.affiliateId}`}
                    className="min-w-0 truncate text-sm font-semibold leading-tight hover:text-[hsl(var(--primary))]"
                    title={debtor.name}
                  >
                    <span className="text-[hsl(var(--muted-foreground))]">{index + 1}.</span>{" "}
                    {debtor.name}
                  </Link>
                  <p className="text-right text-sm font-bold leading-tight">
                    <SensitiveValue value={formatCurrency(debtor.amount)} />
                  </p>
                  <p className="col-span-2 text-xs text-[hsl(var(--muted-foreground))]">
                    {debtor.count} cuota{debtor.count !== 1 ? "s" : ""}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros de cobranza</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Mes</span>
              <select
                name="month"
                defaultValue={month}
                className="h-10 w-full rounded-md border border-[hsl(var(--border))] bg-transparent px-3 text-sm"
              >
                {MONTHS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Año</span>
              <input
                name="year"
                type="number"
                min="2000"
                max="2100"
                defaultValue={year}
                className="h-10 w-full rounded-md border border-[hsl(var(--border))] bg-transparent px-3 text-sm"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Estado</span>
              <select
                name="status"
                defaultValue={status ?? ""}
                className="h-10 w-full rounded-md border border-[hsl(var(--border))] bg-transparent px-3 text-sm"
              >
                <option value="">Todos</option>
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Área</span>
              <input
                name="area"
                defaultValue={area ?? ""}
                placeholder="Todas"
                className="h-10 w-full rounded-md border border-[hsl(var(--border))] bg-transparent px-3 text-sm"
              />
            </label>
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                <Search className="h-4 w-4" />
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <CollectionsTable rows={rows} />
          <div className="border-t px-4">
            <Suspense>
              <Pagination
                page={page}
                totalPages={result.totalPages}
                total={result.total}
                limit={limit}
              />
            </Suspense>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DebtComposition({ pending, overdue }: { pending: number; overdue: number }) {
  const total = pending + overdue;
  const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0;
  const overduePct = total > 0 ? 100 - pendingPct : 0;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5">
      {/* Donut */}
      <div
        className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-[conic-gradient(#d99700_0deg_var(--pending),#ef4444_var(--pending)_360deg)]"
        style={{ "--pending": `${pendingPct * 3.6}deg` } as React.CSSProperties}
      >
        <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-[hsl(var(--card))]">
          <span className="text-lg font-bold leading-none">{total > 0 ? `${pendingPct}%` : "0%"}</span>
          <span className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">pendiente</span>
        </div>
      </div>
      {/* Leyenda — ancho completo, sin recortes */}
      <div className="w-full space-y-2 text-sm">
        <LegendLine color="bg-amber-500" label="Pendientes" value={formatCurrency(pending)} percent={pendingPct} />
        <LegendLine color="bg-red-500" label="Vencidas" value={formatCurrency(overdue)} percent={overduePct} />
      </div>
    </div>
  );
}

function LegendLine({ color, label, value, percent }: { color: string; label: string; value: string; percent: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-md bg-[hsl(var(--muted))]/35 px-3 py-2">
      <span className="flex items-center gap-2 font-medium">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
        {label}
      </span>
      <span className="font-semibold tabular-nums">
        {percent}% <span className="text-[hsl(var(--muted-foreground))]">·</span> <SensitiveValue value={value} />
      </span>
    </div>
  );
}

function RiskSemaphore({
  level,
  overdueCount,
  pendingCount,
}: {
  level: "alto" | "medio" | "bajo";
  overdueCount: number;
  pendingCount: number;
}) {
  const config = {
    alto: { label: "Riesgo alto", color: "bg-red-500", text: "text-red-700", detail: `${overdueCount} cuotas vencidas requieren seguimiento.` },
    medio: { label: "Riesgo medio", color: "bg-amber-500", text: "text-amber-700", detail: `${pendingCount} cuotas pendientes por vencer.` },
    bajo: { label: "Riesgo bajo", color: "bg-emerald-500", text: "text-emerald-700", detail: "No hay cuotas pendientes para este filtro." },
  }[level];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className={`h-3.5 w-3.5 rounded-full ${config.color}`} />
        <p className={`text-lg font-bold ${config.text}`}>{config.label}</p>
      </div>
      <p className="text-sm text-[hsl(var(--muted-foreground))]">{config.detail}</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg border bg-[hsl(var(--muted))]/25 px-3 py-2">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Pendientes</p>
          <p className="text-lg font-bold leading-tight">{pendingCount}</p>
        </div>
        <div className="rounded-lg border bg-[hsl(var(--muted))]/25 px-3 py-2">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Vencidas</p>
          <p className="text-lg font-bold leading-tight">{overdueCount}</p>
        </div>
      </div>
    </div>
  );
}

function buildTopDebtors(rows: InstallmentRow[]) {
  const map = new Map<string, { affiliateId: string; name: string; amount: number; count: number }>();

  for (const row of rows) {
    if (row.status !== "pending" && row.status !== "overdue") continue;
    const existing = map.get(row.affiliateId) ?? {
      affiliateId: row.affiliateId,
      name: row.affiliateName,
      amount: 0,
      count: 0,
    };
    existing.amount += Number(row.amount);
    existing.count += 1;
    map.set(row.affiliateId, existing);
  }

  return [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, 5);
}

function SummaryCard({
  title,
  value,
  detail,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  tone: "amber" | "green" | "red";
}) {
  const toneClass = {
    amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    red: "bg-red-50 text-red-700 ring-red-600/20",
  }[tone];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">{title}</p>
            <p className="mt-2 text-2xl font-bold">
              <SensitiveValue value={value} />
            </p>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{detail}</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${toneClass}`}>
            Mes
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function clampNumber(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function parseStatus(status: string | undefined): InstallmentStatus | undefined {
  if (!status) return undefined;
  return STATUS_OPTIONS.some((item) => item.value === status)
    ? (status as InstallmentStatus)
    : undefined;
}
