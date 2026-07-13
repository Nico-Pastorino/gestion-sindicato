import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { updateFamilyMember, deleteFamilyMember } from "@/lib/services/family.service";
import { updateFamilyMemberSchema } from "@/lib/validations/family.schema";
import { requireRole, authErrorResponse } from "@/lib/auth/guards";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("admin", "operator");
    const { id } = await params;
    const body = await req.json();
    const input = updateFamilyMemberSchema.parse({ ...body, id });
    const data = await updateFamilyMember(input, session.user.id);
    return NextResponse.json({ data });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Datos inválidos", details: error.issues } },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "Familiar no encontrado") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: error.message } },
        { status: 404 }
      );
    }
    console.error("[PATCH /api/family-members/[id]]", error);
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
    const session = await requireRole("admin", "operator");
    const { id } = await params;
    await deleteFamilyMember(id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    if (error instanceof Error && error.message === "Familiar no encontrado") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: error.message } },
        { status: 404 }
      );
    }
    console.error("[DELETE /api/family-members/[id]]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}
