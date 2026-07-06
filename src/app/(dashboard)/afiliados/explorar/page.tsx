import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/shared/pagination";
import { AffiliateStatusBadge } from "@/components/ui/badge";
import { SensitiveText } from "@/components/privacy/sensitive-value";
import {
  exploreAffiliates,
  getAffiliateFilterOptions,
} from "@/lib/services/affiliates.service";
import { affiliateExploreSchema } from "@/lib/validations/affiliate.schema";
import { ExplorarClient } from "./explorar-client";

export const metadata: Metadata = { title: "Explorar afiliados" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  planta: "Planta",
  contratado: "Contratado",
  jubilado: "Jubilado",
  otro: "Otro",
};

export default async function ExplorarAfiliadosPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const input = affiliateExploreSchema.parse({
    search: sp.search || undefined,
    area: sp.area || undefined,
    sector: sp.sector || undefined,
    city: sp.city || undefined,
    neighborhood: sp.neighborhood || undefined,
    province: sp.province || undefined,
    employmentType: sp.employmentType || undefined,
    status: sp.status || undefined,
    documentationStatus: sp.documentationStatus || undefined,
    hasSalary: sp.hasSalary || undefined,
    page: sp.page || 1,
    limit: 25,
  });

  const [result, options] = await Promise.all([
    exploreAffiliates(input),
    getAffiliateFilterOptions(),
  ]);

  const rows = result.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/afiliados">
            <ChevronLeft className="h-4 w-4" />
            Afiliados
          </Link>
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Filter className="h-6 w-6" />
          Explorar y exportar afiliados
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 max-w-3xl">
          Filtrá por los datos del legajo (localidad, área, sector, vínculo, documentación…)
          y exportá el resultado a Excel.
        </p>
      </div>

      {/* Filtros + acción exportar */}
      <ExplorarClient
        options={options}
        total={result.total}
        filters={{
          search: input.search ?? "",
          area: input.area ?? "",
          sector: input.sector ?? "",
          city: input.city ?? "",
          neighborhood: input.neighborhood ?? "",
          province: input.province ?? "",
          employmentType: input.employmentType ?? "",
          status: input.status ?? "",
          documentationStatus: input.documentationStatus ?? "",
          hasSalary: input.hasSalary ?? "",
        }}
      />

      {/* Resultados */}
      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="py-12 text-center">
              <Filter className="h-8 w-8 text-[hsl(var(--muted-foreground))] opacity-40 mx-auto mb-2" />
              <p className="text-sm font-medium">No hay afiliados con estos filtros.</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                Probá quitando algún filtro.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-[hsl(var(--muted-foreground))] text-xs uppercase tracking-wide">
                    <th className="text-left py-2.5 px-4 font-semibold">Afiliado</th>
                    <th className="text-left py-2.5 px-3 font-semibold hidden md:table-cell">DNI</th>
                    <th className="text-left py-2.5 px-3 font-semibold hidden lg:table-cell">Legajo</th>
                    <th className="text-left py-2.5 px-3 font-semibold">Área / Sector</th>
                    <th className="text-left py-2.5 px-3 font-semibold hidden lg:table-cell">Localidad</th>
                    <th className="text-left py-2.5 px-3 font-semibold hidden lg:table-cell">Vínculo</th>
                    <th className="text-left py-2.5 px-3 font-semibold">Estado</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-[hsl(var(--accent))]/40 transition-colors">
                      <td className="py-2.5 px-4 font-medium">{r.fullName}</td>
                      <td className="py-2.5 px-3 text-[hsl(var(--muted-foreground))] hidden md:table-cell">
                        <SensitiveText value={r.dni} type="dni" />
                      </td>
                      <td className="py-2.5 px-3 text-[hsl(var(--muted-foreground))] hidden lg:table-cell">
                        {r.legajo ?? "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        {[r.area, r.sector].filter(Boolean).join(" / ") || "—"}
                      </td>
                      <td className="py-2.5 px-3 hidden lg:table-cell">{r.city ?? "—"}</td>
                      <td className="py-2.5 px-3 hidden lg:table-cell">
                        {r.employmentType ? EMPLOYMENT_LABELS[r.employmentType] ?? r.employmentType : "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <AffiliateStatusBadge status={r.status as "active" | "inactive"} />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Link
                          href={`/afiliados/${encodeURIComponent(r.dni)}`}
                          className="text-xs text-[hsl(var(--primary))] hover:underline"
                          prefetch={false}
                        >
                          Perfil
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.totalPages > 1 && (
            <div className="px-4 border-t">
              <Suspense>
                <Pagination
                  page={result.page}
                  totalPages={result.totalPages}
                  total={result.total}
                  limit={result.limit}
                />
              </Suspense>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
