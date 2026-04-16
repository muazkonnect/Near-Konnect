import { useState, useEffect } from "react";
import { Droplet, Heart } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const BloodDonationCard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["blood_profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("blood_group, is_blood_donor, donor_status")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [isDonor, setIsDonor] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [bloodGroup, setBloodGroup] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setIsDonor(profile.is_blood_donor ?? false);
      setIsActive(profile.donor_status === "active");
      setBloodGroup(profile.blood_group || "");
    }
  }, [profile]);

  const update = async (fields: { blood_group?: string; is_blood_donor?: boolean; donor_status?: string }) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update(fields)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error("Failed to update");
    else {
      toast.success("Updated!");
      queryClient.invalidateQueries({ queryKey: ["blood_profile"] });
    }
  };

  const handleDonorToggle = (val: boolean) => {
    setIsDonor(val);
    update({ is_blood_donor: val, donor_status: val ? (isActive ? "active" : "inactive") : "inactive" });
  };

  const handleActiveToggle = (val: boolean) => {
    setIsActive(val);
    update({ donor_status: val ? "active" : "inactive" });
  };

  const handleBloodGroupChange = (val: string) => {
    setBloodGroup(val);
    update({ blood_group: val });
  };

  return (
    <div className="bg-card border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-5 h-5 text-red-500" />
        <h3 className="font-semibold text-card-foreground">Blood Donation</h3>
      </div>

      {/* Blood Group */}
      <div className="mb-4">
        <label className="text-sm font-medium text-foreground mb-1.5 block">Blood Group</label>
        <select
          value={bloodGroup}
          onChange={e => handleBloodGroupChange(e.target.value)}
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Select blood group</option>
          {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
        </select>
      </div>

      {/* Willing to donate */}
      <div className="flex items-center justify-between p-3 bg-muted rounded-lg mb-3">
        <div>
          <p className="text-sm font-medium text-foreground">Willing to Donate</p>
          <p className="text-xs text-muted-foreground">Allow others to find you as a donor</p>
        </div>
        <Switch checked={isDonor} onCheckedChange={handleDonorToggle} disabled={saving} />
      </div>

      {/* Availability */}
      {isDonor && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Droplet className={`w-4 h-4 ${isActive ? "text-green-500" : "text-muted-foreground"}`} />
            <div>
              <p className="text-sm font-medium text-foreground">Availability</p>
              <p className="text-xs text-muted-foreground">{isActive ? "You're visible to those in need" : "Currently not available"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs rounded-full ${isActive ? "border-green-300 text-green-600" : ""}`}>
              {isActive ? "Active" : "Inactive"}
            </Badge>
            <Switch checked={isActive} onCheckedChange={handleActiveToggle} disabled={saving} />
          </div>
        </div>
      )}
    </div>
  );
};

export default BloodDonationCard;
