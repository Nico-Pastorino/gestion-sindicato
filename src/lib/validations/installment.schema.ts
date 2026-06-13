import { z } from "zod";

export const payInstallmentSchema = z.object({
  id: z.string().uuid("ID de cuota inválido"),
  paidDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)")
    .optional(),
});

export const installmentFiltersSchema = z.object({
  affiliateId: z.string().uuid().optional(),
  benefitId: z.string().uuid().optional(),
  // "unpaid" agrupa pending + overdue (cuotas no cobradas)
  status: z.enum(["pending", "paid", "overdue", "cancelled", "unpaid"]).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  area: z.string().trim().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type PayInstallmentInput = z.infer<typeof payInstallmentSchema>;
export type InstallmentFiltersInput = z.infer<typeof installmentFiltersSchema>;
