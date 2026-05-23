import { useEffect, useState } from "react";
import { Save, KeyRound, Mail, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AvatarUpload from "@/components/AvatarUpload";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";

const AdminProfileTab = () => {
  const { user } = useAuth();
  const { roles } = useUserRole();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["admin_self_profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, profile_phones(phone)" as any)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(((profile as any).profile_phones?.phone) || "");
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  const handleAvatar = async (url: string) => {
    setAvatarUrl(url);
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
    if (error) toast.error("Failed to save avatar");
    else qc.invalidateQueries({ queryKey: ["admin_self_profile", user.id] });
  };

  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("user_id", user.id);
    if (!error) {
      await (supabase as any).from("profile_phones").upsert({ user_id: user.id, phone: phone.trim() || null }, { onConflict: "user_id" });
    }
    setSaving(false);
    if (error) {
      toast.error("Failed to update profile");
      return;
    }
    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["admin_self_profile", user.id] });
  };

  const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-hero-foreground/60";
  const inputClass = "h-11 rounded-xl border-border bg-hero text-base";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-hero-foreground">My Profile</h2>
        <p className="text-sm text-hero-foreground/60">Update your personal info and account security.</p>
      </div>

      {/* Identity card */}
      <div className="rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-5">
        <div className="flex flex-wrap items-start gap-5">
          <AvatarUpload currentUrl={avatarUrl} size={96} />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-hero-foreground">{fullName || "Unnamed"}</p>
            <p className="flex items-center gap-1.5 text-sm text-hero-foreground/60">
              <Mail className="h-3.5 w-3.5" /> {user?.email}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {roles.map((r) => (
                <Badge key={r} variant="outline" className="text-[10px] uppercase tracking-wide">
                  {r}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Personal details */}
      <div className="rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-hero-foreground/60">
          <UserIcon className="h-4 w-4" /> Personal Details
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className={labelClass}>Full Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className={inputClass}
              disabled={isLoading}
            />
          </div>
          <div>
            <Label className={labelClass}>Phone</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional phone number"
              className={inputClass}
              disabled={isLoading}
            />
          </div>
          <div>
            <Label className={labelClass}>Email</Label>
            <Input value={user?.email || ""} disabled className={inputClass} />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={handleSave} disabled={saving || isLoading} variant="hero" className="gap-1">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Security */}
      <div className="rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-hero-foreground/60">
          <KeyRound className="h-4 w-4" /> Security
        </h3>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hero-foreground/10 bg-hero-foreground/[0.05] p-4">
          <div>
            <p className="text-sm font-semibold text-hero-foreground">Password</p>
            <p className="text-xs text-hero-foreground/60">Change your account password regularly to stay secure.</p>
          </div>
          <ChangePasswordDialog>
            <Button variant="outline" className="gap-1">
              <KeyRound className="h-4 w-4" /> Change Password
            </Button>
          </ChangePasswordDialog>
        </div>
      </div>
    </div>
  );
};

export default AdminProfileTab;
