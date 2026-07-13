import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getAppSettings, updateAppSettings } from "@/lib/services/settings.service";
import { requireSession, requireRole, authErrorResponse } from "@/lib/auth/guards";

const updateSettingsSchema = z.object({
  whatsappBirthdayTemplate: z
    .string()
    .trim()
    .min(5, "El saludo es demasiado corto")
    .max(1000, "El saludo no puede superar 1000 caracteres")
    .optional(),
  weeklyDigestEmail: z
    .string()
    .trim()
    .email("Correo inválido")
    .max(200)
    .or(z.literal(""))
    .optional(),
});

export async function GET() {
  try {
    await requireSession();
    const data = await getAppSettings();
    return NextResponse.json({ data });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    console.error("[GET /api/settings]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireRole("admin", "operator");
    const body = await req.json();
    const input = updateSettingsSchema.parse(body);
    const data = await updateAppSettings(input, session.user.id);
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
    console.error("[PUT /api/settings]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
      { status: 500 }
    );
  }
}
