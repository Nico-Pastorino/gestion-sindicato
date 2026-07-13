// ─── Etiquetas compartidas en toda la app ─────────────────────────────────────
// Un solo lugar para traducir valores internos a texto claro para el usuario.
// Evita tener el mismo diccionario repetido en tablas, fichas y dashboards.

export function formatEmploymentType(value?: string | null): string {
  const labels: Record<string, string> = {
    planta_permanente: "Planta Permanente",
    planta_temporaria: "Planta Temporaria",
    jubilado: "Jubilado",
  };
  return value ? labels[value] ?? value : "Sin dato";
}

export function formatSex(value?: string | null): string {
  const labels: Record<string, string> = {
    masculino: "Masculino",
    femenino: "Femenino",
    otro: "Otro",
    prefiero_no_responder: "Prefiere no responder",
  };
  return value ? labels[value] ?? value : "Sin dato";
}

export function formatDocumentationStatus(value?: string | null): string {
  const labels: Record<string, string> = {
    complete: "Completa",
    pending: "Pendiente",
    missing: "Faltante",
  };
  return value ? labels[value] ?? value : "Pendiente";
}

export function formatAffiliateStatus(value?: string | null): string {
  return value === "active" ? "Activo" : "Inactivo";
}

export const INACTIVE_REASON_LABELS: Record<string, string> = {
  renuncia: "Renuncia",
  jubilacion: "Jubilación",
  fallecimiento: "Fallecimiento",
  traslado: "Traslado",
  otro: "Otro",
};

export function formatInactiveReason(value?: string | null): string {
  return value ? INACTIVE_REASON_LABELS[value] ?? value : "Sin dato";
}

export const FAMILY_RELATIONSHIP_LABELS: Record<string, string> = {
  conyuge: "Cónyuge",
  concubino_a: "Concubino/a",
  hijo_a: "Hijo/a",
  otro: "Otro",
};

export function formatFamilyRelationship(value?: string | null): string {
  return value ? FAMILY_RELATIONSHIP_LABELS[value] ?? value : "Sin dato";
}

export const AFFILIATE_FILE_KIND_LABELS: Record<string, string> = {
  foto: "Foto de perfil",
  dni: "DNI escaneado",
  ficha_firmada: "Ficha de afiliación firmada",
  certificado: "Certificado",
  otro: "Otro documento",
};

export function formatAffiliateFileKind(value?: string | null): string {
  return value ? AFFILIATE_FILE_KIND_LABELS[value] ?? value : "Otro documento";
}

/**
 * Valida formato UUID antes de consultar la base.
 * Evita que una URL con un ID inválido (ej: /beneficios/xyz)
 * rompa la pantalla con un error de Postgres en vez de un 404.
 */
export function isUuid(value: string | undefined | null): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
