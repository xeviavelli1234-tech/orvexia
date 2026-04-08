import { z } from "zod";

const emailCom = z.string().email("Email inválido");

export const registerSchema = z.object({
  email: emailCom,
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const loginSchema = z.object({
  email: emailCom,
  password: z.string().min(1, "La contraseña es requerida"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const communityPostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(6, "El título debe tener al menos 6 caracteres")
    .max(120, "El título no puede superar 120 caracteres"),
  content: z
    .string()
    .trim()
    .min(30, "Cuéntanos un poco más (mínimo 30 caracteres)")
    .max(2000, "Máximo 2000 caracteres"),
  type: z.enum(["DISCUSION", "PREGUNTA", "CHOLLO", "CONSEJO"]),
  productId: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val && val.length ? val : null))
    .refine(
      (val) => val === null || /^c[a-z0-9]{24}$/i.test(val),
      "ID de producto inválido"
    ),
});

export const communityCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(2, "El comentario es demasiado corto")
    .max(600, "Máximo 600 caracteres"),
});

export type CommunityPostInput = z.infer<typeof communityPostSchema>;
export type CommunityCommentInput = z.infer<typeof communityCommentSchema>;
