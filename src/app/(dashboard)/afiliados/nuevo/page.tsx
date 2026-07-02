import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AffiliateForm } from "@/components/affiliates/affiliate-form";
import { getAreas } from "@/lib/services/affiliates.service";

export const metadata: Metadata = { title: "Nuevo Afiliado" };

export default async function NewAffiliatePage() {
  const areas = await getAreas();

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/afiliados">
            <ChevronLeft className="h-4 w-4" />
            Volver a afiliados
          </Link>
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserPlus className="h-6 w-6" />
          Nuevo Afiliado
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          Completá los datos del nuevo afiliado.
        </p>
      </div>

      <AffiliateForm mode="create" areas={areas} />
    </div>
  );
}
