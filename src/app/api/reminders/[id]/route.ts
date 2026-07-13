import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { setReminderDone, deleteReminder } from "@/lib/services/reminders.service";
import { requireRole, authErrorResponse } from "@/lib/auth/guards";

const updateReminderSchema = z.object({
  done: z.boolean(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin", "operator");
    const { id } = await params;
    const body = await req.json();
    const input = updateReminderSchema.parse(body);
    const data = await setReminderDone(id, input.done);
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
    if (error instanceof Error && error.message === "Recordatorio no encontrado") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: error.message } },
        { status: 404 }
      );
    }
    console.error("[PATCH /api/reminders/[id]]", error);
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
    await requireRole("admin", "operator");
    const { id } = await params;
    await deleteReminder(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    console.error("[DELETE /api/reminders/[id]]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}
