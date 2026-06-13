import { db } from "@/lib/db";
import { affiliates } from "@/lib/db/schema";
import { eq, ilike, or, and, sql } from "drizzle-orm";
import { logAudit } from "./audit.service";
import type {
  CreateAffiliateInput,
  UpdateAffiliateInput,
  AffiliateSearchInput,
} from "@/lib/validations/affiliate.schema";
import type { AffiliateCreditSummary } from "@/types";

// ─── Obtener disponible de un afiliado (desde la vista SQL) ──────────────────

export async function getAffiliateCreditSummary(
  affiliateId: string
): Promise<AffiliateCreditSummary | null> {
  const result = await db.execute(
    sql`
      SELECT
        affiliate_id    AS "affiliateId",
        full_name       AS "fullName",
        dni,
        legajo,
        area,
        status,
        gross_salary    AS "grossSalary",
        credit_limit_30 AS "creditLimit30",
        active_discounts AS "activeDiscounts",
        available_amount AS "availableAmount"
      FROM affiliate_credit_summary
      WHERE affiliate_id = ${affiliateId}
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
      legajo: input.legajo ?? null,
      area: input.area ?? null,
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
      ...(data.legajo !== undefined && { legajo: data.legajo }),
      ...(data.area !== undefined && { area: data.area }),
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
        a.sector,
        a.phone,
        a.email,
        a.documentation_status AS "documentationStatus",
        acs.status,
        acs.gross_salary      AS "grossSalary",
        acs.credit_limit_30   AS "creditLimit30",
        acs.active_discounts  AS "activeDiscounts",
        acs.available_amount  AS "availableAmount",
        acs.total_committed   AS "totalCommitted"
      FROM affiliate_credit_summary acs
      JOIN affiliates a ON a.id = acs.affiliate_id
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

// ─── Obtener lista de áreas únicas ────────────────────────────────────────────

export async function getAreas(): Promise<string[]> {
  const result = await db
    .selectDistinct({ area: affiliates.area })
    .from(affiliates)
    .where(sql`area IS NOT NULL`)
    .orderBy(affiliates.area);

  return result.map((r) => r.area!).filter(Boolean);
}
