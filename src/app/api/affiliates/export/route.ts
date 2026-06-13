import { NextRequest, NextResponse } from "next/server";
import { getAffiliatesForExport } from "@/lib/services/affiliates.service";
import { buildAffiliatesExcel } from "@/lib/utils/export-affiliates";
import { affiliateExploreFiltersSchema } from "@/lib/validations/affiliate.schema";
import { requireRole, authErrorResponse } from "@/lib/auth/guards";

export async function GET(req: NextRequest) {
  try {
    await requireRole("admin", "operator");
    const sp = req.nextUrl.searchParams;

    const filters = affiliateExploreFiltersSchema.parse({
      search: sp.get("search") || undefined,
      area: sp.get("area") || undefined,
      sector: sp.get("sector") || undefined,
      city: sp.get("city") || undefined,
      neighborhood: sp.get("neighborhood") || undefined,
      province: sp.get("province") || undefined,
      employmentType: sp.get("employmentType") || undefined,
      status: sp.get("status") || undefined,
      documentationStatus: sp.get("documentationStatus") || undefined,
      hasSalary: sp.get("hasSalary") || undefined,
    });

    const rows = await getAffiliatesForExport(filters);
    const result = buildAffiliatesExcel(rows);

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "X-Records-Count": String(result.recordsCount),
      },
    });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    console.error("[GET /api/affiliates/export]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error al generar el Excel" } },
      { status: 500 }
    );
  }
}
