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
} from "@/lib/services/dashboard-detail.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ metric: string }> }
) {
  const { metric } = await params;
  const sp = req.nextUrl.searchParams;
  const now = new Date();
  const month = parseInt(sp.get("month") ?? String(now.getMonth() + 1), 10);
  const year = parseInt(sp.get("year") ?? String(now.getFullYear()), 10);

  if (isNaN(month) || month < 1 || month > 12 || isNaN(year)) {
    return NextResponse.json({ ok: false, message: "Período inválido." }, { status: 400 });
  }

  const d = new Date(year, month - 1, 1);
  const lbl = format(d, "MMMM yyyy", { locale: es });
  const periodLabel = lbl.charAt(0).toUpperCase() + lbl.slice(1);

  try {
    let data: unknown;
    switch (metric) {
      case "capital-entregado":  data = await getCapitalEntregadoDetail(month, year); break;
      case "total-a-cobrar":     data = await getTotalACobrarDetail(month, year); break;
      case "cobrado":            data = await getCobradoDetail(month, year); break;
      case "falta-cobrar":       data = await getFaltaCobrarDetail(month, year); break;
      case "ganancia-estimada":  data = await getGananciaEstimadaDetail(month, year); break;
      case "ganancia-pendiente": data = await getGananciaPendienteDetail(month, year); break;
      default:
        return NextResponse.json({ ok: false, message: "Métrica inválida." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, metric, period: { month, year, label: periodLabel }, data });
  } catch (error) {
    console.error(`[GET /api/dashboard/${metric}]`, error);
    return NextResponse.json({ ok: false, message: "Error al cargar el detalle." }, { status: 500 });
  }
}
