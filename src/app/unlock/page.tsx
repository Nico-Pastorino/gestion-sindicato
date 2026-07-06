import type { Metadata } from "next";
import { Suspense } from "react";
import { Building2 } from "lucide-react";
import { UnlockForm } from "./unlock-form";

export const metadata: Metadata = { title: "Acceso" };

export default function UnlockPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[hsl(224,20%,10%)] px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-white">Sistema Sindical</h1>
          <p className="mt-1 text-sm text-white/50">Gestión de Beneficios</p>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="text-lg font-semibold">Acceso</h2>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            Ingresá la contraseña para continuar.
          </p>
          <Suspense>
            <UnlockForm />
          </Suspense>
        </div>

        <p className="mt-4 text-center text-xs text-white/30">
          Acceso restringido al personal autorizado del sindicato.
        </p>
      </div>
    </div>
  );
}
