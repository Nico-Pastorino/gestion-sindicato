// Helpers para enviar mensajes desde el WhatsApp del sindicato vía enlaces
// wa.me (click-to-chat): se abre WhatsApp con el chat y el texto ya cargados,
// y el operador solo toca "enviar". No requiere API ni proveedor externo.

/**
 * Normaliza un teléfono argentino al formato que espera wa.me (54 9 + área + número).
 * Acepta números guardados con o sin código de país y con 0 inicial.
 */
export function normalizeArgentinePhone(raw: string): string | null {
  let digits = raw.replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("549")) return digits;
  if (digits.startsWith("54")) return "549" + digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length < 8) return null;
  return "549" + digits;
}

export function buildWhatsAppLink(phone: string, message: string): string | null {
  const normalized = normalizeArgentinePhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

/** "JUAN" / "juan carlos" → "Juan" / "Juan Carlos". */
function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/(^|[\s-])\p{L}/gu, (c) => c.toUpperCase());
}

/**
 * Nombre de pila a partir del nombre completo del padrón.
 * El padrón se carga como "Apellido Nombre" (o "Apellido, Nombre"), así que:
 * - si hay coma, se toma la primera palabra después de la coma;
 * - si no, se toma la segunda palabra ("GARCIA JUAN" → "Juan").
 */
export function extractFirstName(fullName: string): string {
  const name = fullName.trim();
  if (!name) return name;

  const commaParts = name.split(",");
  if (commaParts.length > 1 && commaParts[1].trim()) {
    return titleCase(commaParts[1].trim().split(/\s+/)[0]);
  }

  const words = name.split(/\s+/);
  return titleCase(words[1] ?? words[0]);
}

/** Reemplaza {nombre} (nombre de pila) y {nombre_completo} en el texto del saludo. */
export function renderBirthdayMessage(template: string, fullName: string): string {
  return template
    .replaceAll("{nombre}", extractFirstName(fullName))
    .replaceAll("{nombre_completo}", fullName.trim());
}
