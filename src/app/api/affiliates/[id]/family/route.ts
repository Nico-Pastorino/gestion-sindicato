import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { listFamilyMembers, createFamilyMember } from "@/lib/services/family.service";
import { createFamilyMemberSchema } from "@/lib/validations/family.schema";
import { requireSession, requireRole, authErrorResponse } from "@/lib/auth/guards";
import { isUuid } from "@/lib/utils/labels";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;
    if (!isUuid(id)) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Afiliado no encontrado" } },
        { status: 404 }
      );
    }
    const data = await listFamilyMembers(id);
    return NextResponse.json({ data });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    console.error("[GET /api/affiliates/[id]/family]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("admin", "operator");
    const { id } = await params;
    const body = await req.json();
    const input = createFamilyMemberSchema.parse({ ...body, affiliateId: id });
    const data = await createFamilyMember(input, session.user.id);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Datos inválidos", details: error.issues } },
        { status: 400 }
      );
    }
    console.error("[POST /api/affiliates/[id]/family]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}
