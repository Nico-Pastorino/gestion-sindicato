import type { Metadata } from "next";

export const dynamic = "force-dynamic";

import {
  Users,
  Gift,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  CreditCard,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InstallmentStatusBadge, BenefitTypeBadge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/credit";
import { formatDate } from "@/lib/utils/date";
import { db } from "@/lib/db";
import { affiliates, benefits, installments } from "@/lib/db/schema";
import { eq, and, sql, inArray, gte, lte } from "drizzle-orm";

export const metadata: Metadata = { title: "Dashboard" };

async function getDashboardData() {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const [
    totalAffiliates,
    activeBenefits,
    finishedBenefits,
    monthlyStats,
    pendingInstallments,
    paidInstallments,
    interestStats,
    upcomingInstallments,
    affiliatesWithoutCredit,
  ] = await Promise.all([
    // Total afiliados activos
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(affiliates)
      .where(eq(affiliates.status, "active")),

    // Beneficios activos
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(benefits)
      .where(eq(benefits.status, "active")),

    // Beneficios finalizados
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(benefits)
      .where(eq(benefits.status, "finished")),

    // Monto otorgado (capital) + interés del mes
    db
      .select({
        totalGranted: sql<string>`COALESCE(SUM(total_amount)::text, '0')`,
        totalInterest: sql<string>`COALESCE(SUM(interest_amount)::text, '0')`,
        totalRepayment: sql<string>`COALESCE(SUM(total_repayment_amount)::text, '0')`,
      })
      .from(benefits)
      .where(
        and(
          gte(benefits.date, firstOfMonth),
          lte(benefits.date, lastOfMonth)
        )
      ),

    // Total pendiente de cobro
    db
      .select({
        total: sql<string>`COALESCE(SUM(amount)::text, '0')`,
        count: sql<number>`count(*)::int`,
      })
      .from(installments)
      .where(inArray(installments.status, ["pending", "overdue"])),

    // Total cobrado este mes (cuotas pagadas)
    db
      .select({
        total: sql<string>`COALESCE(SUM(amount)::text, '0')`,
      })
      .from(installments)
      .where(
        and(
          eq(installments.status, "paid"),
          gte(installments.paidDate, firstOfMonth),
          lte(installments.paidDate, lastOfMonth)
        )
      ),

    // Ganancia total acumulada (intereses de todos los beneficios activos+finalizados)
    db
      .select({
        totalEarnedInterest: sql<string>`COALESCE(SUM(interest_amount)::text, '0')`,
        totalPendingInterest: sql<string>`
          COALESCE(SUM(
            interest_amount * (
              SELECT COUNT(*) FROM installments i
              WHERE i.benefit_id = benefits.id AND i.status IN ('pending','overdue')
            )::numeric / NULLIF(installments_count, 0)
          )::text, '0')
        `,
      })
      .from(benefits)
      .where(inArray(benefits.status, ["active", "finished"])),

    // Próximas cuotas del mes
    db.execute(sql`
      SELECT
        i.id,
        i.amount,
        i.due_date,
        i.status,
        i.installment_number,
        i.total_installments,
        a.full_name,
        a.dni,
        b.type,
        b.commerce
      FROM installments i
      JOIN affiliates a ON a.id = i.affiliate_id
      JOIN benefits   b ON b.id = i.benefit_id
      WHERE i.status IN ('pending', 'overdue')
        AND i.due_date BETWEEN ${firstOfMonth} AND ${lastOfMonth}
      ORDER BY i.due_date ASC, a.full_name ASC
      LIMIT 10
    `),

    // Afiliados sin disponible
    db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM affiliate_credit_summary
      WHERE available_amount <= 0 AND status = 'active'
    `),
  ]);

  return {
    totalAffiliates: totalAffiliates[0]?.count ?? 0,
    activeBenefits: activeBenefits[0]?.count ?? 0,
    finishedBenefits: finishedBenefits[0]?.count ?? 0,
    monthlyGranted: monthlyStats[0]?.totalGranted ?? "0",
    monthlyInterest: monthlyStats[0]?.totalInterest ?? "0",
    totalPending: pendingInstallments[0]?.total ?? "0",
    pendingCount: pendingInstallments[0]?.count ?? 0,
    totalCollected: paidInstallments[0]?.total ?? "0",
    totalEarnedInterest: interestStats[0]?.totalEarnedInterest ?? "0",
    totalPendingInterest: interestStats[0]?.totalPendingInterest ?? "0",
    upcomingInstallments: upcomingInstallments.rows as Array<{
      id: string;
      amount: string;
      due_date: string;
      status: string;
      installment_number: number;
      total_installments: number;
      full_name: string;
      dni: string;
      type: string;
      commerce: string | null;
    }>,
    affiliatesWithoutCredit:
      (affiliatesWithoutCredit.rows[0] as { count: number })?.count ?? 0,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Dashboard</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          Resumen general del sistema sindical
        </p>
      </div>

      {/* Alertas */}
      {(data.affiliatesWithoutCredit > 0) && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-800">
            <strong>{data.affiliatesWithoutCredit} afiliado{data.affiliatesWithoutCredit !== 1 ? "s" : ""}</strong>{" "}
            sin disponible para nuevos beneficios este mes.
          </p>
        </div>
      )}

      {/* Métricas principales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Afiliados Activos"
          value={data.totalAffiliates.toLocaleString("es-AR")}
          icon={Users}
          iconColor="text-blue-600"
        />
        <MetricCard
          title="Beneficios Activos"
          value={data.activeBenefits.toLocaleString("es-AR")}
          icon={Gift}
          iconColor="text-purple-600"
        />
        <MetricCard
          title="Otorgado en el Mes"
          value={formatCurrency(data.monthlyGranted)}
          icon={DollarSign}
          iconColor="text-green-600"
        />
        <MetricCard
          title="Cuotas Pendientes"
          value={formatCurrency(data.totalPending)}
          subtitle={`${data.pendingCount} cuota${data.pendingCount !== 1 ? "s" : ""} pendiente${data.pendingCount !== 1 ? "s" : ""}`}
          icon={Clock}
          iconColor="text-yellow-600"
        />
      </div>

      {/* Métricas secundarias */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          title="Cobrado este Mes"
          value={formatCurrency(data.totalCollected)}
          icon={CheckCircle}
          iconColor="text-green-600"
        />
        <MetricCard
          title="Beneficios Finalizados"
          value={data.finishedBenefits.toLocaleString("es-AR")}
          icon={TrendingUp}
          iconColor="text-blue-600"
        />
        <MetricCard
          title="Sin Disponible"
          value={data.affiliatesWithoutCredit.toLocaleString("es-AR")}
          subtitle="afiliados al tope del 30%"
          icon={AlertTriangle}
          iconColor="text-red-600"
        />
      </div>

      {/* Métricas financieras / ganancias */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Capital Otorgado (mes)"
          value={formatCurrency(data.monthlyGranted)}
          subtitle="beneficios del mes actual"
          icon={CreditCard}
          iconColor="text-blue-600"
        />
        <MetricCard
          title="Interés del Mes"
          value={formatCurrency(data.monthlyInterest)}
          subtitle="ganancia estimada del mes"
          icon={TrendingUp}
          iconColor="text-orange-600"
        />
        <MetricCard
          title="Ganancia Cobrada"
          value={formatCurrency(data.totalEarnedInterest)}
          subtitle="en todos los beneficios"
          icon={CheckCircle}
          iconColor="text-green-600"
        />
        <MetricCard
          title="Ganancia Pendiente"
          value={formatCurrency(data.totalPendingInterest)}
          subtitle="interés aún no cobrado"
          icon={Clock}
          iconColor="text-yellow-600"
        />
      </div>

      {/* Cuotas del mes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Cuotas del Mes
            </CardTitle>
            <span className="text-sm text-[hsl(var(--muted-foreground))]">
              {data.upcomingInstallments.length} registros
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {data.upcomingInstallments.length === 0 ? (
            <div className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
              No hay cuotas registradas para este mes.
            </div>
          ) : (
            <div className="divide-y">
              {data.upcomingInstallments.map((installment) => (
                <div
                  key={installment.id}
                  className="flex items-center justify-between py-3 gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                      {installment.full_name}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      DNI {installment.dni} ·{" "}
                      {installment.commerce ?? installment.type} · Cuota{" "}
                      {installment.installment_number}/{installment.total_installments}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold">
                      {formatCurrency(installment.amount)}
                    </span>
                    <InstallmentStatusBadge
                      status={installment.status as "pending" | "paid" | "overdue" | "cancelled"}
                    />
                    <span className="text-xs text-[hsl(var(--muted-foreground))] hidden sm:block">
                      {formatDate(installment.due_date)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
