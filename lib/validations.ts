import { z } from "zod";

const emailCom = z.string().email("Email inválido");

// Reglas de contraseña fuertes — replican la validación del cliente
// (RegisterForm) para que un POST directo no pueda saltarse los requisitos.
export const strongPassword = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .regex(/[A-Z]/, "Debe incluir al menos una mayúscula")
  .regex(/[0-9]/, "Debe incluir al menos un número")
  .regex(/[^A-Za-z0-9]/, "Debe incluir al menos un carácter especial");

export const registerSchema = z.object({
  email: emailCom,
  password: strongPassword,
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

// CUID: 'c' + 24 chars base36. Acepta también CUIDs largos por compatibilidad.
const cuidLike = z.string().regex(/^c[a-z0-9]{20,}$/i, "ID inválido");

export const affiliateClickSchema = z.object({
  productId:        cuidLike,
  selectedRetailer: z.string().trim().min(1).max(80),
  retailerPosition: z.number().int().min(0).max(50),
  isPrimary:        z.boolean(),
  pageContext:      z.string().trim().max(120).optional(),
  placement:        z.string().trim().max(60).optional(),
});

export type AffiliateClickInput = z.infer<typeof affiliateClickSchema>;

// Postback Awin (también sirve para redes compatibles). Awin envía parámetros
// por query string en un GET; los nombres siguen su convención clásica.
// Mapeamos a nuestro modelo en el handler.
const numericLike = z.preprocess(
  (v) => (typeof v === "string" ? Number(v.replace(",", ".")) : v),
  z.number().nonnegative(),
);

export const affiliatePostbackSchema = z.object({
  network:       z.string().trim().min(1).max(40).default("awin"),
  transactionId: z.string().trim().min(1).max(120),
  store:         z.string().trim().min(1).max(120),
  amount:        numericLike,
  commission:    numericLike,
  currency:      z.string().trim().length(3).default("EUR"),
  status:        z.enum(["pending", "approved", "declined", "rejected"]).default("pending"),
  clickref:      z.string().trim().max(64).optional(),
});

export type AffiliatePostbackInput = z.infer<typeof affiliatePostbackSchema>;
