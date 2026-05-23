import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, ArrowRight, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import LocationLabel from "@/components/LocationLabel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getCurrentPosition, type Coords } from "@/lib/geolocation";
import { useCategories } from "@/hooks/useCategories";
import MapLocationPickerLazy from "@/components/MapLocationPickerLazy";

const UpgradeToWorker = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { mainCategories, getSubCategories, getExpertise } = useCategories();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mainCategory, setMainCategory] = useState<string>("");
  const [subCategory, setSubCategory] = useState("");
  const [experience, setExperience] = useState("");
  const [location, setLocation] = useState<Coords | null>(null);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [expertiseTags, setExpertiseTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const MAX_EXPERTISE = 5;

  const subCategories = mainCategory ? getSubCategories(mainCategory) : [];
  const expertiseOptions = mainCategory && subCategory ? getExpertise(mainCategory, subCategory) : [];
  const toggleTag = (tag: string) => {
    setExpertiseTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= MAX_EXPERTISE) {
        toast.error(`You can select up to ${MAX_EXPERTISE} expertise tags.`);
        return prev;
      }
      return [...prev, tag];
    });
  };
  const addCustomTag = () => {
    const t = customTag.trim();
    if (!t) return;
    if (expertiseTags.length >= MAX_EXPERTISE) {
      toast.error(`Max ${MAX_EXPERTISE} reached.`);
      return;
    }
    if (!expertiseTags.find((x) => x.toLowerCase() === t.toLowerCase())) {
      setExpertiseTags([...expertiseTags, t]);
    }
    setCustomTag("");
  };

  useEffect(() => {
    if (searchParams.get("upgrade") === "worker") {
      setOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("upgrade");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);


  const captureLocation = async () => {
    setCapturingLocation(true);
    try {
      const coords = await getCurrentPosition();
      setLocation(coords);
      toast.success("Service location saved.");
    } catch {
      toast.error("Please enable location access to continue.");
    } finally {
      setCapturingLocation(false);
    }
  };

  const handleUpgrade = async () => {
    if (!user) return;
    if (!experience.trim()) {
      toast.error("Please fill in experience.");
      return;
    }
    if (!mainCategory || !subCategory) {
      toast.error("Please select both main category and subcategory.");
      return;
    }
    if (!location) {
      toast.error("Use your current location as your fixed service location.");
      return;
    }

    setLoading(true);
    try {
      // Insert worker record
      const { error: workerError } = await supabase.from("workers").insert({
        user_id: user.id,
          profession: subCategory,
          main_category: mainCategory,
          sub_category: subCategory,
        experience: parseInt(experience) || 0,
        city: null,
        service_areas: [],
        latitude: location.latitude,
        longitude: location.longitude,
        available: true,
        ...({ expertise_tags: expertiseTags } as Record<string, unknown>),
      } as never);

      if (workerError) {
        if (workerError.message.includes("duplicate") || workerError.message.includes("unique")) {
          toast.error("You already have a service profile!");
        } else {
          throw workerError;
        }
        setLoading(false);
        return;
      }

      // Add worker role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: user.id,
        role: "worker" as any,
      });

      // Role might already exist, that's fine
      if (roleError && !roleError.message.includes("duplicate") && !roleError.message.includes("unique")) {
        console.warn("Role insert warning:", roleError.message);
      }

      toast.success("You're now registered as a service! Your profile is live.");
      queryClient.invalidateQueries({ queryKey: ["user_role"] });
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to upgrade account.");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-brand rounded-2xl p-5 cursor-pointer hover:opacity-95 transition-opacity"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-primary-foreground">Become a Service</p>
                <p className="text-xs text-primary-foreground/70">Start offering your services on the platform</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-primary-foreground/80" />
          </div>
        </motion.div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register as a Service</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          Fill in your professional details to start appearing in search results. Your existing account info will be kept.
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Main Category</Label>
            <select
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background [color-scheme:dark] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={mainCategory}
              onChange={(e) => {
                setMainCategory(e.target.value);
                setSubCategory("");
              }}
            >
              <option value="" className="bg-popover text-foreground">Select a main category</option>
              {mainCategories.map((cat) => (
                <option key={cat.id} value={cat.name} className="bg-popover text-foreground">
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Profession (Subcategory)</Label>
            <select
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background [color-scheme:dark] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={subCategory}
              onChange={(e) => { setSubCategory(e.target.value); setExpertiseTags([]); }}
              disabled={!mainCategory}
            >
              <option value="" className="bg-popover text-foreground">Select your profession</option>
              {subCategories.map((sub) => (
                <option key={sub.id} value={sub.name} className="bg-popover text-foreground">
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {subCategory && (
            <div className="space-y-2">
              <Label>Expertise (max {MAX_EXPERTISE})</Label>
              <div className="flex flex-wrap gap-1.5">
                {expertiseOptions.map((tag) => {
                  const active = expertiseTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`rounded-full border px-3 py-1 text-xs ${active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"}`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              {expertiseTags.filter((t) => !expertiseOptions.includes(t)).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {expertiseTags.filter((t) => !expertiseOptions.includes(t)).map((tag) => (
                    <button key={tag} type="button" onClick={() => toggleTag(tag)} className="rounded-full border border-primary bg-primary px-3 py-1 text-xs text-primary-foreground">
                      {tag} ✕
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input value={customTag} onChange={(e) => setCustomTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }} placeholder="Add custom…" />
                <Button type="button" variant="outline" onClick={addCustomTag} disabled={!customTag.trim() || expertiseTags.length >= MAX_EXPERTISE}>Add</Button>
              </div>
            </div>
          )}
          <div>
            <Label>Years of Experience *</Label>
            <Input type="number" placeholder="e.g. 5" className="mt-1.5" value={experience} onChange={e => setExperience(e.target.value)} />
          </div>
          <div className="rounded-xl border bg-muted/40 p-3 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">Your fixed service location</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use your current location, or drag the pin on the map to set a different work address. This location is fixed for nearby matching.
              </p>
            </div>
            <Button type="button" variant="outline" className="w-full gap-2" onClick={captureLocation} disabled={capturingLocation}>
              <Navigation className="h-4 w-4" />
              {capturingLocation ? "Detecting..." : location ? "Re-use my current location" : "Use my current location"}
            </Button>
            <MapLocationPickerLazy value={location} onChange={(c) => setLocation(c)} />
            {location && (
              <p className="text-xs text-muted-foreground">
                <LocationLabel latitude={location.latitude} longitude={location.longitude} />
              </p>
            )}
          </div>
          <Button onClick={handleUpgrade} disabled={loading} className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90 rounded-xl">
            {loading ? "Setting up..." : "Activate Service Profile"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeToWorker;
