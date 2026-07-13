import { NextRequest, NextResponse } from "next/server";
import { createBenefit, listBenefits, CreditLimitError } from "@/lib/services/benefits.service";
import { createBenefitSchema, benefitFiltersSchema } from "@/lib/validations/benefit.schema";
import { parseCurrencyInput } from "@/lib/utils/currency";
import { requireSession, requireRole, authErrorResponse } from "@/lib/auth/guards";
import { ZodError } from "zod";

const isDev = process.env.NODE_ENV === "development";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const input = benefitFiltersSchema.parse(params);
    const result = await listBenefits(input);
    return NextResponse.json(result);
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    if (error instanceof ZodError) {
      return NextResponse.json(
        { ok: false, message: "Parámetros inválidos", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[GET /api/benefits]", error);
    return NextResponse.json(
      { ok: false, message: "Error al obtener beneficios" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: unknown = null;

  const sessionOrError = await requireRole("admin", "operator").catch((e) => e);
  const authRes = authErrorResponse(sessionOrError);
  if (authRes) return authRes;
  const session = sessionOrError as Awaited<ReturnType<typeof requireRole>>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "El cuerpo de la solicitud no es válido o está vacío." },
      { status: 400 }
    );
  }

  if (isDev) {
    console.log("[POST /api/benefits] payload recibido:", JSON.stringify(body, null, 2));
  }

  try {
    // Normalizar montos con formato argentino si vienen como string
    const raw = body as Record<string, unknown>;

    const totalAmountRaw = typeof raw.totalAmount === "string"
      ? parseCurrencyInput(raw.totalAmount)
      : raw.totalAmount;
    const installmentAmountRaw = typeof raw.installmentAmount === "string"
      ? parseCurrencyInput(raw.installmentAmount)
      : raw.installmentAmount;
    const commerceRetentionRateRaw = typeof raw.commerceRetentionRate === "string"
      ? Number(raw.commerceRetentionRate.replace(",", "."))
      : raw.commerceRetentionRate;
    const grossSalaryRaw = typeof raw.grossSalary === "string"
      ? parseCurrencyInput(raw.grossSalary)
      : raw.grossSalary;

    const normalized: Record<string, unknown> = {
      ...raw,
      totalAmount: totalAmountRaw,
      installmentAmount: installmentAmountRaw,
      commerceRetentionRate: commerceRetentionRateRaw ?? 0,
      ...(grossSalaryRaw != null && { grossSalary: grossSalaryRaw }),
    };

    if (isDev) {
      console.log("[POST /api/benefits] normalizado:", {
        affiliateId: normalized.affiliateId,
        type: normalized.type,
        totalAmount: normalized.totalAmount,
        installmentsCount: normalized.installmentsCount,
        installmentAmount: normalized.installmentAmount,
        firstDueDate: normalized.firstDueDate,
        date: normalized.date,
      });
    }

    // Validaciones de negocio claras antes del schema Zod
    if (!normalized.affiliateId) {
      return NextResponse.json({ ok: false, message: "El afiliado es obligatorio." }, { status: 400 });
    }
    if (!normalized.totalAmount || Number(normalized.totalAmount) <= 0) {
      return NextResponse.json({ ok: false, message: "El monto otorgado es obligatorio y debe ser mayor a 0." }, { status: 400 });
    }
    if (!normalized.installmentAmount || Number(normalized.installmentAmount) <= 0) {
      return NextResponse.json({ ok: false, message: "El monto por cuota es obligatorio y debe ser mayor a 0." }, { status: 400 });
    }
    if (!normalized.installmentsCount || Number(normalized.installmentsCount) < 1) {
      return NextResponse.json({ ok: false, message: "La cantidad de cuotas es obligatoria." }, { status: 400 });
    }
    if (normalized.type === "ayuda_economica" && Number(normalized.installmentsCount) > 3) {
      return NextResponse.json({ ok: false, message: "La ayuda económica permite un máximo de 3 cuotas." }, { status: 400 });
    }
    if (normalized.type === "supermercado" && Number(normalized.installmentsCount) !== 1) {
      return NextResponse.json({ ok: false, message: "El beneficio Comercio solo puede tener 1 cuota." }, { status: 400 });
    }
    if (normalized.type === "supermercado" && Number(normalized.commerceRetentionRate) <= 0) {
      return NextResponse.json({ ok: false, message: "El porcentaje de retención del comercio es obligatorio." }, { status: 400 });
    }

    const input = createBenefitSchema.parse(normalized);
    const result = await createBenefit(input, session.user.id);

    if (isDev) {
      console.log("[POST /api/benefits] creado:", result.benefit.id);
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Beneficio creado correctamente.",
        benefit: result.benefit,
        installments: result.installments,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      if (isDev) console.log("[POST /api/benefits] ZodError:", error.issues);
      const firstIssue = error.issues[0];
      const fieldLabel: Record<string, string> = {
        affiliateId: "El afiliado",
        totalAmount: "El monto otorgado",
        installmentAmount: "El monto por cuota",
        installmentsCount: "La cantidad de cuotas",
        type: "El tipo de beneficio",
        date: "La fecha",
        firstDueDate: "El primer mes de descuento",
        commerceRetentionRate: "El porcentaje de retención",
        commerce: "El comercio",
      };
      const msg = firstIssue
        ? `${fieldLabel[String(firstIssue.path[0])] ?? "Campo"}: ${firstIssue.message}`
        : "Datos inválidos.";
      return NextResponse.json(
        { ok: false, message: msg, details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof CreditLimitError) {
      return NextResponse.json(
        {
          ok: false,
          code: "CREDIT_LIMIT_EXCEEDED",
          message: error.message,
          details: {
            affiliateName: error.details.affiliateName,
            grossSalary: error.details.grossSalary,
            creditLimit30: error.details.creditLimit30,
            conflicts: error.details.conflicts,
            firstConflict: error.details.firstConflict,
          },
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      const safeMessages: Record<string, number> = {
        "Afiliado no encontrado": 404,
        "El afiliado no tiene salario bruto registrado": 422,
        "no puede ser menor al capital": 400,
      };
      for (const [key, status] of Object.entries(safeMessages)) {
        if (error.message.includes(key)) {
          return NextResponse.json({ ok: false, message: error.message }, { status });
        }
      }
    }

    // Error inesperado: loguear completo en server, mensaje seguro al cliente
    console.error("[POST /api/benefits] Error inesperado:", error);
    return NextResponse.json(
      { ok: false, message: "Error inesperado al crear el beneficio." },
      { status: 500 }
    );
  }
}
