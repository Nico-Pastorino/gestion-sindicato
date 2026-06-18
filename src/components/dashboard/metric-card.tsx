import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export type MetricTone =
  | "blue"
  | "indigo"
  | "red"
  | "green"
  | "yellow"
  | "purple"
  | "teal"
  | "orange"
  | "gray";

// tone → ícono tintado (fondo + color), tomado del UI kit del sindicato
const TONE: Record<MetricTone, { bg: string; fg: string }> = {
  blue: { bg: "bg-blue-50", fg: "text-blue-600" },
  indigo: { bg: "bg-indigo-50", fg: "text-indigo-600" },
  red: { bg: "bg-red-50", fg: "text-red-600" },
  green: { bg: "bg-green-50", fg: "text-green-700" },
  yellow: { bg: "bg-yellow-50", fg: "text-yellow-700" },
  purple: { bg: "bg-purple-50", fg: "text-purple-600" },
  teal: { bg: "bg-teal-50", fg: "text-teal-600" },
  orange: { bg: "bg-orange-50", fg: "text-orange-600" },
  gray: { bg: "bg-gray-50", fg: "text-gray-500" },
};

interface MetricCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon: LucideIcon;
  tone?: MetricTone;
  /** Si se pasa, toda la tarjeta es un link. */
  href?: string;
  /** Resalta en rojo (p. ej. hay mora). */
  alert?: boolean;
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "blue",
  href,
  alert = false,
  className,
}: MetricCardProps) {
  const t = TONE[tone];

  const card = (
    <Card
      className={cn(
        "h-full transition-all",
        href ? "hover:shadow-md hover:border-[hsl(var(--primary))]/30" : "hover:shadow-md",
        alert && "border-red-200 bg-red-50/40",
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
              {title}
            </p>
            <p
              className={cn(
                "text-2xl font-bold",
                alert ? "text-red-700" : "text-[hsl(var(--foreground))]"
              )}
            >
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{subtitle}</p>
            )}
          </div>
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
              t.bg
            )}
          >
            <Icon className={cn("h-6 w-6", t.fg)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    );
  }
  return card;
}
