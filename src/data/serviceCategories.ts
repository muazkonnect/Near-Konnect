// Auto-derived from src/data/nearkonnect-taxonomy.json
// 23 main categories, 960 sub-categories, top-10 expertise per sub.
import taxonomy from "./nearkonnect-taxonomy.json";

export interface TaxonomyMain {
  name: string;
  icon: string;
  sort_order: number;
}
export interface TaxonomySub {
  main: string;
  name: string;
  icon: string;
  sort_order: number;
  expertise: string[];
}

export const TAXONOMY = taxonomy as { main: TaxonomyMain[]; sub: TaxonomySub[] };

export const MAIN_SERVICE_CATEGORIES: readonly string[] = TAXONOMY.main.map((m) => m.name);

export type MainServiceCategory = string;

export const SUBCATEGORIES_BY_MAIN: Record<string, readonly string[]> = (() => {
  const map: Record<string, string[]> = {};
  for (const s of TAXONOMY.sub) {
    if (!map[s.main]) map[s.main] = [];
    map[s.main].push(s.name);
  }
  return map;
})();

export const EXPERTISE_BY_SUB: Record<string, readonly string[]> = (() => {
  const map: Record<string, string[]> = {};
  for (const s of TAXONOMY.sub) {
    map[`${s.main}::${s.name}`] = s.expertise;
    // also keyed by sub name only (best-effort; collisions resolved by first occurrence)
    if (!map[s.name]) map[s.name] = s.expertise;
  }
  return map;
})();

export const MAIN_ICONS: Record<string, string> = Object.fromEntries(
  TAXONOMY.main.map((m) => [m.name, m.icon]),
);

export const SUB_ICONS: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const s of TAXONOMY.sub) map[`${s.main}::${s.name}`] = s.icon;
  return map;
})();

export const isValidMainCategory = (value: string): boolean =>
  MAIN_SERVICE_CATEGORIES.includes(value);

export const isValidSubcategoryForMain = (mainCategory: string, subCategory: string) => {
  const subs = SUBCATEGORIES_BY_MAIN[mainCategory];
  return !!subs && subs.includes(subCategory);
};

export const getExpertiseForSub = (mainCategory: string, subCategory: string): string[] => {
  return (
    (EXPERTISE_BY_SUB[`${mainCategory}::${subCategory}`] as string[] | undefined) ||
    (EXPERTISE_BY_SUB[subCategory] as string[] | undefined) ||
    []
  );
};
