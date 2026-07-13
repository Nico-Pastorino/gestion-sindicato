import { db } from "@/lib/db";
import { announcements } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { logAudit } from "./audit.service";

// ─── Novedades internas del sindicato (se muestran en el Inicio) ─────────────

export async function listAnnouncements() {
  return db.query.announcements.findMany({
    orderBy: [desc(announcements.createdAt)],
    limit: 50,
  });
}

export async function createAnnouncement(
  input: { title: string; body?: string | null; active?: boolean },
  userId?: string
) {
  const [announcement] = await db
    .insert(announcements)
    .values({
      title: input.title.trim(),
      body: input.body?.trim() || null,
      active: input.active ?? true,
      createdBy: userId ?? null,
    })
    .returning();

  await logAudit({
    userId,
    action: "announcement_created",
    entityType: "announcement",
    entityId: announcement.id,
    newValue: announcement,
  });

  return announcement;
}

export async function updateAnnouncement(
  input: { id: string; title?: string; body?: string | null; active?: boolean },
  userId?: string
) {
  const { id, ...data } = input;
  const existing = await db.query.announcements.findFirst({ where: eq(announcements.id, id) });
  if (!existing) throw new Error("Novedad no encontrada");

  const [updated] = await db
    .update(announcements)
    .set({
      ...(data.title !== undefined && { title: data.title.trim() }),
      ...(data.body !== undefined && { body: data.body?.trim() || null }),
      ...(data.active !== undefined && { active: data.active }),
    })
    .where(eq(announcements.id, id))
    .returning();

  await logAudit({
    userId,
    action: "announcement_updated",
    entityType: "announcement",
    entityId: id,
    oldValue: existing,
    newValue: updated,
  });

  return updated;
}

export async function deleteAnnouncement(id: string, userId?: string) {
  const existing = await db.query.announcements.findFirst({ where: eq(announcements.id, id) });
  if (!existing) throw new Error("Novedad no encontrada");

  await db.delete(announcements).where(eq(announcements.id, id));

  await logAudit({
    userId,
    action: "announcement_deleted",
    entityType: "announcement",
    entityId: id,
    oldValue: existing,
  });
}
