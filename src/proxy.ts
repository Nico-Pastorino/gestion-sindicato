import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, getExpectedToken } from "@/lib/auth/gate";

// Rutas que NO requieren contraseña:
// - /unlock y /api/unlock: la propia pantalla de ingreso
// - /api/cron: protegidas por su propio CRON_SECRET (Bearer)
const PUBLIC_PREFIXES = ["/unlock", "/api/unlock", "/api/cron"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const expected = await getExpectedToken();

  // Sin APP_PASSWORD configurada el portón queda desactivado (app abierta).
  if (!expected) return NextResponse.next();

  const token = req.cookies.get(GATE_COOKIE)?.value;
  if (token && token === expected) {
    return NextResponse.next();
  }

  // No autenticado
  if (pathname.startsWith("/api")) {
    return NextResponse.json(
      { error: { code: "LOCKED", message: "Acceso bloqueado: ingresá la contraseña." } },
      { status: 401 }
    );
  }

  const url = new URL("/unlock", req.nextUrl);
  if (pathname !== "/") {
    url.searchParams.set("from", pathname + req.nextUrl.search);
  }
  return NextResponse.redirect(url);
}

export const config = {
  // Todo excepto archivos estáticos. Las páginas y APIs pasan por acá.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|robots.txt).*)",
  ],
};
