import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

// WebSocket es necesario para transacciones reales en Node.js.
// En el browser se usa el WebSocket nativo; aquí forzamos el del paquete ws.
neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;

let pool: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no está definida en las variables de entorno.");
  }

  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  if (!dbInstance) {
    dbInstance = drizzle(pool, { schema });
  }

  return dbInstance;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export type Database = typeof db;
