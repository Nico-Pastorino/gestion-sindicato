import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import type { UserRole } from "@/types/next-auth";

// El proxy ya bloquea requests sin sesión, pero según la guía de seguridad
// de Next.js cada handler debe verificar autorización por su cuenta
// (un cambio de matcher no debe dejar endpoints expuestos).

export class AuthError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthError(401, "Sesión requerida");
  }
  return session;
}

export async function requireRole(...roles: UserRole[]): Promise<Session> {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    throw new AuthError(403, "No tenés permisos para realizar esta acción");
  }
  return session;
}

/** Convierte un AuthError en respuesta JSON; null si no es un AuthError. */
export function authErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof AuthError) {
    return NextResponse.json(
      {
        error: {
          code: error.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
          message: error.message,
        },
      },
      { status: error.status }
    );
  }
  return null;
}
