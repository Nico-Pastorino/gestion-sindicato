import { Resend } from "resend";
import { formatDate } from "@/lib/utils/date";
import { formatCurrencyARS } from "@/lib/utils/currency";

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
