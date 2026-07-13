import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CredentialCard } from "@/components/affiliates/credential-card";
import { getAffiliateById } from "@/lib/services/affiliates.service";
import { isUuid } from "@/lib/utils/labels";

export const metadata: Metadata = { title: "Credencial" };
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CredencialPage({ params }: PageProps) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const data = await getAffiliateById(id);
  if (!data) notFound();

  const unionName = process.env.NEXT_PUBLIC_APP_NAME || "Sistema Sindical";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  // El QR apunta a la verificación pública (sin contraseña): foto, nombre y estado.
  const qrUrl = `${baseUrl}/verificar/${data.id}`;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href={`/afiliados/${data.id}`}>
            <ChevronLeft className="h-4 w-4" />
            Volver a la ficha
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Credencial de {data.fullName}</h1>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Imprimila o guardala como PDF y entregásela al afiliado. Cualquiera que escanee el QR
          ve la verificación pública (foto, nombre y si está ACTIVO) sin necesidad de contraseña;
          el personal del sindicato puede saltar de ahí a la ficha completa.
        </p>
      </div>

      <CredentialCard
        affiliate={{
          id: data.id,
          fullName: data.fullName,
          dni: data.dni,
          legajo: data.legajo,
          area: data.area,
          affiliationDate: data.affiliationDate,
          photoUrl: data.photoUrl,
          status: data.status,
        }}
        unionName={unionName}
        qrUrl={qrUrl}
      />
    </div>
  );
}
