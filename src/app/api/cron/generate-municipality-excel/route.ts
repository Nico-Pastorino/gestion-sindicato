import { NextRequest, NextResponse } from "next/server";
import { getMunicipalityPreview, createExportLog } from "@/lib/services/exports.service";
import { buildMunicipalityExcel } from "@/lib/utils/export-municipality";
import { getMunicipalityPeriod } from "@/lib/utils/date";

const CRON_SECRET = process.env.CRON_SECRET;

// Endpoint legacy — genera el Excel sin enviarlo.
// Para el envío automático completo usar /api/cron/send-municipality-export.
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

    if (process.env.NODE_ENV === "development") {
      const body = await req.json().catch(() => ({})) as { month?: number; year?: number };
      if (body.month) month = body.month;
      if (body.year) year = body.year;
    }

    const { start, end } = getMunicipalityPeriod(month, year);
    const preview = await getMunicipalityPreview(start, end);
    const result = buildMunicipalityExcel(preview);

    await createExportLog({
      periodStart: start,
      periodEnd: end,
      fileName: result.fileName,
      recordsCount: result.recordsCount,
      benefitsCount: result.benefitsCount,
      totalPrincipal: result.totalPrincipal,
      totalInstallment: result.totalInstallment,
      totalInterest: result.totalInterest,
      status: "generated",
    }).catch(console.error);

    console.log(`[CRON generate] ${result.fileName} — ${result.recordsCount} registros — ${start}/${end}`);

    return NextResponse.json({
      ok: true,
      periodStart: result.periodStart,
      periodEnd: result.periodEnd,
      recordsExported: result.recordsCount,
      benefitsIncluded: result.benefitsCount,
      fileName: result.fileName,
    });
  } catch (error) {
    console.error("[CRON /api/cron/generate-municipality-excel]", error);
    return NextResponse.json({ ok: false, message: "Error al generar el Excel." }, { status: 500 });
  }
}
