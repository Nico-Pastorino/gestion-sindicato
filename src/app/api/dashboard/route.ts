import { NextRequest, NextResponse } from "next/server";
import {
  getDashboardSummary,
  getMonthlyHistory,
  getDashboardGlobals,
  getDashboardAnalytics,
} from "@/lib/services/dashboard.service";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const now = new Date();
    const month = parseInt(params.get("month") ?? String(now.getMonth() + 1), 10);
    const year = parseInt(params.get("year") ?? String(now.getFullYear()), 10);

    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ ok: false, message: "Mes inválido." }, { status: 400 });
    }
    if (isNaN(year) || year < 2020 || year > 2100) {
      return NextResponse.json({ ok: false, message: "Año inválido." }, { status: 400 });
    }

    const monthDate = new Date(year, month - 1, 1);
    const label = format(monthDate, "MMMM yyyy", { locale: es });
    const labelCapitalized = label.charAt(0).toUpperCase() + label.slice(1);

    const [summary, monthlyHistory, globals, analytics] = await Promise.all([
      getDashboardSummary(month, year),
      getMonthlyHistory(6),
      getDashboardGlobals(),
      getDashboardAnalytics(month, year),
    ]);

    return NextResponse.json({
      ok: true,
      period: { month, year, label: labelCapitalized },
      summary,
      monthlyHistory,
      globals,
      analytics,
    });
  } catch (error) {
    console.error("[GET /api/dashboard]", error);
    return NextResponse.json({ ok: false, message: "Error al cargar el dashboard." }, { status: 500 });
  }
}
