import { z } from "zod";

export const createAffiliateSchema = z.object({
  fullName: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(200, "El nombre no puede superar 200 caracteres")
    .trim(),
  dni: z
    .string()
    .min(7, "El DNI debe tener al menos 7 dígitos")
    .max(15, "El DNI no puede superar 15 caracteres")
    .regex(/^\d+$/, "El DNI solo puede contener números")
    .trim(),
  legajo: z
    .string()
    .max(50, "El legajo no puede superar 50 caracteres")
    .trim()
    .optional()
    .nullable(),
  area: z
    .string()
    .max(100, "El área no puede superar 100 caracteres")
    .trim()
    .optional()
    .nullable(),
  sex: z
    .enum(["masculino", "femenino", "otro", "prefiero_no_responder"])
    .optional()
    .nullable(),
  employmentType: z
    .enum(["planta_permanente", "planta_temporaria", "jubilado"])
    .optional()
    .nullable(),
  hireDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)")
    .optional()
    .nullable(),
  sector: z.string().max(100, "El sector no puede superar 100 caracteres").trim().optional().nullable(),
  position: z.string().max(100, "El cargo no puede superar 100 caracteres").trim().optional().nullable(),
  workShift: z.string().max(80, "El turno no puede superar 80 caracteres").trim().optional().nullable(),
  affiliationDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)")
    .optional()
    .nullable(),
  alternatePhone: z.string().max(30, "El teléfono alternativo no puede superar 30 caracteres").trim().optional().nullable(),
  email: z.email("Email inválido").max(200, "El email no puede superar 200 caracteres").trim().optional().nullable(),
  cuil: z.string().max(20, "El CUIL no puede superar 20 caracteres").trim().optional().nullable(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)")
    .optional()
    .nullable(),
  maritalStatus: z.string().max(50, "El estado civil no puede superar 50 caracteres").trim().optional().nullable(),
  streetAddress: z.string().max(150, "La calle no puede superar 150 caracteres").trim().optional().nullable(),
  addressNumber: z.string().max(30, "El número no puede superar 30 caracteres").trim().optional().nullable(),
  neighborhood: z.string().max(100, "El barrio no puede superar 100 caracteres").trim().optional().nullable(),
  city: z.string().max(100, "La localidad no puede superar 100 caracteres").trim().optional().nullable(),
  province: z.string().max(100, "La provincia no puede superar 100 caracteres").trim().optional().nullable(),
  postalCode: z.string().max(20, "El código postal no puede superar 20 caracteres").trim().optional().nullable(),
  emergencyContactName: z.string().max(150, "El contacto de emergencia no puede superar 150 caracteres").trim().optional().nullable(),
  emergencyContactRelation: z.string().max(80, "El vínculo no puede superar 80 caracteres").trim().optional().nullable(),
  emergencyContactPhone: z.string().max(30, "El teléfono de emergencia no puede superar 30 caracteres").trim().optional().nullable(),
  documentationStatus: z.enum(["complete", "pending", "missing"]).default("pending"),
  privateNotes: z.string().max(1000, "Las notas internas no pueden superar 1000 caracteres").trim().optional().nullable(),
  grossSalary: z
    .number()
    .min(0, "El salario no puede ser negativo")
    .max(99_999_999, "El salario supera el máximo permitido")
    .optional()
    .nullable(),
  phone: z
    .string()
    .max(30, "El teléfono no puede superar 30 caracteres")
    .trim()
    .optional()
    .nullable(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const updateAffiliateSchema = createAffiliateSchema.partial().extend({
  id: z.string().uuid("ID de afiliado inválido"),
});

export const updateSalarySchema = z.object({
  id: z.string().uuid("ID de afiliado inválido"),
  grossSalary: z
    .number()
    .min(0, "El salario no puede ser negativo")
    .max(99_999_999, "El salario supera el máximo permitido"),
});

export const affiliateSearchSchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  area: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateAffiliateInput = z.infer<typeof createAffiliateSchema>;
export type UpdateAffiliateInput = z.infer<typeof updateAffiliateSchema>;
export type UpdateSalaryInput = z.infer<typeof updateSalarySchema>;
export type AffiliateSearchInput = z.infer<typeof affiliateSearchSchema>;
