import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "./audit.service";

// ─── Configuración de la app (clave/valor en la tabla settings) ──────────────

export const DEFAULT_BIRTHDAY_TEMPLATE =
  "¡Feliz cumpleaños, {nombre}! 🎉 De parte de todo el sindicato te deseamos un muy buen día.";

export interface AppSettings {
  /** Texto del saludo de cumpleaños por WhatsApp. {nombre} se reemplaza por el nombre del afiliado. */
  whatsappBirthdayTemplate: string;
  /** Destinatario del resumen semanal por email. Vacío = no se envía. */
  weeklyDigestEmail: string;
}

const DEFAULTS: AppSettings = {
  whatsappBirthdayTemplate: DEFAULT_BIRTHDAY_TEMPLATE,
  weeklyDigestEmail: "",
};

export async function getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, key) });
  if (!row) return DEFAULTS[key];
  return (row.value as AppSettings[K]) ?? DEFAULTS[key];
}

export async function getAppSettings(): Promise<AppSettings> {
  const rows = await db.query.settings.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  return {
    whatsappBirthdayTemplate:
      (byKey.get("whatsappBirthdayTemplate") as string) || DEFAULTS.whatsappBirthdayTemplate,
    weeklyDigestEmail: (byKey.get("weeklyDigestEmail") as string) || DEFAULTS.weeklyDigestEmail,
  };
}

export async function updateAppSettings(
  input: Partial<AppSettings>,
  userId?: string
): Promise<AppSettings> {
  const entries = Object.entries(input) as Array<[keyof AppSettings, string]>;
  for (const [key, value] of entries) {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
  }

  await logAudit({
    userId,
    action: "settings_updated",
    entityType: "settings",
    newValue: input,
  });

  return getAppSettings();
}
