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
