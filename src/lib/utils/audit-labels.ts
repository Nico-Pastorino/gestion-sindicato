// Etiquetas y tipos de auditoría, sin dependencias de servidor (DB), para poder
// usarlos tanto en componentes server como client.

export interface AuditLogRow {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAt: string;
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  affiliate_created: "Afiliado creado",
  affiliate_updated: "Afiliado actualizado",
  affiliate_deleted: "Afiliado eliminado",
  benefit_created: "Beneficio creado",
  benefit_updated: "Beneficio actualizado",
  benefit_cancelled: "Beneficio cancelado",
  installment_paid: "Cuota cobrada (manual)",
  installment_auto_paid: "Cuota cobrada (automático)",
  installment_unpaid: "Cuota revertida / no cobrada",
  installment_cancelled: "Cuota cancelada",
  salary_updated: "Salario actualizado",
  override_credit_limit: "Override de tope de crédito",
  export_generated: "Exportación generada",
  user_created: "Usuario creado",
  user_updated: "Usuario actualizado",
  user_password_reset: "Contraseña restablecida",
  user_deleted: "Usuario eliminado",
  affiliates_imported: "Afiliados importados desde Excel",
  family_member_added: "Familiar agregado",
  family_member_updated: "Familiar actualizado",
  family_member_removed: "Familiar eliminado",
  affiliate_file_uploaded: "Archivo subido",
  affiliate_file_deleted: "Archivo eliminado",
  settings_updated: "Configuración actualizada",
  announcement_created: "Novedad creada",
  announcement_updated: "Novedad actualizada",
  announcement_deleted: "Novedad eliminada",
};

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  affiliate: "Afiliado",
  benefit: "Beneficio",
  installment: "Cuota",
  user: "Usuario",
  export: "Exportación",
  settings: "Configuración",
  announcement: "Novedad",
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export function auditEntityLabel(entityType: string): string {
  return AUDIT_ENTITY_LABELS[entityType] ?? entityType;
}

/** Detalle corto y legible derivado de old/new value, cuando aporta contexto. */
export function auditDetail(log: Pick<AuditLogRow, "action" | "newValue" | "oldValue">): string | null {
  const nv = log.newValue ?? {};
  const ov = log.oldValue ?? {};

  if (log.action === "installment_unpaid" && typeof nv.uncollectedReason === "string") {
    return nv.uncollectedReason;
  }
  if (log.action === "benefit_updated" && ov.status && nv.status) {
    return `${ov.status} → ${nv.status}`;
  }
  if (log.action === "salary_updated") {
    return "Se modificó el salario bruto";
  }
  return null;
}
