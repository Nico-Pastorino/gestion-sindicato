import { NextRequest, NextResponse } from "next/server";
import { getAffiliateById } from "@/lib/services/affiliates.service";
import { getMonthlyProjection } from "@/lib/services/benefits.service";
import { parseCurrencyInput } from "@/lib/utils/currency";
import { z } from "zod";

const querySchema = z.object({
  installmentAmount: z.coerce.number().positive("La cuota debe ser mayor a 0"),
  installmentsCount: z.coerce.number().int().min(1).max(3),
  firstDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const grossSalary = Number(affiliate.grossSalary);
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
    console.error("[GET /api/affiliates/[id]/credit-projection]", error);
    return NextResponse.json(
      { ok: false, message: "Error al calcular la proyección" },
      { status: 500 }
    );
  }
}
