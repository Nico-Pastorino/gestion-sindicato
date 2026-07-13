import { NextRequest, NextResponse } from "next/server";
import { getAffiliateFileWithData } from "@/lib/services/files.service";
import { isUuid } from "@/lib/utils/labels";

// Sirve el binario de un archivo de afiliado guardado en la base.
// Es una ruta pública (fuera del portón de contraseña) porque la página de
// verificación de credenciales necesita mostrar la foto; el ID es un UUID
// no adivinable, mismo modelo de seguridad que un blob con URL aleatoria.

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isUuid(id)) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Archivo no encontrado" } },
        { status: 404 }
      );
    }

    const file = await getAffiliateFileWithData(id);
    if (!file || !file.data) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Archivo no encontrado" } },
        { status: 404 }
      );
    }

    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        "Content-Type": file.contentType ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.fileName)}"`,
        // Cada archivo es inmutable: si se reemplaza la foto, cambia el ID.
        "Cache-Control": "private, max-age=86400, immutable",
      },
    });
  } catch (error) {
    console.error("[GET /api/files/[id]]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}
