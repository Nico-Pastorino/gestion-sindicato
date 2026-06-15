"use client";

import Link from "next/link";
import {
  Users,
  Wallet,
  AlertTriangle,
  Gauge,
  TrendingUp,
  HandCoins,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SensitiveValue } from "@/components/privacy/sensitive-value";
import { formatCurrencyARS } from "@/lib/utils/currency";
import type { UnionOverview as UnionOverviewData } from "@/lib/services/dashboard.service";

function complianceColor(score: number | null) {
  if (score === null) return { text: "text-gray-500", bar: "bg-gray-300", bg: "bg-gray-50" };
  if (score >= 95) return { text: "text-green-700", bar: "bg-green-500", bg: "bg-green-50" };
  if (score >= 85) return { text: "text-emerald-700", bar: "bg-emerald-500", bg: "bg-emerald-50" };
  if (score >= 70) return { text: "text-yellow-700", bar: "bg-yellow-500", bg: "bg-yellow-50" };
  return { text: "text-red-700", bar: "bg-red-500", bg: "bg-red-50" };
}

export function UnionOverview({ overview }: { overview: UnionOverviewData }) {
  const o = overview;
  const total = o.totalToCollect || 1;
  const pctCollected = Math.round((o.collected / total) * 100);
  const pctPending = Math.round((o.pending / total) * 100);
  const pctOverdue = Math.max(0, 100 - pctCollected - pctPending);
  const comp = complianceColor(o.complianceScore);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">
          Estado general del sindicato
        </h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          Foto completa de la cartera, al día de hoy (no depende del mes seleccionado).
        </p>
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HeroCard
          href="/afiliados"
          icon={<Users className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50"
          label="Afiliados activos"
          value={String(o.totalAffiliates)}
          sub={`${o.affiliatesWithActiveBenefit} con beneficio activo`}
        />
        <HeroCard
          href="/cobranzas"
          icon={<Wallet className="h-5 w-5 text-indigo-600" />}
          iconBg="bg-indigo-50"
          label="Capital en la calle"
          value={<SensitiveValue value={formatCurrencyARS(o.outstanding)} />}
          subNode={
            <>
              de <SensitiveValue value={formatCurrencyARS(o.totalToCollect)} /> a cobrar
            </>
          }
        />
        <HeroCard
          href="/cobranzas?status=overdue"
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          iconBg="bg-red-50"
          label="En mora (vencido)"
          value={<SensitiveValue value={formatCurrencyARS(o.overdue)} />}
          sub={`${o.overdueCount} cuota${o.overdueCount !== 1 ? "s" : ""} vencida${o.overdueCount !== 1 ? "s" : ""}`}
          alert={o.overdueCount > 0}
        />
        <div className={`rounded-xl border p-4 ${comp.bg}`}>
          <div className="flex items-start justify-between">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-white/70`}>
              <Gauge className={`h-5 w-5 ${comp.text}`} />
            </div>
            <span className={`text-2xl font-bold ${comp.text}`}>
              {o.complianceScore !== null ? `${o.complianceScore}%` : "—"}
            </span>
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
            Cumplimiento global
          </p>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/70">
            <div className={`h-full rounded-full ${comp.bar}`} style={{ width: `${o.complianceScore ?? 0}%` }} />
          </div>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">cuotas vencidas cobradas</p>
        </div>
      </div>

      {/* Composición de la cartera */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold flex items-center gap-2">
              <HandCoins className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              Composición de la cartera
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Total a cobrar: <SensitiveValue value={formatCurrencyARS(o.totalToCollect)} />
            </p>
          </div>

          {/* Barra apilada */}
          <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]">
            <div className="h-full bg-green-500" style={{ width: `${pctCollected}%` }} title="Cobrado" />
            <div className="h-full bg-yellow-400" style={{ width: `${pctPending}%` }} title="Pendiente" />
            <div className="h-full bg-red-500" style={{ width: `${pctOverdue}%` }} title="Vencido" />
          </div>

          {/* Leyenda */}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Legend color="bg-green-500" label="Cobrado" value={<SensitiveValue value={formatCurrencyARS(o.collected)} />} pct={pctCollected} />
            <Legend color="bg-yellow-400" label="Pendiente" value={<SensitiveValue value={formatCurrencyARS(o.pending)} />} pct={pctPending} />
            <Legend color="bg-red-500" label="Vencido" value={<SensitiveValue value={formatCurrencyARS(o.overdue)} />} pct={pctOverdue} />
          </div>

          {/* Ganancia acumulada + capital */}
          <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 sm:grid-cols-3">
            <MiniStat
              icon={<HandCoins className="h-4 w-4 text-slate-500" />}
              label="Capital prestado (histórico)"
              value={<SensitiveValue value={formatCurrencyARS(o.capitalLent)} />}
            />
            <MiniStat
              icon={<TrendingUp className="h-4 w-4 text-orange-500" />}
              label="Ganancia acumulada"
              value={<SensitiveValue value={formatCurrencyARS(o.profitTotal)} />}
            />
            <MiniStat
              icon={<TrendingUp className="h-4 w-4 text-green-600" />}
              label="Ganancia cobrada"
              value={<SensitiveValue value={formatCurrencyARS(o.profitCollected)} />}
            />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function HeroCard({
  href, icon, iconBg, label, value, sub, subNode, alert = false,
}: {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: React.ReactNode;
  sub?: string;
  subNode?: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group block rounded-xl border bg-[hsl(var(--card))] p-4 transition-all hover:shadow-md hover:border-[hsl(var(--primary))]/30 ${alert ? "border-red-200 bg-red-50/40" : ""}`}
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className={`mt-0.5 text-2xl font-bold ${alert ? "text-red-700" : ""}`}>{value}</p>
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{subNode ?? sub}</p>
    </Link>
  );
}

function Legend({ color, label, value, pct }: { color: string; label: string; value: React.ReactNode; pct: number }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-1.5">
        <span className={`h-2.5 w-2.5 rounded-sm ${color}`} />
        <span className="text-xs text-[hsl(var(--muted-foreground))]">{label}</span>
      </div>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
      <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{pct}%</p>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--muted))]">{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-[11px] text-[hsl(var(--muted-foreground))]">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
