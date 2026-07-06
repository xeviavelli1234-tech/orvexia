-- Plan MONITOR: tier de entrada (9 €/mes). El motor vigila competencia y
-- Buy Box y envía alertas, pero NUNCA escribe precios en Amazon (los eventos
-- se registran como simulados, igual que el modo dry-run).
ALTER TYPE "SellerPlan" ADD VALUE IF NOT EXISTS 'MONITOR';
