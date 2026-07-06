import { NextRequest, NextResponse } from "next/server";
import { createAffiliate, searchAffiliates } from "@/lib/services/affiliates.service";
import { createAffiliateSchema, affiliateSearchSchema } from "@/lib/validations/affiliate.schema";
import { requireSession, requireRole, authErrorResponse } from "@/lib/auth/guards";
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
    if (error instanceof Error) {
      if (error.message.includes("unique") || error.message.includes("duplicate")) {
        return NextResponse.json(
          { error: { code: "DUPLICATE_ERROR", message: "Ya existe un afiliado con ese DNI o legajo" } },
          { status: 409 }
        );
      }
    }
    console.error("[POST /api/affiliates]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}
