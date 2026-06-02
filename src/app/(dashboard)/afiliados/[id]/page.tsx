import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Pencil,
  Phone,
  MapPin,
  CreditCard,
  Gift,
  Clock,
  CheckCircle2,
  TrendingUp,
  Hash,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { UnpayInstallmentButton } from "@/components/benefits/unpay-installment-button";
import { formatCurrency } from "@/lib/utils/credit";
import { formatDate } from "@/lib/utils/date";
import { getAffiliateById, getAffiliateCreditSummary } from "@/lib/services/affiliates.service";
import { calculateBenefitFinancials, aggregateBenefitFinancials } from "@/lib/utils/financial";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getAffiliateById(id);
  return { title: data ? data.fullName : "Afiliado" };
}

export default async function AffiliateDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [data, credit] = await Promise.all([
    getAffiliateById(id),
    getAffiliateCreditSummary(id),
  ]);

  if (!data) notFound();

  const hasSalary = data.grossSalary != null && Number(data.grossSalary) > 0;

  const activeBenefits = data.benefits.filter((b) => b.status === "active");
  const finishedBenefits = data.benefits.filter((b) => b.status === "finished");
  const cancelledBenefits = data.benefits.filter((b) => b.status === "cancelled");

  const allInstallments = data.benefits.flatMap((b) => b.installments);
  const pendingInstallments = allInstallments.filter(
    (i) => i.status === "pending" || i.status === "overdue"
  );
  const paidInstallments = allInstallments.filter((i) => i.status === "paid");

  // Resumen financiero agregado de todos los beneficios no cancelados
  const nonCancelledBenefits = data.benefits.filter((b) => b.status !== "cancelled");
  const allFinancials = nonCancelledBenefits.map((b) =>
    calculateBenefitFinancials(b, b.installments)
  );
  const agg = aggregateBenefitFinancials(allFinancials);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
            <Link href="/afiliados">
              <ChevronLeft className="h-4 w-4" />
              Afiliados
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{data.fullName}</h1>
            <AffiliateStatusBadge status={data.status} />
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-[hsl(var(--muted-foreground))]">
            <span className="flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5" />
              DNI {data.dni}
            </span>
            {data.legajo && (
              <span className="flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" />
                Legajo {data.legajo}
              </span>
            )}
            {data.area && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {data.area}
              </span>
            )}
            {data.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {data.phone}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button asChild>
            <Link href={`/beneficios/nuevo?affiliateId=${data.id}`}>
              <Gift className="h-4 w-4" />
              Nuevo beneficio
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/afiliados/${data.id}/editar`}>
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
          </Button>
        </div>
      </div>

      {/* Alerta salario pendiente */}
      {!hasSalary && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
          <div className="text-sm text-yellow-800">
            <strong>Salario bruto pendiente de carga.</strong>{" "}
            Sin salario no se pueden cargar beneficios.{" "}
            <Link href={`/afiliados/${data.id}/editar`} className="underline font-medium">
              Completar ahora
            </Link>
          </div>
        </div>
      )}

      {/* Cards de crédito */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
              Salario Bruto
            </p>
            <p className="text-xl font-bold mt-1">
              {hasSalary ? formatCurrency(data.grossSalary!) : (
                <span className="text-[hsl(var(--muted-foreground))] text-base">Pendiente</span>
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
              Tope Mensual 30%
            </p>
            <p className="text-xl font-bold mt-1 text-blue-600">
              {credit?.creditLimit30 != null
                ? formatCurrency(credit.creditLimit30)
                : <span className="text-[hsl(var(--muted-foreground))] text-base">Pendiente</span>}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
              Descuentos Activos
            </p>
            <p className="text-xl font-bold mt-1 text-yellow-600">
              {formatCurrency(credit?.activeDiscounts ?? "0")}
            </p>
          </CardContent>
        </Card>
        <Card className="border-2 border-green-200">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
              Cupo Mensual Libre
            </p>
            <p className="text-xl font-bold mt-1 text-green-600">
              {credit?.availableAmount != null
                ? formatCurrency(credit.availableAmount)
                : <span className="text-[hsl(var(--muted-foreground))] text-base">Pendiente</span>}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de crédito */}
      {credit && hasSalary && (
        <Card>
          <CardContent className="p-5">
            <CreditBar
              grossSalary={credit.grossSalary ?? "0"}
              creditLimit30={credit.creditLimit30 ?? "0"}
              activeDiscounts={credit.activeDiscounts}
              availableAmount={credit.availableAmount ?? "0"}
            />
          </CardContent>
        </Card>
      )}

      {/* Resumen financiero agregado */}
      {nonCancelledBenefits.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Resumen financiero del afiliado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <AggMetric label="Capital entregado" value={formatCurrency(agg.principalAmount)} />
              <AggMetric label="Total a devolver" value={formatCurrency(agg.totalRepaymentAmount)} />
              <AggMetric label="Ganancia total" value={formatCurrency(agg.interestAmount)} accent="orange" />
              <AggMetric
                label="Beneficios activos / finalizados"
                value={`${activeBenefits.length} / ${finishedBenefits.length}`}
              />
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <AggMetric label="Cobrado" value={formatCurrency(agg.paidAmount)} accent="green" />
              <AggMetric label="Pendiente de cobro" value={formatCurrency(agg.pendingAmount)} accent="yellow" />
              <AggMetric label="Ganancia cobrada" value={formatCurrency(agg.earnedInterestAmount)} accent="green" />
              <AggMetric label="Ganancia pendiente" value={formatCurrency(agg.pendingInterestAmount)} accent="yellow" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="activos">
        <TabsList>
          <TabsTrigger value="activos">
            Beneficios activos
            {activeBenefits.length > 0 && (
              <span className="ml-1.5 rounded-full bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5">
                {activeBenefits.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="pendientes">
            Cuotas pendientes
            {pendingInstallments.length > 0 && (
              <span className="ml-1.5 rounded-full bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5">
                {pendingInstallments.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="pagadas">
            Cuotas pagadas
            {paidInstallments.length > 0 && (
              <span className="ml-1.5 rounded-full bg-green-100 text-green-700 text-xs px-1.5 py-0.5">
                {paidInstallments.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="activos">
          <Card>
            <CardContent className="p-0">
              {activeBenefits.length === 0 ? (
                <EmptyState
                  icon={<Gift className="h-8 w-8" />}
                  title="Sin beneficios activos"
                  description="Este afiliado no tiene beneficios activos."
                  action={
                    <Button size="sm" asChild>
                      <Link href={`/beneficios/nuevo?affiliateId=${data.id}`}>
                        <Gift className="h-4 w-4" />
                        Nuevo beneficio
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Beneficio</TableHead>
                      <TableHead className="hidden md:table-cell">Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="hidden sm:table-cell">Capital</TableHead>
                      <TableHead>Cuota</TableHead>
                      <TableHead className="hidden md:table-cell">Cuotas</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Ver</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeBenefits.map((b) => {
                      const paidCount = b.installments.filter((i) => i.status === "paid").length;
                      return (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.commerce ?? "—"}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{formatDate(b.date)}</TableCell>
                          <TableCell>
                            <BenefitTypeBadge type={b.type as "ayuda_economica" | "supermercado" | "otro"} />
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">{formatCurrency(b.totalAmount)}</TableCell>
                          <TableCell className="text-sm font-medium">{formatCurrency(b.installmentAmount)}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-[hsl(var(--muted-foreground))]">
                            {paidCount}/{b.installmentsCount}
                          </TableCell>
                          <TableCell>
                            <BenefitStatusBadge status={b.status as "active" | "cancelled" | "finished"} />
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
        </TabsContent>

        <TabsContent value="pendientes">
          <Card>
            <CardContent className="p-0">
              {pendingInstallments.length === 0 ? (
                <EmptyState
                  icon={<Clock className="h-8 w-8" />}
                  title="Sin cuotas pendientes"
                  description="No hay cuotas pendientes de pago."
                />
              ) : (
                <InstallmentsTable
                  installments={pendingInstallments.map((i) => {
                    const benefit = data.benefits.find((b) => b.id === i.benefitId);
                    return { ...i, benefit };
                  })}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagadas">
          <Card>
            <CardContent className="p-0">
              {paidInstallments.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="h-8 w-8" />}
                  title="Sin cuotas pagadas"
                  description="No hay cuotas pagadas aún."
                />
              ) : (
                <InstallmentsTable
                  installments={paidInstallments.map((i) => {
                    const benefit = data.benefits.find((b) => b.id === i.benefitId);
                    return { ...i, benefit };
                  })}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Historial de beneficios
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.benefits.length === 0 ? (
                <p className="text-sm text-center text-[hsl(var(--muted-foreground))] py-8">
                  Sin beneficios registrados.
                </p>
              ) : (
                <div className="space-y-3">
                  {[...data.benefits]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between rounded-lg border p-3 gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <BenefitTypeBadge type={b.type as "ayuda_economica" | "supermercado" | "otro"} />
                            <span className="text-sm font-medium truncate">
                              {b.commerce ?? "Sin comercio"}
                            </span>
                          </div>
                          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                            {formatDate(b.date)} · {b.installmentsCount} cuota{b.installmentsCount !== 1 ? "s" : ""} de {formatCurrency(b.installmentAmount)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-semibold">{formatCurrency(b.totalAmount)}</span>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AggMetric({ label, value, accent }: { label: string; value: string; accent?: "green" | "yellow" | "orange" }) {
  const colors = { green: "text-green-700", yellow: "text-yellow-700", orange: "text-orange-600" };
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className={`text-sm font-semibold ${accent ? colors[accent] : ""}`}>{value}</p>
    </div>
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

type InstallmentWithBenefit = {
  id: string; benefitId: string; installmentNumber: number; totalInstallments: number;
  dueDate: string; paidDate: string | null; amount: string; status: string;
  benefit?: { commerce: string | null; type: string };
};

function InstallmentsTable({ installments }: { installments: InstallmentWithBenefit[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Concepto</TableHead>
          <TableHead className="hidden sm:table-cell">Tipo</TableHead>
          <TableHead>Cuota</TableHead>
          <TableHead>Vencimiento</TableHead>
          <TableHead className="hidden md:table-cell">Pago</TableHead>
          <TableHead>Monto</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {installments.map((i) => (
          <TableRow key={i.id}>
            <TableCell className="text-sm font-medium">{i.benefit?.commerce ?? "—"}</TableCell>
            <TableCell className="hidden sm:table-cell">
              {i.benefit ? (
                <BenefitTypeBadge type={i.benefit.type as "ayuda_economica" | "supermercado" | "otro"} />
              ) : "—"}
            </TableCell>
            <TableCell className="text-sm text-[hsl(var(--muted-foreground))]">
              {i.installmentNumber}/{i.totalInstallments}
            </TableCell>
            <TableCell className="text-sm">{formatDate(i.dueDate)}</TableCell>
            <TableCell className="hidden md:table-cell text-sm">
              {i.paidDate ? formatDate(i.paidDate) : "—"}
            </TableCell>
            <TableCell className="text-sm font-semibold">{formatCurrency(i.amount)}</TableCell>
            <TableCell>
              <InstallmentStatusBadge status={i.status as "pending" | "paid" | "overdue" | "cancelled"} />
            </TableCell>
            <TableCell className="text-right">
              {i.status === "paid" && (
                <UnpayInstallmentButton
                  installmentId={i.id}
                  installmentNumber={i.installmentNumber}
                  totalInstallments={i.totalInstallments}
                  amount={i.amount}
                  dueDate={i.dueDate}
                />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
