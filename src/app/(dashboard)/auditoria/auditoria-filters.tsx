"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from "@/lib/utils/audit-labels";

export function AuditoriaFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const action = searchParams.get("action") ?? "";
  const entityType = searchParams.get("entityType") ?? "";

  function pushFilters(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    router.push(`/auditoria?${params.toString()}`);
  }

  const selectClass =
    "rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1.5 text-sm font-medium h-9";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={entityType}
        onChange={(e) => pushFilters({ entityType: e.target.value })}
        className={selectClass}
      >
        <option value="">Todas las entidades</option>
        {Object.entries(AUDIT_ENTITY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      <select
        value={action}
        onChange={(e) => pushFilters({ action: e.target.value })}
        className={selectClass}
      >
        <option value="">Todas las acciones</option>
        {Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      {(action || entityType) && (
        <Button variant="ghost" size="sm" onClick={() => router.push("/auditoria")}>
          <X className="h-3.5 w-3.5" />
          Limpiar
        </Button>
      )}
    </div>
  );
}
