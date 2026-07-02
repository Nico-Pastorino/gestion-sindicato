import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Gift,
  UserRound,
  AlertTriangle,
  Clock,
  Gauge,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AffiliateStatusBadge,
  BenefitStatusBadge,
  BenefitTypeBadge,
  InstallmentStatusBadge,
} from "@/components/ui/badge";
import { CreditBar } from "@/components/shared/credit-bar";
import { SensitiveValue } from "@/components/privacy/sensitive-value";
import { formatCurrency } from "@/lib/utils/credit";
import { formatDate } from "@/lib/utils/date";
import { getAffiliateById, getAffiliateCreditSummary } from "@/lib/services/affiliates.service";
import { isUuid } from "@/lib/utils/labels";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return { title: "Beneficios del afiliado" };
  const data = await getAffiliateById(id);
  return { title: data ? `Beneficios — ${data.fullName}` : "Beneficios del afiliado" };
}

export default async function AffiliateBenefitsPage({ params }: PageProps) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [data, credit] = await Promise.all([
    getAffiliateById(id),
    getAffiliateCreditSummary(id),
  ]);

  if (!data) notFound();

  const hasSalary = data.grossSalary != null && Number(data.grossSalary) > 0;

  const activeBenefits = data.benefits.filter((b) => b.status === "active");
  const allInstallments = data.benefits.flatMap((b) =>
    b.installments.map((i) => ({ ...i, benefit: b }))
  );
  const upcomingInstallments = allInstallments
    .filter((i) => i.status === "pending" || i.status === "overdue")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // Cumplimiento: cuotas ya vencidas que se cobraron
  const today = new Date().toISOString().split("T")[0];
  const dueInstallments = allInstallments.filter(
    (i) => i.status !== "cancelled" && i.dueDate <= today
  );
  const paidDueInstallments = dueInstallments.filter((i) => i.status === "paid");
  const complianceRate = dueInstallments.length > 0
    ? Math.round((paidDueInstallments.length / dueInstallments.length) * 100)
    : 100;

  const sortedHistory = [...data.benefits].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
            <Link href="/beneficios">
              <ChevronLeft className="h-4 w-4" />
              Beneficios
            </Link>
          </Button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">Beneficios de {data.fullName}</h1>
            <AffiliateStatusBadge status={data.status} />
          </div>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            DNI {data.dni}
            {data.legajo ? ` · Legajo ${data.legajo}` : ""}
            {data.area ? ` · ${data.area}` : ""}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" asChild>
            <Link href={`/afiliados/${data.id}`}>
              <UserRound className="h-4 w-4" />
              Ver ficha
            </Link>
          </Button>
          {hasSalary ? (
            <Button asChild>
              <Link href={`/beneficios/nuevo?affiliateId=${data.id}`}>
                <Gift className="h-4 w-4" />
                Nuevo beneficio
              </Link>
            </Button>
          ) : (
            <Button disabled title="Cargá el sueldo bruto en la ficha para habilitar beneficios">
              <Gift className="h-4 w-4" />
              Nuevo beneficio
            </Button>
          )}
        </div>
      </div>

      {/* Alerta sueldo pendiente */}
      {!hasSalary && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
          <div className="text-sm text-yellow-800">
            <strong>Sueldo bruto pendiente de carga.</strong>{" "}
            Sin sueldo no se puede calcular el tope del 30% ni cargar beneficios.{" "}
            <Link href={`/afiliados/${data.id}/editar`} className="underline font-medium">
              Completar en la ficha
            </Link>
          </div>
        </div>
      )}

      {/* Cupo mensual del 30% */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CreditMetricCard
          label="Sueldo bruto"
          value={hasSalary ? formatCurrency(data.grossSalary!) : "Pendiente"}
          sensitive={hasSalary}
        />
        <CreditMetricCard
          label="Tope mensual (30% del sueldo)"
          value={credit?.creditLimit30 != null ? formatCurrency(credit.creditLimit30) : "Pendiente"}
          tone="blue"
          sensitive={credit?.creditLimit30 != null}
        />
        <CreditMetricCard
          label="Ya comprometido por mes"
          value={formatCurrency(credit?.activeDiscounts ?? "0")}
          tone="amber"
          sensitive
        />
        <CreditMetricCard
          label="Cupo disponible"
          value={credit?.availableAmount != null ? formatCurrency(credit.availableAmount) : "Pendiente"}
          tone="green"
          emphasized
          sensitive={credit?.availableAmount != null}
        />
      </div>

      {credit && hasSalary && (
        <Card>
          <CardContent className="p-5">
            <CreditBar
              grossSalary={credit.grossSalary ?? "0"}
              creditLimit30={credit.creditLimit30 ?? "0"}
              activeDiscounts={credit.activeDiscounts}
              availableAmount={credit.availableAmount ?? "0"}
              showLabels
            />
          </CardContent>
        </Card>
      )}

      {/* Cumplimiento de pagos */}
      <PaymentComplianceCard
        rate={complianceRate}
        paid={paidDueInstallments.length}
        total={dueInstallments.length}
      />

      {/* Beneficios activos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="h-4 w-4" />
            Beneficios activos
            {activeBenefits.length > 0 && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                {activeBenefits.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activeBenefits.length === 0 ? (
            <EmptyState
              icon={<Gift className="h-8 w-8" />}
              title="Sin beneficios activos"
              description="Este afiliado no tiene beneficios en curso."
              action={
                hasSalary ? (
                  <Button size="sm" asChild>
                    <Link href={`/beneficios/nuevo?affiliateId=${data.id}`}>
                      <Gift className="h-4 w-4" />
                      Nuevo beneficio
                    </Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comercio / Concepto</TableHead>
                  <TableHead className="hidden md:table-cell">Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="hidden sm:table-cell">Monto otorgado</TableHead>
                  <TableHead>Cuota mensual</TableHead>
                  <TableHead className="hidden md:table-cell">Cuotas pagadas</TableHead>
                  <TableHead className="hidden lg:table-cell">Última cuota</TableHead>
                  <TableHead className="text-right">Ver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeBenefits.map((b) => {
                  const paidCount = b.installments.filter((i) => i.status === "paid").length;
                  const lastDue = b.installments
                    .filter((i) => i.status !== "cancelled")
                    .reduce<string | null>((acc, i) => (acc == null || i.dueDate > acc ? i.dueDate : acc), null);
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.commerce ?? "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{formatDate(b.date)}</TableCell>
                      <TableCell>
                        <BenefitTypeBadge type={b.type as "ayuda_economica" | "supermercado" | "otro"} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        <SensitiveValue value={formatCurrency(b.totalAmount)} />
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        <SensitiveValue value={formatCurrency(b.installmentAmount)} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-[hsl(var(--muted-foreground))]">
                        {paidCount}/{b.installmentsCount}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-[hsl(var(--muted-foreground))]">
                        {lastDue ? formatDate(lastDue) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/beneficios/${b.id}`}>Ver</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Próximas cuotas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4" />
            Próximas cuotas
            {upcomingInstallments.length > 0 && (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                {upcomingInstallments.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {upcomingInstallments.length === 0 ? (
            <EmptyState
              icon={<Clock className="h-8 w-8" />}
              title="Sin cuotas pendientes"
              description="No hay cuotas por cobrar para este afiliado."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Cuota</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Beneficio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingInstallments.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="text-sm font-medium">{i.benefit.commerce ?? "—"}</TableCell>
                    <TableCell className="text-sm text-[hsl(var(--muted-foreground))]">
                      {i.installmentNumber}/{i.totalInstallments}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(i.dueDate)}</TableCell>
                    <TableCell className="text-sm font-semibold">
                      <SensitiveValue value={formatCurrency(i.amount)} />
                    </TableCell>
                    <TableCell>
                      <InstallmentStatusBadge status={i.status as "pending" | "paid" | "overdue" | "cancelled"} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/beneficios/${i.benefit.id}`}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Historial */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Historial de beneficios</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedHistory.length === 0 ? (
            <p className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
              Sin beneficios registrados.
            </p>
          ) : (
            <div className="space-y-3">
              {sortedHistory.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <BenefitTypeBadge type={b.type as "ayuda_economica" | "supermercado" | "otro"} />
                      <span className="truncate text-sm font-medium">
                        {b.commerce ?? "Sin comercio"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                      {formatDate(b.date)} · {b.installmentsCount} cuota{b.installmentsCount !== 1 ? "s" : ""} de{" "}
                      {formatCurrency(b.installmentAmount)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold">
                      <SensitiveValue value={formatCurrency(b.totalAmount)} />
                    </span>
                    <BenefitStatusBadge status={b.status as "active" | "cancelled" | "finished"} />
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/beneficios/${b.id}`}>Ver</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreditMetricCard({
  label,
  value,
  tone,
  emphasized = false,
  sensitive = false,
}: {
  label: string;
  value: string;
  tone?: "blue" | "amber" | "green";
  emphasized?: boolean;
  sensitive?: boolean;
}) {
  const toneClass = {
    blue: "text-blue-600",
    amber: "text-amber-600",
    green: "text-green-600",
  }[tone ?? "blue"];

  return (
    <Card className={emphasized ? "border-2 border-green-200" : ""}>
      <CardContent className="p-5">
        <p className="min-h-8 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
          {label}
        </p>
        <p className={`mt-1 text-2xl font-bold leading-tight ${tone ? toneClass : ""}`}>
          {sensitive ? <SensitiveValue value={value} /> : value}
        </p>
      </CardContent>
    </Card>
  );
}

function PaymentComplianceCard({
  rate,
  paid,
  total,
}: {
  rate: number;
  paid: number;
  total: number;
}) {
  const label = total === 0
    ? "Sin vencimientos"
    : rate >= 95
      ? "Excelente"
      : rate >= 75
        ? "Bueno"
        : rate >= 50
          ? "Regular"
          : "Crítico";
  const tone = rate >= 95 ? "green" : rate >= 75 ? "blue" : rate >= 50 ? "amber" : "red";
  const color = {
    green: "text-green-700 bg-green-50 border-green-200",
    blue: "text-blue-700 bg-blue-50 border-blue-200",
    amber: "text-amber-700 bg-amber-50 border-amber-200",
    red: "text-red-700 bg-red-50 border-red-200",
  }[tone];
  const bar = {
    green: "bg-green-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  }[tone];

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold">Cumplimiento de pagos</h2>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${color}`}>
                  {label}
                </span>
              </div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {paid} de {total} cuotas vencidas cobradas
              </p>
            </div>
          </div>
          <p className={`text-3xl font-bold ${tone === "red" ? "text-red-700" : tone === "amber" ? "text-amber-700" : tone === "blue" ? "text-blue-700" : "text-green-700"}`}>
            {rate}%
          </p>
        </div>
        <div className="h-2.5 w-full rounded-full bg-[hsl(var(--muted))]">
          <div className={`h-2.5 rounded-full ${bar}`} style={{ width: `${rate}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="text-[hsl(var(--muted-foreground))] opacity-40">{icon}</div>
      <div>
        <p className="font-medium text-[hsl(var(--foreground))]">{title}</p>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{description}</p>
      </div>
      {action}
    </div>
  );
}
