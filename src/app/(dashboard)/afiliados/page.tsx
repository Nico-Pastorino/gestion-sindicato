import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, BriefcaseBusiness, CreditCard, Plus, UserCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AffiliateSearch } from "@/components/affiliates/affiliate-search";
import { AffiliatesTable } from "@/components/affiliates/affiliates-table";
import { Pagination } from "@/components/shared/pagination";
import { getAffiliateModuleSummary, getAreas, searchAffiliates } from "@/lib/services/affiliates.service";
import { formatCurrency } from "@/lib/utils/credit";
import type { AffiliateCreditSummary } from "@/types";

export const metadata: Metadata = { title: "Afiliados" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    area?: string;
    page?: string;
  }>;
}

async function getAffiliatesWithCredit(params: {
  search?: string;
  status?: string;
  area?: string;
  page: number;
  limit: number;
}): Promise<{ data: AffiliateCreditSummary[]; total: number }> {
  const normalizedStatus =
    params.status === "active" || params.status === "inactive" ? params.status : undefined;

  const result = await searchAffiliates({
    search: params.search?.trim() || undefined,
    status: normalizedStatus,
    area: params.area?.trim() || undefined,
    page: params.page,
    limit: params.limit,
  });
  return {
    data: result.data,
    total: result.total,
  };
}

export default async function AffiliatesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = 20;

  const [{ data, total }, areas, summary] = await Promise.all([
    getAffiliatesWithCredit({
      search: params.search,
      status: params.status,
      area: params.area,
      page,
      limit,
    }),
    getAreas(),
    getAffiliateModuleSummary(),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Afiliados
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            {total} afiliado{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/afiliados/nuevo">
            <Plus className="h-4 w-4" />
            Nuevo afiliado
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AffiliateCrmCard
          icon={<Users className="h-5 w-5 text-blue-600" />}
          title="Cartera de afiliados"
          value={String(summary.total)}
          detail={`${summary.active} activos · ${summary.inactive} inactivos`}
        />
        <AffiliateCrmCard
          icon={<UserCheck className="h-5 w-5 text-emerald-700" />}
          title="Con beneficio activo"
          value={String(summary.withActiveBenefit)}
          detail="Afiliados con operaciones vigentes"
        />
        <AffiliateCrmCard
          icon={<CreditCard className="h-5 w-5 text-purple-700" />}
          title="Cupo disponible total"
          value={formatCurrency(summary.totalAvailableCredit)}
          detail="Suma de cupos libres en afiliados activos"
        />
        <AffiliateCrmCard
          icon={<AlertTriangle className="h-5 w-5 text-amber-700" />}
          title="Datos incompletos"
          value={String(summary.withoutSalary + summary.withoutEmploymentType + summary.withoutSex)}
          detail={`${summary.withoutSalary} sin salario · ${summary.withoutEmploymentType} sin revista · ${summary.withoutSex} sin sexo`}
          tone="warning"
        />
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <EmploymentStat label="Planta Permanente" value={summary.permanentStaff} total={summary.total} />
          <EmploymentStat label="Planta Temporaria" value={summary.temporaryStaff} total={summary.total} />
          <EmploymentStat label="Jubilados" value={summary.retirees} total={summary.total} />
        </CardContent>
      </Card>

      {/* Buscador y filtros */}
      <Suspense>
        <AffiliateSearch areas={areas} />
      </Suspense>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <AffiliatesTable affiliates={data} />
          <div className="px-4 border-t">
            <Suspense>
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                limit={limit}
              />
            </Suspense>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AffiliateCrmCard({
  icon,
  title,
  value,
  detail,
  tone = "default",
}: {
  icon: ReactNode;
  title: string;
  value: string;
  detail: string;
  tone?: "default" | "warning";
}) {
  return (
    <Card className={tone === "warning" ? "border-amber-200 bg-amber-50/60" : ""}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--muted))]">
            {icon}
          </div>
          {tone === "warning" && <AlertTriangle className="h-4 w-4 text-amber-600" />}
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{title}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{detail}</p>
      </CardContent>
    </Card>
  );
}

function EmploymentStat({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium">
          <BriefcaseBusiness className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          {label}
        </span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-[hsl(var(--muted))]">
        <div className="h-2 rounded-full bg-[hsl(var(--primary))]" style={{ width: `${Math.max(3, percent)}%` }} />
      </div>
    </div>
  );
}
