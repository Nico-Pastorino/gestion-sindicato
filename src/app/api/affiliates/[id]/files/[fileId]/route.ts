import { NextRequest, NextResponse } from "next/server";
import { deleteAffiliateFile } from "@/lib/services/files.service";
import { requireRole, authErrorResponse } from "@/lib/auth/guards";
import { isUuid } from "@/lib/utils/labels";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const session = await requireRole("admin", "operator");
    const { fileId } = await params;
    if (!isUuid(fileId)) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Archivo no encontrado" } },
        { status: 404 }
      );
    }
    await deleteAffiliateFile(fileId, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    if (error instanceof Error && error.message === "Archivo no encontrado") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: error.message } },
        { status: 404 }
      );
    }
    console.error("[DELETE /api/affiliates/[id]/files/[fileId]]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}
