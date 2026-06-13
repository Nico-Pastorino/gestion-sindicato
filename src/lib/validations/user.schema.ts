import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "operator", "readonly"]);

export const createUserSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(120, "El nombre no puede superar 120 caracteres")
    .trim(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email inválido")
    .max(200, "El email no puede superar 200 caracteres"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(100, "La contraseña no puede superar 100 caracteres"),
  role: userRoleSchema.default("operator"),
});

export const updateUserSchema = z.object({
  id: z.string().uuid("ID de usuario inválido"),
  name: z.string().min(2).max(120).trim().optional(),
  role: userRoleSchema.optional(),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(100)
    .optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
