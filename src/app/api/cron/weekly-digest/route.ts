import { NextRequest, NextResponse } from "next/server";
import { getPadronHome } from "@/lib/services/home.service";
import { getSetting } from "@/lib/services/settings.service";
import { sendWeeklyDigestEmail } from "@/lib/services/email.service";

const CRON_SECRET = process.env.CRON_SECRET;

async function handleWeeklyDigest(req: NextRequest) {
  if (!CRON_SECRET) {
    return NextResponse.json({ ok: false, message: "Endpoint no configurado." }, { status: 503 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  try {
    const to = await getSetting("weeklyDigestEmail");
    if (!to) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        message: "Sin destinatario configurado (Configuración → Resumen semanal).",
      });
    }

    const home = await getPadronHome();
    const result = await sendWeeklyDigestEmail(to, home);
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, messageId: result.messageId, to });
  } catch (error) {
    console.error("[CRON /api/cron/weekly-digest]", error);
    return NextResponse.json({ ok: false, message: "Error al enviar el resumen semanal." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleWeeklyDigest(req);
}

export async function POST(req: NextRequest) {
  return handleWeeklyDigest(req);
}
