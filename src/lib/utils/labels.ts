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

/**
 * Valida formato UUID antes de consultar la base.
 * Evita que una URL con un ID inválido (ej: /beneficios/xyz)
 * rompa la pantalla con un error de Postgres en vez de un 404.
 */
export function isUuid(value: string | undefined | null): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
