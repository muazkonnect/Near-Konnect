import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import {
  MAIN_SERVICE_CATEGORIES,
  SUBCATEGORIES_BY_MAIN,
  MAIN_ICONS,
  SUB_ICONS,
  getExpertiseForSub,
} from "@/data/serviceCategories";

export interface Category {
  id: string;
  name: string;
  icon: string;
  parent_id: string | null;
  created_at: string;
  sort_order?: number;
}

export interface Expertise {
  id: string;
  sub_category_id: string;
  name: string;
  sort_order: number;
}

export function useCategories() {
  const { data: dbCategories = [], isLoading } = useQuery({
    queryKey: ["service_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: dbExpertise = [] } = useQuery({
    queryKey: ["category_expertise"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_expertise" as never)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) {
        console.warn("expertise fetch failed", error);
        return [] as Expertise[];
      }
      return (data as unknown) as Expertise[];
    },
  });

  const mainCategories = useMemo(() => {
    if (dbCategories.length > 0) {
      return dbCategories.filter((c) => !("parent_id" in c) || !c.parent_id);
    }
    return MAIN_SERVICE_CATEGORIES.map((name) => ({
      id: name,
      name,
      icon: MAIN_ICONS[name] || "",
      parent_id: null,
      created_at: "",
    }));
  }, [dbCategories]);

  const getSubCategories = (mainName: string): Category[] => {
    if (dbCategories.length > 0) {
      const parent = dbCategories.find(
        (c) => c.name === mainName && !c.parent_id,
      );
      if (parent) {
        return dbCategories.filter((c) => (c as any).parent_id === parent.id);
      }
      return [];
    }
    const subs = SUBCATEGORIES_BY_MAIN[mainName] || [];
    return subs.map((name) => ({
      id: name,
      name,
      icon: SUB_ICONS[`${mainName}::${name}`] || "",
      parent_id: mainName,
      created_at: "",
    }));
  };

  const getExpertise = (mainName: string, subName: string): string[] => {
    // DB-first
    if (dbCategories.length > 0 && dbExpertise.length > 0) {
      const main = dbCategories.find((c) => c.name === mainName && !c.parent_id);
      if (main) {
        const sub = dbCategories.find(
          (c) => c.name === subName && (c as any).parent_id === main.id,
        );
        if (sub) {
          const list = dbExpertise
            .filter((e) => e.sub_category_id === sub.id)
            .map((e) => e.name);
          if (list.length) return list;
        }
      }
    }
    return getExpertiseForSub(mainName, subName);
  };

  return {
    categories: dbCategories,
    mainCategories,
    getSubCategories,
    getExpertise,
    isLoading,
  };
}
