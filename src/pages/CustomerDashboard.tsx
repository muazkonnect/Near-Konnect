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
import PhoneField from "@/components/PhoneField";
import WhatsappIcon from "@/components/icons/WhatsappIcon";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { isValidPhoneNumber } from "libphonenumber-js";
import { sanitizePhone } from "@/lib/contactMethods";


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
    <AppLayout hideMobileHeader>
      <section className="min-h-screen bg-hero px-4 pb-40 pt-4 text-hero-foreground -mx-4 -mt-[90px] -mb-[166px] md:mx-0 md:mt-0 md:mb-0 md:min-h-0 md:rounded-3xl md:px-8 md:pt-8 md:pb-10">
        {/* Top App Bar — mobile only (desktop has AppLayout nav) */}
        <header className="sticky top-0 z-40 -mx-4 mb-5 flex items-center justify-between gap-3 border-b border-hero-foreground/10 bg-hero/90 px-5 py-3 backdrop-blur-md md:hidden">
          <Link to="/" className="inline-flex items-center">
            <img src={logoImg} alt="Near Konnect" className="block h-6 w-auto max-w-[55vw] object-contain" />
          </Link>
          <button
            onClick={() => navigate("/messages")}
            className="relative rounded-full p-2 text-primary transition hover:bg-hero-foreground/10"
            aria-label="Messages"
          >
            <MessageSquare className="h-5 w-5" />
          </button>
        </header>

        <div className="mx-auto max-w-xl space-y-4 md:max-w-2xl">
          <div className="rounded-3xl border border-hero-foreground/10 bg-hero-foreground/5 p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-4">
              <AvatarUpload currentUrl={profile?.avatar_url} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-sora text-lg font-bold text-hero-foreground">
                  {profile?.full_name || "Your profile"}
                </p>
                <p className="truncate text-sm text-hero-foreground/60">{user?.email}</p>
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
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-hero-foreground/60">Full Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 h-11 rounded-xl border-hero-foreground/15 bg-hero-foreground/5 text-hero-foreground placeholder:text-hero-foreground/40 focus-visible:border-primary/60 focus-visible:ring-0"
                />
              </div>
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-hero-foreground/60">Phone Number</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  placeholder="+1 234 567 8900"
                  className="mt-1.5 h-11 rounded-xl border-hero-foreground/15 bg-hero-foreground/5 text-hero-foreground placeholder:text-hero-foreground/40 focus-visible:border-primary/60 focus-visible:ring-0"
                />
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="mt-6 h-11 w-full gap-2 rounded-xl">
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>

          <div className="rounded-3xl border border-hero-foreground/10 bg-hero-foreground/5 p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-sora font-semibold text-hero-foreground">Password</p>
                <p className="text-xs text-hero-foreground/60">Change your account password.</p>
              </div>
              <ChangePasswordDialog>
                <Button
                  variant="outline"
                  className="h-10 gap-2 rounded-xl border-hero-foreground/15 bg-hero-foreground/5 text-hero-foreground hover:bg-hero-foreground/10 hover:text-hero-foreground"
                >
                  <KeyRound className="h-3.5 w-3.5" /> Change
                </Button>
              </ChangePasswordDialog>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={async () => { await signOut(); navigate("/login"); }}
            className="h-11 w-full gap-2 rounded-xl border-destructive/40 bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </section>
    </AppLayout>
  );
};

export default CustomerDashboard;
