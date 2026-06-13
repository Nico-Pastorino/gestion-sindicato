import { NextRequest, NextResponse } from "next/server";
import { payInstallment } from "@/lib/services/installments.service";
import { payInstallmentSchema } from "@/lib/validations/installment.schema";
import { requireRole, authErrorResponse } from "@/lib/auth/guards";
import { ZodError } from "zod";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("admin", "operator");
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const input = payInstallmentSchema.parse({ ...body, id });
    const result = await payInstallment(input, session.user.id);
    return NextResponse.json({ data: result });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Datos inválidos", details: error.issues } },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      const businessErrors = ["no encontrada", "ya está pagada", "está cancelada"];
      if (businessErrors.some((e) => error.message.includes(e))) {
        return NextResponse.json(
          { error: { code: "BUSINESS_ERROR", message: error.message } },
          { status: 422 }
        );
      }
    }
    console.error("[POST /api/installments/[id]/pay]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}
