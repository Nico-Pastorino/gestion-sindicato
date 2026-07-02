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
  BriefcaseBusiness,
  UserRound,
  Gauge,
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
  CollectionMethodBadge,
  InstallmentStatusBadge,
} from "@/components/ui/badge";
import { ActivityTimeline } from "@/components/audit/activity-timeline";
import { CreditBar } from "@/components/shared/credit-bar";
import { UnpayInstallmentButton } from "@/components/benefits/unpay-installment-button";
import { formatCurrency } from "@/lib/utils/credit";
import { formatDate } from "@/lib/utils/date";
import { getAffiliateById, getAffiliateCreditSummary } from "@/lib/services/affiliates.service";
import { getAffiliateActivity } from "@/lib/services/audit.service";
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

  const [data, credit, activity] = await Promise.all([
    getAffiliateById(id),
    getAffiliateCreditSummary(id),
    getAffiliateActivity(id),
  ]);

  if (!data) notFound();

  const hasSalary = data.grossSalary != null && Number(data.grossSalary) > 0;

  const activeBenefits = data.benefits.filter((b) => b.status === "active");
  const finishedBenefits = data.benefits.filter((b) => b.status === "finished");
  const allInstallments = data.benefits.flatMap((b) => b.installments);
  const pendingInstallments = allInstallments.filter(
    (i) => i.status === "pending" || i.status === "overdue"
  );
  const paidInstallments = allInstallments.filter((i) => i.status === "paid");
  const today = new Date().toISOString().split("T")[0];
  const dueInstallmentsForScore = allInstallments.filter(
    (i) => i.status !== "cancelled" && i.dueDate <= today
  );
  const paidDueInstallments = dueInstallmentsForScore.filter((i) => i.status === "paid");
  const complianceRate = dueInstallmentsForScore.length > 0
    ? Math.round((paidDueInstallments.length / dueInstallmentsForScore.length) * 100)
    : 100;

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

      {/* Capacidad mensual y cumplimiento */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CreditMetricCard
          label="Salario bruto"
          value={hasSalary ? formatCurrency(data.grossSalary!) : "Pendiente"}
        />
        <CreditMetricCard
          label="Máximo a descontar por mes (30% del sueldo)"
          value={credit?.creditLimit30 != null ? formatCurrency(credit.creditLimit30) : "Pendiente"}
          tone="blue"
        />
        <CreditMetricCard
          label="Ya comprometido este mes"
          value={formatCurrency(credit?.activeDiscounts ?? "0")}
          tone="amber"
        />
        <CreditMetricCard
          label="Disponible para descontar"
          value={credit?.availableAmount != null ? formatCurrency(credit.availableAmount) : "Pendiente"}
          tone="green"
          emphasized
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

      <PaymentComplianceCard
        rate={complianceRate}
        paid={paidDueInstallments.length}
        total={dueInstallmentsForScore.length}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-4 w-4" />
              Datos personales
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoItem label="DNI" value={data.dni} />
            <InfoItem label="CUIL" value={data.cuil ?? "Sin dato"} />
            <InfoItem label="Sexo" value={formatSex(data.sex)} />
            <InfoItem label="Fecha de nacimiento" value={data.birthDate ? formatDate(data.birthDate) : "Sin dato"} />
            <InfoItem label="Estado civil" value={data.maritalStatus ?? "Sin dato"} />
            <InfoItem label="Teléfono" value={data.phone ?? "Sin dato"} />
            <InfoItem label="Teléfono alternativo" value={data.alternatePhone ?? "Sin dato"} />
            <InfoItem label="Email" value={data.email ?? "Sin dato"} />
            <InfoItem label="Estado" value={data.status === "active" ? "Activo" : "Inactivo"} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BriefcaseBusiness className="h-4 w-4" />
              Datos laborales
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoItem label="Área" value={data.area ?? "Sin dato"} />
            <InfoItem label="Sector" value={data.sector ?? "Sin dato"} />
            <InfoItem label="Cargo" value={data.position ?? "Sin dato"} />
            <InfoItem label="Turno" value={data.workShift ?? "Sin dato"} />
            <InfoItem label="Situación de revista" value={formatEmploymentType(data.employmentType)} />
            <InfoItem label="Fecha de ingreso" value={data.hireDate ? formatDate(data.hireDate) : "Sin dato"} />
            <InfoItem label="Antigüedad" value={data.hireDate ? calculateSeniority(data.hireDate) : "Sin dato"} />
            <InfoItem label="Afiliado desde" value={data.affiliationDate ? formatDate(data.affiliationDate) : "Sin dato"} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" />
              Domicilio
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoItem label="Calle" value={data.streetAddress ?? "Sin dato"} />
            <InfoItem label="Número" value={data.addressNumber ?? "Sin dato"} />
            <InfoItem label="Barrio" value={data.neighborhood ?? "Sin dato"} />
            <InfoItem label="Localidad" value={data.city ?? "Sin dato"} />
            <InfoItem label="Provincia" value={data.province ?? "Sin dato"} />
            <InfoItem label="Código postal" value={data.postalCode ?? "Sin dato"} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="h-4 w-4" />
              Contacto y documentación
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoItem label="Contacto emergencia" value={data.emergencyContactName ?? "Sin dato"} />
            <InfoItem label="Vínculo" value={data.emergencyContactRelation ?? "Sin dato"} />
            <InfoItem label="Teléfono emergencia" value={data.emergencyContactPhone ?? "Sin dato"} />
            <InfoItem label="Documentación" value={formatDocumentationStatus(data.documentationStatus)} />
            <div className="sm:col-span-2">
              <InfoItem label="Observaciones internas" value={data.privateNotes ?? "Sin dato"} />
            </div>
          </CardContent>
        </Card>
      </div>

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
          <TabsTrigger value="actividad">
            Actividad
            {activity.length > 0 && (
              <span className="ml-1.5 rounded-full bg-slate-100 text-slate-700 text-xs px-1.5 py-0.5">
                {activity.length}
              </span>
            )}
          </TabsTrigger>
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

        <TabsContent value="actividad">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Actividad del afiliado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline items={activity} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreditMetricCard({
  label,
  value,
  tone,
  emphasized = false,
}: {
  label: string;
  value: string;
  tone?: "blue" | "amber" | "green";
  emphasized?: boolean;
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
          {value}
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
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          Porcentaje de cuotas ya vencidas que se cobraron por retención municipal o cobro manual.
          No incluye cuotas por vencer ni canceladas.
        </p>
      </CardContent>
    </Card>
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

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-[hsl(var(--muted))]/25 px-3 py-2">
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

function formatSex(value?: string | null) {
  const labels: Record<string, string> = {
    masculino: "Masculino",
    femenino: "Femenino",
    otro: "Otro",
    prefiero_no_responder: "Prefiere no responder",
  };

  return value ? labels[value] ?? value : "Sin dato";
}

function formatEmploymentType(value?: string | null) {
  const labels: Record<string, string> = {
    planta_permanente: "Planta Permanente",
    planta_temporaria: "Planta Temporaria",
    jubilado: "Jubilado",
  };

  return value ? labels[value] ?? value : "Sin dato";
}

function formatDocumentationStatus(value?: string | null) {
  const labels: Record<string, string> = {
    complete: "Completa",
    pending: "Pendiente",
    missing: "Faltante",
  };

  return value ? labels[value] ?? value : "Pendiente";
}

function calculateSeniority(hireDate: string) {
  const start = new Date(`${hireDate}T12:00:00`);
  if (Number.isNaN(start.getTime())) return "Sin dato";

  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();

  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years <= 0 && months <= 0) return "Menos de 1 mes";
  if (years <= 0) return `${months} mes${months !== 1 ? "es" : ""}`;
  if (months <= 0) return `${years} año${years !== 1 ? "s" : ""}`;
  return `${years} año${years !== 1 ? "s" : ""} y ${months} mes${months !== 1 ? "es" : ""}`;
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
  autoPaid?: boolean | null; paidBy?: string | null;
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
          <TableHead className="hidden lg:table-cell">Cobro</TableHead>
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
            <TableCell className="hidden lg:table-cell">
              {i.status === "paid" ? (
                <CollectionMethodBadge autoPaid={i.autoPaid} paidBy={i.paidBy} />
              ) : (
                <span className="text-sm text-[hsl(var(--muted-foreground))]">—</span>
              )}
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
