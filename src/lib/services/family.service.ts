import { db } from "@/lib/db";
import { familyMembers } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { logAudit } from "./audit.service";
import type {
  CreateFamilyMemberInput,
  UpdateFamilyMemberInput,
} from "@/lib/validations/family.schema";

// ─── Grupo familiar del afiliado ──────────────────────────────────────────────
// Los eventos se auditan sobre el afiliado (entityType 'affiliate') para que
// aparezcan en la línea de actividad de su ficha.

export async function listFamilyMembers(affiliateId: string) {
  return db.query.familyMembers.findMany({
    where: eq(familyMembers.affiliateId, affiliateId),
    orderBy: [asc(familyMembers.createdAt)],
  });
}

export async function createFamilyMember(input: CreateFamilyMemberInput, userId?: string) {
  const [member] = await db
    .insert(familyMembers)
    .values({
      affiliateId: input.affiliateId,
      fullName: input.fullName,
      relationship: input.relationship,
      dni: input.dni?.trim() || null,
      birthDate: input.birthDate || null,
      studentCertificate: input.studentCertificate ?? false,
      studentCertificateDate: input.studentCertificate ? input.studentCertificateDate || null : null,
      notes: input.notes?.trim() || null,
    })
    .returning();

  await logAudit({
    userId,
    action: "family_member_added",
    entityType: "affiliate",
    entityId: input.affiliateId,
    newValue: member,
  });

  return member;
}

export async function updateFamilyMember(input: UpdateFamilyMemberInput, userId?: string) {
  const { id, ...data } = input;

  const existing = await db.query.familyMembers.findFirst({ where: eq(familyMembers.id, id) });
  if (!existing) throw new Error("Familiar no encontrado");

  const [updated] = await db
    .update(familyMembers)
    .set({
      ...(data.fullName !== undefined && { fullName: data.fullName }),
      ...(data.relationship !== undefined && { relationship: data.relationship }),
      ...(data.dni !== undefined && { dni: data.dni?.trim() || null }),
      ...(data.birthDate !== undefined && { birthDate: data.birthDate || null }),
      ...(data.studentCertificate !== undefined && { studentCertificate: data.studentCertificate }),
      ...(data.studentCertificate !== undefined || data.studentCertificateDate !== undefined
        ? {
            studentCertificateDate:
              (data.studentCertificate ?? existing.studentCertificate)
                ? data.studentCertificateDate ?? existing.studentCertificateDate
                : null,
          }
        : {}),
      ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
    })
    .where(eq(familyMembers.id, id))
    .returning();

  await logAudit({
    userId,
    action: "family_member_updated",
    entityType: "affiliate",
    entityId: existing.affiliateId,
    oldValue: existing,
    newValue: updated,
  });

  return updated;
}

export async function deleteFamilyMember(id: string, userId?: string) {
  const existing = await db.query.familyMembers.findFirst({ where: eq(familyMembers.id, id) });
  if (!existing) throw new Error("Familiar no encontrado");

  await db.delete(familyMembers).where(eq(familyMembers.id, id));

  await logAudit({
    userId,
    action: "family_member_removed",
    entityType: "affiliate",
    entityId: existing.affiliateId,
    oldValue: existing,
  });
}
