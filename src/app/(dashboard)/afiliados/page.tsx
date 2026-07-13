import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, FileUp, Filter, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AffiliateSearch } from "@/components/affiliates/affiliate-search";
import { AffiliatesTable } from "@/components/affiliates/affiliates-table";
import { Pagination } from "@/components/shared/pagination";
import { getAffiliateModuleSummary, getAreas, searchAffiliates } from "@/lib/services/affiliates.service";
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

async function getAffiliates(params: {
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
    getAffiliates({
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
            Fichero de afiliados del sindicato. Los beneficios y cuotas se gestionan en{" "}
            <Link href="/beneficios" className="font-medium text-[hsl(var(--primary))] hover:underline">
              Beneficios
            </Link>.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" asChild>
            <Link href="/afiliados/importar">
              <FileUp className="h-4 w-4" />
              Importar Excel
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/afiliados/explorar">
              <Filter className="h-4 w-4" />
              Explorar y exportar
            </Link>
          </Button>
          <Button asChild>
            <Link href="/afiliados/nuevo">
              <Plus className="h-4 w-4" />
              Nuevo afiliado
            </Link>
          </Button>
        </div>
      </div>

      {/* Resumen simple del padrón (solo datos del afiliado) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PadronCard
          icon={<Users className="h-5 w-5 text-blue-600" />}
          title="Total de afiliados"
          value={String(summary.total)}
          detail={`${summary.active} activos · ${summary.inactive} inactivos`}
        />
        <PadronCard
          icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
          title="Sin sueldo cargado"
          value={String(summary.withoutSalary)}
          detail="Necesario para poder cargar beneficios"
          tone={summary.withoutSalary > 0 ? "warning" : "default"}
        />
      </div>

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

function PadronCard({
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
      <CardContent className="flex items-start gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--muted))]">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{title}</p>
          <p className="mt-1 text-2xl font-bold leading-tight">{value}</p>
          <p className="mt-0.5 text-sm text-[hsl(var(--muted-foreground))]">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}
