import { z } from "zod";
import { parseCurrencyInput } from "@/lib/utils/currency";

// Helper: acepta string con formato argentino o number
const moneyField = (label: string) =>
  z.union([
    z.number().positive(`${label} debe ser mayor a 0`),
    z.string().transform((v) => parseCurrencyInput(v)),
  ])
    .pipe(z.number().positive(`${label} debe ser mayor a 0`).max(99_999_999, `${label} supera el máximo`));

export const createBenefitSchema = z
  .object({
    affiliateId: z.string().uuid("ID de afiliado inválido"),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
    // firstDueDate es opcional: si no se envía, el backend lo calcula automáticamente
    // según la regla del día 20 a partir de `date`
    firstDueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)")
      .optional(),
    type: z.enum(["ayuda_economica", "supermercado", "otro"]),
    commerce: z
      .string()
      .max(200, "El comercio no puede superar 200 caracteres")
      .trim()
      .optional()
      .nullable(),
    // Monto otorgado al afiliado / capital
    totalAmount: moneyField("El monto otorgado"),
    installmentsCount: z
      .number()
      .int("La cantidad de cuotas debe ser un número entero")
      .min(1, "Debe tener al menos 1 cuota")
      .max(3, "El máximo es 3 cuotas"),
    // Monto real mensual a descontar (puede incluir interés)
    installmentAmount: moneyField("El monto por cuota"),
    observations: z
      .string()
      .max(500, "Las observaciones no pueden superar 500 caracteres")
      .trim()
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "supermercado" && data.installmentsCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["installmentsCount"],
        message: "El beneficio COMERCIO solo puede tener 1 cuota",
      });
    }

    if (data.type === "ayuda_economica" && data.installmentsCount > 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["installmentsCount"],
        message: "La ayuda económica permite un máximo de 3 cuotas",
      });
    }

    // La cuota no puede ser menor al capital dividido por cuotas (tolerancia 1%)
    const baseInstallment = data.totalAmount / data.installmentsCount;
    if (data.installmentAmount < baseInstallment * 0.99) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["installmentAmount"],
        message: `La cuota mensual no puede ser menor al capital dividido en cuotas ($${baseInstallment.toFixed(2)})`,
      });
    }
  });

export const cancelBenefitSchema = z.object({
  id: z.string().uuid("ID de beneficio inválido"),
  reason: z
    .string()
    .max(300, "El motivo no puede superar 300 caracteres")
    .trim()
    .optional(),
});

export const benefitFiltersSchema = z.object({
  affiliateId: z.string().uuid().optional(),
  type: z.enum(["ayuda_economica", "supermercado", "otro"]).optional(),
  status: z.enum(["active", "cancelled", "finished"]).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateBenefitInput = z.infer<typeof createBenefitSchema>;
export type CancelBenefitInput = z.infer<typeof cancelBenefitSchema>;
export type BenefitFiltersInput = z.infer<typeof benefitFiltersSchema>;

export interface MonthlyConflict {
  month: string;
  monthLabel: string;
  creditLimit30: number;
  activeDiscounts: number;
  newInstallment: number;
  projectedTotal: number;
  availableBefore: number;
  availableAfter: number;
  excess: number;
}

export interface CreditProjectionResult {
  valid: boolean;
  creditLimit30: number;
  months: Array<{
    month: string;
    monthLabel: string;
    creditLimit30: number;
    activeDiscounts: number;
    newInstallment: number;
    projectedTotal: number;
    availableAfter: number;
    ok: boolean;
  }>;
  conflicts: MonthlyConflict[];
}
