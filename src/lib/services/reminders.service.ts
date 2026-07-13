import { db } from "@/lib/db";
import { reminders } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";

// ─── Recordatorios internos del equipo ────────────────────────────────────────
// Notas operativas simples ("reclamar ficha firmada de X"). Sin auditoría:
// son efímeros y no tocan datos de afiliados.

export async function listReminders(includeDone = false) {
  if (includeDone) {
    return db.query.reminders.findMany({
      orderBy: [desc(reminders.createdAt)],
      limit: 50,
    });
  }
  return db.query.reminders.findMany({
    where: eq(reminders.status, "pending"),
    orderBy: [sql`${reminders.dueDate} ASC NULLS LAST`, desc(reminders.createdAt)],
    limit: 50,
  });
}

export async function createReminder(input: { title: string; dueDate?: string | null }, userId?: string) {
  const [reminder] = await db
    .insert(reminders)
    .values({
      title: input.title.trim(),
      dueDate: input.dueDate || null,
      createdBy: userId ?? null,
    })
    .returning();
  return reminder;
}

export async function setReminderDone(id: string, done: boolean) {
  const [updated] = await db
    .update(reminders)
    .set({
      status: done ? "done" : "pending",
      doneAt: done ? new Date() : null,
    })
    .where(eq(reminders.id, id))
    .returning();
  if (!updated) throw new Error("Recordatorio no encontrado");
  return updated;
}

export async function deleteReminder(id: string) {
  await db.delete(reminders).where(eq(reminders.id, id));
}
