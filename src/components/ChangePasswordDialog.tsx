import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { validatePassword } from "@/lib/passwordValidation";
import { getAuthErrorMessage } from "@/lib/supabaseErrorMessages";
import PasswordStrength from "@/components/PasswordStrength";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  children: React.ReactNode;
}

const ChangePasswordDialog = ({ children }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setCurrentPw(""); setNewPw(""); setConfirmPw(""); setShow(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) { toast.error("No account email found."); return; }
    if (newPw !== confirmPw) { toast.error("New passwords do not match."); return; }
    if (currentPw === newPw) { toast.error("New password must differ from current."); return; }
    const v = validatePassword(newPw);
    if (!v.isValid) { toast.error("Password requirement: " + v.errors[0]); return; }

    setLoading(true);
    // Verify current password by re-authenticating
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPw });
    if (signInErr) {
      setLoading(false);
      toast.error("Current password is incorrect.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setLoading(false);
    if (error) { toast.error(getAuthErrorMessage(error)); return; }
    toast.success("Password updated successfully.");
    reset();
    setOpen(false);
  };

  const inputClass = "h-11 rounded-xl border-border bg-background pr-10 text-base";
  const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="currentPw" className={labelClass}>Current Password</Label>
            <div className="relative">
              <Input id="currentPw" type={show ? "text" : "password"} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className={inputClass} autoComplete="current-password" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="Toggle password visibility">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="newPw" className={labelClass}>New Password</Label>
            <Input id="newPw" type={show ? "text" : "password"} value={newPw} onChange={(e) => setNewPw(e.target.value)} className="h-11 rounded-xl border-border bg-background text-base" autoComplete="new-password" />
            <PasswordStrength password={newPw} />
          </div>
          <div>
            <Label htmlFor="confirmPw" className={labelClass}>Confirm New Password</Label>
            <Input id="confirmPw" type={show ? "text" : "password"} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="h-11 rounded-xl border-border bg-background text-base" autoComplete="new-password" />
            {confirmPw && newPw !== confirmPw && (
              <p className="mt-1.5 text-xs font-medium text-destructive">Passwords do not match</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" variant="hero" disabled={loading || !currentPw || !newPw || newPw !== confirmPw}>
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordDialog;
