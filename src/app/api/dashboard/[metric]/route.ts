import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  getCapitalEntregadoDetail,
  getTotalACobrarDetail,
  getCobradoDetail,
  getFaltaCobrarDetail,
  getGananciaEstimadaDetail,
  getGananciaPendienteDetail,
  type MetricScope,
} from "@/lib/services/dashboard-detail.service";
import { requireSession, authErrorResponse } from "@/lib/auth/guards";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ metric: string }> }
) {
  const { metric } = await params;
  const sp = req.nextUrl.searchParams;
  const now = new Date();
  const month = parseInt(sp.get("month") ?? String(now.getMonth() + 1), 10);
  const year = parseInt(sp.get("year") ?? String(now.getFullYear()), 10);
  const scopeRaw = sp.get("scope");
  const scope: MetricScope = scopeRaw === "year" || scopeRaw === "all" ? scopeRaw : "month";

  if (isNaN(month) || month < 1 || month > 12 || isNaN(year)) {
    return NextResponse.json({ ok: false, message: "Período inválido." }, { status: 400 });
  }

  const d = new Date(year, month - 1, 1);
  const lbl = format(d, "MMMM yyyy", { locale: es });
  const periodLabel =
    scope === "all" ? "Todo el historial"
    : scope === "year" ? `Año ${year} completo`
    : lbl.charAt(0).toUpperCase() + lbl.slice(1);

  try {
    await requireSession();
    let data: unknown;
    switch (metric) {
      case "capital-entregado":  data = await getCapitalEntregadoDetail(month, year, scope); break;
      case "total-a-cobrar":     data = await getTotalACobrarDetail(month, year, scope); break;
      case "cobrado":            data = await getCobradoDetail(month, year, scope); break;
      case "falta-cobrar":       data = await getFaltaCobrarDetail(month, year, scope); break;
      case "ganancia-estimada":  data = await getGananciaEstimadaDetail(month, year, scope); break;
      case "ganancia-pendiente": data = await getGananciaPendienteDetail(month, year, scope); break;
      default:
        return NextResponse.json({ ok: false, message: "Métrica inválida." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, metric, period: { month, year, scope, label: periodLabel }, data });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    console.error(`[GET /api/dashboard/${metric}]`, error);
    return NextResponse.json({ ok: false, message: "Error al cargar el detalle." }, { status: 500 });
  }
}
