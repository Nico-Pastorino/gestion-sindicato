"use client";

import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { AffiliateAvatar } from "@/components/affiliates/affiliate-avatar";
import { Building2, Printer } from "lucide-react";
import { formatDate } from "@/lib/utils/date";

// Credencial imprimible del afiliado. El QR abre su ficha en el sistema.

export interface CredentialData {
  id: string;
  fullName: string;
  dni: string;
  legajo: string | null;
  area: string | null;
  affiliationDate: string | null;
  photoUrl: string | null;
  status: "active" | "inactive";
}

export function CredentialCard({
  affiliate,
  unionName,
  qrUrl,
}: {
  affiliate: CredentialData;
  unionName: string;
  qrUrl: string;
}) {
  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Imprimir credencial
        </Button>
      </div>

      <div
        id="credencial"
        className="w-full max-w-[420px] overflow-hidden rounded-2xl border bg-white shadow-lg print:max-w-[340px] print:shadow-none"
      >
        {/* Franja superior */}
        <div className="flex items-center gap-2 bg-blue-700 px-5 py-3 text-white">
          <Building2 className="h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold uppercase tracking-wide">{unionName}</p>
            <p className="text-[11px] text-white/80">Credencial de afiliado</p>
          </div>
        </div>

        <div className="flex gap-4 px-5 py-4">
          <AffiliateAvatar name={affiliate.fullName} photoUrl={affiliate.photoUrl} size="xl" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-lg font-bold leading-tight">{affiliate.fullName}</p>
            <p className="text-sm text-slate-600">DNI {affiliate.dni}</p>
            {affiliate.legajo && <p className="text-sm text-slate-600">Legajo {affiliate.legajo}</p>}
            {affiliate.area && <p className="text-sm text-slate-600">{affiliate.area}</p>}
            {affiliate.affiliationDate && (
              <p className="text-xs text-slate-500">
                Afiliado desde el {formatDate(affiliate.affiliationDate)}
              </p>
            )}
          </div>
          <div className="shrink-0 self-center rounded-lg border bg-white p-1.5">
            <QRCode value={qrUrl} size={84} />
          </div>
        </div>

        <div className="flex items-center justify-between border-t bg-slate-50 px-5 py-2">
          <p className="text-[11px] text-slate-500">
            {affiliate.status === "active" ? "Afiliado activo" : "Afiliado inactivo"}
          </p>
          <p className="text-[11px] text-slate-400">Verificable con el código QR</p>
        </div>
      </div>

      {/* Al imprimir: solo la credencial */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #credencial, #credencial * { visibility: visible; }
          #credencial { position: absolute; left: 0; top: 0; }
        }
      `}</style>
    </div>
  );
}
