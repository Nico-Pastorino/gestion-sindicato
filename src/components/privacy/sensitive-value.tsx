"use client";

import { usePrivacy } from "@/contexts/privacy-context";

interface SensitiveValueProps {
  value: React.ReactNode;
  mask?: React.ReactNode;
  className?: string;
}

export function SensitiveValue({ value, mask = "••••••", className }: SensitiveValueProps) {
  const { hidden } = usePrivacy();
  return <span className={className}>{hidden ? mask : value}</span>;
}

export function SensitiveText({
  value,
  type = "text",
  prefix = "",
}: {
  value: string | null | undefined;
  type?: "dni" | "phone" | "email" | "text";
  prefix?: string;
}) {
  const { hidden } = usePrivacy();
  if (!value) return <span>—</span>;
  if (!hidden) return <span>{prefix}{value}</span>;

  if (type === "dni") {
    return <span>{prefix}****{value.slice(-3)}</span>;
  }
  if (type === "phone") {
    return <span>{prefix}••••{value.slice(-3)}</span>;
  }
  if (type === "email") {
    const [name, domain] = value.split("@");
    return <span>{prefix}{name?.slice(0, 2) || "••"}••@{domain || "••"}</span>;
  }
  return <span>{prefix}••••••</span>;
}
