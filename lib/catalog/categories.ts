import type { Category } from "@/app/generated/prisma/client";

export type CategorySlug =
  | "televisores"
  | "lavadoras"
  | "frigorificos"
  | "lavavajillas"
  | "secadoras"
  | "hornos"
  | "microondas"
  | "aspiradoras"
  | "cafeteras"
  | "aires_acondicionados";

export interface CategoryMeta {
  key: Category;
  slug: CategorySlug;
  label: string;
  labelSingular: string;
  genderArticle: "el" | "la";
  icon: string;
}

export const CATEGORIES: Record<CategorySlug, CategoryMeta> = {
  televisores:          { key: "TELEVISORES",          slug: "televisores",          label: "Televisores",        labelSingular: "televisor",        genderArticle: "el", icon: "📺" },
  lavadoras:            { key: "LAVADORAS",            slug: "lavadoras",            label: "Lavadoras",          labelSingular: "lavadora",         genderArticle: "la", icon: "🫧" },
  frigorificos:         { key: "FRIGORIFICOS",         slug: "frigorificos",         label: "Frigoríficos",       labelSingular: "frigorífico",      genderArticle: "el", icon: "🧊" },
  lavavajillas:         { key: "LAVAVAJILLAS",         slug: "lavavajillas",         label: "Lavavajillas",       labelSingular: "lavavajillas",     genderArticle: "el", icon: "🍽️" },
  secadoras:            { key: "SECADORAS",            slug: "secadoras",            label: "Secadoras",          labelSingular: "secadora",         genderArticle: "la", icon: "💨" },
  hornos:               { key: "HORNOS",               slug: "hornos",               label: "Hornos",             labelSingular: "horno",            genderArticle: "el", icon: "🔥" },
  microondas:           { key: "MICROONDAS",           slug: "microondas",           label: "Microondas",         labelSingular: "microondas",       genderArticle: "el", icon: "📡" },
  aspiradoras:          { key: "ASPIRADORAS",          slug: "aspiradoras",          label: "Aspiradoras",        labelSingular: "aspiradora",       genderArticle: "la", icon: "🌀" },
  cafeteras:            { key: "CAFETERAS",            slug: "cafeteras",            label: "Cafeteras",          labelSingular: "cafetera",         genderArticle: "la", icon: "☕" },
  aires_acondicionados: { key: "AIRES_ACONDICIONADOS", slug: "aires_acondicionados", label: "Aires acondicionados", labelSingular: "aire acondicionado", genderArticle: "el", icon: "❄️" },
};

export const CATEGORY_SLUGS = Object.keys(CATEGORIES) as CategorySlug[];

export function getCategoryBySlug(slug: string): CategoryMeta | null {
  return CATEGORIES[slug.toLowerCase() as CategorySlug] ?? null;
}

// Normaliza una marca a slug URL-safe (sin tildes, lowercase, guiones).
export function brandToSlug(brand: string): string {
  return brand
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Rangos de precio razonables por categoría — solo generamos páginas para los
// rangos donde tiene sentido buscar (no tiene sentido "lavadoras de menos de 50€").
export const PRICE_THRESHOLDS: Record<CategorySlug, number[]> = {
  televisores:          [300, 500, 800, 1200, 2000],
  lavadoras:            [300, 400, 500, 700],
  frigorificos:         [400, 600, 900, 1500],
  lavavajillas:         [300, 400, 500, 700],
  secadoras:            [400, 600, 800],
  hornos:               [200, 300, 500, 800],
  microondas:           [80, 150, 250],
  aspiradoras:          [100, 200, 400, 600],
  cafeteras:            [100, 200, 400, 700],
  aires_acondicionados: [300, 500, 800, 1200],
};
