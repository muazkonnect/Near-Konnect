import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Shield,
  Loader2,
  ChevronRight,
  ChevronDown,
  Search,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon: string;
  parent_id: string | null;
  is_active: boolean;
  sort_order?: number;
}

interface Expertise {
  id: string;
  name: string;
  sub_category_id: string;
  is_active: boolean;
  sort_order: number;
}

interface Props {
  categories: Category[];
}

export default function TaxonomyManagementTab({ categories }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newMainName, setNewMainName] = useState("");
  const [newSubName, setNewSubName] = useState<Record<string, string>>({});
  const [newExpertiseName, setNewExpertiseName] = useState<Record<string, string>>({});


  const sortFn = (a: Category, b: Category) =>
    (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name);
  const mains = useMemo(
    () => categories.filter((c) => !c.parent_id).slice().sort(sortFn),
    [categories]
  );
  const subsByParent = useMemo(() => {
    const m = new Map<string, Category[]>();
    categories
      .filter((c) => !!c.parent_id)
      .forEach((c) => {
        const arr = m.get(c.parent_id!) ?? [];
        arr.push(c);
        m.set(c.parent_id!, arr);
      });
    m.forEach((arr) => arr.sort(sortFn));
    return m;
  }, [categories]);

  // Load expertise only for expanded subs
  const expandedSubIds = useMemo(
    () =>
      Array.from(expanded).filter((id) =>
        categories.some((c) => c.id === id && !!c.parent_id)
      ),
    [expanded, categories]
  );

  const { data: expertiseList = [] } = useQuery({
    queryKey: ["admin_category_expertise", expandedSubIds.sort().join(",")],
    enabled: expandedSubIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_expertise")
        .select("*")
        .in("sub_category_id", expandedSubIds)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Expertise[];
    },
  });

  const expertiseBySub = useMemo(() => {
    const m = new Map<string, Expertise[]>();
    expertiseList.forEach((e) => {
      const arr = m.get(e.sub_category_id) ?? [];
      arr.push(e);
      m.set(e.sub_category_id, arr);
    });
    return m;
  }, [expertiseList]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin_categories"] });
    qc.invalidateQueries({ queryKey: ["service_categories"] });
    qc.invalidateQueries({ queryKey: ["admin_category_expertise"] });
  };

  const toggleExpand = (id: string) => {
    const n = new Set(expanded);
    n.has(id) ? n.delete(id) : n.add(id);
    setExpanded(n);
  };

  // ---- Category mutations ----
  const updateCat = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<Category, "name" | "icon" | "is_active">>;
    }) => {
      setBusyId(id);
      const { error } = await supabase
        .from("service_categories")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      setEditingId(null);
    },
    onError: (e: any) => toast.error(e.message || "Update failed"),
    onSettled: () => setBusyId(null),
  });

  const addCat = useMutation({
    mutationFn: async (payload: {
      name: string;
      icon: string;
      parent_id: string | null;
    }) => {
      setBusyId("new-" + (payload.parent_id ?? "root"));
      const { error } = await (supabase as any).from("service_categories").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Added");
      setNewMainName("");
      setNewSubName({});
      setNewSubName({});
      refresh();
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
    onSettled: () => setBusyId(null),
  });

  const deleteCat = useMutation({
    mutationFn: async (id: string) => {
      setBusyId(id);
      const { error } = await supabase
        .from("service_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      refresh();
    },
    onError: (e: any) => toast.error(e.message || "Delete failed"),
    onSettled: () => setBusyId(null),
  });

  // ---- Expertise mutations ----
  const addExp = useMutation({
    mutationFn: async (payload: { sub_category_id: string; name: string }) => {
      setBusyId("new-exp-" + payload.sub_category_id);
      const { error } = await (supabase as any).from("category_expertise").insert(payload);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      setNewExpertiseName((s) => ({ ...s, [vars.sub_category_id]: "" }));
      refresh();
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
    onSettled: () => setBusyId(null),
  });

  const updateExp = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<Expertise, "name" | "is_active">>;
    }) => {
      setBusyId(id);
      const { error } = await supabase
        .from("category_expertise")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      refresh();
    },
    onError: (e: any) => toast.error(e.message || "Update failed"),
    onSettled: () => setBusyId(null),
  });

  const deleteExp = useMutation({
    mutationFn: async (id: string) => {
      setBusyId(id);
      const { error } = await supabase
        .from("category_expertise")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      refresh();
    },
    onError: (e: any) => toast.error(e.message || "Delete failed"),
    onSettled: () => setBusyId(null),
  });

  const startEdit = (item: { id: string; name: string; icon?: string }) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditIcon(item.icon ?? "");
  };

  const handleDeleteCat = (cat: Category) => {
    if (
      !confirm(
        `Delete "${cat.name}"? ${
          !cat.parent_id ? "All subcategories and expertise will be removed." : "All expertise will be removed."
        }`
      )
    )
      return;
    deleteCat.mutate(cat.id);
  };

  const lowerSearch = search.trim().toLowerCase();
  const visibleMains = lowerSearch
    ? mains.filter((m) => {
        if (m.name.toLowerCase().includes(lowerSearch)) return true;
        const subs = subsByParent.get(m.id) ?? [];
        return subs.some((s) => s.name.toLowerCase().includes(lowerSearch));
      })
    : mains;

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div>
        <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold tracking-tight text-hero-foreground">
          <Shield className="h-5 w-5 text-primary shrink-0" /> Taxonomy Manager
        </h2>
        <p className="text-xs sm:text-sm text-hero-foreground/60">
          Manage main categories, subcategories, and expertise. Toggle visibility
          or edit names without breaking existing worker profiles.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-hero-foreground/40" />
        <Input
          placeholder="Search main or sub category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Add new main */}
      <div className="flex flex-col gap-3 rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-3 sm:p-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5 min-w-0">
          <label className="text-xs font-semibold uppercase tracking-wider text-hero-foreground/60">
            New main category
          </label>
          <Input
            placeholder="e.g. Pet Services"
            value={newMainName}
            onChange={(e) => setNewMainName(e.target.value)}
          />
        </div>
        <Button
          onClick={() =>
            newMainName.trim() &&
            addCat.mutate({
              name: newMainName.trim(),
              icon: "",
              parent_id: null,
            })
          }
          disabled={!newMainName.trim() || busyId === "new-root"}
          className="gap-2 w-full sm:w-auto"
        >
          {busyId === "new-root" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add Main
        </Button>
      </div>


      {/* Mains list */}
      <div className="space-y-3">
        {visibleMains.map((main) => {
          const subs = subsByParent.get(main.id) ?? [];
          const filteredSubs = lowerSearch
            ? subs.filter((s) => s.name.toLowerCase().includes(lowerSearch) || main.name.toLowerCase().includes(lowerSearch))
            : subs;
          const isOpen = expanded.has(main.id) || !!lowerSearch;
          const isEditingMain = editingId === main.id;
          const isBusy = busyId === main.id;
          return (
            <div key={main.id} className="space-y-2">
              <div
                className={`flex items-center gap-2 rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-2 sm:p-3 ${
                  isBusy ? "opacity-60 pointer-events-none" : ""
                } ${!main.is_active ? "opacity-60" : ""}`}
              >
                <button
                  onClick={() => toggleExpand(main.id)}
                  className="p-1 hover:bg-hero-foreground/10 rounded-lg shrink-0"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-hero-foreground/60" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-hero-foreground/60" />
                  )}
                </button>
                {isEditingMain ? (
                  <>
                    <Input
                      className="flex-1 min-w-0"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      onClick={() =>
                        editName.trim() &&
                        updateCat.mutate({
                          id: main.id,
                          patch: { name: editName.trim(), icon: "" },
                        })
                      }
                    >
                      <Check className="h-4 w-4 text-primary" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">

                      <p className="font-semibold text-hero-foreground truncate text-sm sm:text-base">
                        {main.name}
                      </p>
                      <p className="text-[10px] text-hero-foreground/60 uppercase tracking-widest">
                        {subs.length} subcategories
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch
                        checked={main.is_active}
                        onCheckedChange={(v) =>
                          updateCat.mutate({ id: main.id, patch: { is_active: v } })
                        }
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => startEdit(main)}
                      >
                        <Edit2 className="h-4 w-4 text-hero-foreground/60" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDeleteCat(main)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {isOpen && (
                <div className="ml-4 sm:ml-9 space-y-2 border-l-2 border-hero-foreground/15 pl-3 sm:pl-4">
                  {filteredSubs.map((sub) => {
                    const isEditingSub = editingId === sub.id;
                    const subOpen = expanded.has(sub.id);
                    const exps = expertiseBySub.get(sub.id) ?? [];
                    return (
                      <div key={sub.id} className="space-y-1.5">
                        <div
                          className={`flex items-center gap-2 rounded-xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-2 ${
                            !sub.is_active ? "opacity-60" : ""
                          }`}
                        >
                          <button
                            onClick={() => toggleExpand(sub.id)}
                            className="p-1 hover:bg-hero-foreground/10 rounded-lg shrink-0"
                            title="Manage expertise"
                          >
                            {subOpen ? (
                              <ChevronDown className="h-3.5 w-3.5 text-hero-foreground/60" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-hero-foreground/60" />
                            )}
                          </button>
                          {isEditingSub ? (
                            <>
                              <Input
                                className="flex-1 h-8 text-sm"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                autoFocus
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() =>
                                  editName.trim() &&
                                  updateCat.mutate({
                                    id: sub.id,
                                    patch: { name: editName.trim() },
                                  })
                                }
                              >
                                <Check className="h-4 w-4 text-primary" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => setEditingId(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-hero-foreground truncate">
                                  {sub.name}
                                </p>
                                {subOpen && (
                                  <p className="text-[10px] text-hero-foreground/50 uppercase tracking-widest">
                                    {exps.length} expertise
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Switch
                                  checked={sub.is_active}
                                  onCheckedChange={(v) =>
                                    updateCat.mutate({
                                      id: sub.id,
                                      patch: { is_active: v },
                                    })
                                  }
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => startEdit(sub)}
                                >
                                  <Edit2 className="h-3.5 w-3.5 text-hero-foreground/60" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => handleDeleteCat(sub)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>

                        {subOpen && (
                          <div className="ml-3 sm:ml-6 space-y-1.5 border-l border-hero-foreground/10 pl-2 sm:pl-3">
                            {exps.map((exp) => {
                              const isEditingExp = editingId === exp.id;
                              return (
                                <div
                                  key={exp.id}
                                  className={`flex items-center gap-2 rounded-lg border border-hero-foreground/10 bg-hero-foreground/[0.02] px-2 py-1 ${
                                    !exp.is_active ? "opacity-60" : ""
                                  }`}
                                >
                                  {isEditingExp ? (
                                    <>
                                      <Input
                                        className="flex-1 h-7 text-xs"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        autoFocus
                                      />
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onClick={() =>
                                          editName.trim() &&
                                          updateExp.mutate({
                                            id: exp.id,
                                            patch: { name: editName.trim() },
                                          })
                                        }
                                      >
                                        <Check className="h-3.5 w-3.5 text-primary" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onClick={() => setEditingId(null)}
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="flex-1 truncate text-xs text-hero-foreground">
                                        {exp.name}
                                      </span>
                                      <Switch
                                        checked={exp.is_active}
                                        onCheckedChange={(v) =>
                                          updateExp.mutate({
                                            id: exp.id,
                                            patch: { is_active: v },
                                          })
                                        }
                                      />
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onClick={() => startEdit(exp)}
                                      >
                                        <Edit2 className="h-3 w-3 text-hero-foreground/60" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => {
                                          if (
                                            confirm(`Delete expertise "${exp.name}"?`)
                                          )
                                            deleteExp.mutate(exp.id);
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                            {/* Add expertise */}
                            <div className="flex items-center gap-2 pt-1">
                              <Input
                                className="flex-1 h-7 text-xs"
                                placeholder="Add expertise…"
                                value={newExpertiseName[sub.id] ?? ""}
                                onChange={(e) =>
                                  setNewExpertiseName((s) => ({
                                    ...s,
                                    [sub.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    const v = (newExpertiseName[sub.id] ?? "").trim();
                                    if (v)
                                      addExp.mutate({
                                        sub_category_id: sub.id,
                                        name: v,
                                      });
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                disabled={
                                  !(newExpertiseName[sub.id] ?? "").trim() ||
                                  busyId === "new-exp-" + sub.id
                                }
                                onClick={() => {
                                  const v = (newExpertiseName[sub.id] ?? "").trim();
                                  if (v)
                                    addExp.mutate({
                                      sub_category_id: sub.id,
                                      name: v,
                                    });
                                }}
                              >
                                {busyId === "new-exp-" + sub.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Plus className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add subcategory */}
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      className="flex-1 h-8 text-sm"
                      placeholder={`Add subcategory to ${main.name}…`}
                      value={newSubName[main.id] ?? ""}
                      onChange={(e) =>
                        setNewSubName((s) => ({ ...s, [main.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const v = (newSubName[main.id] ?? "").trim();
                          if (v)
                            addCat.mutate({
                              name: v,
                              icon: "",
                              parent_id: main.id,
                            });
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2"
                      disabled={
                        !(newSubName[main.id] ?? "").trim() ||
                        busyId === "new-" + main.id
                      }
                      onClick={() => {
                        const v = (newSubName[main.id] ?? "").trim();
                        if (v)
                          addCat.mutate({
                            name: v,
                            icon: "",
                            parent_id: main.id,
                          });
                      }}
                    >
                      {busyId === "new-" + main.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {visibleMains.length === 0 && (
          <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-hero-foreground/60">
            No categories match your search.
          </div>
        )}
      </div>
    </div>
  );
}
