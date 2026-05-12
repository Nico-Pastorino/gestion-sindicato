import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Gift, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BenefitFilters } from "@/components/benefits/benefit-filters";
import { BenefitsTable } from "@/components/benefits/benefits-table";
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
            {result.total} beneficio{result.total !== 1 ? "s" : ""} registrado{result.total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/beneficios/nuevo">
            <Plus className="h-4 w-4" />
            Nuevo beneficio
          </Link>
        </Button>
      </div>

      {/* Filtros */}
      <Suspense>
        <BenefitFilters currentType={params.type} currentStatus={params.status} />
      </Suspense>

      {/* Tabla */}
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
  );
}
