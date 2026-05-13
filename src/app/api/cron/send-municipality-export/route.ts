import { NextRequest, NextResponse } from "next/server";
import { getMunicipalityPreview, createExportLog, updateExportLogStatus } from "@/lib/services/exports.service";
import { buildMunicipalityExcel } from "@/lib/utils/export-municipality";
import { sendMunicipalityExportEmail } from "@/lib/services/email.service";
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

    if (process.env.NODE_ENV === "development") {
      const body = await req.json().catch(() => ({})) as { month?: number; year?: number };
      if (body.month) month = body.month;
      if (body.year) year = body.year;
    }

    const { start, end } = getMunicipalityPeriod(month, year);
    const preview = await getMunicipalityPreview(start, end);

    if (preview.recordsCount === 0) {
      return NextResponse.json({
        ok: true,
        message: "No hay beneficios otorgados en este período para exportar.",
        periodStart: start,
        periodEnd: end,
        recordsExported: 0,
      });
    }

    const result = buildMunicipalityExcel(preview);

    const log = await createExportLog({
      periodStart: start,
      periodEnd: end,
      fileName: result.fileName,
      recordsCount: result.recordsCount,
      benefitsCount: result.benefitsCount,
      totalPrincipal: result.totalPrincipal,
      totalInstallment: result.totalInstallment,
      totalInterest: result.totalInterest,
      emailTo: process.env.EXPORT_EMAIL_TO,
      emailCc: process.env.EXPORT_EMAIL_CC,
      status: "generated",
    });

    const emailResult = await sendMunicipalityExportEmail({
      buffer: result.buffer,
      fileName: result.fileName,
      periodStart: start,
      periodEnd: end,
      recordsCount: result.recordsCount,
      benefitsCount: result.benefitsCount,
      totalPrincipal: result.totalPrincipal,
      totalInstallment: result.totalInstallment,
    });

    if (!emailResult.ok) {
      await updateExportLogStatus(log.id, "failed", emailResult.error);
      console.error(`[CRON send-municipality-export] Email falló: ${emailResult.error}`);
      return NextResponse.json(
        { ok: false, message: `Liquidación generada pero email falló: ${emailResult.error}` },
        { status: 500 }
      );
    }

    await updateExportLogStatus(log.id, "sent");
    console.log(`[CRON send-municipality-export] OK — ${result.fileName} → ${process.env.EXPORT_EMAIL_TO}`);

    return NextResponse.json({
      ok: true,
      message: "Liquidación municipal enviada correctamente.",
      periodStart: start,
      periodEnd: end,
      recordsExported: result.recordsCount,
      benefitsIncluded: result.benefitsCount,
      fileName: result.fileName,
      emailSentTo: process.env.EXPORT_EMAIL_TO,
    });
  } catch (error) {
    console.error("[CRON /api/cron/send-municipality-export]", error);
    return NextResponse.json({ ok: false, message: "Error inesperado." }, { status: 500 });
  }
}
