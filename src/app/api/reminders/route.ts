import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { listReminders, createReminder } from "@/lib/services/reminders.service";
import { requireSession, requireRole, authErrorResponse } from "@/lib/auth/guards";

const createReminderSchema = z.object({
  title: z.string().trim().min(2, "El recordatorio es demasiado corto").max(300),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const includeDone = req.nextUrl.searchParams.get("includeDone") === "true";
    const data = await listReminders(includeDone);
    return NextResponse.json({ data });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    console.error("[GET /api/reminders]", error);
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
    const input = createReminderSchema.parse(body);
    const data = await createReminder(
      { title: input.title, dueDate: input.dueDate || null },
      session.user.id
    );
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
    console.error("[POST /api/reminders]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}
