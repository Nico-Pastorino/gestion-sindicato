import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/credit";

interface CreditBarProps {
  grossSalary: string | number;
  creditLimit30: string | number;
  activeDiscounts: string | number;
  availableAmount: string | number;
  className?: string;
  showLabels?: boolean;
}

export function CreditBar({
  creditLimit30,
  activeDiscounts,
  availableAmount,
  className,
  showLabels = true,
}: CreditBarProps) {
  const limit = Number(creditLimit30);
  const used = Number(activeDiscounts);
  const available = Number(availableAmount);

  const usedPercent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isLow = usedPercent >= 80;
  const isEmpty = available <= 0;

  return (
    <div className={cn("space-y-2", className)}>
      {showLabels && (
        <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
          <span>Usado: {formatCurrency(used)}</span>
          <span>Tope 30%: {formatCurrency(limit)}</span>
        </div>
      )}
      <div className="h-2.5 w-full rounded-full bg-[hsl(var(--muted))]">
        <div
          className={cn(
            "h-2.5 rounded-full transition-all duration-300",
            isEmpty ? "bg-red-500" : isLow ? "bg-yellow-500" : "bg-blue-500"
          )}
          style={{ width: `${usedPercent}%` }}
        />
      </div>
      {showLabels && (
        <p
          className={cn(
            "text-xs font-medium",
            isEmpty ? "text-red-600" : isLow ? "text-yellow-600" : "text-green-600"
          )}
        >
          Disponible: {formatCurrency(available)}
        </p>
      )}
    </div>
  );
}
