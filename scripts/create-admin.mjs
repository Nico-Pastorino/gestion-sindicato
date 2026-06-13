#!/usr/bin/env node
/**
 * Crea (o actualiza la contraseña de) un usuario administrador.
 *
 * Uso:
 *   node scripts/create-admin.mjs <email> <password> [nombre]
 *
 * Lee DATABASE_URL de las variables de entorno o de .env.local.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { hash } from "bcryptjs";

neonConfig.webSocketConstructor = ws;

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

loadEnvLocal();

const [email, password, name = "Administrador"] = process.argv.slice(2);

if (!email || !password) {
  console.error("Uso: node scripts/create-admin.mjs <email> <password> [nombre]");
  process.exit(1);
}
if (password.length < 8) {
  console.error("La contraseña debe tener al menos 8 caracteres.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL no está definida (ni en el entorno ni en .env.local).");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const passwordHash = await hash(password, 12);
  const normalizedEmail = email.trim().toLowerCase();

  const { rows } = await pool.query(
    `INSERT INTO users (name, email, role, password_hash)
     VALUES ($1, $2, 'admin', $3)
     ON CONFLICT (email)
     DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin', updated_at = now()
     RETURNING id, name, email, role`,
    [name, normalizedEmail, passwordHash]
  );

  console.log("✔ Usuario administrador listo:");
  console.log(`  id:    ${rows[0].id}`);
  console.log(`  email: ${rows[0].email}`);
  console.log(`  rol:   ${rows[0].role}`);
} catch (error) {
  console.error("Error al crear el administrador:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
