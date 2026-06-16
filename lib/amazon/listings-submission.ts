/**
 * Interpretación de la respuesta del PATCH/PUT a Listings Items 2021-08-01
 * — FUNCIÓN PURA, testeable.
 *
 * Amazon responde HTTP 200 incluso cuando RECHAZA el cambio: el veredicto va en
 * el cuerpo (`status` + `issues`). Si no se mira, un precio rechazado (fuera de
 * rango permitido, error de listing, atributo requerido…) se da por aplicado y
 * corromperíamos `priceCurrent` con un precio que NO está vivo en Amazon.
 */

export interface SubmissionIssue {
  code?: string;
  message?: string;
  severity?: string; // "ERROR" | "WARNING" | "INFO"
}

export interface ListingsSubmissionResponse {
  sku?: string;
  status?: string; // "ACCEPTED" | "INVALID" | "VALID"
  submissionId?: string;
  issues?: SubmissionIssue[];
}

export interface SubmissionRejection {
  code: string;
  detail: string;
}

/**
 * Devuelve el motivo de rechazo si la submission fue rechazada (status INVALID
 * o algún issue de severidad ERROR), o null si Amazon la aceptó. Los WARNING /
 * INFO NO bloquean (son informativos).
 */
export function submissionRejection(
  res: ListingsSubmissionResponse | null | undefined,
): SubmissionRejection | null {
  const issues = res?.issues ?? [];
  const errors = issues.filter(
    (i) => (i.severity ?? "").toUpperCase() === "ERROR",
  );
  const status = (res?.status ?? "").toUpperCase();

  if (status !== "INVALID" && errors.length === 0) return null;

  const detail =
    errors.length > 0
      ? errors
          .map((i) => `${i.code ?? "?"}: ${i.message ?? ""}`.trim())
          .join(" | ")
      : `status ${res?.status ?? "INVALID"}`;

  return { code: errors[0]?.code ?? "submission_invalid", detail };
}
