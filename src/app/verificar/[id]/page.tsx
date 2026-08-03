import type { Metadata } from "next";
import { Building2, CheckCircle2, ShieldQuestion, XCircle } from "lucide-react";
import { AffiliateAvatar } from "@/components/affiliates/affiliate-avatar";
import { formatDate } from "@/lib/utils/date";
import { isUuid } from "@/lib/utils/labels";
import { db } from "@/lib/db";
import { affiliates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const metadata: Metadata = { title: "Verificación de credencial" };
export const dynamic = "force-dynamic";

// Página PÚBLICA (fuera del portón de contraseña) a la que apunta el QR del
// carnet. Muestra solo lo mínimo para verificar la credencial: foto, nombre,
// estado y DNI parcial. Nada de domicilio, teléfonos ni datos financieros.

interface PageProps {
  params: Promise<{ id: string }>;
}

function maskDni(dni: string): string {
  if (dni.length <= 3) return dni;
  return "···" + dni.slice(-3);
}

export default async function VerificarCredencialPage({ params }: PageProps) {
  const { id } = await params;
  const unionName = process.env.NEXT_PUBLIC_APP_NAME || "Sistema Sindical";

  const affiliate = isUuid(id)
    ? await db.query.affiliates.findFirst({
        where: eq(affiliates.id, id),
        columns: {
          id: true,
          fullName: true,
          dni: true,
          legajo: true,
          status: true,
          photoUrl: true,
          affiliationDate: true,
        },
      })
    : null;

  const now = new Date().toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-lg">
        <div className="flex items-center gap-2 bg-blue-700 px-5 py-3 text-white">
          <Building2 className="h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold uppercase tracking-wide">{unionName}</p>
            <p className="text-[11px] text-white/80">Verificación de credencial</p>
          </div>
        </div>

        {!affiliate ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <ShieldQuestion className="h-12 w-12 text-slate-400" />
            <p className="text-lg font-bold">Credencial no válida</p>
            <p className="text-sm text-slate-600">
              El código escaneado no corresponde a ninguna credencial emitida por el sindicato.
            </p>
          </div>
        ) : (
          <div className="space-y-5 px-6 py-6">
            <div className="flex items-center gap-4">
              <AffiliateAvatar name={affiliate.fullName} photoUrl={affiliate.photoUrl} size="xl" />
              <div className="min-w-0">
                <p className="text-xl font-bold leading-tight">{affiliate.fullName}</p>
                <p className="mt-1 text-sm text-slate-600">DNI {maskDni(affiliate.dni)}</p>
                {affiliate.legajo && (
                  <p className="text-sm text-slate-600">Legajo {affiliate.legajo}</p>
                )}
                {affiliate.affiliationDate && (
                  <p className="text-xs text-slate-500">
                    Afiliado desde el {formatDate(affiliate.affiliationDate)}
                  </p>
                )}
              </div>
            </div>

            {affiliate.status === "active" ? (
              <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                <CheckCircle2 className="h-8 w-8 shrink-0 text-green-600" />
                <div>
                  <p className="text-lg font-bold text-green-800">AFILIADO ACTIVO</p>
                  <p className="text-xs text-green-700">Credencial vigente · verificado el {now}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <XCircle className="h-8 w-8 shrink-0 text-red-600" />
                <div>
                  <p className="text-lg font-bold text-red-800">AFILIADO INACTIVO</p>
                  <p className="text-xs text-red-700">La credencial no está vigente · verificado el {now}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
