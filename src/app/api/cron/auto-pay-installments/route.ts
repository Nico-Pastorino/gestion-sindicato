import { NextRequest, NextResponse } from "next/server";
import { autoPayDueInstallments } from "@/lib/services/installments.service";

const CRON_SECRET = process.env.CRON_SECRET;

async function handleAutoPay(req: NextRequest) {
  if (!CRON_SECRET) {
    return NextResponse.json({ ok: false, message: "Endpoint no configurado." }, { status: 503 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  try {
    let processDate = new Date();

    if (process.env.NODE_ENV === "development") {
      const body = await req.json().catch(() => ({})) as { processDate?: string };
      if (body.processDate) {
        processDate = new Date(`${body.processDate}T00:00:00`);
      }
    }

    const result = await autoPayDueInstallments(processDate);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[CRON /api/cron/auto-pay-installments]", error);
    return NextResponse.json({ ok: false, message: "Error al marcar cuotas pagadas." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleAutoPay(req);
}

export async function POST(req: NextRequest) {
  return handleAutoPay(req);
}
