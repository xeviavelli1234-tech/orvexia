-- Logs de auditoría de cambios de configuración
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "sellerAccountId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "detail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_sellerAccountId_createdAt_idx" ON "AuditLog"("sellerAccountId", "createdAt");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_sellerAccountId_fkey" FOREIGN KEY ("sellerAccountId") REFERENCES "SellerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
