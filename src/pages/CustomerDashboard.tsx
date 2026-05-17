import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Save, KeyRound, LogOut, MessageSquare } from "lucide-react";
import logoImg from "@/assets/logo.svg";
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
      <div className="grid min-h-screen place-items-center bg-hero">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <AppLayout showSignOut>
      <div className="-mx-4 -my-[70px] min-h-screen bg-hero text-hero-foreground">
        <section className="mx-auto max-w-xl space-y-5 px-5 pt-6 pb-32">
          <div className="rounded-3xl border border-primary/15 bg-primary/5 p-6 backdrop-blur sm:p-8">
            <div className="mb-6 flex items-center gap-4">
              <AvatarUpload currentUrl={profile?.avatar_url} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-sora text-lg font-bold text-hero-foreground">
                  {profile?.full_name || "Your profile"}
                </p>
                <p className="truncate text-sm text-hero-muted">{user?.email}</p>
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
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-hero-muted">Full Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 h-11 rounded-xl border-primary/20 bg-primary/5 text-hero-foreground placeholder:text-hero-muted/60 focus-visible:border-primary/60 focus-visible:ring-0"
                />
              </div>
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-hero-muted">Phone Number</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  placeholder="+1 234 567 8900"
                  className="mt-1.5 h-11 rounded-xl border-primary/20 bg-primary/5 text-hero-foreground placeholder:text-hero-muted/60 focus-visible:border-primary/60 focus-visible:ring-0"
                />
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="mt-6 h-11 w-full gap-2 rounded-xl">
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>

          <div className="rounded-3xl border border-primary/15 bg-primary/5 p-6 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-sora font-semibold text-hero-foreground">Password</p>
                <p className="text-xs text-hero-muted">Change your account password.</p>
              </div>
              <ChangePasswordDialog>
                <Button
                  variant="outline"
                  className="h-10 gap-2 rounded-xl border-primary/20 bg-primary/5 text-hero-foreground hover:bg-primary/10 hover:text-hero-foreground"
                >
                  <KeyRound className="h-3.5 w-3.5" /> Change
                </Button>
              </ChangePasswordDialog>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={async () => { await signOut(); navigate("/login"); }}
            className="h-11 w-full gap-2 rounded-xl border-primary/20 bg-primary/5 text-hero-foreground hover:bg-primary/10 hover:text-hero-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </section>
      </div>
    </AppLayout>
  );
};

export default CustomerDashboard;
