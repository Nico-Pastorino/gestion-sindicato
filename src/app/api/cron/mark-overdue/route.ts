import { NextRequest, NextResponse } from "next/server";
import { markOverdueInstallments } from "@/lib/services/installments.service";

const CRON_SECRET = process.env.CRON_SECRET;

async function handleMarkOverdue(req: NextRequest) {
  if (!CRON_SECRET) {
    return NextResponse.json({ ok: false, message: "Endpoint no configurado." }, { status: 503 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  try {
    const updatedCount = await markOverdueInstallments();
    return NextResponse.json({ ok: true, updatedCount });
  } catch (error) {
    console.error("[CRON /api/cron/mark-overdue]", error);
    return NextResponse.json({ ok: false, message: "Error al marcar cuotas vencidas." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleMarkOverdue(req);
}

export async function POST(req: NextRequest) {
  return handleMarkOverdue(req);
}
