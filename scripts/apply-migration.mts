// Aplica un archivo de migración SQL contra DATABASE_URL.
// Uso: npx tsx --env-file=.env.local scripts/apply-migration.mts drizzle/migrations/0008_padron_extras.sql
import { readFileSync } from "node:fs";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;

const file = process.argv[2];
if (!file) {
  console.error("Falta el archivo de migración.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL no está definida.");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(sql);
  console.log(`OK: migración ${file} aplicada.`);
} finally {
  await pool.end();
}
