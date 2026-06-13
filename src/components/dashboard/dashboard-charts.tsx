"use client";

import { PieChart as PieChartIcon, BarChart3, Store } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePrivacy } from "@/contexts/privacy-context";
import { formatCurrencyARS } from "@/lib/utils/currency";
import { getBenefitTypeLabel } from "@/lib/utils/benefit-types";
import type {
  DashboardBreakdowns,
  MonthlyHistoryRow,
} from "@/lib/services/dashboard.service";

const TYPE_COLORS: Record<string, string> = {
  ayuda_economica: "#2563eb",
  supermercado: "#9333ea",
  otro: "#64748b",
};

const COMMERCE_COLORS = ["#2563eb", "#9333ea", "#0d9488", "#ea580c", "#ca8a04", "#64748b"];

interface DashboardChartsProps {
  breakdowns: DashboardBreakdowns;
  history: MonthlyHistoryRow[];
}

export function DashboardCharts({ breakdowns, history }: DashboardChartsProps) {
  const { hidden } = usePrivacy();

  const fmtAmount = (value: number) =>
    hidden ? "••••••" : formatCurrencyARS(value);

  const totalByType = breakdowns.byType.reduce((sum, s) => sum + s.totalAmount, 0);

  const typeData = breakdowns.byType.map((s) => ({
    name: getBenefitTypeLabel(s.type as "ayuda_economica" | "supermercado" | "otro"),
    rawType: s.type,
    value: s.totalAmount,
    count: s.count,
    percent: totalByType > 0 ? Math.round((s.totalAmount / totalByType) * 100) : 0,
  }));

  const commerceData = breakdowns.byCommerce.map((s) => ({
    name: s.commerce,
    value: s.totalAmount,
    count: s.count,
  }));

  // Historial llega de más reciente a más antiguo; el gráfico va cronológico
  const evolutionData = [...history].reverse().map((row) => ({
    name: row.monthLabel.split(" ")[0]?.slice(0, 3) ?? row.month,
    fullLabel: row.monthLabel,
    Entregado: row.capitalDelivered,
    Cobrado: row.paidAmount,
    Ganancia: row.estimatedProfit,
  }));

  const hasTypeData = typeData.length > 0;
  const hasCommerceData = commerceData.length > 0;

  return (
    <section>
      <h2 className="text-base font-semibold mb-3">Análisis visual</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Torta: qué se llevan más */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-blue-600" />
              ¿Qué se otorga más?
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasTypeData ? (
              <EmptyChart />
            ) : (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        strokeWidth={2}
                        isAnimationActive={false}
                      >
                        {typeData.map((entry) => (
                          <Cell
                            key={entry.rawType}
                            fill={TYPE_COLORS[entry.rawType] ?? "#64748b"}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, _name, item) => [
                          `${fmtAmount(Number(value))} · ${item?.payload?.count} beneficio${item?.payload?.count !== 1 ? "s" : ""}`,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-1.5">
                  {typeData.map((entry) => (
                    <div key={entry.rawType} className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: TYPE_COLORS[entry.rawType] ?? "#64748b" }}
                      />
                      <span className="flex-1 truncate">{entry.name}</span>
                      <span className="font-semibold">{entry.percent}%</span>
                      <span className="text-[hsl(var(--muted-foreground))] w-20 text-right">
                        {fmtAmount(entry.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Barras horizontales: top comercios */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Store className="h-4 w-4 text-purple-600" />
              Top comercios del período
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasCommerceData ? (
              <EmptyChart />
            ) : (
              <div className="space-y-2.5 pt-1">
                {commerceData.map((entry, i) => {
                  const max = commerceData[0]?.value || 1;
                  const width = Math.max(4, Math.round((entry.value / max) * 100));
                  return (
                    <div key={entry.name} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate font-medium">{entry.name}</span>
                        <span className="text-[hsl(var(--muted-foreground))] shrink-0">
                          {fmtAmount(entry.value)} · {entry.count}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[hsl(var(--muted))]">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${width}%`,
                            backgroundColor: COMMERCE_COLORS[i % COMMERCE_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Barras: evolución 6 meses */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-teal-600" />
              Evolución (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolutionData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220 13% 90%)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    className="capitalize"
                  />
                  <YAxis
                    tick={hidden ? false : { fontSize: 10 }}
                    tickFormatter={(v: number) =>
                      v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${Math.round(v / 1_000)}K` : String(v)
                    }
                    tickLine={false}
                    axisLine={false}
                    width={hidden ? 8 : 40}
                  />
                  <Tooltip
                    formatter={(value) => fmtAmount(Number(value))}
                    labelFormatter={(_label, payload) =>
                      payload?.[0]?.payload?.fullLabel ?? _label
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Entregado" fill="#2563eb" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="Cobrado" fill="#16a34a" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-48 items-center justify-center text-center">
      <p className="text-xs text-[hsl(var(--muted-foreground))]">
        Sin beneficios en este período.
      </p>
    </div>
  );
}
