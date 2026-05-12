import { cn } from "@/lib/utils/cn";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-blue-600",
  trend,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
              {title}
            </p>
            <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{subtitle}</p>
            )}
            {trend && (
              <p
                className={cn(
                  "text-xs font-medium",
                  trend.positive ? "text-green-600" : "text-red-600"
                )}
              >
                {trend.positive ? "+" : ""}
                {trend.value}% {trend.label}
              </p>
            )}
          </div>
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl",
              iconColor.includes("blue") && "bg-blue-50",
              iconColor.includes("green") && "bg-green-50",
              iconColor.includes("yellow") && "bg-yellow-50",
              iconColor.includes("red") && "bg-red-50",
              iconColor.includes("purple") && "bg-purple-50",
              iconColor.includes("gray") && "bg-gray-50"
            )}
          >
            <Icon className={cn("h-6 w-6", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
