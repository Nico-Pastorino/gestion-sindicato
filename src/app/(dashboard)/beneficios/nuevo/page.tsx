import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BenefitForm } from "@/components/benefits/benefit-form";
import { getAffiliateById, getAffiliateCreditSummary } from "@/lib/services/affiliates.service";

export const metadata: Metadata = { title: "Nuevo Beneficio" };

interface PageProps {
  searchParams: Promise<{ affiliateId?: string }>;
}

export default async function NewBenefitPage({ searchParams }: PageProps) {
  const { affiliateId } = await searchParams;

  let preselected: Parameters<typeof BenefitForm>[0]["preselectedAffiliate"] = undefined;

  if (affiliateId) {
    const [affiliate, credit] = await Promise.all([
      getAffiliateById(affiliateId),
      getAffiliateCreditSummary(affiliateId),
    ]);

    if (affiliate) {
      preselected = {
        id: affiliate.id,
        fullName: affiliate.fullName,
        dni: affiliate.dni,
        creditSummary: credit,
      };
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href={affiliateId ? `/beneficios/afiliado/${affiliateId}` : "/beneficios"}>
            <ChevronLeft className="h-4 w-4" />
            {affiliateId ? "Volver al afiliado" : "Volver a beneficios"}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gift className="h-6 w-6" />
          Nuevo Beneficio
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          El sistema valida automáticamente el límite del 30% del salario bruto.
        </p>
      </div>

      <BenefitForm preselectedAffiliate={preselected} />
    </div>
  );
}
