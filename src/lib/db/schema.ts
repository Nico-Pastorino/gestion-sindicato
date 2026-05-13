import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  boolean,
  date,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ─── Timestamps helper ────────────────────────────────────────────────────────

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ─── users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["admin", "operator", "readonly"] })
    .notNull()
    .default("operator"),
  passwordHash: text("password_hash"),
  ...timestamps,
});

// ─── affiliates ───────────────────────────────────────────────────────────────

export const affiliates = pgTable(
  "affiliates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fullName: text("full_name").notNull(),
    dni: text("dni").notNull(),
    legajo: text("legajo"),
    area: text("area"),
    grossSalary: numeric("gross_salary", { precision: 14, scale: 2 }),
    phone: text("phone"),
    status: text("status", { enum: ["active", "inactive"] })
      .notNull()
      .default("active"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("affiliates_dni_idx").on(t.dni),
    uniqueIndex("affiliates_legajo_idx").on(t.legajo),
    index("affiliates_full_name_idx").on(t.fullName),
    index("affiliates_status_idx").on(t.status),
  ]
);

// ─── benefits ─────────────────────────────────────────────────────────────────

export const benefits = pgTable(
  "benefits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    affiliateId: uuid("affiliate_id")
      .notNull()
      .references(() => affiliates.id, { onDelete: "restrict" }),
    date: date("date").notNull(),
    type: text("type", {
      enum: ["ayuda_economica", "supermercado", "otro"],
    }).notNull(),
    commerce: text("commerce"),
    // totalAmount = capital / monto otorgado al afiliado
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
    installmentsCount: integer("installments_count").notNull().default(1),
    // installmentAmount = cuota real mensual a descontar (puede incluir interés)
    installmentAmount: numeric("installment_amount", { precision: 14, scale: 2 }).notNull(),
    // Campos de interés
    totalRepaymentAmount: numeric("total_repayment_amount", { precision: 14, scale: 2 }).notNull(),
    interestAmount: numeric("interest_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    interestRate: numeric("interest_rate", { precision: 8, scale: 4 }).notNull().default("0"),
    firstDueDate: date("first_due_date"),
    status: text("status", { enum: ["active", "cancelled", "finished"] })
      .notNull()
      .default("active"),
    observations: text("observations"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [
    index("benefits_affiliate_id_idx").on(t.affiliateId),
    index("benefits_status_idx").on(t.status),
    index("benefits_type_idx").on(t.type),
    index("benefits_date_idx").on(t.date),
  ]
);

// ─── installments ─────────────────────────────────────────────────────────────

export const installments = pgTable(
  "installments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    benefitId: uuid("benefit_id")
      .notNull()
      .references(() => benefits.id, { onDelete: "restrict" }),
    affiliateId: uuid("affiliate_id")
      .notNull()
      .references(() => affiliates.id, { onDelete: "restrict" }),
    installmentNumber: integer("installment_number").notNull(),
    totalInstallments: integer("total_installments").notNull(),
    dueDate: date("due_date").notNull(),
    paidDate: date("paid_date"),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    status: text("status", {
      enum: ["pending", "paid", "overdue", "cancelled"],
    })
      .notNull()
      .default("pending"),
    // Campos para pago automático (cron)
    autoPaid: boolean("auto_paid").notNull().default(false),
    paidBy: text("paid_by", { enum: ["system", "admin", "operator"] }),
    ...timestamps,
  },
  (t) => [
    index("installments_affiliate_id_idx").on(t.affiliateId),
    index("installments_benefit_id_idx").on(t.benefitId),
    index("installments_status_idx").on(t.status),
    index("installments_due_date_idx").on(t.dueDate),
    index("installments_affiliate_status_idx").on(t.affiliateId, t.status),
  ]
);

// ─── audit_logs ───────────────────────────────────────────────────────────────

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    index("audit_logs_user_id_idx").on(t.userId),
    index("audit_logs_action_idx").on(t.action),
    index("audit_logs_created_at_idx").on(t.createdAt),
  ]
);

// ─── whatsapp_alerts ──────────────────────────────────────────────────────────

export const whatsappAlerts = pgTable(
  "whatsapp_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(),
    recipientPhone: text("recipient_phone").notNull(),
    message: text("message").notNull(),
    status: text("status", { enum: ["pending", "sent", "failed", "skipped"] })
      .notNull()
      .default("pending"),
    payload: jsonb("payload"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("whatsapp_alerts_status_idx").on(t.status),
    index("whatsapp_alerts_type_idx").on(t.type),
  ]
);

// ─── settings ─────────────────────────────────────────────────────────────────

export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  ...timestamps,
});

// ─── export_logs ──────────────────────────────────────────────────────────────

export const exportLogs = pgTable(
  "export_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull().default("municipality"),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    fileName: text("file_name"),
    recordsCount: integer("records_count").notNull().default(0),
    benefitsCount: integer("benefits_count").notNull().default(0),
    totalPrincipal: numeric("total_principal", { precision: 16, scale: 2 }).notNull().default("0"),
    totalInstallment: numeric("total_installment", { precision: 16, scale: 2 }).notNull().default("0"),
    totalInterest: numeric("total_interest", { precision: 16, scale: 2 }).notNull().default("0"),
    sentByEmail: boolean("sent_by_email").notNull().default(false),
    emailTo: text("email_to"),
    emailCc: text("email_cc"),
    sentByWhatsapp: boolean("sent_by_whatsapp").notNull().default(false),
    whatsappTo: text("whatsapp_to"),
    status: text("status", { enum: ["generated", "sent", "failed"] }).notNull().default("generated"),
    errorMessage: text("error_message"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => [
    index("export_logs_period_idx").on(t.periodStart, t.periodEnd),
    index("export_logs_status_idx").on(t.status),
    index("export_logs_created_at_idx").on(t.createdAt),
  ]
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const affiliatesRelations = relations(affiliates, ({ many }) => ({
  benefits: many(benefits),
  installments: many(installments),
}));

export const benefitsRelations = relations(benefits, ({ one, many }) => ({
  affiliate: one(affiliates, {
    fields: [benefits.affiliateId],
    references: [affiliates.id],
  }),
  createdByUser: one(users, {
    fields: [benefits.createdBy],
    references: [users.id],
  }),
  installments: many(installments),
}));

export const installmentsRelations = relations(installments, ({ one }) => ({
  benefit: one(benefits, {
    fields: [installments.benefitId],
    references: [benefits.id],
  }),
  affiliate: one(affiliates, {
    fields: [installments.affiliateId],
    references: [affiliates.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  benefits: many(benefits),
  auditLogs: many(auditLogs),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// ─── Type exports ─────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Affiliate = typeof affiliates.$inferSelect;
export type NewAffiliate = typeof affiliates.$inferInsert;

export type Benefit = typeof benefits.$inferSelect;
export type NewBenefit = typeof benefits.$inferInsert;

export type Installment = typeof installments.$inferSelect;
export type NewInstallment = typeof installments.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type WhatsappAlert = typeof whatsappAlerts.$inferSelect;
export type NewWhatsappAlert = typeof whatsappAlerts.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

export type ExportLog = typeof exportLogs.$inferSelect;
export type NewExportLog = typeof exportLogs.$inferInsert;
