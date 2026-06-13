import { NextRequest, NextResponse } from "next/server";
import {
  getAffiliateById,
  updateAffiliate,
} from "@/lib/services/affiliates.service";
import { updateAffiliateSchema } from "@/lib/validations/affiliate.schema";
import { requireSession, requireRole, authErrorResponse } from "@/lib/auth/guards";
import { ZodError } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;
    const affiliate = await getAffiliateById(id);

    if (!affiliate) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Afiliado no encontrado" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: affiliate });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    console.error("[GET /api/affiliates/[id]]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("admin", "operator");
    const { id } = await params;
    const body = await req.json();
    const input = updateAffiliateSchema.parse({ ...body, id });
    const updated = await updateAffiliate(input, session.user.id);
    return NextResponse.json({ data: updated });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Datos inválidos", details: error.issues } },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "Afiliado no encontrado") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: error.message } },
        { status: 404 }
      );
    }
    console.error("[PATCH /api/affiliates/[id]]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}
