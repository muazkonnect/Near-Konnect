import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { MAIN_SERVICE_CATEGORIES, SUBCATEGORIES_BY_MAIN } from "@/data/serviceCategories";

export interface Category {
  id: string;
  name: string;
  icon: string;
  parent_id: string | null;
  created_at: string;
}

export function useCategories() {
  const { data: dbCategories = [], isLoading } = useQuery({
    queryKey: ["service_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
  });

  const mainCategories = useMemo(() => {
    if (dbCategories.length > 0) {
      // Filter out subcategories. If parent_id column is missing, all categories will be treated as main.
      return dbCategories.filter((c) => !("parent_id" in c) || !c.parent_id);
    }
    return MAIN_SERVICE_CATEGORIES.map((name) => ({
      id: name,
      name,
      icon: "",
      parent_id: null,
      created_at: "",
    }));
  }, [dbCategories]);

  const getSubCategories = (mainName: string) => {
    if (dbCategories.length > 0) {
      const parent = dbCategories.find((c) => c.name === mainName);
      if (parent && "parent_id" in parent) {
        return dbCategories.filter((c) => (c as any).parent_id === parent.id);
      }
      return [];
    }
    const subs = SUBCATEGORIES_BY_MAIN[mainName as keyof typeof SUBCATEGORIES_BY_MAIN] || [];
    return subs.map((name) => ({
      id: name,
      name,
      icon: "",
      parent_id: mainName,
      created_at: "",
    }));
  };

  return {
    categories: dbCategories,
    mainCategories,
    getSubCategories,
    isLoading,
  };
}
