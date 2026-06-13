"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { usePrivacy } from "@/contexts/privacy-context";
import { formatCurrencyARS } from "@/lib/utils/currency";

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
  /** Dato secundario opcional (ej: cantidad de cuotas) */
  count?: number;
}

interface SimpleDonutProps {
  data: DonutSlice[];
  /** Alto del gráfico en px (default 160) */
  height?: number;
  /** Si los valores son montos, se enmascaran en modo privacidad */
  isCurrency?: boolean;
}

/**
 * Donut compacto con leyenda de porcentajes.
 * Respeta el modo privacidad cuando los valores son montos.
 */
export function SimpleDonut({ data, height = 160, isCurrency = true }: SimpleDonutProps) {
  const { hidden } = usePrivacy();

  const visible = data.filter((d) => d.value > 0);
  const total = visible.reduce((sum, d) => sum + d.value, 0);

  if (visible.length === 0 || total === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-[hsl(var(--muted-foreground))]"
        style={{ height }}
      >
        Sin datos para graficar.
      </div>
    );
  }

  const fmt = (value: number) =>
    isCurrency
      ? hidden
        ? "••••••"
        : formatCurrencyARS(value)
      : String(value);

  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={visible}
              dataKey="value"
              nameKey="name"
              innerRadius="55%"
              outerRadius="90%"
              paddingAngle={3}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {visible.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => {
                const count = item?.payload?.count;
                const base = fmt(Number(value));
                return [count != null ? `${base} · ${count}` : base];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 space-y-1.5">
        {visible.map((entry) => {
          const percent = Math.round((entry.value / total) * 100);
          return (
            <div key={entry.name} className="flex items-center gap-2 text-xs">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="flex-1 truncate">{entry.name}</span>
              <span className="font-semibold">{percent}%</span>
              <span className="text-[hsl(var(--muted-foreground))] w-24 text-right">
                {fmt(entry.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
