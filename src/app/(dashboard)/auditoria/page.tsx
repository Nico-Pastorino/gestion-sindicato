import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ScrollText } from "lucide-react";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/shared/pagination";
import { listAuditLogs } from "@/lib/services/audit.service";
import {
  auditActionLabel,
  auditEntityLabel,
  auditDetail,
} from "@/lib/utils/audit-labels";
import { AuditoriaFilters } from "./auditoria-filters";

export const metadata: Metadata = { title: "Auditoría" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ action?: string; entityType?: string; page?: string }>;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function AuditoriaPage({ searchParams }: PageProps) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));

  const result = await listAuditLogs({
    action: sp.action || undefined,
    entityType: sp.entityType || undefined,
    page,
    limit: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScrollText className="h-6 w-6" />
          Auditoría
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          Registro de todas las operaciones del sistema: quién hizo qué y cuándo.
        </p>
      </div>

      <Suspense>
        <AuditoriaFilters />
      </Suspense>

      <Card>
        <CardContent className="p-0">
          {result.data.length === 0 ? (
            <div className="py-12 text-center">
              <ScrollText className="h-8 w-8 text-[hsl(var(--muted-foreground))] opacity-40 mx-auto mb-2" />
              <p className="text-sm font-medium">No hay registros con estos filtros.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-[hsl(var(--muted-foreground))] text-xs uppercase tracking-wide">
                    <th className="text-left py-2.5 px-4 font-semibold">Fecha y hora</th>
                    <th className="text-left py-2.5 px-3 font-semibold">Usuario</th>
                    <th className="text-left py-2.5 px-3 font-semibold">Acción</th>
                    <th className="text-left py-2.5 px-3 font-semibold hidden md:table-cell">Entidad</th>
                    <th className="text-left py-2.5 px-4 font-semibold hidden lg:table-cell">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {result.data.map((log) => {
                    const detail = auditDetail(log);
                    return (
                      <tr key={log.id} className="hover:bg-[hsl(var(--accent))]/40 transition-colors">
                        <td className="py-2.5 px-4 whitespace-nowrap text-[hsl(var(--muted-foreground))]">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="py-2.5 px-3">{log.userName ?? "Sistema"}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-xs font-medium">
                            {auditActionLabel(log.action)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 hidden md:table-cell text-[hsl(var(--muted-foreground))]">
                          {auditEntityLabel(log.entityType)}
                        </td>
                        <td className="py-2.5 px-4 hidden lg:table-cell text-[hsl(var(--muted-foreground))]">
                          {detail ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {result.totalPages > 1 && (
            <div className="px-4 border-t">
              <Suspense>
                <Pagination
                  page={result.page}
                  totalPages={result.totalPages}
                  total={result.total}
                  limit={result.limit}
                />
              </Suspense>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
