import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { getAppSettings } from "@/lib/services/settings.service";
import { listAnnouncements } from "@/lib/services/announcements.service";
import { SettingsForm } from "@/components/settings/settings-form";
import { AnnouncementsManager } from "@/components/settings/announcements-manager";

export const metadata: Metadata = { title: "Configuración" };
export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const [settings, announcements] = await Promise.all([getAppSettings(), listAnnouncements()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Settings className="h-6 w-6" />
          Configuración
        </h1>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Textos, avisos y novedades del sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SettingsForm initial={settings} />
        <AnnouncementsManager announcements={announcements} />
      </div>
    </div>
  );
}
