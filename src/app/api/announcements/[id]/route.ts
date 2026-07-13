import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { updateAnnouncement, deleteAnnouncement } from "@/lib/services/announcements.service";
import { requireRole, authErrorResponse } from "@/lib/auth/guards";

const updateAnnouncementSchema = z.object({
  title: z.string().trim().min(2, "El título es demasiado corto").max(200).optional(),
  body: z.string().trim().max(2000).optional().nullable(),
  active: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("admin", "operator");
    const { id } = await params;
    const body = await req.json();
    const input = updateAnnouncementSchema.parse(body);
    const data = await updateAnnouncement({ id, ...input }, session.user.id);
    return NextResponse.json({ data });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Datos inválidos", details: error.issues } },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "Novedad no encontrada") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: error.message } },
        { status: 404 }
      );
    }
    console.error("[PATCH /api/announcements/[id]]", error);
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
    await deleteAnnouncement(id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    if (error instanceof Error && error.message === "Novedad no encontrada") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: error.message } },
        { status: 404 }
      );
    }
    console.error("[DELETE /api/announcements/[id]]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}
