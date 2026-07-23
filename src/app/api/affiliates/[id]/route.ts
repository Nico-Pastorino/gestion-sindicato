import { NextRequest, NextResponse } from "next/server";
import {
  getAffiliateById,
  updateAffiliate,
  deleteAffiliate,
} from "@/lib/services/affiliates.service";
import { updateAffiliateSchema } from "@/lib/validations/affiliate.schema";
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;
    const affiliate = await getAffiliateById(id);

    if (!affiliate) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Afiliado no encontrado" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: affiliate });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    console.error("[GET /api/affiliates/[id]]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("admin", "operator");
    const { id } = await params;
    const body = await req.json();
    const input = updateAffiliateSchema.parse({ ...body, id });
    const updated = await updateAffiliate(input, session.user.id);
    return NextResponse.json({ data: updated });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Datos inválidos", details: error.issues } },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "Afiliado no encontrado") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: error.message } },
        { status: 404 }
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
              "Ya existe otro afiliado con ese DNI o legajo"
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
    console.error("[PATCH /api/affiliates/[id]]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("admin", "operator");
    const { id } = await params;
    await deleteAffiliate(id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    if (error instanceof Error && error.message === "Afiliado no encontrado") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: error.message } },
        { status: 404 }
      );
    }
    if (error instanceof Error && error.message.startsWith("No se puede eliminar")) {
      return NextResponse.json(
        { error: { code: "HAS_BENEFITS", message: error.message } },
        { status: 409 }
      );
    }
    console.error("[DELETE /api/affiliates/[id]]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}
