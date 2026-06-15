// Portón de acceso por contraseña única (sin usuarios ni roles).
// La contraseña vive en la variable de entorno APP_PASSWORD. Al ingresarla
// correctamente se guarda una cookie httpOnly con el hash SHA-256 de la
// contraseña; el proxy compara esa cookie contra el hash esperado.
// Usa solo Web Crypto para funcionar también en el runtime Edge (proxy).

export const GATE_COOKIE = "sindicato_gate";

/** SHA-256 en hex de un texto. Disponible en Edge y Node. */
export async function hashToken(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Hash esperado de la cookie, derivado de APP_PASSWORD.
 * Devuelve null si no hay contraseña configurada (portón desactivado).
 */
export async function getExpectedToken(): Promise<string | null> {
  const password = process.env.APP_PASSWORD;
  if (!password) return null;
  return hashToken(password);
}
