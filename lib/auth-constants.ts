/**
 * TTL del código de verificación de email.
 *
 * Unificado entre el registro y el reenvío. Antes el registro usaba 24h y el
 * reenvío 15min: un usuario que pedía reenvío acortaba su propia ventana sin
 * saberlo y, como `deleteExpiredUnverified` borra la cuenta al expirar el
 * código, podía quedarse sin cuenta a los 15 min. 24h da margen cómodo.
 */
export const VERIFICATION_CODE_TTL_MS = 1000 * 60 * 60 * 24; // 24 horas
