"use client";

import { useRouter } from "next/navigation";
import { Search, Menu, Eye, EyeOff, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePrivacy } from "@/contexts/privacy-context";

interface TopbarProps {
  onMenuToggle?: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const router = useRouter();
  const { hidden, toggleHidden } = usePrivacy();

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = new FormData(e.currentTarget).get("q");
    const search = typeof query === "string" ? query.trim() : "";
    router.push(search ? `/afiliados?search=${encodeURIComponent(search)}` : "/afiliados");
  }

  async function handleExit() {
    await fetch("/api/unlock", { method: "DELETE" }).catch(() => {});
    router.push("/unlock");
    router.refresh();
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

      {/* Búsqueda de afiliados (funcional) */}
      <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        <Input
          name="q"
          type="search"
          placeholder="Buscar afiliado por nombre, DNI o legajo…"
          className="pl-9 h-9 text-sm bg-[hsl(var(--muted))] border-transparent"
        />
      </form>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Modo privacidad: oculta montos para mostrar la app sin exponer datos */}
      <Button
        variant={hidden ? "default" : "ghost"}
        size="icon"
        onClick={toggleHidden}
        title={hidden ? "Mostrar montos" : "Ocultar montos (modo demo)"}
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
}
