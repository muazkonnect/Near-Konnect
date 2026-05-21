// Top expertise per (main, sub) category, derived from full NearKonnect taxonomy.
import { getExpertiseForSub } from "@/data/serviceCategories";

const FALLBACK = ["On-Site Service", "Quality Work", "Quick Response", "Fair Pricing", "Warranty"];

export function getExpertise(
  mainCategory?: string,
  subCategory?: string,
  extras: string[] = [],
  limit = 5,
): string[] {
  const out: string[] = [];
  const push = (arr: string[]) =>
    arr.forEach((x) => {
      if (x && !out.find((o) => o.toLowerCase() === x.toLowerCase())) out.push(x);
    });
  if (mainCategory && subCategory) push(getExpertiseForSub(mainCategory, subCategory));
  push(extras);
  push(FALLBACK);
  return out.slice(0, limit);
}
