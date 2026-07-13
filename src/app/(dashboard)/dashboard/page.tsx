import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowRight,
  BarChart3,
  Cake,
  CheckCircle2,
  ChevronRight,
  FileDown,
  FileWarning,
  Gift,
  HandCoins,
  Heart,
  Megaphone,
  MessageCircle,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityTimeline } from "@/components/audit/activity-timeline";
import { RemindersCard } from "@/components/dashboard/reminders-card";
import { AffiliateAvatar } from "@/components/affiliates/affiliate-avatar";
import { getPadronHome, type UpcomingBirthday } from "@/lib/services/home.service";
import { getSetting } from "@/lib/services/settings.service";
import { buildWhatsAppLink, renderBirthdayMessage } from "@/lib/utils/whatsapp";
import { formatEmploymentType } from "@/lib/utils/labels";
import { formatDate } from "@/lib/utils/date";

export const metadata: Metadata = { title: "Inicio" };
export const dynamic = "force-dynamic";

// Inicio del padrón: solo datos de gestión (cantidades, estados, fechas).
// Sin montos ni información financiera — pedido explícito del cliente.

export default async function HomePage() {
  const [home, birthdayTemplate] = await Promise.all([
    getPadronHome(),
    getSetting("whatsappBirthdayTemplate"),
  ]);

  const monthLabel = format(new Date(), "MMMM yyyy", { locale: es });
  const monthLabelCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const docsTotal = home.docsPending + home.docsMissing;
  const actions: Array<{ tone: "alert" | "warn"; title: string; href: string }> = [];
  if (home.docsMissing > 0) {
    actions.push({
      tone: "alert",
      title: `${home.docsMissing} afiliado${home.docsMissing !== 1 ? "s" : ""} con documentación faltante`,
      href: "/afiliados/explorar?documentationStatus=missing",
    });
  }
  if (home.docsPending > 0) {
    actions.push({
      tone: "warn",
      title: `${home.docsPending} afiliado${home.docsPending !== 1 ? "s" : ""} con documentación pendiente`,
      href: "/afiliados/explorar?documentationStatus=pending",
    });
  }

  const birthdaysWeek = home.birthdays.filter((b) => b.daysUntil <= 7);
  const birthdaysLater = home.birthdays.filter((b) => b.daysUntil > 7);

  return (
    <div className="space-y-8">
      {/* ── Encabezado ── */}
      <div>
        <h1 className="text-2xl font-bold">Inicio</h1>
        <p className="mt-0.5 text-sm text-[hsl(var(--muted-foreground))]">
          ¿Cómo está el padrón hoy? · {monthLabelCap}
        </p>
      </div>

      {/* ── Novedades del sindicato ── */}
      {home.announcements.length > 0 && (
        <section className="space-y-2">
          {home.announcements.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3"
            >
              <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <div className="min-w-0">
                <p className="font-semibold text-blue-900">{a.title}</p>
                {a.body && <p className="mt-0.5 text-sm text-blue-800/90">{a.body}</p>}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── Estado del padrón + qué hacer hoy ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <Users className="h-7 w-7 text-blue-600" />
              <div>
                <p className="text-lg font-bold">
                  {home.totalAffiliates} afiliado{home.totalAffiliates !== 1 ? "s" : ""} en el padrón
                </p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {home.activeAffiliates} activos · {home.inactiveAffiliates} inactivos
                  {home.newThisMonth > 0 &&
                    ` · ${home.newThisMonth} alta${home.newThisMonth !== 1 ? "s" : ""} este mes`}
                </p>
              </div>
            </div>
            {home.byEmploymentType.length > 0 && (
              <div className="grid grid-cols-2 gap-4 border-t border-black/5 pt-4 sm:grid-cols-3">
                {home.byEmploymentType.map((e) => (
                  <div key={e.type}>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {formatEmploymentType(e.type)}
                    </p>
                    <p className="mt-0.5 text-lg font-bold">{e.count}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Qué hacer hoy</h2>
          <Card className="h-[calc(100%-1.75rem)]">
            <CardContent className="p-3">
              {actions.length === 0 ? (
                <div className="flex h-full items-center gap-3 px-2 py-3">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600" />
                  <div>
                    <p className="font-medium">Todo al día</p>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      La documentación del padrón está completa.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {actions.map((a) => (
                    <Link
                      key={a.href}
                      href={a.href}
                      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors hover:bg-[hsl(var(--accent))] ${a.tone === "alert" ? "border-red-200 bg-red-50/50" : "border-amber-200 bg-amber-50/50"}`}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <FileWarning className={`h-4 w-4 shrink-0 ${a.tone === "alert" ? "text-red-600" : "text-amber-600"}`} />
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

      {/* ── Cumpleaños y aniversarios ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Cake className="h-4 w-4 text-pink-600" />
              Cumpleaños
            </CardTitle>
          </CardHeader>
          <CardContent>
            {home.birthdays.length === 0 ? (
              <p className="py-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
                No hay cumpleaños en los próximos 30 días.
              </p>
            ) : (
              <div className="space-y-4">
                {birthdaysWeek.length > 0 && (
                  <BirthdayGroup
                    label="Esta semana"
                    birthdays={birthdaysWeek}
                    template={birthdayTemplate}
                  />
                )}
                {birthdaysLater.length > 0 && (
                  <BirthdayGroup
                    label="Próximos 30 días"
                    birthdays={birthdaysLater}
                    template={birthdayTemplate}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-4 w-4 text-rose-600" />
              Aniversarios de afiliación del mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {home.anniversaries.length === 0 ? (
              <p className="py-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
                Ningún afiliado cumple aniversario este mes.
              </p>
            ) : (
              <ul className="space-y-2">
                {home.anniversaries.map((a) => (
                  <li key={a.affiliateId}>
                    <Link
                      href={`/afiliados/${a.affiliateId}`}
                      className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors hover:bg-[hsl(var(--accent))]/50"
                    >
                      <span className="min-w-0 truncate text-sm font-medium">{a.fullName}</span>
                      <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                        {a.years} año{a.years !== 1 ? "s" : ""} afiliado
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recordatorios + actividad reciente ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RemindersCard reminders={home.pendingReminders} />
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-4 w-4" />
              Actividad reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTimeline items={home.recentActivity} />
          </CardContent>
        </Card>
      </div>

      {/* ── Estado operativo (solo conteos y fechas) ── */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Los números de hoy</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            href="/afiliados"
            icon={<Users className="h-5 w-5 text-blue-600" />}
            iconBg="bg-blue-50"
            label="Afiliados activos"
            value={String(home.activeAffiliates)}
            sub={`${home.totalAffiliates} en total`}
          />
          <KpiCard
            href="/afiliados/explorar"
            icon={<UserPlus className="h-5 w-5 text-green-600" />}
            iconBg="bg-green-50"
            label="Altas de este mes"
            value={String(home.newThisMonth)}
            sub="Por fecha de afiliación"
          />
          <KpiCard
            href="/afiliados/explorar?documentationStatus=pending"
            icon={<FileWarning className="h-5 w-5 text-amber-600" />}
            iconBg="bg-amber-50"
            label="Documentación incompleta"
            value={String(docsTotal)}
            sub={docsTotal > 0 ? `${home.docsMissing} faltante · ${home.docsPending} pendiente` : "Todo en orden"}
            alert={home.docsMissing > 0}
          />
          <KpiCard
            href="/exportar"
            icon={<FileDown className="h-5 w-5 text-slate-600" />}
            iconBg="bg-slate-100"
            label="Último envío municipal"
            value={home.lastExport ? formatDate(home.lastExport.createdAt.slice(0, 10)) : "—"}
            sub={
              home.lastExport
                ? home.lastExport.status === "sent"
                  ? "Enviado correctamente"
                  : home.lastExport.status === "failed"
                    ? "Falló el envío"
                    : "Generado, sin enviar"
                : "Todavía no se generó ninguno"
            }
            alert={home.lastExport?.status === "failed"}
          />
        </div>
      </section>

      {/* ── Accesos rápidos ── */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">¿A dónde vas?</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <ModuleCard href="/afiliados" icon={<Users className="h-5 w-5 text-blue-600" />} iconBg="bg-blue-50" label="Afiliados" detail="Fichero del padrón" />
          <ModuleCard href="/beneficios" icon={<Gift className="h-5 w-5 text-purple-600" />} iconBg="bg-purple-50" label="Beneficios" detail="Gestión financiera" />
          <ModuleCard href="/cobranzas" icon={<HandCoins className="h-5 w-5 text-emerald-700" />} iconBg="bg-emerald-50" label="Cobranzas" detail="Cuotas y conciliación" />
          <ModuleCard href="/analisis" icon={<BarChart3 className="h-5 w-5 text-teal-600" />} iconBg="bg-teal-50" label="Análisis" detail="Métricas y reportes" />
          <ModuleCard href="/exportar" icon={<FileDown className="h-5 w-5 text-slate-600" />} iconBg="bg-slate-100" label="Exportar" detail="Archivo municipal" />
        </div>
      </section>
    </div>
  );
}

// ─── Componentes ──────────────────────────────────────────────────────────────

function BirthdayGroup({
  label,
  birthdays,
  template,
}: {
  label: string;
  birthdays: UpcomingBirthday[];
  template: string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
        {label}
      </p>
      <ul className="space-y-2">
        {birthdays.map((b) => {
          const waLink = b.phone
            ? buildWhatsAppLink(b.phone, renderBirthdayMessage(template, b.fullName))
            : null;
          return (
            <li key={b.affiliateId} className="flex items-center gap-3 rounded-lg border px-3 py-2">
              <AffiliateAvatar name={b.fullName} photoUrl={b.photoUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/afiliados/${b.affiliateId}`}
                  className="block truncate text-sm font-medium transition-colors hover:text-[hsl(var(--primary))]"
                >
                  {b.fullName}
                </Link>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {b.daysUntil === 0
                    ? "¡Cumple hoy!"
                    : b.daysUntil === 1
                      ? "Cumple mañana"
                      : `Cumple el ${formatDate(b.nextDate)}`}
                  {b.turnsAge ? ` · ${b.turnsAge} años` : ""}
                </p>
              </div>
              {waLink ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Saludar por WhatsApp desde el número del sindicato"
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Saludar
                </a>
              ) : (
                <span className="shrink-0 text-xs text-[hsl(var(--muted-foreground))]">Sin teléfono</span>
              )}
            </li>
          );
        })}
      </ul>
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
        <p className={`text-xl font-bold ${alert ? "text-red-700" : ""}`}>{value}</p>
        {sub && <p className="text-xs text-[hsl(var(--muted-foreground))]">{sub}</p>}
      </div>
    </Link>
  );
}

function ModuleCard({ href, icon, iconBg, label, detail }: {
  href: string; icon: ReactNode; iconBg: string; label: string; detail: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border bg-[hsl(var(--card))] p-4 transition-all hover:border-[hsl(var(--primary))]/30 hover:shadow-md"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{label}</p>
        <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">{detail}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}
