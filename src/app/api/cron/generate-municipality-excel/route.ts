import { NextRequest, NextResponse } from "next/server";
import { generateMunicipalityExcel } from "@/lib/utils/export-municipality";
import { getMunicipalityPeriod } from "@/lib/utils/date";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  if (!CRON_SECRET) {
    return NextResponse.json({ ok: false, message: "Endpoint no configurado." }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  try {
    const now = new Date();
    let month = now.getMonth() + 1;
    let year = now.getFullYear();

    // En dev se puede forzar el período
    if (process.env.NODE_ENV === "development") {
      const body = await req.json().catch(() => ({})) as { month?: number; year?: number };
      if (body.month) month = body.month;
      if (body.year) year = body.year;
    }

    const { start, end } = getMunicipalityPeriod(month, year);
    const result = await generateMunicipalityExcel(start, end);

    // El archivo se genera en memoria. Sin almacenamiento externo configurado,
    // se registra el resumen y se devuelve. Para automatizar el guardado
    // conectar aquí un servicio de storage (S3, Vercel Blob, etc.).
    console.log(
      `[CRON export] Generado: ${result.fileName} — ${result.recordsCount} registros — período ${start}/${end}`
    );

    return NextResponse.json({
      ok: true,
      periodStart: result.periodStart,
      periodEnd: result.periodEnd,
      recordsExported: result.recordsCount,
      fileName: result.fileName,
    });
  } catch (error) {
    console.error("[CRON /api/cron/generate-municipality-excel]", error);
    return NextResponse.json({ ok: false, message: "Error al generar el Excel." }, { status: 500 });
  }
}
