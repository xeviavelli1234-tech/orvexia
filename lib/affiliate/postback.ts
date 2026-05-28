import { timingSafeEqual } from "node:crypto";
import type { AffiliateConversionStatus } from "@/app/generated/prisma/client";

export function statusMap(s: string): AffiliateConversionStatus {
  switch (s.toLowerCase()) {
    case "approved": return "APPROVED";
    case "rejected":
    case "declined": return "REJECTED";
    default:         return "PENDING";
  }
}

export function checkSecret(provided: string | null, expected: string | undefined): boolean {
  if (!expected || !provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
