import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AffiliateSearch } from "@/components/affiliates/affiliate-search";
import { AffiliatesTable } from "@/components/affiliates/affiliates-table";
import { Pagination } from "@/components/shared/pagination";
import { db } from "@/lib/db";
import { affiliates } from "@/lib/db/schema";
import { sql, and, ilike, or, eq } from "drizzle-orm";
import type { AffiliateCreditSummary } from "@/types";

export const metadata: Metadata = { title: "Afiliados" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    area?: string;
    page?: string;
  }>;
}

async function getAffiliatesWithCredit(params: {
  search?: string;
  status?: string;
  area?: string;
  page: number;
  limit: number;
}): Promise<{ data: AffiliateCreditSummary[]; total: number }> {
  const { search, status, area, page, limit } = params;
  const offset = (page - 1) * limit;

  const whereParts: string[] = [];
  const queryParams: unknown[] = [];
  let idx = 1;

  if (search) {
    whereParts.push(
      `(a.full_name ILIKE $${idx} OR a.dni ILIKE $${idx + 1} OR a.legajo ILIKE $${idx + 2})`
    );
    queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    idx += 3;
  }
  if (status) {
    whereParts.push(`a.status = $${idx++}`);
    queryParams.push(status);
  }
  if (area) {
    whereParts.push(`a.area ILIKE $${idx++}`);
    queryParams.push(`%${area}%`);
  }

  const whereClause =
    whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

  // Join con la vista para obtener disponible en tiempo real
  const dataSQL = `
    SELECT
      acs.affiliate_id     AS "affiliateId",
      acs.full_name        AS "fullName",
      acs.dni,
      acs.legajo,
      acs.area,
      acs.status,
      acs.gross_salary     AS "grossSalary",
      acs.credit_limit_30  AS "creditLimit30",
      acs.active_discounts AS "activeDiscounts",
      acs.available_amount AS "availableAmount"
    FROM affiliate_credit_summary acs
    JOIN affiliates a ON a.id = acs.affiliate_id
    ${whereClause}
    ORDER BY a.full_name ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countSQL = `
    SELECT COUNT(*)::int AS count
    FROM affiliate_credit_summary acs
    JOIN affiliates a ON a.id = acs.affiliate_id
    ${whereClause}
  `;

  // Build parameterized query using sql template
  const [rows, countResult] = await Promise.all([
    db.execute(sql.raw(dataSQL)),
    db.execute(sql.raw(countSQL)),
  ]);

  return {
    data: rows.rows as unknown as AffiliateCreditSummary[],
    total: (countResult.rows[0] as { count: number })?.count ?? 0,
  };
}

async function getAreas(): Promise<string[]> {
  const result = await db
    .selectDistinct({ area: affiliates.area })
    .from(affiliates)
    .where(sql`area IS NOT NULL`)
    .orderBy(affiliates.area);
  return result.map((r) => r.area!).filter(Boolean);
}

export default async function AffiliatesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = 20;

  const [{ data, total }, areas] = await Promise.all([
    getAffiliatesWithCredit({
      search: params.search,
      status: params.status,
      area: params.area,
      page,
      limit,
    }),
    getAreas(),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Afiliados
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            {total} afiliado{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/afiliados/nuevo">
            <Plus className="h-4 w-4" />
            Nuevo afiliado
          </Link>
        </Button>
      </div>

      {/* Buscador y filtros */}
      <Suspense>
        <AffiliateSearch areas={areas} />
      </Suspense>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <AffiliatesTable affiliates={data} />
          <div className="px-4 border-t">
            <Suspense>
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                limit={limit}
              />
            </Suspense>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
