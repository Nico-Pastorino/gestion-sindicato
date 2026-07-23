import { NextRequest, NextResponse } from "next/server";
import { createAffiliate, searchAffiliates } from "@/lib/services/affiliates.service";
import { createAffiliateSchema, affiliateSearchSchema } from "@/lib/validations/affiliate.schema";
import { requireSession, requireRole, authErrorResponse } from "@/lib/auth/guards";
import {
  getPgError,
  uniqueViolationMessage,
  uniqueViolationField,
  checkViolationMessage,
  PG_UNIQUE_VIOLATION,
  PG_CHECK_VIOLATION,
} from "@/lib/utils/db-errors";
import { ZodError } from "zod";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const input = affiliateSearchSchema.parse(params);
    const result = await searchAffiliates(input);
    return NextResponse.json(result);
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Datos inválidos", details: error.issues } },
        { status: 400 }
      );
    }
    console.error("[GET /api/affiliates]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("admin", "operator");
    const body = await req.json();
    const input = createAffiliateSchema.parse(body);
    const affiliate = await createAffiliate(input, session.user.id);
    return NextResponse.json({ data: affiliate }, { status: 201 });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Datos inválidos", details: error.issues } },
        { status: 400 }
      );
    }
    // El error de Postgres viene envuelto por Drizzle: hay que leerlo de `cause`.
    const pgError = getPgError(error);
    if (pgError?.code === PG_UNIQUE_VIOLATION) {
      return NextResponse.json(
        {
          error: {
            code: "DUPLICATE_ERROR",
            message: uniqueViolationMessage(
              pgError,
              "Ya existe un afiliado con ese DNI o legajo"
            ),
            field: uniqueViolationField(pgError),
          },
        },
        { status: 409 }
      );
    }
    if (pgError?.code === PG_CHECK_VIOLATION) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: checkViolationMessage(
              pgError,
              "Alguno de los datos cargados tiene un valor no válido"
            ),
          },
        },
        { status: 400 }
      );
    }
    console.error("[POST /api/affiliates]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}
