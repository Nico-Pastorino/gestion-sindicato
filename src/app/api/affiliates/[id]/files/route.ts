import { NextRequest, NextResponse } from "next/server";
import { listAffiliateFiles, uploadAffiliateFile } from "@/lib/services/files.service";
import { requireSession, requireRole, authErrorResponse } from "@/lib/auth/guards";
import { isUuid } from "@/lib/utils/labels";
import type { AffiliateFileKind } from "@/types";

const VALID_KINDS: AffiliateFileKind[] = ["foto", "dni", "ficha_firmada", "certificado", "otro"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;
    if (!isUuid(id)) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Afiliado no encontrado" } },
        { status: 404 }
      );
    }
    const data = await listAffiliateFiles(id);
    return NextResponse.json({ data });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    console.error("[GET /api/affiliates/[id]/files]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("admin", "operator");
    const { id } = await params;
    if (!isUuid(id)) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Afiliado no encontrado" } },
        { status: 404 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const kindRaw = formData.get("kind");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Falta el archivo a subir" } },
        { status: 400 }
      );
    }
    const kind = VALID_KINDS.includes(kindRaw as AffiliateFileKind)
      ? (kindRaw as AffiliateFileKind)
      : "otro";

    const data = await uploadAffiliateFile({
      affiliateId: id,
      kind,
      file,
      userId: session.user.id,
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    if (error instanceof Error && error.message === "Afiliado no encontrado") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: error.message } },
        { status: 404 }
      );
    }
    if (error instanceof Error) {
      // Errores de validación del servicio (tamaño, formato, storage sin configurar)
      return NextResponse.json(
        { error: { code: "UPLOAD_ERROR", message: error.message } },
        { status: 400 }
      );
    }
    console.error("[POST /api/affiliates/[id]/files]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}
