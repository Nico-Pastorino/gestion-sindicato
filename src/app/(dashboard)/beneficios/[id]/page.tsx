import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Gift,
  User,
  Calendar,
  Store,
  Hash,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
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
import { Separator } from "@/components/ui/separator";
import {
  BenefitStatusBadge,
  BenefitTypeBadge,
  InstallmentStatusBadge,
} from "@/components/ui/badge";
import { CancelBenefitButton } from "@/components/benefits/cancel-benefit-button";
import { PayInstallmentButton } from "@/components/benefits/pay-installment-button";
import { formatCurrency } from "@/lib/utils/credit";
import { formatDate } from "@/lib/utils/date";
import { getBenefitById } from "@/lib/services/benefits.service";
import { calculateBenefitFinancials } from "@/lib/utils/financial";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const benefit = await getBenefitById(id);
  if (!benefit) return { title: "Beneficio" };
  const type = { ayuda_economica: "Ayuda Económica", supermercado: "Supermercado", otro: "Otro" }[benefit.type] ?? benefit.type;
  return { title: `${type} — ${benefit.affiliate?.fullName}` };
}

export default async function BenefitDetailPage({ params }: PageProps) {
  const { id } = await params;
  const benefit = await getBenefitById(id);

  if (!benefit) notFound();

  const installments = benefit.installments ?? [];
  const paid = installments.filter((i) => i.status === "paid");
  const pending = installments.filter((i) => i.status === "pending" || i.status === "overdue");
  const cancelled = installments.filter((i) => i.status === "cancelled");

  const fin = calculateBenefitFinancials(benefit, installments);

  const TYPE_LABELS: Record<string, string> = {
    ayuda_economica: "Ayuda Económica",
    supermercado: "Supermercado / Orden de Compra",
    otro: "Otro",
  };

  const isActive = benefit.status === "active";

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
            <h1 className="text-2xl font-bold">
              {TYPE_LABELS[benefit.type] ?? benefit.type}
            </h1>
            <BenefitStatusBadge status={benefit.status as "active" | "cancelled" | "finished"} />
          </div>
          {benefit.commerce && (
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 flex items-center gap-1">
              <Store className="h-3.5 w-3.5" />
              {benefit.commerce}
            </p>
          )}
        </div>
        {isActive && (
          <CancelBenefitButton
            benefitId={benefit.id}
            affiliateName={benefit.affiliate?.fullName ?? ""}
          />
        )}
      </div>

      {/* Datos del beneficio + afiliado */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Datos del beneficio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <DataItem label="Tipo">
                <BenefitTypeBadge type={benefit.type as "ayuda_economica" | "supermercado" | "otro"} />
              </DataItem>
              <DataItem label="Fecha" icon={<Calendar className="h-3.5 w-3.5" />}>
                {formatDate(benefit.date)}
              </DataItem>
              <DataItem label="Comercio" icon={<Store className="h-3.5 w-3.5" />}>
                {benefit.commerce ?? "—"}
              </DataItem>
              <DataItem label="Capital otorgado" icon={<CreditCard className="h-3.5 w-3.5" />}>
                <span className="font-semibold">{formatCurrency(benefit.totalAmount)}</span>
              </DataItem>
              <DataItem label="Cuotas" icon={<Hash className="h-3.5 w-3.5" />}>
                {benefit.installmentsCount}
              </DataItem>
              <DataItem label="Por cuota">
                <span className="font-semibold text-blue-600">
                  {formatCurrency(benefit.installmentAmount)}
                </span>
              </DataItem>
            </div>

            {benefit.observations && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1">
                    Observaciones
                  </p>
                  <p className="text-sm">{benefit.observations}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Afiliado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {benefit.affiliate ? (
              <>
                <div>
                  <Link
                    href={`/afiliados/${benefit.affiliate.id}`}
                    className="font-semibold hover:text-[hsl(var(--primary))] transition-colors"
                  >
                    {benefit.affiliate.fullName}
                  </Link>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
                    DNI {benefit.affiliate.dni}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={`/afiliados/${benefit.affiliate.id}`}>
                    Ver perfil del afiliado
                  </Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Sin datos</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Métricas financieras */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Resumen financiero
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <FinMetric label="Capital otorgado" value={formatCurrency(fin.principalAmount)} />
            <FinMetric label="Total a devolver" value={formatCurrency(fin.totalRepaymentAmount)} />
            <FinMetric
              label="Interés total"
              value={formatCurrency(fin.interestAmount)}
              sub={fin.interestAmount > 0 ? `${fin.interestRate.toFixed(2)}%` : undefined}
              accent={fin.interestAmount > 0 ? "orange" : undefined}
            />
            <FinMetric label="Interés por cuota" value={formatCurrency(fin.interestPerInstallment)} />
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <FinMetric
              label="Cobrado hasta ahora"
              value={formatCurrency(fin.paidAmount)}
              sub={`${fin.paidInstallmentsCount} cuota${fin.paidInstallmentsCount !== 1 ? "s" : ""}`}
              accent="green"
            />
            <FinMetric
              label="Pendiente de cobro"
              value={formatCurrency(fin.pendingAmount)}
              sub={`${fin.pendingInstallmentsCount} cuota${fin.pendingInstallmentsCount !== 1 ? "s" : ""}`}
              accent={fin.pendingInstallmentsCount > 0 ? "yellow" : undefined}
            />
            <FinMetric
              label="Ganancia cobrada"
              value={formatCurrency(fin.earnedInterestAmount)}
              accent="green"
            />
            <FinMetric
              label="Ganancia pendiente"
              value={formatCurrency(fin.pendingInterestAmount)}
              accent={fin.pendingInterestAmount > 0 ? "yellow" : undefined}
            />
          </div>
        </CardContent>
      </Card>

      {/* Resumen de cuotas */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Pagadas</p>
              <p className="text-lg font-bold text-green-700">{paid.length}</p>
              <p className="text-xs text-green-600">{formatCurrency(fin.paidAmount)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-50">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Pendientes</p>
              <p className="text-lg font-bold text-yellow-700">{pending.length}</p>
              <p className="text-xs text-yellow-600">{formatCurrency(fin.pendingAmount)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50">
              <XCircle className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Canceladas</p>
              <p className="text-lg font-bold text-gray-600">{cancelled.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de cuotas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detalle de cuotas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Cuota</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden sm:table-cell">Fecha de Pago</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {installments
                .sort((a, b) => a.installmentNumber - b.installmentNumber)
                .map((installment) => (
                  <TableRow key={installment.id}>
                    <TableCell className="font-medium">
                      {installment.installmentNumber}/{installment.totalInstallments}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(installment.dueDate)}
                    </TableCell>
                    <TableCell className="text-sm font-semibold">
                      {formatCurrency(installment.amount)}
                    </TableCell>
                    <TableCell>
                      <InstallmentStatusBadge
                        status={installment.status as "pending" | "paid" | "overdue" | "cancelled"}
                      />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-[hsl(var(--muted-foreground))]">
                      {installment.paidDate ? formatDate(installment.paidDate) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {(installment.status === "pending" || installment.status === "overdue") &&
                        isActive && (
                          <PayInstallmentButton
                            installmentId={installment.id}
                            installmentNumber={installment.installmentNumber}
                            totalInstallments={installment.totalInstallments}
                            amount={installment.amount}
                            dueDate={installment.dueDate}
                          />
                        )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function DataItem({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1 text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
        {icon}
        {label}
      </p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function FinMetric({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "yellow" | "orange";
}) {
  const colors = {
    green: "text-green-700",
    yellow: "text-yellow-700",
    orange: "text-orange-600",
  };
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className={`text-sm font-semibold ${accent ? colors[accent] : ""}`}>{value}</p>
      {sub && <p className="text-xs text-[hsl(var(--muted-foreground))]">{sub}</p>}
    </div>
  );
}
