import type { Metadata } from "next";
import { Suspense } from "react";
import { Building2 } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[hsl(224,20%,10%)] px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Marca */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Sistema Sindical</h1>
            <p className="mt-1 text-sm text-white/50">
              Gestión de beneficios y afiliados
            </p>
          </div>
        </div>

        {/* Card de login */}
        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <h2 className="text-lg font-semibold text-[hsl(224,20%,12%)]">
            Iniciar sesión
          </h2>
          <p className="mt-1 text-sm text-[hsl(220,8%,46%)]">
            Ingresá con tu cuenta para continuar.
          </p>
          <div className="mt-6">
            <Suspense>
              <LoginForm />
            </Suspense>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/30">
          Acceso restringido al personal autorizado del sindicato.
        </p>
      </div>
    </main>
  );
}
