import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ClipboardCheck, CircleDollarSign, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/shared/pagination";
import { SensitiveValue } from "@/components/privacy/sensitive-value";
import { listAutoPaidInstallments } from "@/lib/services/installments.service";
import { formatCurrencyARS } from "@/lib/utils/currency";
import { ConciliacionClient } from "./conciliacion-client";

export const metadata: Metadata = { title: "Conciliación mensual" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    month?: string;
    year?: string;
    search?: string;
    page?: string;
  }>;
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default async function ConciliacionPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const now = new Date();

  const month = params.month ? Number(params.month) : now.getMonth() + 1;
  const year = params.year ? Number(params.year) : now.getFullYear();
  const search = params.search || undefined;
  const page = params.page ? Number(params.page) : 1;

  const result = await listAutoPaidInstallments({ month, year, search, page, limit: 50 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/cobranzas">
            <ChevronLeft className="h-4 w-4" />
            Cobranzas
          </Link>
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6" />
          Conciliación mensual
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 max-w-3xl">
          Cuotas que el sistema marcó como cobradas automáticamente (retención municipal).
          Destildá las que la municipalidad <strong>no</strong> retuvo, elegí el motivo y revertilas
          en lote: vuelven a quedar pendientes/vencidas y reaparecen en Cobranzas.
        </p>
      </div>

      {/* Resumen del período */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <ListChecks className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wide font-medium">
                Cuotas auto-cobradas
              </p>
              <p className="text-xl font-bold">{result.total}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {MONTHS[month - 1]} {year}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
              <CircleDollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wide font-medium">
                Monto retenido (estimado)
              </p>
              <p className="text-xl font-bold">
                <SensitiveValue value={formatCurrencyARS(result.totalAmount)} />
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                según lo cobrado en el período
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConciliacionClient
        rows={result.data}
        month={month}
        year={year}
        search={params.search ?? ""}
      />

      {result.totalPages > 1 && (
        <Suspense>
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            limit={result.limit}
          />
        </Suspense>
      )}
    </div>
  );
}
