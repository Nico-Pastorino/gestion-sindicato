"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface AffiliateSearchProps {
  areas?: string[];
}

export function AffiliateSearch({ areas = [] }: AffiliateSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [area, setArea] = useState(searchParams.get("area") ?? "");

  // Debounce de búsqueda por texto
  useEffect(() => {
    const timer = setTimeout(() => {
      applyFilters(search, status, area);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function applyFilters(s: string, st: string, a: string) {
    startTransition(() => {
      const params = new URLSearchParams();
      if (s.trim()) params.set("search", s.trim());
      if (st && st !== "_all") params.set("status", st);
      if (a && a !== "_all") params.set("area", a);
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleStatusChange(val: string) {
    setStatus(val);
    applyFilters(search, val, area);
  }

  function handleAreaChange(val: string) {
    setArea(val);
    applyFilters(search, status, val);
  }

  function clearFilters() {
    setSearch("");
    setStatus("");
    setArea("");
    router.push(pathname);
  }

  const hasFilters = search || (status && status !== "_all") || (area && area !== "_all");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Buscador */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        <Input
          placeholder="Buscar por nombre, DNI o legajo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filtro estado */}
      <Select value={status || "_all"} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos</SelectItem>
          <SelectItem value="active">Activos</SelectItem>
          <SelectItem value="inactive">Inactivos</SelectItem>
        </SelectContent>
      </Select>

      {/* Filtro área */}
      {areas.length > 0 && (
        <Select value={area || "_all"} onValueChange={handleAreaChange}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas las áreas</SelectItem>
            {areas.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Limpiar filtros */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
          <X className="h-4 w-4" />
          Limpiar
        </Button>
      )}
    </div>
  );
}
