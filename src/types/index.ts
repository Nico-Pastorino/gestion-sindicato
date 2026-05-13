// ─── Re-exports del schema ────────────────────────────────────────────────────

export type {
  User,
  NewUser,
  Affiliate,
  NewAffiliate,
  Benefit,
  NewBenefit,
  Installment,
  NewInstallment,
  AuditLog,
  NewAuditLog,
  WhatsappAlert,
  NewWhatsappAlert,
  Setting,
  NewSetting,
  ExportLog,
  NewExportLog,
} from "@/lib/db/schema";

export type {
  MonthlyConflict,
  CreditProjectionResult,
} from "@/lib/validations/benefit.schema";

// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "operator" | "readonly";

export type AffiliateStatus = "active" | "inactive";

export type BenefitType = "ayuda_economica" | "supermercado" | "otro";

export type BenefitStatus = "active" | "cancelled" | "finished";

export type InstallmentStatus = "pending" | "paid" | "overdue" | "cancelled";

export type WhatsappAlertStatus = "pending" | "sent" | "failed" | "skipped";

export type AuditAction =
  | "affiliate_created"
  | "affiliate_updated"
  | "benefit_created"
  | "benefit_updated"
  | "benefit_cancelled"
  | "installment_paid"
  | "installment_cancelled"
  | "salary_updated"
  | "override_credit_limit"
  | "export_generated";

// ─── Vista: affiliate_credit_summary ─────────────────────────────────────────

export interface AffiliateCreditSummary {
  affiliateId: string;
  fullName: string;
  dni: string;
  legajo: string | null;
  area: string | null;
  status: AffiliateStatus;
  /** null si el afiliado todavía no tiene salario cargado */
  grossSalary: string | null;
  /** null si grossSalary es null */
  creditLimit30: string | null;
  /** Descuento del mes con mayor compromiso (peor mes individual). */
  activeDiscounts: string;
  /** null si grossSalary es null (no se puede calcular disponible) */
  availableAmount: string | null;
  /** Suma total de todas las cuotas pendientes/vencidas (informativo). */
  totalCommitted?: string;
}

// ─── API Response types ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  error?: never;
}

export interface ApiError {
  data?: never;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// ─── Filtros y paginación ─────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface AffiliateFilters {
  search?: string;
  status?: AffiliateStatus;
  area?: string;
}

export interface BenefitFilters {
  affiliateId?: string;
  type?: BenefitType;
  status?: BenefitStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface InstallmentFilters {
  affiliateId?: string;
  benefitId?: string;
  status?: InstallmentStatus;
  month?: number;
  year?: number;
  area?: string;
}

// ─── Tipos enriquecidos para vistas ──────────────────────────────────────────

export interface BenefitWithAffiliate {
  id: string;
  affiliateId: string;
  affiliateName: string;
  affiliateDni: string;
  date: string;
  type: BenefitType;
  commerce: string | null;
  totalAmount: string;
  installmentsCount: number;
  installmentAmount: string;
  status: BenefitStatus;
  observations: string | null;
  createdAt: string;
}

export interface InstallmentWithDetails {
  id: string;
  benefitId: string;
  affiliateId: string;
  affiliateName: string;
  affiliateDni: string;
  affiliateLegajo: string | null;
  affiliateArea: string | null;
  commerce: string | null;
  benefitType: BenefitType;
  installmentNumber: number;
  totalInstallments: number;
  dueDate: string;
  paidDate: string | null;
  amount: string;
  status: InstallmentStatus;
}

// ─── Dashboard metrics ────────────────────────────────────────────────────────

export interface DashboardMetrics {
  totalAffiliates: number;
  activeAffiliates: number;
  activeBenefits: number;
  finishedBenefits: number;
  monthlyGranted: string;
  totalPending: string;
  totalCollected: string;
  affiliatesWithoutCredit: number;
  affiliatesLowCredit: number;
  recentOperations: RecentOperation[];
  upcomingInstallments: InstallmentWithDetails[];
}

export interface RecentOperation {
  id: string;
  action: AuditAction;
  entityType: string;
  description: string;
  createdAt: string;
  userName?: string;
}

// ─── WhatsApp payload types ───────────────────────────────────────────────────

export interface BenefitCompletedPayload {
  affiliateId: string;
  affiliateName: string;
  affiliateDni: string;
  benefitId: string;
  benefitType: BenefitType;
  totalAmount: string;
  commerce: string | null;
}
