import { NextRequest, NextResponse } from "next/server";
import { unpayInstallment } from "@/lib/services/installments.service";
import { requireRole, authErrorResponse } from "@/lib/auth/guards";
import { z, ZodError } from "zod";

const paramsSchema = z.object({
  id: z.string().uuid("ID de cuota inválido"),
});

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("admin", "operator");
    const { id } = paramsSchema.parse(await params);
    const result = await unpayInstallment(id, session.user.id);
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
      const businessErrors = ["no encontrada", "no está pagada", "beneficio cancelado"];
      if (businessErrors.some((e) => error.message.includes(e))) {
        return NextResponse.json(
          { error: { code: "BUSINESS_ERROR", message: error.message } },
          { status: 422 }
        );
      }
    }
    console.error("[POST /api/installments/[id]/unpay]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}
