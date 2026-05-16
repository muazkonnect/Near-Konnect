import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Save, KeyRound, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AvatarUpload from "@/components/AvatarUpload";
import AvatarResetFlow from "@/components/AvatarResetFlow";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import UpgradeToWorker from "@/components/UpgradeToWorker";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import PhoneField from "@/components/PhoneField";

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { role } = useUserRole();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["my_profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  const handleSave = async () => {
    if (!user) return;
    if (!phone.trim()) { toast.error("Phone number is required."); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: name,
      phone: phone.trim(),
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error(error.message || "Failed to save");
    else {
      toast.success("Profile updated!");
      queryClient.invalidateQueries({ queryKey: ["my_profile"] });
    }
  };

  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <AppLayout showSignOut>
      <section className="mx-auto max-w-xl space-y-5">
        <div className="rounded-3xl border bg-card p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-4">
            <AvatarUpload currentUrl={profile?.avatar_url} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold text-card-foreground">{profile?.full_name || "Your profile"}</p>
              <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
              <AvatarResetFlow onReplaced={() => queryClient.invalidateQueries({ queryKey: ["my_profile"] })} />
            </div>
          </div>

          {role !== "worker" && (
            <div className="mb-6">
              <UpgradeToWorker />
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 h-11 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone Number</Label>
              <div className="mt-1.5">
                <PhoneField value={phone} onChange={setPhone} />
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="mt-6 h-11 w-full gap-2 rounded-xl">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>

        <div className="rounded-3xl border bg-card p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-card-foreground">Password</p>
              <p className="text-xs text-muted-foreground">Change your account password.</p>
            </div>
            <ChangePasswordDialog>
              <Button variant="outline" className="h-10 gap-2 rounded-xl">
                <KeyRound className="h-3.5 w-3.5" /> Change
              </Button>
            </ChangePasswordDialog>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={async () => { await signOut(); navigate("/login"); }}
          className="h-11 w-full gap-2 rounded-xl"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </section>
    </AppLayout>
  );
};

export default CustomerDashboard;
