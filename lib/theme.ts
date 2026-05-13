export const THEME_COOKIE = "theme";
export type Theme = "light" | "dark";

export function parseTheme(raw: string | undefined): Theme | null {
  return raw === "dark" || raw === "light" ? raw : null;
}
