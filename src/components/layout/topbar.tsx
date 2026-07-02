"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePrivacy } from "@/contexts/privacy-context";

interface TopbarProps {
  title?: string;
  onMenuToggle?: () => void;
}

export function Topbar({ title, onMenuToggle }: TopbarProps) {
  const { hidden, toggleHidden } = usePrivacy();
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setQuery("");
    router.push(`/afiliados?search=${encodeURIComponent(q)}`);
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-white px-4 sm:px-6">
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

      {/* Page title */}
      {title && (
        <h1 className="text-lg font-semibold text-[hsl(var(--foreground))] hidden sm:block">
          {title}
        </h1>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Búsqueda rápida de afiliados */}
      <form onSubmit={handleSearch} className="relative hidden md:block w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar afiliado… (Enter)"
          className="pl-9 h-9 text-sm bg-[hsl(var(--muted))] border-transparent"
        />
      </form>

      <Button
        variant={hidden ? "default" : "outline"}
        size="sm"
        onClick={toggleHidden}
        className="gap-2"
        title={hidden ? "Mostrar montos" : "Ocultar montos"}
      >
        {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        <span className="hidden sm:inline">{hidden ? "Privado" : "Visible"}</span>
      </Button>
    </header>
  );
}
