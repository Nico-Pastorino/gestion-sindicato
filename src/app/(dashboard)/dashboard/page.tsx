import type { Metadata } from "next";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  getDashboardSummary,
  getPendingInstallmentsForPeriod,
  getMonthlyHistory,
  getDashboardGlobals,
} from "@/lib/services/dashboard.service";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const now = new Date();
  const month = Math.min(12, Math.max(1, parseInt(sp.month ?? String(now.getMonth() + 1), 10) || (now.getMonth() + 1)));
  const year = parseInt(sp.year ?? String(now.getFullYear()), 10) || now.getFullYear();

  const monthDate = new Date(year, month - 1, 1);
  const label = format(monthDate, "MMMM yyyy", { locale: es });
  const periodLabel = label.charAt(0).toUpperCase() + label.slice(1);

  const [summary, pendingInstallments, monthlyHistory, globals] = await Promise.all([
    getDashboardSummary(month, year),
    getPendingInstallmentsForPeriod(month, year, 50),
    getMonthlyHistory(6),
    getDashboardGlobals(),
  ]);

  return (
    <DashboardClient
      initialMonth={month}
      initialYear={year}
      periodLabel={periodLabel}
      summary={summary}
      pendingInstallments={pendingInstallments}
      monthlyHistory={monthlyHistory}
      globals={globals}
    />
  );
}
