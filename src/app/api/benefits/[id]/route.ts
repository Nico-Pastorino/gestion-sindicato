import { NextRequest, NextResponse } from "next/server";
import {
  getBenefitById,
  cancelBenefit,
} from "@/lib/services/benefits.service";
import { cancelBenefitSchema } from "@/lib/validations/benefit.schema";
import { requireSession, requireRole, authErrorResponse } from "@/lib/auth/guards";
import { ZodError } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;
    const benefit = await getBenefitById(id);

    if (!benefit) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Beneficio no encontrado" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: benefit });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    console.error("[GET /api/benefits/[id]]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("admin", "operator");
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const input = cancelBenefitSchema.parse({ ...body, id });
    await cancelBenefit(input, session.user.id);
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Datos inválidos" } },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      const businessErrors = ["no encontrado", "cancelado", "finalizado"];
      if (businessErrors.some((e) => error.message.includes(e))) {
        return NextResponse.json(
          { error: { code: "BUSINESS_ERROR", message: error.message } },
          { status: 422 }
        );
      }
    }
    console.error("[DELETE /api/benefits/[id]]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}
