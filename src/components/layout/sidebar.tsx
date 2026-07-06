"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Gift,
  FileDown,
  BarChart3,
  Building2,
  ChevronRight,
  HandCoins,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navItems: NavItem[] = [
  { href: "/dashboard",       label: "Inicio",         icon: LayoutDashboard },
  { href: "/afiliados",       label: "Afiliados",      icon: Users },
  { href: "/beneficios",      label: "Beneficios",     icon: Gift },
  { href: "/cobranzas",       label: "Cobranzas",      icon: HandCoins },
  { href: "/analisis",        label: "Análisis",       icon: BarChart3 },
  { href: "/exportar",        label: "Exportar",       icon: FileDown },
];


interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-[hsl(224,20%,10%)] text-white",
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">Sistema Sindical</p>
          <p className="text-xs text-white/50 leading-tight">Gestión de Beneficios</p>
        </div>
      </div>

      {/* Nav principal */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}

      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-[11px] text-white/30 text-center">v1.0.0 · Sindicato</p>
      </div>
    </aside>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
        active
          ? "bg-blue-600 text-white"
          : "text-white/60 hover:bg-white/8 hover:text-white"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {active && <ChevronRight className="h-3 w-3 opacity-60" />}
    </Link>
  );
}
