import { notFound } from "next/navigation";
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
import { MetricDetailClient } from "./metric-detail-client";

export const dynamic = "force-dynamic";

const VALID_METRICS = [
  "capital-entregado","total-a-cobrar","cobrado",
  "falta-cobrar","ganancia-estimada","ganancia-pendiente",
] as const;

type ValidMetric = typeof VALID_METRICS[number];

const METRIC_TITLES: Record<ValidMetric, { title: string; subtitle: string }> = {
  "capital-entregado":  { title: "Capital entregado",  subtitle: "Beneficios otorgados en el período" },
  "total-a-cobrar":     { title: "Total a cobrar",      subtitle: "Cuotas generadas por beneficios del período" },
  "cobrado":            { title: "Cobrado hasta ahora", subtitle: "Cuotas efectivamente cobradas" },
  "falta-cobrar":       { title: "Falta cobrar",        subtitle: "Cuotas pendientes y vencidas" },
  "ganancia-estimada":  { title: "Ganancia del sindicato", subtitle: "Intereses + retención a comercios de los beneficios del período" },
  "ganancia-pendiente": { title: "Interés por cobrar",  subtitle: "Intereses aún no cobrados" },
};

interface PageProps {
  params: Promise<{ metric: string }>;
  searchParams: Promise<{ month?: string; year?: string; scope?: string }>;
}

export default async function MetricDetailPage({ params, searchParams }: PageProps) {
  const { metric } = await params;
  const sp = await searchParams;

  if (!VALID_METRICS.includes(metric as ValidMetric)) notFound();

  const now = new Date();
  const month = Math.min(12, Math.max(1, parseInt(sp.month ?? String(now.getMonth() + 1), 10) || now.getMonth() + 1));
  const year = parseInt(sp.year ?? String(now.getFullYear()), 10) || now.getFullYear();
  const scope: MetricScope = sp.scope === "year" || sp.scope === "all" ? sp.scope : "month";

  const d = new Date(year, month - 1, 1);
  const lbl = format(d, "MMMM yyyy", { locale: es });
  const periodLabel =
    scope === "all" ? "Todo el historial"
    : scope === "year" ? `Año ${year} completo`
    : lbl.charAt(0).toUpperCase() + lbl.slice(1);
  const { title, subtitle } = METRIC_TITLES[metric as ValidMetric];

  // Fetch data for this metric
  let data: unknown;
  switch (metric as ValidMetric) {
    case "capital-entregado":  data = await getCapitalEntregadoDetail(month, year, scope); break;
    case "total-a-cobrar":     data = await getTotalACobrarDetail(month, year, scope); break;
    case "cobrado":            data = await getCobradoDetail(month, year, scope); break;
    case "falta-cobrar":       data = await getFaltaCobrarDetail(month, year, scope); break;
    case "ganancia-estimada":  data = await getGananciaEstimadaDetail(month, year, scope); break;
    case "ganancia-pendiente": data = await getGananciaPendienteDetail(month, year, scope); break;
  }

  return (
    <MetricDetailClient
      metric={metric as ValidMetric}
      title={title}
      subtitle={subtitle}
      initialMonth={month}
      initialYear={year}
      initialScope={scope}
      periodLabel={periodLabel}
      initialData={data}
    />
  );
}
