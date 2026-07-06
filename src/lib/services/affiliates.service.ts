import { db } from "@/lib/db";
import { affiliates } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { logAudit } from "./audit.service";
import type {
  CreateAffiliateInput,
  UpdateAffiliateInput,
  AffiliateSearchInput,
  AffiliateExploreFilters,
  AffiliateExploreInput,
} from "@/lib/validations/affiliate.schema";
import type { AffiliateCreditSummary } from "@/types";

export interface AffiliateModuleSummary {
  total: number;
  active: number;
  inactive: number;
  withActiveBenefit: number;
  withoutSalary: number;
}

// ─── Obtener disponible de un afiliado (desde la vista SQL) ──────────────────

export async function getAffiliateCreditSummary(
  affiliateId: string
): Promise<AffiliateCreditSummary | null> {
  const result = await db.execute(
    sql`
      SELECT
        acs.affiliate_id    AS "affiliateId",
        acs.full_name       AS "fullName",
        acs.dni,
        acs.legajo,
        acs.area,
        a.sex,
        a.employment_type AS "employmentType",
        a.hire_date AS "hireDate",
        acs.status,
        acs.gross_salary    AS "grossSalary",
        acs.credit_limit_30 AS "creditLimit30",
        acs.active_discounts AS "activeDiscounts",
        acs.available_amount AS "availableAmount"
      FROM affiliate_credit_summary acs
      JOIN affiliates a ON a.id = acs.affiliate_id
      WHERE acs.affiliate_id = ${affiliateId}
      LIMIT 1
    `
  );

  if (!result.rows || result.rows.length === 0) return null;
  return result.rows[0] as unknown as AffiliateCreditSummary;
}

// ─── Crear afiliado ───────────────────────────────────────────────────────────

export async function createAffiliate(
  input: CreateAffiliateInput,
  userId?: string
) {
  const [affiliate] = await db
    .insert(affiliates)
    .values({
      fullName: input.fullName,
      dni: input.dni,
      // "" se guarda como null para no chocar con el índice único de legajo
      legajo: input.legajo?.trim() || null,
      area: input.area ?? null,
      sex: input.sex ?? null,
      sector: input.sector ?? null,
      position: input.position ?? null,
      employmentType: input.employmentType ?? null,
      workShift: input.workShift ?? null,
      hireDate: input.hireDate || null,
      affiliationDate: input.affiliationDate || null,
      grossSalary: input.grossSalary != null ? String(input.grossSalary) : null,
      phone: input.phone ?? null,
      alternatePhone: input.alternatePhone ?? null,
      email: input.email || null,
      cuil: input.cuil ?? null,
      birthDate: input.birthDate || null,
      maritalStatus: input.maritalStatus ?? null,
      streetAddress: input.streetAddress ?? null,
      addressNumber: input.addressNumber ?? null,
      neighborhood: input.neighborhood ?? null,
      city: input.city ?? null,
      province: input.province ?? null,
      postalCode: input.postalCode ?? null,
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactRelation: input.emergencyContactRelation ?? null,
      emergencyContactPhone: input.emergencyContactPhone ?? null,
      documentationStatus: input.documentationStatus ?? "pending",
      privateNotes: input.privateNotes ?? null,
      status: input.status ?? "active",
    })
    .returning();

  await logAudit({
    userId,
    action: "affiliate_created",
    entityType: "affiliate",
    entityId: affiliate.id,
    newValue: affiliate,
  });

  return affiliate;
}

// ─── Actualizar afiliado ──────────────────────────────────────────────────────

export async function updateAffiliate(
  input: UpdateAffiliateInput,
  userId?: string
) {
  const { id, ...data } = input;

  const existing = await db.query.affiliates.findFirst({
    where: eq(affiliates.id, id),
  });

  if (!existing) {
    throw new Error("Afiliado no encontrado");
  }

  const isSalaryUpdate = data.grossSalary !== undefined;

  const [updated] = await db
    .update(affiliates)
    .set({
      ...(data.fullName !== undefined && { fullName: data.fullName }),
      ...(data.dni !== undefined && { dni: data.dni }),
      ...(data.legajo !== undefined && { legajo: data.legajo?.trim() || null }),
      ...(data.area !== undefined && { area: data.area }),
      ...(data.sex !== undefined && { sex: data.sex }),
      ...(data.sector !== undefined && { sector: data.sector }),
      ...(data.position !== undefined && { position: data.position }),
      ...(data.employmentType !== undefined && { employmentType: data.employmentType }),
      ...(data.workShift !== undefined && { workShift: data.workShift }),
      ...(data.hireDate !== undefined && { hireDate: data.hireDate || null }),
      ...(data.affiliationDate !== undefined && { affiliationDate: data.affiliationDate || null }),
      ...(data.grossSalary !== undefined && {
        grossSalary: data.grossSalary != null ? String(data.grossSalary) : null,
      }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.alternatePhone !== undefined && { alternatePhone: data.alternatePhone }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.cuil !== undefined && { cuil: data.cuil }),
      ...(data.birthDate !== undefined && { birthDate: data.birthDate || null }),
      ...(data.maritalStatus !== undefined && { maritalStatus: data.maritalStatus }),
      ...(data.streetAddress !== undefined && { streetAddress: data.streetAddress }),
      ...(data.addressNumber !== undefined && { addressNumber: data.addressNumber }),
      ...(data.neighborhood !== undefined && { neighborhood: data.neighborhood }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.province !== undefined && { province: data.province }),
      ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
      ...(data.emergencyContactName !== undefined && { emergencyContactName: data.emergencyContactName }),
      ...(data.emergencyContactRelation !== undefined && { emergencyContactRelation: data.emergencyContactRelation }),
      ...(data.emergencyContactPhone !== undefined && { emergencyContactPhone: data.emergencyContactPhone }),
      ...(data.documentationStatus !== undefined && { documentationStatus: data.documentationStatus }),
      ...(data.privateNotes !== undefined && { privateNotes: data.privateNotes }),
      ...(data.status !== undefined && { status: data.status }),
    })
    .where(eq(affiliates.id, id))
    .returning();

  await logAudit({
    userId,
    action: isSalaryUpdate ? "salary_updated" : "affiliate_updated",
    entityType: "affiliate",
    entityId: id,
    oldValue: existing,
    newValue: updated,
  });

  return updated;
}

// ─── Buscar afiliados con datos de crédito ────────────────────────────────────
// Devuelve AffiliateCreditSummary para que el formulario de beneficios
// pueda mostrar el disponible directamente en los resultados de búsqueda.

export async function searchAffiliates(input: AffiliateSearchInput) {
  const { search, status, area, page, limit } = input;
  const offset = (page - 1) * limit;

  // Construir WHERE usando sql template (seguro contra inyección)
  let baseFilter = sql`1=1`;
  if (search) {
    baseFilter = sql`${baseFilter} AND (
      a.full_name ILIKE ${'%' + search + '%'}
      OR a.dni ILIKE ${'%' + search + '%'}
      OR a.legajo ILIKE ${'%' + search + '%'}
    )`;
  }
  if (status) {
    baseFilter = sql`${baseFilter} AND a.status = ${status}`;
  }
  if (area) {
    baseFilter = sql`${baseFilter} AND a.area ILIKE ${'%' + area + '%'}`;
  }

  const [rows, countResult] = await Promise.all([
    db.execute(sql`
      SELECT
        acs.affiliate_id      AS "affiliateId",
        acs.full_name         AS "fullName",
        acs.dni,
        acs.legajo,
        acs.area,
        a.sex,
        a.employment_type AS "employmentType",
        a.hire_date AS "hireDate",
        a.sector,
        a.phone,
        a.email,
        a.documentation_status AS "documentationStatus",
        acs.status,
        acs.gross_salary      AS "grossSalary",
        acs.credit_limit_30   AS "creditLimit30",
        acs.active_discounts  AS "activeDiscounts",
        acs.available_amount  AS "availableAmount",
        COALESCE(tc.total_committed, 0)::text AS "totalCommitted",
        COALESCE(ab.active_benefits, 0)::int AS "activeBenefitsCount"
      FROM affiliate_credit_summary acs
      JOIN affiliates a ON a.id = acs.affiliate_id
      LEFT JOIN (
        SELECT affiliate_id, COUNT(*)::int AS active_benefits
        FROM benefits
        WHERE status = 'active'
        GROUP BY affiliate_id
      ) ab ON ab.affiliate_id = acs.affiliate_id
      LEFT JOIN (
        -- Total comprometido = suma de cuotas pendientes/vencidas.
        -- Se calcula acá (no desde la vista) para no depender de que la
        -- vista affiliate_credit_summary tenga la columna total_committed.
        SELECT affiliate_id, SUM(amount::numeric) AS total_committed
        FROM installments
        WHERE status IN ('pending', 'overdue')
        GROUP BY affiliate_id
      ) tc ON tc.affiliate_id = acs.affiliate_id
      WHERE ${baseFilter}
      ORDER BY a.full_name ASC
      LIMIT ${limit} OFFSET ${offset}
    `),
    db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM affiliate_credit_summary acs
      JOIN affiliates a ON a.id = acs.affiliate_id
      WHERE ${baseFilter}
    `),
  ]);

  return {
    data: rows.rows as unknown as import("@/types").AffiliateCreditSummary[],
    total: (countResult.rows[0] as { count: number })?.count ?? 0,
    page,
    limit,
    totalPages: Math.ceil(((countResult.rows[0] as { count: number })?.count ?? 0) / limit),
  };
}

// ─── Obtener afiliado por ID con sus beneficios e instalments ─────────────────

export async function getAffiliateById(id: string) {
  const affiliate = await db.query.affiliates.findFirst({
    where: eq(affiliates.id, id),
    with: {
      benefits: {
        orderBy: (t, { desc }) => [desc(t.date)],
        with: {
          installments: {
            orderBy: (t, { asc }) => [asc(t.installmentNumber)],
          },
        },
      },
    },
  });

  if (!affiliate) return null;

  const creditSummary = await getAffiliateCreditSummary(id);

  return { ...affiliate, creditSummary };
}

// ─── Obtener afiliado por DNI ─────────────────────────────────────────────────

export async function getAffiliateByDni(dni: string) {
  return db.query.affiliates.findFirst({
    where: eq(affiliates.dni, dni),
  });
}

// ─── Obtener afiliado por legajo ──────────────────────────────────────────────

export async function getAffiliateByLegajo(legajo: string) {
  return db.query.affiliates.findFirst({
    where: eq(affiliates.legajo, legajo),
  });
}

// ─── Explorador / exportador de afiliados ────────────────────────────────────

export interface AffiliateExportRow {
  id: string;
  fullName: string;
  dni: string;
  cuil: string | null;
  legajo: string | null;
  area: string | null;
  sector: string | null;
  position: string | null;
  employmentType: string | null;
  workShift: string | null;
  phone: string | null;
  alternatePhone: string | null;
  email: string | null;
  streetAddress: string | null;
  addressNumber: string | null;
  neighborhood: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  grossSalary: string | null;
  status: string;
  documentationStatus: string;
  hireDate: string | null;
  affiliationDate: string | null;
}

/** WHERE compartido por el listado y la exportación (parametrizado). */
function buildExploreWhere(f: AffiliateExploreFilters) {
  let where = sql`1=1`;
  if (f.search) {
    where = sql`${where} AND (
      a.full_name ILIKE ${"%" + f.search + "%"}
      OR a.dni ILIKE ${"%" + f.search + "%"}
      OR a.legajo ILIKE ${"%" + f.search + "%"}
      OR a.cuil ILIKE ${"%" + f.search + "%"}
    )`;
  }
  if (f.area) where = sql`${where} AND a.area ILIKE ${"%" + f.area + "%"}`;
  if (f.sector) where = sql`${where} AND a.sector ILIKE ${"%" + f.sector + "%"}`;
  if (f.city) where = sql`${where} AND a.city ILIKE ${"%" + f.city + "%"}`;
  if (f.neighborhood) where = sql`${where} AND a.neighborhood ILIKE ${"%" + f.neighborhood + "%"}`;
  if (f.province) where = sql`${where} AND a.province ILIKE ${"%" + f.province + "%"}`;
  if (f.employmentType) where = sql`${where} AND a.employment_type = ${f.employmentType}`;
  if (f.status) where = sql`${where} AND a.status = ${f.status}`;
  if (f.documentationStatus) where = sql`${where} AND a.documentation_status = ${f.documentationStatus}`;
  if (f.hasSalary === "yes") where = sql`${where} AND a.gross_salary IS NOT NULL AND a.gross_salary > 0`;
  if (f.hasSalary === "no") where = sql`${where} AND (a.gross_salary IS NULL OR a.gross_salary = 0)`;
  return where;
}

const EXPORT_SELECT = sql`
  a.id,
  a.full_name           AS "fullName",
  a.dni,
  a.cuil,
  a.legajo,
  a.area,
  a.sector,
  a.position,
  a.employment_type     AS "employmentType",
  a.work_shift          AS "workShift",
  a.phone,
  a.alternate_phone     AS "alternatePhone",
  a.email,
  a.street_address      AS "streetAddress",
  a.address_number      AS "addressNumber",
  a.neighborhood,
  a.city,
  a.province,
  a.postal_code         AS "postalCode",
  a.gross_salary        AS "grossSalary",
  a.status,
  a.documentation_status AS "documentationStatus",
  a.hire_date           AS "hireDate",
  a.affiliation_date    AS "affiliationDate"
`;

/** Listado paginado para la tabla del explorador. */
export async function exploreAffiliates(input: AffiliateExploreInput) {
  const { page, limit, ...filters } = input;
  const offset = (page - 1) * limit;
  const where = buildExploreWhere(filters);

  const [rows, countResult] = await Promise.all([
    db.execute(sql`
      SELECT ${EXPORT_SELECT}
      FROM affiliates a
      WHERE ${where}
      ORDER BY a.full_name ASC
      LIMIT ${limit} OFFSET ${offset}
    `),
    db.execute(sql`SELECT COUNT(*)::int AS count FROM affiliates a WHERE ${where}`),
  ]);

  const total = (countResult.rows[0] as { count: number })?.count ?? 0;
  return {
    data: rows.rows as unknown as AffiliateExportRow[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/** Todos los afiliados que matchean los filtros (para exportar). Cap defensivo. */
export async function getAffiliatesForExport(
  filters: AffiliateExploreFilters
): Promise<AffiliateExportRow[]> {
  const where = buildExploreWhere(filters);
  const rows = await db.execute(sql`
    SELECT ${EXPORT_SELECT}
    FROM affiliates a
    WHERE ${where}
    ORDER BY a.full_name ASC
    LIMIT 10000
  `);
  return rows.rows as unknown as AffiliateExportRow[];
}

/** Valores distintos para poblar los selects de filtros. */
export async function getAffiliateFilterOptions() {
  const result = await db.execute(sql`
    SELECT 'area' AS field, area AS value FROM affiliates WHERE area IS NOT NULL AND area <> ''
    UNION
    SELECT 'sector' AS field, sector AS value FROM affiliates WHERE sector IS NOT NULL AND sector <> ''
    UNION
    SELECT 'city' AS field, city AS value FROM affiliates WHERE city IS NOT NULL AND city <> ''
    UNION
    SELECT 'province' AS field, province AS value FROM affiliates WHERE province IS NOT NULL AND province <> ''
    ORDER BY value ASC
  `);

  const rows = result.rows as { field: string; value: string }[];
  return {
    areas: rows.filter((r) => r.field === "area").map((r) => r.value),
    sectors: rows.filter((r) => r.field === "sector").map((r) => r.value),
    cities: rows.filter((r) => r.field === "city").map((r) => r.value),
    provinces: rows.filter((r) => r.field === "province").map((r) => r.value),
  };
}

// ─── Obtener lista de áreas únicas ────────────────────────────────────────────

export async function getAreas(): Promise<string[]> {
  const result = await db
    .selectDistinct({ area: affiliates.area })
    .from(affiliates)
    .where(sql`area IS NOT NULL`)
    .orderBy(affiliates.area);

  return result.map((r) => r.area!).filter(Boolean);
}

export async function getAffiliateModuleSummary(): Promise<AffiliateModuleSummary> {
  const [statusRows, activeBenefitRows] = await Promise.all([
    db.execute(sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*) FILTER (WHERE status = 'inactive')::int AS inactive,
        COUNT(*) FILTER (WHERE status = 'active' AND (gross_salary IS NULL OR gross_salary <= 0))::int AS without_salary
      FROM affiliates
    `),
    db.execute(sql`
      SELECT COUNT(DISTINCT affiliate_id)::int AS count
      FROM benefits
      WHERE status = 'active'
    `),
  ]);

  const status = statusRows.rows[0] as {
    total: number;
    active: number;
    inactive: number;
    without_salary: number;
  };

  return {
    total: status?.total ?? 0,
    active: status?.active ?? 0,
    inactive: status?.inactive ?? 0,
    withActiveBenefit: (activeBenefitRows.rows[0] as { count: number })?.count ?? 0,
    withoutSalary: status?.without_salary ?? 0,
  };
}
