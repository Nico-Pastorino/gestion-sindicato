import { NextRequest, NextResponse } from "next/server";
import { listExportLogs } from "@/lib/services/exports.service";
import { requireSession, authErrorResponse } from "@/lib/auth/guards";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10);
    const logs = await listExportLogs(Math.min(limit, 50));
    return NextResponse.json({ ok: true, data: logs });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    console.error("[GET /api/exports/logs]", error);
    return NextResponse.json({ ok: false, message: "Error al obtener historial." }, { status: 500 });
  }
}
