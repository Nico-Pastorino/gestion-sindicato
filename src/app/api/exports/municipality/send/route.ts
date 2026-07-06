import { NextRequest, NextResponse } from "next/server";
import { getMunicipalityPreview, createExportLog, updateExportLogStatus } from "@/lib/services/exports.service";
import { buildMunicipalityExcel } from "@/lib/utils/export-municipality";
import { sendMunicipalityExportEmail } from "@/lib/services/email.service";
import { getMunicipalityPeriod } from "@/lib/utils/date";
import { requireRole, authErrorResponse } from "@/lib/auth/guards";

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("admin", "operator");
    const body = await req.json().catch(() => ({})) as { month?: number; year?: number };
    const now = new Date();
    const month = body.month ?? (now.getMonth() + 1);
    const year = body.year ?? now.getFullYear();

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

    // Crear log previo (estado generated)
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
      createdBy: session.user.id,
    });

    // Enviar por email
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
      return NextResponse.json(
        { ok: false, message: `Error al enviar email: ${emailResult.error}` },
        { status: 500 }
      );
    }

    await updateExportLogStatus(log.id, "sent");

    return NextResponse.json({
      ok: true,
      message: "Liquidación municipal enviada correctamente por email.",
      periodStart: start,
      periodEnd: end,
      recordsExported: result.recordsCount,
      benefitsIncluded: result.benefitsCount,
      fileName: result.fileName,
      emailSentTo: process.env.EXPORT_EMAIL_TO,
    });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    console.error("[POST /api/exports/municipality/send]", error);
    return NextResponse.json({ ok: false, message: "Error inesperado al enviar." }, { status: 500 });
  }
}
