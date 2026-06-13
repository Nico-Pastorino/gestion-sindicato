import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { listUsers, createUser } from "@/lib/services/users.service";
import { createUserSchema } from "@/lib/validations/user.schema";
import { requireRole, authErrorResponse } from "@/lib/auth/guards";

export async function GET() {
  try {
    await requireRole("admin");
    const data = await listUsers();
    return NextResponse.json({ data });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    console.error("[GET /api/users]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("admin");
    const body = await req.json();
    const input = createUserSchema.parse(body);
    const user = await createUser(input, session.user.id);
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: error.issues[0]?.message ?? "Datos inválidos", details: error.issues } },
        { status: 400 }
      );
    }
    if (error instanceof Error && (error.message.includes("unique") || error.message.includes("duplicate"))) {
      return NextResponse.json(
        { error: { code: "DUPLICATE_ERROR", message: "Ya existe un usuario con ese email" } },
        { status: 409 }
      );
    }
    console.error("[POST /api/users]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}
