"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { PrivacyProvider } from "@/contexts/privacy-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Cerrar el menú móvil al navegar (ajuste de estado durante render)
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (sidebarOpen) setSidebarOpen(false);
  }

  return (
    <PrivacyProvider>
    <div className="flex h-dvh overflow-hidden">
      {/* Sidebar Desktop */}
      <div className="hidden lg:flex lg:flex-col lg:w-[260px] lg:shrink-0">
        <Sidebar className="h-full" />
      </div>

      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute left-0 top-0 h-full w-[260px]"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar className="h-full" />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Topbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
    </PrivacyProvider>
  );
}
