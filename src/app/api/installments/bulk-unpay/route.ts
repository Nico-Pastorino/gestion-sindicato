import { NextRequest, NextResponse } from "next/server";
import { bulkUnpayInstallments } from "@/lib/services/installments.service";
import { bulkUnpaySchema } from "@/lib/validations/installment.schema";
import { requireRole, authErrorResponse } from "@/lib/auth/guards";
import { ZodError } from "zod";

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("admin", "operator");
    const body = await req.json();
    const input = bulkUnpaySchema.parse(body);
    const result = await bulkUnpayInstallments(input, session.user.id);
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
    console.error("[POST /api/installments/bulk-unpay]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}
