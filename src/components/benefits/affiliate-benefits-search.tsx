"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { formatCurrencyARS } from "@/lib/utils/currency";
import { Loader2, Search } from "lucide-react";
import type { AffiliateCreditSummary } from "@/types";

/**
 * Buscador de afiliados dentro del módulo Beneficios.
 * Al elegir un afiliado navega a su situación de beneficios
 * (cupo del 30%, cuotas y historial).
 */
export function AffiliateBenefitsSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AffiliateCreditSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/affiliates?search=${encodeURIComponent(q.trim())}&limit=8`);
      if (!res.ok) return;
      const json = await res.json();
      setResults(json.data ?? []);
      setOpen(true);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 350);
    return () => clearTimeout(t);
  }, [query, search]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function select(a: AffiliateCreditSummary) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(`/beneficios/afiliado/${a.affiliateId}`);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Buscar afiliado por nombre, DNI o legajo…"
          className="pl-9"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[hsl(var(--muted-foreground))]" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-md border bg-[hsl(var(--card))] shadow-lg">
          {results.map((a) => (
            <button
              key={a.affiliateId}
              type="button"
              className="flex w-full items-center justify-between border-b px-4 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-[hsl(var(--accent))]"
              onClick={() => select(a)}
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{a.fullName}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  DNI {a.dni}
                  {a.legajo ? ` · Legajo ${a.legajo}` : ""}
                  {a.area ? ` · ${a.area}` : ""}
                </p>
              </div>
              <div className="ml-4 shrink-0 text-right">
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Cupo disponible</p>
                <p className={`text-sm font-semibold ${a.availableAmount == null ? "text-[hsl(var(--muted-foreground))]" : Number(a.availableAmount) <= 0 ? "text-red-600" : "text-green-600"}`}>
                  {a.availableAmount == null ? "Sin sueldo" : formatCurrencyARS(a.availableAmount)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && !isSearching && query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-md border bg-[hsl(var(--card))] px-4 py-3 text-sm text-[hsl(var(--muted-foreground))] shadow-lg">
          No se encontraron afiliados con “{query.trim()}”.
        </div>
      )}
    </div>
  );
}
