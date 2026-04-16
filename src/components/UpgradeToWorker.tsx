import { useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, ArrowRight, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getCurrentPosition, type Coords } from "@/lib/geolocation";
import { MAIN_SERVICE_CATEGORIES, SUBCATEGORIES_BY_MAIN, type MainServiceCategory } from "@/data/serviceCategories";

const UpgradeToWorker = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mainCategory, setMainCategory] = useState<MainServiceCategory | "">("");
  const [subCategory, setSubCategory] = useState("");
  const [experience, setExperience] = useState("");
  const [location, setLocation] = useState<Coords | null>(null);
  const [capturingLocation, setCapturingLocation] = useState(false);

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
      });

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Register as a Service</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          Fill in your professional details to start appearing in search results. Your existing account info will be kept.
        </p>
        <div className="space-y-4">
          <div>
            <Label>Main Category *</Label>
            <select
              value={mainCategory}
              onChange={(e) => {
                const nextMainCategory = e.target.value as MainServiceCategory | "";
                setMainCategory(nextMainCategory);
                setSubCategory("");
              }}
              className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select main category</option>
              {MAIN_SERVICE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Subcategory *</Label>
            <select
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              disabled={!mainCategory}
              className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select subcategory</option>
              {(mainCategory ? SUBCATEGORIES_BY_MAIN[mainCategory] : []).map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Years of Experience *</Label>
            <Input type="number" placeholder="e.g. 5" className="mt-1.5" value={experience} onChange={e => setExperience(e.target.value)} />
          </div>
          <div className="rounded-xl border bg-muted/40 p-3">
            <p className="text-sm font-medium text-foreground">Use your current location as your service location?</p>
            <p className="mt-1 text-xs text-muted-foreground">This location is fixed for nearby matching and cannot be changed frequently.</p>
            <Button type="button" variant="outline" className="mt-3 w-full gap-2" onClick={captureLocation} disabled={capturingLocation || !!location}>
              <Navigation className="h-4 w-4" />
              {location ? "Service location saved" : capturingLocation ? "Detecting location..." : "Use my current location"}
            </Button>
            {location && (
              <p className="mt-2 text-xs text-muted-foreground">{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</p>
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
