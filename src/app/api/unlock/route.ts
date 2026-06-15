import { NextRequest, NextResponse } from "next/server";
import { GATE_COOKIE, hashToken } from "@/lib/auth/gate";

export async function POST(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return NextResponse.json(
      { ok: false, message: "El acceso por contraseña no está configurado (falta APP_PASSWORD)." },
      { status: 503 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { password?: unknown };
  const provided = typeof body.password === "string" ? body.password : "";

  if (provided !== password) {
    return NextResponse.json({ ok: false, message: "Contraseña incorrecta." }, { status: 401 });
  }

  const token = await hashToken(password);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(GATE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 días
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(GATE_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
