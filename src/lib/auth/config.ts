import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/types/next-auth";

// Configuración base de NextAuth, sin providers ni acceso a DB.
// Se comparte entre el proxy (chequeo de sesión liviano) y la
// instancia completa de src/lib/auth/index.ts.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    // Jornada laboral: la sesión expira a las 12 horas.
    maxAge: 60 * 60 * 12,
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string | undefined) ?? "";
        session.user.role = (token.role as UserRole | undefined) ?? "readonly";
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
