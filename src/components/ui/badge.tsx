import * as React from "react";
import { cn } from "@/lib/utils/cn";
import type { BenefitStatus, BenefitType, InstallmentStatus, AffiliateStatus } from "@/types";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "outline" && "border border-current bg-transparent",
        className
      )}
      {...props}
    />
  );
}

// ─── Badges de estado especializados ─────────────────────────────────────────

const BENEFIT_STATUS_MAP: Record<BenefitStatus, { label: string; className: string }> = {
  active:    { label: "Activo",      className: "badge-active" },
  cancelled: { label: "Cancelado",   className: "badge-cancelled" },
  finished:  { label: "Finalizado",  className: "badge-finished" },
};

const INSTALLMENT_STATUS_MAP: Record<InstallmentStatus, { label: string; className: string }> = {
  pending:   { label: "Pendiente",   className: "badge-pending" },
  paid:      { label: "Pagada",      className: "badge-paid" },
  overdue:   { label: "Vencida",     className: "badge-overdue" },
  cancelled: { label: "Cancelada",   className: "badge-cancelled" },
};

const AFFILIATE_STATUS_MAP: Record<AffiliateStatus, { label: string; className: string }> = {
  active:   { label: "Activo",   className: "badge-active" },
  inactive: { label: "Inactivo", className: "badge-inactive" },
};

const BENEFIT_TYPE_MAP: Record<BenefitType, { label: string; className: string }> = {
  ayuda_economica: { label: "Ayuda Económica", className: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" },
  supermercado:    { label: "COMERCIO",        className: "bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-600/20 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" },
  otro:            { label: "Otro",            className: "bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" },
};

export function BenefitStatusBadge({ status }: { status: BenefitStatus }) {
  const { label, className } = BENEFIT_STATUS_MAP[status] ?? { label: status, className: "badge-cancelled" };
  return <span className={className}>{label}</span>;
}

export function InstallmentStatusBadge({ status }: { status: InstallmentStatus }) {
  const { label, className } = INSTALLMENT_STATUS_MAP[status] ?? { label: status, className: "badge-cancelled" };
  return <span className={className}>{label}</span>;
}

export function AffiliateStatusBadge({ status }: { status: AffiliateStatus }) {
  const { label, className } = AFFILIATE_STATUS_MAP[status] ?? { label: status, className: "badge-inactive" };
  return <span className={className}>{label}</span>;
}

export function BenefitTypeBadge({ type }: { type: BenefitType }) {
  const { label, className } = BENEFIT_TYPE_MAP[type] ?? { label: type, className: "" };
  return <span className={className}>{label}</span>;
}
