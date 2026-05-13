import type { Metadata } from "next";
import { getMunicipalityPeriod, formatDate } from "@/lib/utils/date";
import { getMunicipalityPreview } from "@/lib/services/exports.service";
import { listExportLogs } from "@/lib/services/exports.service";
import { ExportClient } from "./export-client";

export const metadata: Metadata = { title: "Exportaciones" };
export const dynamic = "force-dynamic";

export default async function ExportPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const { start, end } = getMunicipalityPeriod(month, year);

  const [preview, logs] = await Promise.all([
    getMunicipalityPreview(start, end),
    listExportLogs(10),
  ]);

  return (
    <ExportClient
      initialMonth={month}
      initialYear={year}
      initialPreview={preview}
      initialLogs={logs}
      periodLabel={`${formatDate(start)} al ${formatDate(end)}`}
    />
  );
}
