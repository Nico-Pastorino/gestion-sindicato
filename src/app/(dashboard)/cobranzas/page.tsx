import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HandCoins, AlertTriangle, Clock, Users, CheckCircle, ClipboardCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InstallmentStatusBadge, BenefitTypeBadge } from "@/components/ui/badge";
import { SensitiveValue, SensitiveText } from "@/components/privacy/sensitive-value";
import { SimpleDonut } from "@/components/charts/simple-donut";
import { PayInstallmentButton } from "@/components/benefits/pay-installment-button";
import { Pagination } from "@/components/shared/pagination";
import { CobranzasFilters } from "./cobranzas-filters";
import {
  listInstallments,
  getCollectionsSummary,
} from "@/lib/services/installments.service";
import { installmentFiltersSchema } from "@/lib/validations/installment.schema";
import { formatCurrencyARS } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";

export const metadata: Metadata = { title: "Cobranzas" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    month?: string;
    year?: string;
    search?: string;
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
  benefitType: string;
  installmentNumber: number;
  totalInstallments: number;
  dueDate: string;
  amount: string;
  status: string;
  uncollectedReason: string | null;
}

export default async function CobranzasPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const parsed = installmentFiltersSchema.safeParse({
    status: ["pending", "overdue", "unpaid"].includes(params.status ?? "")
      ? params.status
      : "unpaid",
    month: params.month || undefined,
    year: params.month ? (params.year || new Date().getFullYear()) : undefined,
    search: params.search || undefined,
    page: params.page || 1,
    limit: 30,
  });

  const input = parsed.success
    ? parsed.data
    : installmentFiltersSchema.parse({ status: "unpaid" });

  const [result, summary] = await Promise.all([
    listInstallments(input),
    getCollectionsSummary(input.month, input.year),
  ]);

  const rows = result.data as unknown as InstallmentRow[];
  const totalUncollected = summary.pendingTotal + summary.overdueTotal;
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HandCoins className="h-6 w-6" />
            Cobranzas
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Cuotas que todavía no se cobraron. Acá se identifican y se registra el cobro manual.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/cobranzas/conciliacion">
            <ClipboardCheck className="h-4 w-4" />
            Revisar cobros del mes
          </Link>
        </Button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<HandCoins className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50"
          label="Total sin cobrar"
          value={<SensitiveValue value={formatCurrencyARS(totalUncollected)} />}
          sub={`${summary.pendingCount + summary.overdueCount} cuota${summary.pendingCount + summary.overdueCount !== 1 ? "s" : ""}`}
        />
        <SummaryCard
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          iconBg="bg-red-50"
          label="Vencidas (mora)"
          value={<SensitiveValue value={formatCurrencyARS(summary.overdueTotal)} />}
          sub={`${summary.overdueCount} cuota${summary.overdueCount !== 1 ? "s" : ""}`}
          alert={summary.overdueCount > 0}
        />
        <SummaryCard
          icon={<Clock className="h-5 w-5 text-yellow-600" />}
          iconBg="bg-yellow-50"
          label="Pendientes (por vencer)"
          value={<SensitiveValue value={formatCurrencyARS(summary.pendingTotal)} />}
          sub={`${summary.pendingCount} cuota${summary.pendingCount !== 1 ? "s" : ""}`}
        />
        <SummaryCard
          icon={<Users className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-50"
          label="Afiliados afectados"
          value={String(summary.affiliatesCount)}
          sub={
            summary.oldestDueDate
              ? `vencimiento más antiguo: ${formatDate(summary.oldestDueDate)}`
              : "sin cuotas adeudadas"
          }
        />
      </div>

      {/* Donut + filtros + tabla */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Composición de la deuda</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleDonut
              data={[
                { name: "Vencidas", value: summary.overdueTotal, color: "#dc2626", count: summary.overdueCount },
                { name: "Pendientes", value: summary.pendingTotal, color: "#ca8a04", count: summary.pendingCount },
              ]}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <Suspense>
              <CobranzasFilters />
            </Suspense>
          </CardHeader>
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm font-medium">No hay cuotas sin cobrar con estos filtros.</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  Probá quitando filtros o cambiando el período.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-[hsl(var(--muted-foreground))] text-xs uppercase tracking-wide">
                      <th className="text-left py-2.5 px-4 font-semibold">Afiliado</th>
                      <th className="text-left py-2.5 px-3 font-semibold hidden md:table-cell">DNI</th>
                      <th className="text-left py-2.5 px-3 font-semibold hidden lg:table-cell">Tipo</th>
                      <th className="text-left py-2.5 px-3 font-semibold">Cuota</th>
                      <th className="text-left py-2.5 px-3 font-semibold">Vencimiento</th>
                      <th className="text-right py-2.5 px-3 font-semibold">Monto</th>
                      <th className="text-left py-2.5 px-3 font-semibold">Estado</th>
                      <th className="py-2.5 px-4 text-right font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((row) => {
                      const isOverdue = row.status === "overdue" || (row.status === "pending" && row.dueDate < today);
                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-[hsl(var(--accent))]/40 transition-colors ${isOverdue ? "bg-red-50/40" : ""}`}
                        >
                          <td className="py-2.5 px-4">
                            <Link
                              href={`/afiliados/${row.affiliateId}`}
                              className="font-medium hover:underline"
                            >
                              {row.affiliateName}
                            </Link>
                            {row.affiliateArea && (
                              <span className="block text-xs text-[hsl(var(--muted-foreground))]">
                                {row.affiliateArea}
                              </span>
                            )}
                            {row.uncollectedReason && (
                              <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-orange-700">
                                <RotateCcw className="h-3 w-3" />
                                {row.uncollectedReason}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[hsl(var(--muted-foreground))] hidden md:table-cell">
                            <SensitiveText value={row.affiliateDni} type="dni" />
                          </td>
                          <td className="py-2.5 px-3 hidden lg:table-cell">
                            <BenefitTypeBadge type={row.benefitType as "ayuda_economica" | "supermercado" | "otro"} />
                          </td>
                          <td className="py-2.5 px-3 text-[hsl(var(--muted-foreground))]">
                            {row.installmentNumber}/{row.totalInstallments}
                          </td>
                          <td className="py-2.5 px-3">{formatDate(row.dueDate)}</td>
                          <td className="py-2.5 px-3 text-right font-semibold">
                            <SensitiveValue value={formatCurrencyARS(row.amount)} />
                          </td>
                          <td className="py-2.5 px-3">
                            <InstallmentStatusBadge status={row.status as "pending" | "overdue" | "paid" | "cancelled"} />
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <PayInstallmentButton
                                installmentId={row.id}
                                installmentNumber={row.installmentNumber}
                                totalInstallments={row.totalInstallments}
                                amount={row.amount}
                                dueDate={row.dueDate}
                              />
                              <Link
                                href={`/beneficios/${row.benefitId}`}
                                className="text-xs text-[hsl(var(--primary))] hover:underline whitespace-nowrap"
                              >
                                Ver
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {result.totalPages > 1 && (
              <div className="px-4 border-t">
                <Suspense>
                  <Pagination
                    page={result.page}
                    totalPages={result.totalPages}
                    total={result.total}
                    limit={result.limit}
                  />
                </Suspense>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-[hsl(var(--muted-foreground))]">
        El último día hábil de cada mes el sistema marca como cobradas las cuotas con vencimiento
        hasta ese mismo mes (retención municipal). Si la municipalidad no retuvo alguna, revertila
        desde el detalle del beneficio con el botón &quot;No cobrado&quot; y va a volver a aparecer
        en esta lista.
      </p>
    </div>
  );
}

function SummaryCard({
  icon, iconBg, label, value, sub, alert = false,
}: {
  icon: React.ReactNode; iconBg: string; label: string;
  value: React.ReactNode; sub?: string; alert?: boolean;
}) {
  return (
    <div className={`rounded-xl border bg-[hsl(var(--card))] p-4 ${alert ? "border-red-200 bg-red-50/40" : ""}`}>
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
        {icon}
      </div>
      <div className="mt-3 space-y-0.5">
        <p className="text-xs text-[hsl(var(--muted-foreground))] font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-xl font-bold ${alert ? "text-red-700" : ""}`}>{value}</p>
        {sub && <p className="text-xs text-[hsl(var(--muted-foreground))]">{sub}</p>}
      </div>
    </div>
  );
}
