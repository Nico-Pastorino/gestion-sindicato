"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, FileDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface FilterOptions {
  areas: string[];
  sectors: string[];
  cities: string[];
  provinces: string[];
}

interface Filters {
  search: string;
  area: string;
  sector: string;
  city: string;
  neighborhood: string;
  province: string;
  employmentType: string;
  status: string;
  documentationStatus: string;
  hasSalary: string;
}

const FILTER_KEYS: (keyof Filters)[] = [
  "search", "area", "sector", "city", "neighborhood",
  "province", "employmentType", "status", "documentationStatus", "hasSalary",
];

export function ExplorarClient({
  options,
  filters,
  total,
}: {
  options: FilterOptions;
  filters: Filters;
  total: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(filters.search);

  function pushFilters(next: Partial<Filters>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    router.push(`/afiliados/explorar?${params.toString()}`);
  }

  const hasFilters = FILTER_KEYS.some((k) => filters[k]);

  // Query string para el endpoint de exportación (mismos filtros, sin page/limit).
  const exportParams = new URLSearchParams();
  for (const k of FILTER_KEYS) {
    if (filters[k]) exportParams.set(k, filters[k]);
  }
  const exportHref = `/api/affiliates/export${exportParams.toString() ? `?${exportParams.toString()}` : ""}`;

  const selectClass =
    "rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1.5 text-sm font-medium h-9";

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Búsqueda + exportar */}
        <div className="flex flex-wrap items-center gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              pushFilters({ search: search.trim() });
            }}
            className="relative flex-1 min-w-[220px] max-w-sm"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, DNI, legajo o CUIL…"
              className="pl-9 h-9 text-sm"
            />
          </form>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">
              {total} afiliado{total !== 1 ? "s" : ""}
            </span>
            <Button asChild disabled={total === 0}>
              <a href={exportHref} aria-disabled={total === 0}>
                <FileDown className="h-4 w-4" />
                Exportar Excel
              </a>
            </Button>
          </div>
        </div>

        {/* Selects de filtros */}
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            value={filters.area}
            onChange={(v) => pushFilters({ area: v })}
            placeholder="Área"
            options={options.areas}
            className={selectClass}
          />
          <FilterSelect
            value={filters.sector}
            onChange={(v) => pushFilters({ sector: v })}
            placeholder="Sector"
            options={options.sectors}
            className={selectClass}
          />
          <FilterSelect
            value={filters.city}
            onChange={(v) => pushFilters({ city: v })}
            placeholder="Localidad"
            options={options.cities}
            className={selectClass}
          />
          <FilterSelect
            value={filters.province}
            onChange={(v) => pushFilters({ province: v })}
            placeholder="Provincia"
            options={options.provinces}
            className={selectClass}
          />

          <select
            value={filters.employmentType}
            onChange={(e) => pushFilters({ employmentType: e.target.value })}
            className={selectClass}
          >
            <option value="">Vínculo (todos)</option>
            <option value="planta_permanente">Planta permanente</option>
            <option value="planta_temporaria">Planta temporaria</option>
            <option value="jubilado">Jubilado</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => pushFilters({ status: e.target.value })}
            className={selectClass}
          >
            <option value="">Estado (todos)</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>

          <select
            value={filters.documentationStatus}
            onChange={(e) => pushFilters({ documentationStatus: e.target.value })}
            className={selectClass}
          >
            <option value="">Documentación (toda)</option>
            <option value="complete">Completa</option>
            <option value="pending">Pendiente</option>
            <option value="missing">Faltante</option>
          </select>

          <select
            value={filters.hasSalary}
            onChange={(e) => pushFilters({ hasSalary: e.target.value })}
            className={selectClass}
          >
            <option value="">Salario (todos)</option>
            <option value="yes">Con salario</option>
            <option value="no">Sin salario</option>
          </select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                router.push("/afiliados/explorar");
              }}
            >
              <X className="h-3.5 w-3.5" />
              Limpiar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
  className: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      <option value="">{placeholder} (todos)</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}
