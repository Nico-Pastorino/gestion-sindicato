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

// ─── Conciliación masiva: revertir cobro con motivo ──────────────────────────

export const UNCOLLECTED_REASONS = {
  licencia: "Licencia / sin actividad",
  renuncia: "Renuncia o desvinculación",
  error_municipal: "Error de la municipalidad",
  embargo: "Embargo / retención judicial",
  otro: "Otro motivo",
} as const;

export type UncollectedReason = keyof typeof UNCOLLECTED_REASONS;

export const bulkUnpaySchema = z.object({
  ids: z
    .array(z.string().uuid("ID de cuota inválido"))
    .min(1, "Seleccioná al menos una cuota")
    .max(500, "Demasiadas cuotas en una sola operación"),
  reason: z.enum(
    Object.keys(UNCOLLECTED_REASONS) as [UncollectedReason, ...UncollectedReason[]]
  ),
  note: z.string().trim().max(500).optional(),
});

export type BulkUnpayInput = z.infer<typeof bulkUnpaySchema>;

export type PayInstallmentInput = z.infer<typeof payInstallmentSchema>;
export type InstallmentFiltersInput = z.infer<typeof installmentFiltersSchema>;
