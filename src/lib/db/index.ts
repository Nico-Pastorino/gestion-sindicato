import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está definida en las variables de entorno.");
}

// WebSocket es necesario para transacciones reales en Node.js.
// En el browser se usa el WebSocket nativo; aquí forzamos el del paquete ws.
neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });

export type Database = typeof db;
