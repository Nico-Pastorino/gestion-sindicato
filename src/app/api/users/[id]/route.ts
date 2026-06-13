import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { updateUser, deleteUser } from "@/lib/services/users.service";
import { updateUserSchema } from "@/lib/validations/user.schema";
import { requireRole, authErrorResponse } from "@/lib/auth/guards";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("admin");
    const { id } = await params;
    const body = await req.json();
    const input = updateUserSchema.parse({ ...body, id });
    const updated = await updateUser(input, session.user.id);
    return NextResponse.json({ data: updated });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: error.issues[0]?.message ?? "Datos inválidos", details: error.issues } },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "Usuario no encontrado") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: error.message } },
        { status: 404 }
      );
    }
    console.error("[PATCH /api/users/[id]]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("admin");
    const { id } = await params;
    await deleteUser(id, session.user.id);
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    if (error instanceof Error) {
      if (error.message === "Usuario no encontrado") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: error.message } },
          { status: 404 }
        );
      }
      if (error.message.includes("tu propio usuario")) {
        return NextResponse.json(
          { error: { code: "BUSINESS_ERROR", message: error.message } },
          { status: 422 }
        );
      }
    }
    console.error("[DELETE /api/users/[id]]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}
