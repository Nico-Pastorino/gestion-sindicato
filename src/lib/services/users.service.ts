import { hash } from "bcryptjs";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { logAudit } from "./audit.service";
import type { CreateUserInput, UpdateUserInput } from "@/lib/validations/user.schema";

const BCRYPT_ROUNDS = 12;

// Nunca exponer passwordHash fuera de este servicio.
const publicUserColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

export async function listUsers() {
  return db
    .select(publicUserColumns)
    .from(users)
    .orderBy(asc(users.name));
}

export async function createUser(input: CreateUserInput, actorId?: string) {
  const passwordHash = await hash(input.password, BCRYPT_ROUNDS);

  const [user] = await db
    .insert(users)
    .values({
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash,
    })
    .returning(publicUserColumns);

  await logAudit({
    userId: actorId,
    action: "user_created",
    entityType: "user",
    entityId: user.id,
    newValue: { name: user.name, email: user.email, role: user.role },
  });

  return user;
}

export async function updateUser(input: UpdateUserInput, actorId?: string) {
  const existing = await db.query.users.findFirst({
    where: eq(users.id, input.id),
    columns: { id: true, name: true, email: true, role: true },
  });

  if (!existing) throw new Error("Usuario no encontrado");

  const passwordHash = input.password
    ? await hash(input.password, BCRYPT_ROUNDS)
    : undefined;

  const [updated] = await db
    .update(users)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.role !== undefined && { role: input.role }),
      ...(passwordHash !== undefined && { passwordHash }),
    })
    .where(eq(users.id, input.id))
    .returning(publicUserColumns);

  await logAudit({
    userId: actorId,
    action: input.password ? "user_password_reset" : "user_updated",
    entityType: "user",
    entityId: input.id,
    oldValue: { name: existing.name, role: existing.role },
    newValue: { name: updated.name, role: updated.role },
  });

  return updated;
}

export async function deleteUser(id: string, actorId?: string) {
  if (id === actorId) {
    throw new Error("No podés eliminar tu propio usuario");
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: { id: true, name: true, email: true, role: true },
  });

  if (!existing) throw new Error("Usuario no encontrado");

  await db.delete(users).where(eq(users.id, id));

  await logAudit({
    userId: actorId,
    action: "user_deleted",
    entityType: "user",
    entityId: id,
    oldValue: { name: existing.name, email: existing.email, role: existing.role },
  });
}
