import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Edit2, Check, X, Shield, Loader2, RotateCcw, ChevronRight, ChevronDown, ArrowUp, ArrowDown } from "lucide-react";
import { SUBCATEGORIES_BY_MAIN } from "@/data/serviceCategories";

const DEFAULT_CATEGORIES = [
  { name: "Home & Local Services", icon: "🏠" },
  { name: "Automotive & Transport", icon: "🚗" },
  { name: "Shops, Food & Daily Needs", icon: "🛍️" },
  { name: "Professional & Business Services", icon: "💼" },
  { name: "Health, Education & Community", icon: "🏥" },
  { name: "Events & Lifestyle", icon: "✨" },
];

interface Category {
  id: string;
  name: string;
  icon: string;
  parent_id: string | null;
  created_at: string;
  sort_order?: number;
}

interface Props {
  categories: Category[];
}

export default function CategoriesManagementTab({ categories }: Props) {
  const qc = useQueryClient();
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("");
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const sortFn = (a: Category, b: Category) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name);
  const mainCategories = categories.filter((c) => !c.parent_id).slice().sort(sortFn);
  const subCategories = categories.filter((c) => !!c.parent_id).slice().sort(sortFn);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin_categories"] });
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!newCatName.trim()) throw new Error("Category name required");
      setBusyId("new");
      const { error } = await supabase.from("service_categories").insert({
        name: newCatName.trim(),
        icon: newCatIcon.trim() || (newParentId ? "" : "🔧"),
        parent_id: newParentId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category added!");
      setNewCatName("");
      setNewCatIcon("");
      setNewParentId(null);
      refresh();
    },
    onError: (e: any) => toast.error(e.message || "Failed to add category"),
    onSettled: () => setBusyId(null),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, icon }: { id: string; name: string; icon: string }) => {
      setBusyId(id);
      const { error } = await supabase
        .from("service_categories")
        .update({ name: name.trim(), icon: icon.trim() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category updated");
      setEditingId(null);
      refresh();
    },
    onError: (e: any) => toast.error(e.message || "Failed to update category"),
    onSettled: () => setBusyId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setBusyId(id);
      const { error } = await supabase.from("service_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category deleted");
      refresh();
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete category"),
    onSettled: () => setBusyId(null),
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ a, b }: { a: Category; b: Category }) => {
      setBusyId(a.id);
      const aOrder = a.sort_order ?? 0;
      const bOrder = b.sort_order ?? 0;
      // Swap sort_order values between two siblings
      const { error: e1 } = await supabase
        .from("service_categories")
        .update({ sort_order: bOrder } as any)
        .eq("id", a.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("service_categories")
        .update({ sort_order: aOrder } as any)
        .eq("id", b.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_categories"] });
      qc.invalidateQueries({ queryKey: ["service_categories"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to reorder"),
    onSettled: () => setBusyId(null),
  });

  const moveCategory = (cat: Category, direction: "up" | "down") => {
    const siblings = categories
      .filter((c) => c.parent_id === cat.parent_id)
      .slice()
      .sort(sortFn);
    const idx = siblings.findIndex((s) => s.id === cat.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    let a = cat;
    let b = siblings[swapIdx];
    // If both have the same sort_order (e.g. defaults), assign distinct values first
    if ((a.sort_order ?? 0) === (b.sort_order ?? 0)) {
      a = { ...a, sort_order: (idx + 1) * 10 };
      b = { ...b, sort_order: (swapIdx + 1) * 10 };
    }
    reorderMutation.mutate({ a, b });
  };

  const seedMutation = useMutation({
    mutationFn: async () => {
      setBusyId("seed");
      
      // Fetch latest state to avoid stale data
      const { data: currentCats, error: initialFetchErr } = await supabase
        .from("service_categories")
        .select("*");
      if (initialFetchErr) throw initialFetchErr;

      // Check if parent_id column exists in the returned data
      const hasParentId = currentCats.length === 0 || "parent_id" in currentCats[0];
      if (!hasParentId) {
        throw new Error("Database schema is out of date. Please run the subcategory migration in the Supabase SQL Editor.");
      }

      // 1. Seed Main Categories
      const existingMainNames = new Set(currentCats.filter(c => !c.parent_id).map(c => c.name));
      const missingMain = DEFAULT_CATEGORIES.filter(d => !existingMainNames.has(d.name));
      
      if (missingMain.length > 0) {
        const { error: mainErr } = await supabase.from("service_categories").insert(missingMain);
        if (mainErr) throw mainErr;
      }

      // Refresh to get IDs of all main categories (including newly added ones)
      const { data: allMain, error: fetchErr } = await supabase
        .from("service_categories")
        .select("id, name")
        .is("parent_id", null);
      if (fetchErr) throw fetchErr;

      // 2. Seed Sub Categories
      const mainIdMap = new Map(allMain.map(m => [m.name, m.id]));
      
      // Deduplicate subcategories based on (name, parent_id)
      const existingSubsMap = new Set(
        currentCats.filter(c => !!c.parent_id).map(c => `${c.name}:${c.parent_id}`)
      );
      
      const missingSubs: { name: string; parent_id: string; icon: string }[] = [];
      
      Object.entries(SUBCATEGORIES_BY_MAIN).forEach(([mainName, subs]) => {
        const parentId = mainIdMap.get(mainName);
        if (!parentId) return;
        
        subs.forEach(subName => {
          if (!existingSubsMap.has(`${subName}:${parentId}`)) {
            missingSubs.push({ name: subName, parent_id: parentId, icon: "" });
          }
        });
      });

      if (missingSubs.length > 0) {
        const { error: subErr } = await supabase.from("service_categories").insert(missingSubs);
        if (subErr) throw subErr;
      }
    },
    onSuccess: () => {
      toast.success("Default categories and subcategories restored!");
      refresh();
    },
    onError: (e: any) => {
      console.error("Restore defaults error:", e);
      if (e.message?.includes("parent_id") || e.message?.includes("parent")) {
        toast.error("Database schema mismatch. Please ensure you've applied the subcategory migration.");
      } else {
        toast.error(e.message || "Failed to restore defaults");
      }
    },
    onSettled: () => setBusyId(null),
  });

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = (id: string) => {
    if (!editName.trim()) return toast.error("Name required");
    updateMutation.mutate({ id, name: editName, icon: editIcon });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this category? This might affect workers assigned to it.")) return;
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold tracking-tight text-hero-foreground">
              <Shield className="h-5 w-5 text-primary shrink-0" /> Service Categories
            </h2>
            <p className="text-xs sm:text-sm text-hero-foreground/60">
              Manage the taxonomy of services available on the platform.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => seedMutation.mutate()}
            disabled={busyId === "seed"}
            className="gap-2 w-full sm:w-auto shrink-0"
          >
            {busyId === "seed" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            Restore Defaults
          </Button>
        </div>
      </div>

      {/* Add New Category */}
      <div className="flex flex-col gap-3 rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-3 sm:p-4 sm:flex-row sm:items-end sm:flex-wrap">
        <div className="flex gap-3 sm:contents">
          <div className="flex-1 space-y-1.5 min-w-0">
            <label className="text-xs font-semibold uppercase tracking-wider text-hero-foreground/60">
              Category Name
            </label>
            <Input
              placeholder="e.g. Electrician"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              disabled={busyId === "new"}
            />
          </div>
          <div className="w-20 sm:w-24 space-y-1.5 shrink-0">
            <label className="text-xs font-semibold uppercase tracking-wider text-hero-foreground/60">
              Icon
            </label>
            <Input
              placeholder="Emoji"
              value={newCatIcon}
              onChange={(e) => setNewCatIcon(e.target.value)}
              disabled={busyId === "new"}
            />
          </div>
        </div>
        <div className="w-full sm:w-48 space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-hero-foreground/60">
            Parent
          </label>
          <Select
            value={newParentId || "none"}
            onValueChange={(v) => setNewParentId(v === "none" ? null : v)}
            disabled={busyId === "new"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Main Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (Main Category)</SelectItem>
              {mainCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => addMutation.mutate()}
          disabled={busyId === "new" || !newCatName.trim()}
          className="gap-2 w-full sm:w-auto"
        >
          {busyId === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </Button>
      </div>

      {/* Categories List */}
      <div className="space-y-4">
        {mainCategories.map((main, mainIdx) => {
          const subs = subCategories.filter((s) => s.parent_id === main.id);
          const isExpanded = expandedIds.has(main.id);
          const isEditingMain = editingId === main.id;
          const isBusyMain = busyId === main.id;

          return (
            <div key={main.id} className="space-y-2">
              <div
                className={`flex items-center gap-2 sm:gap-3 rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-2 sm:p-3 transition-all ${
                  isEditingMain ? "ring-2 ring-primary/20" : ""
                } ${isBusyMain ? "opacity-60 pointer-events-none" : ""}`}
              >
                <button
                  onClick={() => toggleExpand(main.id)}
                  className="p-1 hover:bg-accent rounded-lg"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-hero-foreground/60" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-hero-foreground/60" />
                  )}
                </button>
                {isEditingMain ? (
                  <>
                    <Input
                      className="w-12 sm:w-16 shrink-0 text-center text-lg sm:text-xl px-1"
                      value={editIcon}
                      onChange={(e) => setEditIcon(e.target.value)}
                    />
                    <Input
                      className="flex-1 min-w-0"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit(main.id)}>
                        <Check className="h-4 w-4 text-primary" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEdit}>
                        <X className="h-4 w-4 text-hero-foreground/60" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg sm:text-xl">
                      {main.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-hero-foreground truncate text-sm sm:text-base">{main.name}</p>
                      <p className="text-[10px] text-hero-foreground/60 uppercase tracking-widest truncate">
                        {subs.length} subcategories
                      </p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 shrink-0 w-[72px] sm:w-auto">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => moveCategory(main, "up")}
                        disabled={mainIdx === 0}
                        title="Move up"
                      >
                        <ArrowUp className="h-4 w-4 text-hero-foreground/60" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => moveCategory(main, "down")}
                        disabled={mainIdx === mainCategories.length - 1}
                        title="Move down"
                      >
                        <ArrowDown className="h-4 w-4 text-hero-foreground/60" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(main)}>
                        <Edit2 className="h-4 w-4 text-hero-foreground/60" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(main.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {isExpanded && (
                <div className="ml-4 sm:ml-9 space-y-2 border-l-2 border-muted pl-3 sm:pl-4">
                  {subs.map((sub, subIdx) => {
                    const isEditingSub = editingId === sub.id;
                    const isBusySub = busyId === sub.id;
                    return (
                      <div
                        key={sub.id}
                        className={`flex items-center gap-3 rounded-xl border border-hero-foreground/10 bg-hero-foreground/[0.04]/50 p-2 transition-all ${
                          isEditingSub ? "ring-2 ring-primary/20" : ""
                        } ${isBusySub ? "opacity-60 pointer-events-none" : ""}`}
                      >
                        {isEditingSub ? (
                          <>
                            <Input
                              className="flex-1 h-8 text-sm"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              autoFocus
                            />
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit(sub.id)}>
                                <Check className="h-4 w-4 text-primary" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEdit}>
                                <X className="h-4 w-4 text-hero-foreground/60" />
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-hero-foreground truncate">{sub.name}</p>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 shrink-0 w-[72px] sm:w-auto">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => moveCategory(sub, "up")}
                                disabled={subIdx === 0}
                                title="Move up"
                              >
                                <ArrowUp className="h-3.5 w-3.5 text-hero-foreground/60" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => moveCategory(sub, "down")}
                                disabled={subIdx === subs.length - 1}
                                title="Move down"
                              >
                                <ArrowDown className="h-3.5 w-3.5 text-hero-foreground/60" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(sub)}>
                                <Edit2 className="h-3.5 w-3.5 text-hero-foreground/60" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleDelete(sub.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                  <button
                    onClick={() => {
                      setNewParentId(main.id);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="flex items-center gap-2 rounded-xl border border-dashed p-2 text-xs text-hero-foreground/60 hover:bg-accent hover:text-accent-foreground transition-colors w-full"
                  >
                    <Plus className="h-3 w-3" /> Add subcategory to {main.name}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {mainCategories.length === 0 && (
          <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-hero-foreground/60">
            No categories found. Start by adding one above.
          </div>
        )}
      </div>
    </div>
  );
}
