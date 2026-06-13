import { NextRequest, NextResponse } from "next/server";
import { getMunicipalityPreview } from "@/lib/services/exports.service";
import { getMunicipalityPeriod } from "@/lib/utils/date";
import { requireSession, authErrorResponse } from "@/lib/auth/guards";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
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

    return NextResponse.json({ ok: true, data: preview });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    console.error("[GET /api/exports/municipality/preview]", error);
    return NextResponse.json({ ok: false, message: "Error al obtener preview." }, { status: 500 });
  }
}
