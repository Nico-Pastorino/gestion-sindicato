"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

export function CobranzasFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const status = searchParams.get("status") ?? "unpaid";
  const month = searchParams.get("month") ?? "";
  const year = searchParams.get("year") ?? "";

  const now = new Date();
  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - 2 + i);

  function pushFilters(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    router.push(`/cobranzas?${params.toString()}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    pushFilters({ search: search.trim() });
  }

  const hasFilters = Boolean(searchParams.get("search") || month || year || (status !== "unpaid"));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[220px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, DNI o legajo…"
          className="pl-9 h-9 text-sm"
        />
      </form>

      <select
        value={status}
        onChange={(e) => pushFilters({ status: e.target.value })}
        className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1.5 text-sm font-medium h-9"
      >
        <option value="unpaid">Todas las no cobradas</option>
        <option value="overdue">Solo vencidas</option>
        <option value="pending">Solo pendientes</option>
      </select>

      <select
        value={month}
        onChange={(e) => {
          const m = e.target.value;
          pushFilters({ month: m, year: m ? (year || String(now.getFullYear())) : year });
        }}
        className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1.5 text-sm font-medium h-9"
      >
        <option value="">Todos los vencimientos</option>
        {MONTHS.map((name, i) => (
          <option key={i + 1} value={i + 1}>{name}</option>
        ))}
      </select>

      {month && (
        <select
          value={year || String(now.getFullYear())}
          onChange={(e) => pushFilters({ year: e.target.value })}
          className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1.5 text-sm font-medium h-9"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      )}

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearch("");
            router.push("/cobranzas");
          }}
        >
          <X className="h-3.5 w-3.5" />
          Limpiar
        </Button>
      )}
    </div>
  );
}
