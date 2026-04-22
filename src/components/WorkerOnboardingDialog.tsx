import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Briefcase } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MapLocationPicker from "@/components/MapLocationPicker";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { type Coords } from "@/lib/geolocation";
import {
  MAIN_SERVICE_CATEGORIES,
  SUBCATEGORIES_BY_MAIN,
  type MainServiceCategory,
} from "@/data/serviceCategories";

const STORAGE_KEY = "nk_oauth_intent";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-hero-muted";
const inputClass = "h-12 rounded-2xl border-white/15 bg-white/5 text-base text-hero-foreground placeholder:text-hero-muted/70 focus-visible:ring-primary/40";
const selectClass = `${inputClass} w-full px-3 focus-visible:outline-none focus-visible:ring-2`;

const WorkerOnboardingDialog = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mainCategory, setMainCategory] = useState<MainServiceCategory | "">("");
  const [subCategory, setSubCategory] = useState("");
  const [experience, setExperience] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [willingToDonate, setWillingToDonate] = useState(false);
  const [bloodGroup, setBloodGroup] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;
    const intent = sessionStorage.getItem(STORAGE_KEY);
    if (intent !== "worker") return;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("workers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn("Worker check failed", error);
        return;
      }
      if (!data) {
        setOpen(true);
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const handleSubmit = async () => {
    if (!user) return;
    if (!mainCategory || !subCategory) {
      toast.error("Please select a main category and subcategory.");
      return;
    }
    const exp = parseInt(experience, 10);
    if (!Number.isFinite(exp) || exp < 0) {
      toast.error("Please enter your years of experience.");
      return;
    }
    if (!coords) {
      toast.error("Please pick your service location on the map.");
      return;
    }
    if (willingToDonate && !bloodGroup) {
      toast.error("Please select your blood group.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: workerErr } = await supabase.from("workers").insert({
        user_id: user.id,
        profession: subCategory,
        main_category: mainCategory,
        sub_category: subCategory,
        experience: exp,
        latitude: coords.latitude,
        longitude: coords.longitude,
        service_areas: [],
        city: null,
        available: true,
      });
      if (workerErr && !/duplicate|unique/i.test(workerErr.message)) {
        throw workerErr;
      }

      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: "worker" as never });
      if (roleErr && !/duplicate|unique/i.test(roleErr.message)) {
        console.warn("Role insert warning", roleErr);
      }

      if (willingToDonate || bloodGroup) {
        const { error: profileErr } = await supabase
          .from("profiles")
          .update({
            is_blood_donor: willingToDonate,
            blood_group: bloodGroup || null,
          })
          .eq("user_id", user.id);
        if (profileErr) console.warn("Profile update warning", profileErr);
      }

      sessionStorage.removeItem(STORAGE_KEY);
      queryClient.invalidateQueries({ queryKey: ["user_role"] });
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      queryClient.invalidateQueries({ queryKey: ["my_worker_profile"] });
      toast.success("Your service profile is live!");
      setOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not set up your service profile.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (submitting) return;
    setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl border-0 bg-hero p-0 text-hero-foreground sm:max-w-lg">
        <div className="relative px-6 pb-8 pt-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "radial-gradient(hsl(var(--hero-foreground)) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="relative">
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-primary">
                <Briefcase className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Complete your service profile</h2>
                <p className="text-sm text-hero-muted">A few details so customers can find and trust you.</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <Label className={labelClass}>Main Category *</Label>
                <select
                  value={mainCategory}
                  onChange={(e) => {
                    setMainCategory(e.target.value as MainServiceCategory | "");
                    setSubCategory("");
                  }}
                  className={selectClass}
                >
                  <option value="" className="text-foreground">Select main category</option>
                  {MAIN_SERVICE_CATEGORIES.map((c) => (
                    <option key={c} value={c} className="text-foreground">{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className={labelClass}>Subcategory *</Label>
                <select
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  disabled={!mainCategory}
                  className={`${selectClass} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <option value="" className="text-foreground">Select subcategory</option>
                  {(mainCategory ? SUBCATEGORIES_BY_MAIN[mainCategory] : []).map((c) => (
                    <option key={c} value={c} className="text-foreground">{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className={labelClass}>Years of experience *</Label>
                <Input
                  type="number"
                  min={0}
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="e.g. 5"
                  className={inputClass}
                />
              </div>

              <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold">Pin your service location *</p>
                <p className="text-xs text-hero-muted">Used for nearby matching. Cannot be changed frequently.</p>
                <div className="overflow-hidden rounded-2xl">
                  <MapLocationPicker value={coords} onChange={setCoords} />
                </div>
              </div>

              <label
                htmlFor="onboard-donate"
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 text-sm font-medium"
              >
                <input
                  id="onboard-donate"
                  type="checkbox"
                  checked={willingToDonate}
                  onChange={(e) => {
                    setWillingToDonate(e.target.checked);
                    if (!e.target.checked) setBloodGroup("");
                  }}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                I am willing to donate blood
              </label>

              {willingToDonate && (
                <div>
                  <Label className={labelClass}>Blood Group *</Label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className={selectClass}
                  >
                    <option value="" className="text-foreground">Select blood group</option>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                      <option key={bg} value={bg} className="text-foreground">{bg}</option>
                    ))}
                  </select>
                </div>
              )}

              <Button
                type="button"
                variant="hero"
                size="lg"
                className="w-full"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Setting up…" : "Activate Service Profile"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkerOnboardingDialog;
