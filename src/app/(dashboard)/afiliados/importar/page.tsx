import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportAffiliates } from "@/components/affiliates/import-affiliates";

export const metadata: Metadata = { title: "Importar afiliados" };

export default function ImportarAfiliadosPage() {
  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/afiliados">
            <ChevronLeft className="h-4 w-4" />
            Afiliados
          </Link>
        </Button>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <FileSpreadsheet className="h-6 w-6" />
          Importar afiliados desde Excel
        </h1>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Cargá el padrón completo de una sola vez. Los DNI ya existentes se saltean.
        </p>
      </div>

      <ImportAffiliates />
    </div>
  );
}
