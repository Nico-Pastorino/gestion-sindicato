import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { importAffiliates } from "@/lib/services/affiliates.service";
import { createAffiliateSchema } from "@/lib/validations/affiliate.schema";
import { requireRole, authErrorResponse } from "@/lib/auth/guards";

const importSchema = z.object({
  rows: z
    .array(createAffiliateSchema)
    .min(1, "El archivo no tiene filas válidas")
    .max(1000, "Máximo 1000 afiliados por importación"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("admin", "operator");
    const body = await req.json();
    const input = importSchema.parse(body);
    const result = await importAffiliates(input.rows, session.user.id);
    return NextResponse.json({ data: result });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Hay filas con datos inválidos", details: error.issues } },
        { status: 400 }
      );
    }
    console.error("[POST /api/affiliates/import]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}
