import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, CheckCircle, ClipboardCheck, DollarSign, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BenefitTypeBadge, InstallmentStatusBadge } from "@/components/ui/badge";
import { SensitiveText, SensitiveValue } from "@/components/privacy/sensitive-value";
import { UnpayInstallmentButton } from "@/components/benefits/unpay-installment-button";
import { formatCurrency } from "@/lib/utils/credit";
import { formatDate, getCurrentMonthYear } from "@/lib/utils/date";
import { listAutoPaidInstallmentsForReview } from "@/lib/services/installments.service";
import type { BenefitType, InstallmentStatus } from "@/types";

export const metadata: Metadata = { title: "Revisar cobros del mes" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    month?: string;
    year?: string;
    q?: string;
  }>;
}

interface AutoPaidRow {
  id: string;
  benefitId: string;
  affiliateId: string;
  affiliateName: string;
  affiliateDni: string;
  affiliateLegajo: string | null;
  affiliateArea: string | null;
  benefitType: BenefitType;
  commerce: string | null;
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

export default async function ReviewCollectionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const current = getCurrentMonthYear();
  const month = clampNumber(Number(params.month ?? current.month), 1, 12, current.month);
  const year = clampNumber(Number(params.year ?? current.year), 2000, 2100, current.year);
  const query = params.q?.trim() || undefined;
  const selectedMonth = MONTHS.find((item) => item.value === month)?.label ?? "Mes";

  const rows = (await listAutoPaidInstallmentsForReview({ month, year, search: query })) as unknown as AutoPaidRow[];
  const totalAmount = rows.reduce((acc, row) => acc + Number(row.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/cobranza?month=${month}&year=${year}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        >
          <ChevronLeft className="h-4 w-4" />
          Cobranzas
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ClipboardCheck className="h-6 w-6" />
          Conciliación mensual
        </h1>
        <p className="mt-2 max-w-4xl text-sm text-[hsl(var(--muted-foreground))]">
          Cuotas que el sistema marcó como cobradas automáticamente por retención municipal.
          Destildá las que la municipalidad no retuvo: vuelven a quedar pendientes o vencidas y reaparecen en Cobranzas.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <MetricCard
          icon={<ClipboardCheck className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50"
          label="Cuotas auto-cobradas"
          value={String(rows.length)}
          detail={`${selectedMonth} ${year}`}
        />
        <MetricCard
          icon={<DollarSign className="h-5 w-5 text-emerald-700" />}
          iconBg="bg-emerald-50"
          label="Monto retenido estimado"
          value={formatCurrency(totalAmount)}
          detail="según lo cobrado en el período"
          sensitive
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <form className="flex flex-wrap gap-2 border-b p-4">
            <label className="relative min-w-[18rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              <input
                name="q"
                defaultValue={query ?? ""}
                placeholder="Buscar por nombre, DNI o legajo..."
                className="h-10 w-full rounded-md border border-[hsl(var(--border))] bg-transparent pl-9 pr-3 text-sm"
              />
            </label>
            <select
              name="month"
              defaultValue={month}
              className="h-10 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm font-medium"
              aria-label="Mes"
            >
              {MONTHS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
            <input
              name="year"
              type="number"
              min="2000"
              max="2100"
              defaultValue={year}
              className="h-10 w-28 rounded-md border border-[hsl(var(--border))] bg-transparent px-3 text-sm font-medium"
              aria-label="Año"
            />
            <Button type="submit" variant="outline">
              Filtrar
            </Button>
          </form>

          {rows.length === 0 ? (
            <div className="py-20 text-center">
              <CheckCircle className="mx-auto h-10 w-10 text-green-500" />
              <p className="mt-3 text-sm font-semibold">No hay cuotas auto-cobradas en este período.</p>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                Probá con otro mes o quitá la búsqueda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Afiliado</TableHead>
                    <TableHead className="hidden md:table-cell">DNI</TableHead>
                    <TableHead className="hidden lg:table-cell">Tipo</TableHead>
                    <TableHead>Cuota</TableHead>
                    <TableHead className="hidden md:table-cell">Vencimiento</TableHead>
                    <TableHead className="hidden md:table-cell">Cobro</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Link href={`/afiliados/${row.affiliateId}`} className="font-medium hover:text-[hsl(var(--primary))]">
                          {row.affiliateName}
                        </Link>
                        <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                          {row.affiliateArea ?? row.affiliateLegajo ?? "Sin área"}
                        </p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        <SensitiveText value={row.affiliateDni} type="dni" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <BenefitTypeBadge type={row.benefitType} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.installmentNumber}/{row.totalInstallments}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {formatDate(row.dueDate)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {formatDate(row.paidDate)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        <SensitiveValue value={formatCurrency(row.amount)} />
                      </TableCell>
                      <TableCell>
                        <InstallmentStatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <UnpayInstallmentButton
                          installmentId={row.id}
                          installmentNumber={row.installmentNumber}
                          totalInstallments={row.totalInstallments}
                          amount={row.amount}
                          dueDate={row.dueDate}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon,
  iconBg,
  label,
  value,
  detail,
  sensitive = false,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  detail: string;
  sensitive?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{label}</p>
          <p className="mt-1 text-2xl font-bold leading-tight">
            {sensitive ? <SensitiveValue value={value} /> : value}
          </p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function clampNumber(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
