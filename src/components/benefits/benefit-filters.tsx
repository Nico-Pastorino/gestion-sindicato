"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BenefitFiltersProps {
  currentType?: string;
  currentStatus?: string;
}

export function BenefitFilters({ currentType, currentStatus }: BenefitFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  function update(key: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== "_all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={currentType ?? "_all"}
        onValueChange={(v) => update("type", v)}
      >
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Tipo de beneficio" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos los tipos</SelectItem>
          <SelectItem value="ayuda_economica">Ayuda Económica</SelectItem>
          <SelectItem value="supermercado">Supermercado</SelectItem>
          <SelectItem value="otro">Otro</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={currentStatus ?? "_all"}
        onValueChange={(v) => update("status", v)}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos los estados</SelectItem>
          <SelectItem value="active">Activos</SelectItem>
          <SelectItem value="finished">Finalizados</SelectItem>
          <SelectItem value="cancelled">Cancelados</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
