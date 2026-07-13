// Verificación de funciones puras nuevas: normalización de teléfonos para
// WhatsApp y render del saludo. Correr con: npx tsx scripts/test-nuevas-utils.ts
import {
  normalizeArgentinePhone,
  buildWhatsAppLink,
  renderBirthdayMessage,
  extractFirstName,
} from "../src/lib/utils/whatsapp";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures++;
    console.log(`✗ ${name}: esperado ${JSON.stringify(expected)}, obtuvo ${JSON.stringify(actual)}`);
  } else {
    console.log(`✓ ${name}`);
  }
}

check("celular con 0 inicial", normalizeArgentinePhone("0351 123-4567"), "5493511234567");
check("celular sin 0", normalizeArgentinePhone("3511234567"), "5493511234567");
check("ya con 549", normalizeArgentinePhone("549 351 1234567"), "5493511234567");
check("con 54 sin 9", normalizeArgentinePhone("54 351 1234567"), "5493511234567");
check("con 00 internacional", normalizeArgentinePhone("0054 9 351 1234567"), "5493511234567");
check("vacío", normalizeArgentinePhone("  "), null);
check("muy corto", normalizeArgentinePhone("123"), null);

check(
  "wa.me link con texto",
  buildWhatsAppLink("3511234567", "¡Feliz cumpleaños, Ana!"),
  "https://wa.me/5493511234567?text=%C2%A1Feliz%20cumplea%C3%B1os%2C%20Ana!"
);
check("wa.me sin teléfono válido", buildWhatsAppLink("abc", "hola"), null);

// El padrón carga los nombres como "Apellido Nombre"
check("apellido nombre", extractFirstName("GARCIA JUAN"), "Juan");
check("apellido + dos nombres", extractFirstName("PEREZ JUAN CARLOS"), "Juan");
check("con coma", extractFirstName("LOPEZ, MARIA ELENA"), "Maria");
check("una sola palabra", extractFirstName("MARIA"), "Maria");
check("minúsculas", extractFirstName("gomez maría"), "María");

check(
  "template {nombre}",
  renderBirthdayMessage("¡Feliz cumple, {nombre}!", "LOPEZ MARIA"),
  "¡Feliz cumple, Maria!"
);
check(
  "template {nombre_completo}",
  renderBirthdayMessage("Saludos a {nombre_completo}", " LOPEZ MARIA "),
  "Saludos a LOPEZ MARIA"
);

if (failures > 0) {
  console.log(`\n${failures} pruebas fallaron.`);
  process.exit(1);
}
console.log("\nTodas las pruebas pasaron.");
