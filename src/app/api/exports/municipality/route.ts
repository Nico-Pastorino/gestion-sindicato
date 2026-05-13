import { NextRequest, NextResponse } from "next/server";
import { getMunicipalityPreview, createExportLog } from "@/lib/services/exports.service";
import { buildMunicipalityExcel } from "@/lib/utils/export-municipality";
import { getMunicipalityPeriod } from "@/lib/utils/date";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const now = new Date();
    const month = parseInt(params.get("month") ?? String(now.getMonth() + 1), 10);
    const year = parseInt(params.get("year") ?? String(now.getFullYear()), 10);

    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ ok: false, message: "Mes inválido (1-12)." }, { status: 400 });
    }
    if (isNaN(year) || year < 2020 || year > 2100) {
      return NextResponse.json({ ok: false, message: "Año inválido." }, { status: 400 });
    }

    const { start, end } = getMunicipalityPeriod(month, year);
    const preview = await getMunicipalityPreview(start, end);
    const result = buildMunicipalityExcel(preview);

    // Registrar descarga en log
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

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "X-Records-Count": String(result.recordsCount),
        "X-Benefits-Count": String(result.benefitsCount),
        "X-Period-Start": result.periodStart,
        "X-Period-End": result.periodEnd,
      },
    });
  } catch (error) {
    console.error("[GET /api/exports/municipality]", error);
    return NextResponse.json({ ok: false, message: "Error al generar el Excel." }, { status: 500 });
  }
}
