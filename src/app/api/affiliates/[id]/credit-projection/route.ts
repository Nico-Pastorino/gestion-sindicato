import { NextRequest, NextResponse } from "next/server";
import { getAffiliateById } from "@/lib/services/affiliates.service";
import { getMonthlyProjection } from "@/lib/services/benefits.service";
import { parseCurrencyInput } from "@/lib/utils/currency";
import { requireSession, authErrorResponse } from "@/lib/auth/guards";
import { z } from "zod";

const querySchema = z.object({
  installmentAmount: z.coerce.number().positive("La cuota debe ser mayor a 0"),
  installmentsCount: z.coerce.number().int().min(1).max(3),
  firstDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // Sueldo bruto cargado/editado en el formulario de Beneficios (todavía no
  // guardado). Si no se envía, se usa el que ya tiene el afiliado en la DB.
  grossSalary: z.coerce.number().positive().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;
    const raw = Object.fromEntries(req.nextUrl.searchParams);

    // Parsear monto con formato argentino si viene como string
    if (typeof raw.installmentAmount === "string") {
      raw.installmentAmount = String(parseCurrencyInput(raw.installmentAmount));
    }

    const parsed = querySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Parámetros inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const affiliate = await getAffiliateById(id);
    if (!affiliate) {
      return NextResponse.json(
        { ok: false, message: "Afiliado no encontrado" },
        { status: 404 }
      );
    }

    // Prioriza el sueldo cargado en el formulario (todavía no guardado) por
    // sobre el que ya tiene el afiliado en la DB.
    const grossSalary = parsed.data.grossSalary ?? Number(affiliate.grossSalary);
    if (!grossSalary || grossSalary <= 0) {
      return NextResponse.json(
        { ok: false, message: "El afiliado no tiene salario bruto registrado" },
        { status: 422 }
      );
    }

    const projection = await getMonthlyProjection(
      id,
      parsed.data.installmentAmount,
      parsed.data.installmentsCount,
      parsed.data.firstDueDate,
      grossSalary
    );

    return NextResponse.json({ ok: true, data: projection });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    console.error("[GET /api/affiliates/[id]/credit-projection]", error);
    return NextResponse.json(
      { ok: false, message: "Error al calcular la proyección" },
      { status: 500 }
    );
  }
}
