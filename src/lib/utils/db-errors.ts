// ─── Lectura de errores de Postgres ──────────────────────────────────────────
// Drizzle envuelve los errores del driver en un DrizzleQueryError cuyo mensaje
// es solamente el SQL que falló ("Failed query: insert into ..."). El error real
// de Postgres —con su código SQLSTATE y el nombre de la restricción violada—
// queda colgando en `cause`, a veces con más de un nivel de anidamiento.
//
// Por eso no alcanza con mirar `error.message`: hay que recorrer la cadena de
// causas. Si no se hace, un DNI repetido termina reportado como "Error interno
// del servidor" en vez de avisarle al usuario que el afiliado ya está cargado.

/** Códigos SQLSTATE que sabemos traducir a un mensaje entendible. */
export const PG_UNIQUE_VIOLATION = "23505";
export const PG_CHECK_VIOLATION = "23514";
export const PG_NOT_NULL_VIOLATION = "23502";
export const PG_FOREIGN_KEY_VIOLATION = "23503";

export interface PgErrorInfo {
  /** SQLSTATE, por ejemplo "23505". */
  code: string;
  /** Nombre de la restricción violada, si Postgres lo informó. */
  constraint?: string;
  /** Detalle crudo de Postgres, útil para los logs. */
  detail?: string;
}

/**
 * Recorre la cadena de `cause` buscando el error original de Postgres.
 * Devuelve null si el error no viene de la base.
 */
export function getPgError(error: unknown): PgErrorInfo | null {
  let current: unknown = error;

  // La cadena es corta, pero acotamos por las dudas para no colgarnos si
  // alguna vez apareciera una referencia circular.
  for (let depth = 0; current != null && depth < 10; depth++) {
    if (typeof current === "object") {
      const candidate = current as {
        code?: unknown;
        constraint?: unknown;
        detail?: unknown;
        cause?: unknown;
      };

      // Los SQLSTATE son siempre 5 caracteres alfanuméricos.
      if (typeof candidate.code === "string" && /^[0-9A-Z]{5}$/.test(candidate.code)) {
        return {
          code: candidate.code,
          constraint:
            typeof candidate.constraint === "string" ? candidate.constraint : undefined,
          detail: typeof candidate.detail === "string" ? candidate.detail : undefined,
        };
      }

      current = candidate.cause;
      continue;
    }

    break;
  }

  return null;
}

// ─── Mensajes por restricción ────────────────────────────────────────────────
// Cada restricción de la base se traduce al campo que el usuario ve en el
// formulario, así el aviso apunta al dato que hay que corregir.

interface UniqueViolation {
  /** Campo del formulario al que apunta el error, para poder resaltarlo. */
  field: string;
  message: string;
}

const UNIQUE_VIOLATIONS: Record<string, UniqueViolation> = {
  affiliates_dni_unique: {
    field: "dni",
    message: "Ya existe un afiliado cargado con ese DNI",
  },
  affiliates_dni_idx: {
    field: "dni",
    message: "Ya existe un afiliado cargado con ese DNI",
  },
  affiliates_legajo_unique: {
    field: "legajo",
    message: "Ya existe un afiliado cargado con ese legajo",
  },
  affiliates_legajo_idx: {
    field: "legajo",
    message: "Ya existe un afiliado cargado con ese legajo",
  },
};

const CHECK_MESSAGES: Record<string, string> = {
  affiliates_employment_type_check: "La situación de revista tiene un valor no válido",
  affiliates_sex_check: "El sexo tiene un valor no válido",
  affiliates_status_check: "El estado del afiliado tiene un valor no válido",
  affiliates_inactive_reason_check: "El motivo de baja tiene un valor no válido",
  affiliates_documentation_status_check:
    "El estado de documentación tiene un valor no válido",
  affiliates_gross_salary_check: "El salario no puede ser negativo",
};

/** Mensaje para mostrarle al usuario cuando se viola un índice único. */
export function uniqueViolationMessage(
  pgError: PgErrorInfo,
  fallback: string
): string {
  const known = pgError.constraint ? UNIQUE_VIOLATIONS[pgError.constraint] : undefined;
  return known?.message ?? fallback;
}

/** Campo del formulario responsable del duplicado, si lo podemos identificar. */
export function uniqueViolationField(pgError: PgErrorInfo): string | undefined {
  return pgError.constraint ? UNIQUE_VIOLATIONS[pgError.constraint]?.field : undefined;
}

/** Mensaje para mostrarle al usuario cuando se viola un CHECK. */
export function checkViolationMessage(
  pgError: PgErrorInfo,
  fallback: string
): string {
  const known = pgError.constraint ? CHECK_MESSAGES[pgError.constraint] : undefined;
  return known ?? fallback;
}
