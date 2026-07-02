import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Gift, Plus, UserSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BenefitFilters } from "@/components/benefits/benefit-filters";
import { BenefitsTable } from "@/components/benefits/benefits-table";
import { AffiliateBenefitsSearch } from "@/components/benefits/affiliate-benefits-search";
import { Pagination } from "@/components/shared/pagination";
import { listBenefits } from "@/lib/services/benefits.service";

export const metadata: Metadata = { title: "Beneficios" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    type?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function BenefitsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = 20;

  const result = await listBenefits({
    type: params.type as "ayuda_economica" | "supermercado" | "otro" | undefined,
    status: params.status as "active" | "cancelled" | "finished" | undefined,
    page,
    limit,
  });

  const totalPages = Math.ceil(result.total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="h-6 w-6" />
            Beneficios
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Carga de beneficios, tope del 30%, cuotas y cupo por afiliado.
          </p>
        </div>
        <Button asChild>
          <Link href="/beneficios/nuevo">
            <Plus className="h-4 w-4" />
            Nuevo beneficio
          </Link>
        </Button>
      </div>

      {/* Consultar situación de un afiliado */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserSearch className="h-4 w-4" />
            Consultar afiliado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <AffiliateBenefitsSearch />
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Buscá un afiliado para ver su cupo disponible, sus beneficios y sus próximas cuotas.
          </p>
        </CardContent>
      </Card>

      {/* Listado de beneficios */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">
            Todos los beneficios
            <span className="ml-2 text-sm font-normal text-[hsl(var(--muted-foreground))]">
              {result.total} registrado{result.total !== 1 ? "s" : ""}
            </span>
          </h2>
          <Suspense>
            <BenefitFilters currentType={params.type} currentStatus={params.status} />
          </Suspense>
        </div>

        <Card>
          <CardContent className="p-0">
            <BenefitsTable
              benefits={
                result.data as Parameters<typeof BenefitsTable>[0]["benefits"]
              }
            />
            <div className="px-4 border-t">
              <Suspense>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  total={result.total}
                  limit={limit}
                />
              </Suspense>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
