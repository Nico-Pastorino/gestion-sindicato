import { NextRequest, NextResponse } from "next/server";
import { listInstallments } from "@/lib/services/installments.service";
import { installmentFiltersSchema } from "@/lib/validations/installment.schema";
import { requireSession, authErrorResponse } from "@/lib/auth/guards";
import { ZodError } from "zod";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const input = installmentFiltersSchema.parse(params);
    const result = await listInstallments(input);
    return NextResponse.json(result);
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Parámetros inválidos", details: error.issues } },
        { status: 400 }
      );
    }
    console.error("[GET /api/installments]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}
