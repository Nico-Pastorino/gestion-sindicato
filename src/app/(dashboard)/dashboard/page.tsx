import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileDown,
  Gift,
  Landmark,
  Users,
  WalletCards,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SensitiveValue } from "@/components/privacy/sensitive-value";
import { formatCurrencyARS } from "@/lib/utils/currency";
import { getHomeSnapshot, type HomeSnapshot } from "@/lib/services/dashboard.service";

export const metadata: Metadata = { title: "Inicio" };
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const snapshot = await getHomeSnapshot();

  const monthLabel = format(new Date(), "MMMM yyyy", { locale: es });
  const monthLabelCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  // Próximas acciones (solo lo que requiere hacer algo)
  const actions: Array<{ tone: "alert" | "warn"; title: string; href: string }> = [];
  if (snapshot.overdueCount > 0) {
    actions.push({
      tone: "alert",
      title: `${snapshot.overdueCount} cuota${snapshot.overdueCount !== 1 ? "s" : ""} vencida${snapshot.overdueCount !== 1 ? "s" : ""} sin cobrar · revisá la cobranza`,
      href: "/cobranza?status=overdue",
    });
  }
  if (snapshot.dueThisMonthCount > 0) {
    actions.push({
      tone: "warn",
      title: `${snapshot.dueThisMonthCount} cuota${snapshot.dueThisMonthCount !== 1 ? "s" : ""} por cobrar este mes`,
      href: "/cobranza?status=pending",
    });
  }
  if (snapshot.activeWithoutSalary > 0) {
    actions.push({
      tone: "warn",
      title: `${snapshot.activeWithoutSalary} afiliado${snapshot.activeWithoutSalary !== 1 ? "s" : ""} sin sueldo cargado (no pueden recibir beneficios)`,
      href: "/afiliados",
    });
  }

  return (
    <div className="space-y-8">
      {/* ── Encabezado ── */}
      <div>
        <h1 className="text-2xl font-bold">Inicio</h1>
        <p className="mt-0.5 text-sm text-[hsl(var(--muted-foreground))]">
          ¿Cómo está el sindicato hoy? · {monthLabelCap}
        </p>
      </div>

      {/* ── Estado general + qué hacer hoy ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <StatusBanner snapshot={snapshot} />
        </div>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Qué hacer hoy</h2>
          <Card className="h-[calc(100%-1.75rem)]">
            <CardContent className="p-3">
              {actions.length === 0 ? (
                <div className="flex h-full items-center gap-3 px-2 py-3">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600" />
                  <div>
                    <p className="font-medium">Todo al día</p>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">No hay tareas urgentes.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {actions.map((a) => (
                    <Link
                      key={a.href + a.title}
                      href={a.href}
                      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors hover:bg-[hsl(var(--accent))] ${a.tone === "alert" ? "border-red-200 bg-red-50/50" : "border-amber-200 bg-amber-50/50"}`}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <AlertTriangle className={`h-4 w-4 shrink-0 ${a.tone === "alert" ? "text-red-600" : "text-amber-600"}`} />
                        {a.title}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      {/* ── Indicadores clave ── */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Los números de hoy</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard
            href="/afiliados"
            icon={<Users className="h-5 w-5 text-blue-600" />}
            iconBg="bg-blue-50"
            label="Total de afiliados"
            value={String(snapshot.totalAffiliates)}
            sub={`${snapshot.activeAffiliates} activos`}
          />
          <KpiCard
            href="/beneficios"
            icon={<Gift className="h-5 w-5 text-purple-600" />}
            iconBg="bg-purple-50"
            label="Beneficios activos"
            value={String(snapshot.activeBenefits)}
            sub={`${snapshot.affiliatesWithActiveBenefit} afiliado${snapshot.affiliatesWithActiveBenefit !== 1 ? "s" : ""} con beneficio`}
          />
          <KpiCard
            href="/cobranza"
            icon={<Clock className="h-5 w-5 text-amber-600" />}
            iconBg="bg-amber-50"
            label="A cobrar este mes"
            value={formatCurrencyARS(snapshot.dueThisMonthAmount)}
            sub={`${snapshot.dueThisMonthCount} cuota${snapshot.dueThisMonthCount !== 1 ? "s" : ""} pendiente${snapshot.dueThisMonthCount !== 1 ? "s" : ""}`}
          />
          <KpiCard
            href="/cobranza?status=paid"
            icon={<WalletCards className="h-5 w-5 text-green-600" />}
            iconBg="bg-green-50"
            label="Ya cobrado este mes"
            value={formatCurrencyARS(snapshot.collectedThisMonthAmount)}
            sub={`${snapshot.collectedThisMonthCount} cuota${snapshot.collectedThisMonthCount !== 1 ? "s" : ""} cobrada${snapshot.collectedThisMonthCount !== 1 ? "s" : ""}`}
          />
          <KpiCard
            href="/analisis"
            icon={<Landmark className="h-5 w-5 text-emerald-700" />}
            iconBg="bg-emerald-50"
            label="Ganancia del sindicato (mes)"
            value={formatCurrencyARS(snapshot.unionProfitThisMonth)}
            sub="Por beneficios otorgados este mes"
          />
          <KpiCard
            href="/cobranza?status=overdue"
            icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
            iconBg="bg-red-50"
            label="En mora (vencido)"
            value={formatCurrencyARS(snapshot.overdueAmount)}
            sub={
              snapshot.overdueCount > 0
                ? `${snapshot.overdueCount} cuota${snapshot.overdueCount !== 1 ? "s" : ""} · ${snapshot.overdueAffiliates} afiliado${snapshot.overdueAffiliates !== 1 ? "s" : ""}`
                : "Sin cuotas vencidas"
            }
            alert={snapshot.overdueCount > 0}
          />
        </div>
      </section>

      {/* ── Accesos rápidos ── */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">¿A dónde vas?</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <ModuleCard href="/afiliados" icon={<Users className="h-5 w-5 text-blue-600" />} iconBg="bg-blue-50" label="Afiliados" detail="Fichero del padrón" />
          <ModuleCard href="/beneficios" icon={<Gift className="h-5 w-5 text-purple-600" />} iconBg="bg-purple-50" label="Beneficios" detail="Carga, cupo y cuotas" />
          <ModuleCard
            href="/cobranza"
            icon={<WalletCards className="h-5 w-5 text-emerald-700" />}
            iconBg="bg-emerald-50"
            label="Cobranza"
            detail={snapshot.overdueCount > 0 ? `${snapshot.overdueCount} vencida${snapshot.overdueCount !== 1 ? "s" : ""}` : "Al día"}
            alert={snapshot.overdueCount > 0}
          />
          <ModuleCard href="/analisis" icon={<BarChart3 className="h-5 w-5 text-teal-600" />} iconBg="bg-teal-50" label="Análisis" detail="Métricas y reportes" />
          <ModuleCard href="/exportar" icon={<FileDown className="h-5 w-5 text-slate-600" />} iconBg="bg-slate-100" label="Exportar" detail="Archivo municipal" />
        </div>
      </section>
    </div>
  );
}

// ─── Componentes ──────────────────────────────────────────────────────────────

function StatusBanner({ snapshot }: { snapshot: HomeSnapshot }) {
  const hasOverdue = snapshot.overdueCount > 0;
  const cfg = hasOverdue
    ? {
        box: "border-red-200 bg-red-50",
        text: "text-red-900",
        title: `Hay ${snapshot.overdueCount} cuota${snapshot.overdueCount !== 1 ? "s" : ""} vencida${snapshot.overdueCount !== 1 ? "s" : ""} sin cobrar`,
        icon: <AlertTriangle className="h-7 w-7 text-red-600" />,
      }
    : {
        box: "border-green-200 bg-green-50",
        text: "text-green-800",
        title: "El sindicato está al día",
        icon: <CheckCircle2 className="h-7 w-7 text-green-600" />,
      };

  return (
    <Card className={`h-full ${cfg.box}`}>
      <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          {cfg.icon}
          <div>
            <p className={`text-lg font-bold ${cfg.text}`}>{cfg.title}</p>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Resumen del mes en curso. El detalle completo está en Análisis.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 border-t border-black/5 pt-4">
          <BannerStat label="A cobrar este mes" value={formatCurrencyARS(snapshot.dueThisMonthAmount)} />
          <BannerStat label="Ya cobrado" value={formatCurrencyARS(snapshot.collectedThisMonthAmount)} />
          <BannerStat
            label="En mora"
            value={formatCurrencyARS(snapshot.overdueAmount)}
            tone={hasOverdue ? "red" : undefined}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function BannerStat({ label, value, tone }: { label: string; value: string; tone?: "red" }) {
  return (
    <div>
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${tone === "red" ? "text-red-700" : ""}`}>
        <SensitiveValue value={value} />
      </p>
    </div>
  );
}

function KpiCard({ href, icon, iconBg, label, value, sub, alert = false }: {
  href: string;
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group block cursor-pointer rounded-xl border bg-[hsl(var(--card))] p-4 transition-all hover:border-[hsl(var(--primary))]/30 hover:shadow-md ${alert ? "border-red-200 bg-red-50/40" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
        <ChevronRight className="mt-0.5 h-4 w-4 text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="mt-3 space-y-0.5">
        <p className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{label}</p>
        <p className={`text-xl font-bold ${alert ? "text-red-700" : ""}`}>
          {value.trim().startsWith("$") ? <SensitiveValue value={value} /> : value}
        </p>
        {sub && <p className="text-xs text-[hsl(var(--muted-foreground))]">{sub}</p>}
      </div>
    </Link>
  );
}

function ModuleCard({ href, icon, iconBg, label, detail, alert = false }: {
  href: string; icon: ReactNode; iconBg: string; label: string; detail: string; alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-xl border bg-[hsl(var(--card))] p-4 transition-all hover:border-[hsl(var(--primary))]/30 hover:shadow-md ${alert ? "border-red-200 bg-red-50/40" : ""}`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{label}</p>
        <p className={`truncate text-xs ${alert ? "font-medium text-red-700" : "text-[hsl(var(--muted-foreground))]"}`}>{detail}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}
