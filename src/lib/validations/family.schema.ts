import { z } from "zod";

export const createFamilyMemberSchema = z.object({
  affiliateId: z.string().uuid("ID de afiliado inválido"),
  fullName: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(200, "El nombre no puede superar 200 caracteres")
    .trim(),
  relationship: z.enum(["conyuge", "concubino_a", "hijo_a", "otro"]).default("hijo_a"),
  dni: z
    .string()
    .max(15, "El DNI no puede superar 15 caracteres")
    .regex(/^\d*$/, "El DNI solo puede contener números")
    .trim()
    .optional()
    .nullable(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)")
    .optional()
    .nullable()
    .or(z.literal("")),
  studentCertificate: z.boolean().default(false),
  studentCertificateDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)")
    .optional()
    .nullable()
    .or(z.literal("")),
  notes: z.string().max(1000, "Las notas no pueden superar 1000 caracteres").trim().optional().nullable(),
});

export const updateFamilyMemberSchema = createFamilyMemberSchema
  .omit({ affiliateId: true })
  .partial()
  .extend({
    id: z.string().uuid("ID de familiar inválido"),
  });

export type CreateFamilyMemberInput = z.infer<typeof createFamilyMemberSchema>;
export type UpdateFamilyMemberInput = z.infer<typeof updateFamilyMemberSchema>;
