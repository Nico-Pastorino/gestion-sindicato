"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Search, Menu, LogOut, UserCircle2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePrivacy } from "@/contexts/privacy-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SessionUser } from "@/components/layout/app-shell";

const ROLE_LABELS: Record<SessionUser["role"], string> = {
  admin: "Administrador",
  operator: "Operador",
  readonly: "Solo lectura",
};

interface TopbarProps {
  user: SessionUser;
  onMenuToggle?: () => void;
}

export function Topbar({ user, onMenuToggle }: TopbarProps) {
  const router = useRouter();
  const { hidden, toggleHidden } = usePrivacy();

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = new FormData(e.currentTarget).get("q");
    const search = typeof query === "string" ? query.trim() : "";
    router.push(search ? `/afiliados?search=${encodeURIComponent(search)}` : "/afiliados");
  }

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

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

      {/* Menú de usuario */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2.5 hover:bg-[hsl(var(--muted))] transition-colors"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
              {initials || <UserCircle2 className="h-5 w-5" />}
            </span>
            <span className="hidden sm:block text-left">
              <span className="block text-sm font-medium leading-tight">
                {user.name}
              </span>
              <span className="block text-[11px] leading-tight text-[hsl(var(--muted-foreground))]">
                {ROLE_LABELS[user.role]}
              </span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <span className="block text-sm font-medium">{user.name}</span>
            <span className="block text-xs font-normal text-[hsl(var(--muted-foreground))]">
              {user.email}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-red-600 focus:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
