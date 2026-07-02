"use client";

import { Bell, Eye, EyeOff, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePrivacy } from "@/contexts/privacy-context";

interface TopbarProps {
  title?: string;
  onMenuToggle?: () => void;
}

export function Topbar({ title, onMenuToggle }: TopbarProps) {
  const { hidden, toggleHidden } = usePrivacy();

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
        <span className="sr-only">Toggle menu</span>
      </Button>

      {/* Page title */}
      {title && (
        <h1 className="text-lg font-semibold text-[hsl(var(--foreground))] hidden sm:block">
          {title}
        </h1>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="relative hidden md:block w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        <Input
          placeholder="Buscar afiliado..."
          className="pl-9 h-9 text-sm bg-[hsl(var(--muted))] border-transparent"
        />
      </div>

      <Button
        variant={hidden ? "default" : "outline"}
        size="sm"
        onClick={toggleHidden}
        className="gap-2"
        title={hidden ? "Mostrar datos sensibles" : "Ocultar datos sensibles"}
      >
        {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        <span className="hidden sm:inline">{hidden ? "Privado" : "Visible"}</span>
      </Button>

      {/* Notifications */}
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
        <span className="sr-only">Notificaciones</span>
      </Button>
    </header>
  );
}
