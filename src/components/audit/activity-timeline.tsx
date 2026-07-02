import {
  Activity,
  CheckCircle2,
  DollarSign,
  FileDown,
  Gift,
  Pencil,
  Plus,
  RotateCcw,
  Shield,
  XCircle,
} from "lucide-react";
import {
  auditActionLabel,
  auditDetail,
  auditEntityLabel,
  type AuditLogRow,
} from "@/lib/utils/audit-labels";

function iconFor(action: string) {
  if (action.endsWith("_created")) return action.startsWith("benefit") ? Gift : Plus;
  if (action.endsWith("_updated")) return Pencil;
  if (action.endsWith("_cancelled") || action === "user_deleted") return XCircle;
  if (action === "installment_paid" || action === "installment_auto_paid") return CheckCircle2;
  if (action === "installment_unpaid") return RotateCcw;
  if (action === "salary_updated") return DollarSign;
  if (action === "export_generated") return FileDown;
  if (action.startsWith("user_") || action === "override_credit_limit") return Shield;
  return Activity;
}

function colorFor(action: string): { bg: string; text: string } {
  if (action === "installment_unpaid" || action.endsWith("_cancelled") || action === "user_deleted") {
    return { bg: "bg-orange-50", text: "text-orange-600" };
  }
  if (action === "installment_paid" || action === "installment_auto_paid" || action.endsWith("_created")) {
    return { bg: "bg-green-50", text: "text-green-600" };
  }
  if (action === "salary_updated" || action === "override_credit_limit") {
    return { bg: "bg-blue-50", text: "text-blue-600" };
  }
  return { bg: "bg-slate-100", text: "text-slate-600" };
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityTimeline({ items }: { items: AuditLogRow[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <Activity className="h-8 w-8 text-[hsl(var(--muted-foreground))] opacity-40" />
        <p className="text-sm font-medium">Sin actividad registrada todavía.</p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-4">
      {items.map((item, index) => {
        const Icon = iconFor(item.action);
        const color = colorFor(item.action);
        const detail = auditDetail(item);
        const isLast = index === items.length - 1;

        return (
          <li key={item.id} className="relative flex gap-3">
            {!isLast && (
              <span
                className="absolute bottom-[-16px] left-[15px] top-8 w-px bg-[hsl(var(--border))]"
                aria-hidden
              />
            )}
            <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color.bg}`}>
              <Icon className={`h-4 w-4 ${color.text}`} />
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium">{auditActionLabel(item.action)}</p>
                <time className="text-xs text-[hsl(var(--muted-foreground))]">
                  {formatDateTime(item.createdAt)}
                </time>
              </div>
              <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                {auditEntityLabel(item.entityType)}
                {item.userName ? ` · ${item.userName}` : " · Sistema"}
                {detail ? ` · ${detail}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
