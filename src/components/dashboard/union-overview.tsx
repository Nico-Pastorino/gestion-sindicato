"use client";

import {
  Users,
  Wallet,
  AlertTriangle,
  Gauge,
  TrendingUp,
  HandCoins,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MetricCard, type MetricTone } from "@/components/dashboard/metric-card";
import { SensitiveValue } from "@/components/privacy/sensitive-value";
import { formatCurrencyARS } from "@/lib/utils/currency";
import type { UnionOverview as UnionOverviewData } from "@/lib/services/dashboard.service";

function complianceTone(score: number | null): MetricTone {
  if (score === null) return "gray";
  if (score >= 85) return "green";
  if (score >= 70) return "yellow";
  return "red";
}

export function UnionOverview({ overview }: { overview: UnionOverviewData }) {
  const o = overview;
  const total = o.totalToCollect || 1;
  const pctCollected = Math.round((o.collected / total) * 100);
  const pctPending = Math.round((o.pending / total) * 100);
  const pctOverdue = Math.max(0, 100 - pctCollected - pctPending);

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
        <MetricCard
          href="/afiliados"
          tone="blue"
          icon={Users}
          title="Afiliados activos"
          value={String(o.totalAffiliates)}
          subtitle={`${o.affiliatesWithActiveBenefit} con beneficio activo`}
        />
        <MetricCard
          href="/cobranzas"
          tone="indigo"
          icon={Wallet}
          title="Falta cobrar (total)"
          value={<SensitiveValue value={formatCurrencyARS(o.outstanding)} />}
          subtitle={
            <>
              de <SensitiveValue value={formatCurrencyARS(o.totalToCollect)} /> en total (capital + interés)
            </>
          }
        />
        <MetricCard
          href="/cobranzas?status=overdue"
          tone="red"
          icon={AlertTriangle}
          title="En mora (vencido)"
          value={<SensitiveValue value={formatCurrencyARS(o.overdue)} />}
          subtitle={`${o.overdueCount} cuota${o.overdueCount !== 1 ? "s" : ""} vencida${o.overdueCount !== 1 ? "s" : ""}`}
          alert={o.overdueCount > 0}
        />
        <MetricCard
          tone={complianceTone(o.complianceScore)}
          icon={Gauge}
          title="Cumplimiento global"
          value={o.complianceScore !== null ? `${o.complianceScore}%` : "—"}
          subtitle="cuotas vencidas cobradas"
        />
      </div>

      {/* Composición de la cartera */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold flex items-center gap-2">
              <HandCoins className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              ¿Cómo viene la cobranza?
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Total a cobrar (capital + interés): <SensitiveValue value={formatCurrencyARS(o.totalToCollect)} />
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
              label="Interés acumulado"
              value={<SensitiveValue value={formatCurrencyARS(o.profitTotal)} />}
            />
            <MiniStat
              icon={<TrendingUp className="h-4 w-4 text-green-600" />}
              label="Interés cobrado"
              value={<SensitiveValue value={formatCurrencyARS(o.profitCollected)} />}
            />
          </div>
        </CardContent>
      </Card>
    </section>
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
