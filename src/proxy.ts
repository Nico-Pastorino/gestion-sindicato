import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

// Instancia liviana (sin providers ni DB) solo para leer la sesión JWT.
const { auth } = NextAuth(authConfig);

// Rutas API que manejan su propia autenticación:
// - /api/auth: NextAuth (login/logout)
// - /api/cron: protegidas por CRON_SECRET (Bearer token)
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/cron"];

export default auth((req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const isLoggedIn = Boolean(req.auth?.user);

  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return;
  }

  if (pathname.startsWith("/api")) {
    if (!isLoggedIn) {
      return Response.json(
        { error: { code: "UNAUTHORIZED", message: "Sesión requerida" } },
        { status: 401 }
      );
    }
    return;
  }

  if (pathname === "/login") {
    if (isLoggedIn) {
      return Response.redirect(new URL("/dashboard", nextUrl));
    }
    return;
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    if (pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", pathname + nextUrl.search);
    }
    return Response.redirect(loginUrl);
  }
});

export const config = {
  // Todo excepto estáticos. Las APIs sí pasan por acá (ver arriba).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|robots.txt).*)",
  ],
};
