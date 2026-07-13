import { Resend } from "resend";
import { formatDate } from "@/lib/utils/date";
import { formatCurrencyARS } from "@/lib/utils/currency";
import type { PadronHome } from "./home.service";

export interface MunicipalityEmailPayload {
  buffer: Buffer;
  fileName: string;
  periodStart: string;
  periodEnd: string;
  recordsCount: number;
  benefitsCount: number;
  totalPrincipal: number;
  totalInstallment: number;
}

export interface EmailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

// ─── Resumen semanal del padrón (sin datos financieros) ──────────────────────

export async function sendWeeklyDigestEmail(
  to: string,
  home: PadronHome
): Promise<EmailResult> {
  const emailFrom = process.env.EMAIL_FROM ?? "sindicato@resend.dev";
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY no está configurado en variables de entorno." };
  }

  const birthdaysThisWeek = home.birthdays.filter((b) => b.daysUntil <= 7);
  const lines: string[] = [
    "Resumen semanal del sindicato",
    "",
    `Padrón: ${home.totalAffiliates} afiliados (${home.activeAffiliates} activos, ${home.inactiveAffiliates} inactivos).`,
    `Altas de este mes: ${home.newThisMonth}.`,
    `Documentación pendiente: ${home.docsPending} · faltante: ${home.docsMissing}.`,
  ];

  if (birthdaysThisWeek.length > 0) {
    lines.push("", "Cumpleaños de los próximos 7 días:");
    for (const b of birthdaysThisWeek) {
      lines.push(`- ${b.fullName} (${formatDate(b.nextDate)})`);
    }
  }

  if (home.overdueReminders > 0) {
    lines.push("", `Recordatorios vencidos sin resolver: ${home.overdueReminders}.`);
  }

  lines.push("", "Este resumen se genera automáticamente todos los lunes.", "Sistema de Gestión Sindical");

  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to,
      subject: `Resumen semanal del padrón - ${formatDate(new Date().toISOString().slice(0, 10))}`,
      text: lines.join("\n"),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, messageId: data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido al enviar email";
    return { ok: false, error: msg };
  }
}

export async function sendMunicipalityExportEmail(
  payload: MunicipalityEmailPayload
): Promise<EmailResult> {
  const emailTo = process.env.EXPORT_EMAIL_TO;
  const emailCc = process.env.EXPORT_EMAIL_CC;
  const emailFrom = process.env.EMAIL_FROM ?? "sindicato@resend.dev";

  if (!emailTo) {
    return { ok: false, error: "EXPORT_EMAIL_TO no está configurado en variables de entorno." };
  }
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY no está configurado en variables de entorno." };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const periodLabel = `${formatDate(payload.periodStart)} al ${formatDate(payload.periodEnd)}`;
  const subject = `Liquidación Municipal - Período ${periodLabel}`;

  const body = `Estimados,

Adjuntamos la liquidación municipal correspondiente al período ${periodLabel}.

Resumen del período:
- Beneficios incluidos: ${payload.benefitsCount}
- Cuotas incluidas: ${payload.recordsCount}
- Capital otorgado: ${formatCurrencyARS(payload.totalPrincipal)}
- Total a descontar: ${formatCurrencyARS(payload.totalInstallment)}

El archivo adjunto contiene el detalle completo de los descuentos a realizar en los haberes.

Saludos.
Sistema de Gestión Sindical`;

  try {
    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to: emailTo,
      ...(emailCc ? { cc: emailCc } : {}),
      subject,
      text: body,
      attachments: [
        {
          filename: payload.fileName,
          content: payload.buffer,
        },
      ],
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, messageId: data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido al enviar email";
    return { ok: false, error: msg };
  }
}
