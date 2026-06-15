import { NextResponse } from "next/server";

// Autenticación deshabilitada temporalmente: la app no usa login ni roles.
// Estos guards quedan como no-op para que los route handlers existentes sigan
// funcionando sin cambios. Para reactivar el control de acceso, volvé a
// implementar requireSession/requireRole contra el sistema de sesión.

export interface AppSession {
  user: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  };
}

export class AuthError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireSession(): Promise<AppSession> {
  return { user: {} };
}

export async function requireRole(..._roles: string[]): Promise<AppSession> {
  void _roles;
  return { user: {} };
}

/** Sin auth no se generan AuthError; siempre devuelve null. */
export function authErrorResponse(_error: unknown): NextResponse | null {
  void _error;
  return null;
}
