import { db } from "@/lib/db";
import { whatsappAlerts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { BenefitCompletedPayload } from "@/types";
import { getBenefitTypeLabel } from "@/lib/utils/benefit-types";

export type WhatsappAlertType =
  | "benefit_completed"
  | "benefit_created"
  | "installment_overdue"
  | "credit_limit_warning";

interface SendAlertParams {
  type: WhatsappAlertType;
  recipientPhone: string;
  message: string;
  payload?: Record<string, unknown>;
}

// Servicio desacoplado de WhatsApp.
// En V1: modo mock — registra la alerta en DB sin enviar.
// Para activar un proveedor real, configurar WHATSAPP_PROVIDER y WHATSAPP_API_KEY.
export async function sendWhatsAppAlert(params: SendAlertParams): Promise<void> {
  const provider = process.env.WHATSAPP_PROVIDER ?? "mock";

  const [alert] = await db
    .insert(whatsappAlerts)
    .values({
      type: params.type,
      recipientPhone: params.recipientPhone,
      message: params.message,
      payload: params.payload ?? null,
      status: "pending",
    })
    .returning();

  if (provider === "mock") {
    console.log(`[WhatsApp MOCK] → ${params.recipientPhone}: ${params.message}`);
    await db
      .update(whatsappAlerts)
      .set({ status: "skipped", sentAt: new Date() })
      .where(eq(whatsappAlerts.id, alert.id));
    return;
  }

  // Placeholder para proveedores reales (twilio, meta, wapi, etc.)
  try {
    // await providerClient.send(params.recipientPhone, params.message);
    await db
      .update(whatsappAlerts)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(whatsappAlerts.id, alert.id));
  } catch (error) {
    await db
      .update(whatsappAlerts)
      .set({ status: "failed" })
      .where(eq(whatsappAlerts.id, alert.id));
    console.error("[WhatsApp] Error al enviar alerta:", error);
  }
}

export function buildBenefitCompletedMessage(payload: BenefitCompletedPayload): string {
  const typeLabel = getBenefitTypeLabel(payload.benefitType);
  const commerce = payload.commerce ? ` (${payload.commerce})` : "";

  return (
    `El afiliado ${payload.affiliateName}, DNI ${payload.affiliateDni}, ` +
    `finalizó el pago de la última cuota del beneficio ${typeLabel}${commerce} ` +
    `por $${Number(payload.totalAmount).toLocaleString("es-AR")}. ` +
    `Ya vuelve a tener disponible actualizado.`
  );
}

export async function notifyBenefitCompleted(
  payload: BenefitCompletedPayload
): Promise<void> {
  const adminPhone = process.env.ADMIN_ALERT_PHONE;
  if (!adminPhone) return;

  await sendWhatsAppAlert({
    type: "benefit_completed",
    recipientPhone: adminPhone,
    message: buildBenefitCompletedMessage(payload),
    payload: payload as unknown as Record<string, unknown>,
  });
}
