import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AffiliateForm } from "@/components/affiliates/affiliate-form";
import { getAffiliateById, getAreas } from "@/lib/services/affiliates.service";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getAffiliateById(id);
  return { title: data ? `Editar: ${data.fullName}` : "Editar Afiliado" };
}

export default async function EditAffiliatePage({ params }: PageProps) {
  const { id } = await params;
  const [data, areas] = await Promise.all([
    getAffiliateById(id),
    getAreas(),
  ]);

  if (!data) notFound();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href={`/afiliados/${id}`}>
            <ChevronLeft className="h-4 w-4" />
            Volver al detalle
          </Link>
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Pencil className="h-6 w-6" />
          Editar Afiliado
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          {data.fullName} · DNI {data.dni}
        </p>
      </div>

      <AffiliateForm mode="edit" affiliate={data} areas={areas} />
    </div>
  );
}
