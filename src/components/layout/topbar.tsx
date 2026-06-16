"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Menu, Eye, EyeOff, LogOut, Loader2, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePrivacy } from "@/contexts/privacy-context";
import { SensitiveText } from "@/components/privacy/sensitive-value";

interface SearchResult {
  affiliateId: string;
  fullName: string;
  dni: string;
  legajo: string | null;
  area: string | null;
}

interface TopbarProps {
  onMenuToggle?: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const router = useRouter();
  const { hidden, toggleHidden } = usePrivacy();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);

  // Búsqueda en vivo con debounce
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/affiliates?search=${encodeURIComponent(q)}&limit=8`,
          { signal: ctrl.signal }
        );
        if (!res.ok) return;
        const json = await res.json();
        setResults((json.data ?? []) as SearchResult[]);
        setOpen(true);
        setActiveIndex(-1);
      } catch {
        /* abortado o error de red: ignoramos */
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  // Cerrar al clickear afuera
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setOpen(false);
    }
  }

  function goToAffiliate(id: string) {
    setOpen(false);
    setQuery("");
    router.push(`/afiliados/${id}`);
  }

  function goToFullResults() {
    const q = query.trim();
    setOpen(false);
    router.push(q ? `/afiliados?search=${encodeURIComponent(q)}` : "/afiliados");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (open && activeIndex >= 0 && results[activeIndex]) {
      goToAffiliate(results[activeIndex].affiliateId);
    } else {
      goToFullResults();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-white px-4 sm:px-6">
      {/* Mobile menu toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuToggle}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Abrir menú</span>
      </Button>

      {/* Búsqueda de afiliados con desplegable en vivo */}
      <div ref={containerRef} className="relative flex-1 max-w-md">
        <form onSubmit={handleSubmit}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <Input
            name="q"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar afiliado por nombre, DNI o legajo…"
            className="pl-9 pr-9 h-9 text-sm bg-[hsl(var(--muted))] border-transparent"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[hsl(var(--muted-foreground))]" />
          )}
        </form>

        {/* Desplegable de resultados */}
        {open && query.trim().length >= 2 && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border bg-white shadow-lg">
            {results.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                {loading ? "Buscando…" : "Sin resultados."}
              </div>
            ) : (
              <ul className="max-h-80 overflow-y-auto py-1">
                {results.map((r, i) => (
                  <li key={r.affiliateId}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => goToAffiliate(r.affiliateId)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                        i === activeIndex ? "bg-[hsl(var(--accent))]" : "hover:bg-[hsl(var(--accent))]"
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <User className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{r.fullName}</span>
                        <span className="block truncate text-xs text-[hsl(var(--muted-foreground))]">
                          <SensitiveText value={r.dni} type="dni" prefix="DNI " />
                          {r.legajo ? ` · Leg. ${r.legajo}` : ""}
                          {r.area ? ` · ${r.area}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={goToFullResults}
              className="flex w-full items-center justify-between border-t px-3 py-2 text-xs font-medium text-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))]"
            >
              <span>Ver todos los resultados de «{query.trim()}»</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Modo privacidad: oculta montos para mostrar la app sin exponer datos */}
      <Button
        variant={hidden ? "default" : "ghost"}
        size="icon"
        onClick={toggleHidden}
        title={hidden ? "Mostrar los importes" : "Ocultar los importes"}
      >
        {hidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        <span className="sr-only">
          {hidden ? "Mostrar montos" : "Ocultar montos"}
        </span>
      </Button>

      {/* Salir (borra la cookie de acceso) */}
      <Button variant="ghost" size="sm" onClick={handleExit} title="Salir">
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Salir</span>
      </Button>
    </header>
  );

  async function handleExit() {
    await fetch("/api/unlock", { method: "DELETE" }).catch(() => {});
    router.push("/unlock");
    router.refresh();
  }
}
