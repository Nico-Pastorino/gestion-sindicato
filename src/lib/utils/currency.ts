/**
 * Convierte un input de moneda argentina a número.
 *
 * Formatos soportados (todos devuelven el mismo número):
 *   "$654.361,66"  → 654361.66
 *   "654.361,66"   → 654361.66
 *   "654361,66"    → 654361.66
 *   "$100.000,50"  → 100000.50
 *   "100000"       → 100000
 *   "100000.50"    → 100000.50 (punto decimal estilo US también aceptado)
 *   "1.000.000"    → 1000000
 */
export function parseCurrencyInput(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return isNaN(value) ? 0 : Math.abs(value);

  // Limpiar: quitar $ y espacios (incluyendo espacio no-break  )
  let s = String(value)
    .trim()
    .replace(/[\s ]/g, "")
    .replace(/\$/g, "");

  if (s === "" || s === "-") return 0;

  const hasComma = s.includes(",");
  const dotCount = (s.match(/\./g) || []).length;

  if (hasComma) {
    // Formato argentino: punto = separador de miles, coma = decimal
    // "654.361,66" → "654361.66"
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (dotCount > 1) {
    // Múltiples puntos = separadores de miles, sin decimal
    // "1.000.000" → "1000000"
    s = s.replace(/\./g, "");
  }
  // Un solo punto o ninguno: parseFloat lo maneja correctamente

  const result = parseFloat(s);
  return isNaN(result) ? 0 : Math.abs(result);
}

/**
 * Formatea un número como moneda argentina con símbolo $.
 * 827361.66 → "$ 827.361,66"
 */
export function formatCurrencyARS(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "$ 0,00";
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (isNaN(num)) return "$ 0,00";

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formatea un número como moneda argentina SIN símbolo $.
 * Útil para inputs donde el $ se muestra por separado.
 * 827361.66 → "827.361,66"
 */
export function formatNumberARS(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0,00";
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (isNaN(num)) return "0,00";

  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Valida que un valor sea un monto monetario positivo válido.
 */
export function isValidMoney(value: unknown): boolean {
  if (typeof value === "number") return !isNaN(value) && isFinite(value) && value > 0;
  if (typeof value === "string") return parseCurrencyInput(value) > 0;
  return false;
}

/** Alias explícito pedido por el sistema. */
export const validateMoney = isValidMoney;

/**
 * Redondea un monto a 2 decimales (modo bancario).
 */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

// Alias de compatibilidad
export const formatCurrency = formatCurrencyARS;
