import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { listAnnouncements, createAnnouncement } from "@/lib/services/announcements.service";
import { requireSession, requireRole, authErrorResponse } from "@/lib/auth/guards";

const createAnnouncementSchema = z.object({
  title: z.string().trim().min(2, "El título es demasiado corto").max(200),
  body: z.string().trim().max(2000).optional().nullable(),
  active: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireSession();
    const data = await listAnnouncements();
    return NextResponse.json({ data });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    console.error("[GET /api/announcements]", error);
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
    const input = createAnnouncementSchema.parse(body);
    const data = await createAnnouncement(input, session.user.id);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Datos inválidos", details: error.issues } },
        { status: 400 }
      );
    }
    console.error("[POST /api/announcements]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}
