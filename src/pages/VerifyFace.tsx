import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import AuthShell from "@/components/AuthShell";
import FaceVerification from "@/components/FaceVerification";
import { supabase } from "@/integrations/supabase/client";

const VerifyFace = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [checking, setChecking] = useState(true);
  const redirect = params.get("redirect") || "/";

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate(`/login?redirect=${encodeURIComponent(`/verify-face?redirect=${encodeURIComponent(redirect)}`)}`, { replace: true });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("face_verified")
        .eq("user_id", data.session.user.id)
        .maybeSingle();
      if (!active) return;
      if (profile?.face_verified) {
        navigate(redirect, { replace: true });
        return;
      }
      setChecking(false);
    })();
    return () => {
      active = false;
    };
  }, [navigate, redirect]);

  const handleVerified = () => {
    toast.success("Identity verified!");
    navigate(redirect, { replace: true });
  };

  const handleSkip = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  if (checking) {
    return (
      <AuthShell title="Checking…" subtitle="One moment">
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">Loading…</div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Verify your identity" subtitle="Quick face check to keep NearKonnect safe">
      <FaceVerification onVerified={handleVerified} onSkip={handleSkip} />
    </AuthShell>
  );
};

export default VerifyFace;
