import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AffiliateSearch } from "@/components/affiliates/affiliate-search";
import { AffiliatesTable } from "@/components/affiliates/affiliates-table";
import { Pagination } from "@/components/shared/pagination";
import { getAreas, searchAffiliates } from "@/lib/services/affiliates.service";
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

  const [{ data, total }, areas] = await Promise.all([
    getAffiliatesWithCredit({
      search: params.search,
      status: params.status,
      area: params.area,
      page,
      limit,
    }),
    getAreas(),
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
