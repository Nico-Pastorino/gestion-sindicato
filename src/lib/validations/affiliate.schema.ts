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
