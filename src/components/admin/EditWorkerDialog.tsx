import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  MAIN_SERVICE_CATEGORIES,
  SUBCATEGORIES_BY_MAIN,
  type MainServiceCategory,
} from "@/data/serviceCategories";
import { useAuth } from "@/contexts/AuthContext";
import { logAdminAction } from "@/lib/adminAudit";

interface Props {
  worker: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditWorkerDialog({ worker, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [profession, setProfession] = useState("");
  const [mainCategory, setMainCategory] = useState<string>("");
  const [subCategory, setSubCategory] = useState<string>("");
  const [experience, setExperience] = useState("0");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (worker) {
      setProfession(worker.profession || "");
      setMainCategory(worker.main_category || "");
      setSubCategory(worker.sub_category || "");
      setExperience(String(worker.experience ?? 0));
    }
  }, [worker]);

  const subOptions = useMemo(() => {
    if (!mainCategory) return [] as readonly string[];
    return (SUBCATEGORIES_BY_MAIN as any)[mainCategory] || [];
  }, [mainCategory]);

  const save = async () => {
    if (!worker) return;
    if (!profession.trim() || !mainCategory || !subCategory) {
      toast.error("Profession, main category, and sub category are required");
      return;
    }
    setBusy(true);
    const before = {
      profession: worker.profession,
      main_category: worker.main_category,
      sub_category: worker.sub_category,
      experience: worker.experience,
    };
    const after = {
      profession: profession.trim(),
      main_category: mainCategory,
      sub_category: subCategory,
      experience: Math.max(0, parseInt(experience, 10) || 0),
    };
    const { error } = await supabase
      .from("workers")
      .update(after)
      .eq("id", worker.id);

    if (error) {
      toast.error("Failed to update worker: " + error.message);
      setBusy(false);
      return;
    }

    if (user?.id) {
      await logAdminAction({
        adminUserId: user.id,
        action: "worker.update",
        targetType: "worker",
        targetId: worker.id,
        metadata: { before, after, worker_user_id: worker.user_id },
      });
    }

    toast.success("Worker updated");
    qc.invalidateQueries({ queryKey: ["admin_workers"] });
    qc.invalidateQueries({ queryKey: ["workers"] });
    setBusy(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit worker</DialogTitle>
          <DialogDescription>
            Update profession, category, and experience. Changes save instantly and are logged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Profession *</Label>
            <Input
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              placeholder="e.g. Electrician"
            />
          </div>

          <div className="space-y-2">
            <Label>Main category *</Label>
            <Select
              value={mainCategory}
              onValueChange={(v) => {
                setMainCategory(v);
                // reset sub when main changes
                setSubCategory("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a main category" />
              </SelectTrigger>
              <SelectContent>
                {MAIN_SERVICE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Sub category *</Label>
            <Select
              value={subCategory}
              onValueChange={setSubCategory}
              disabled={!mainCategory}
            >
              <SelectTrigger>
                <SelectValue placeholder={mainCategory ? "Select a sub category" : "Pick main category first"} />
              </SelectTrigger>
              <SelectContent>
                {subOptions.map((c: string) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Experience (years)</Label>
            <Input
              type="number"
              min="0"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
