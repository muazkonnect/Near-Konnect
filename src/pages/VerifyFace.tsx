import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import AuthShell from "@/components/AuthShell";
import FaceVerification from "@/components/FaceVerification";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const PENDING_KEY = "pending_face_verification_image";

const VerifyFace = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const ranAuto = useRef(false);
  const redirect = params.get("redirect") || "/";
  const force = params.get("force") === "1";

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate(`/login?redirect=${encodeURIComponent(`/verify-face?redirect=${encodeURIComponent(redirect)}`)}`, { replace: true });
        return;
      }

      // If we have a pending captured image from signup, submit it now.
      const pending = sessionStorage.getItem(PENDING_KEY);
      if (pending && !ranAuto.current) {
        ranAuto.current = true;
        setAutoSubmitting(true);
        try {
          const { data: result, error } = await supabase.functions.invoke("verify-face", {
            body: { image: pending },
          });
          if (error) throw new Error(error.message);
          if ((result as { error?: string })?.error) throw new Error((result as { error: string }).error);
          sessionStorage.removeItem(PENDING_KEY);
          toast.success("Identity verified!");
          navigate(redirect, { replace: true });
          return;
        } catch (e) {
          sessionStorage.removeItem(PENDING_KEY);
          const msg = e instanceof Error ? e.message : "Verification failed";
          toast.error(msg + " — please retake.");
          if (active) {
            setAutoSubmitting(false);
            setChecking(false);
          }
          return;
        }
      }

      if (force) {
        if (active) setChecking(false);
        return;
      }
      const { data: profile } = await (supabase
        .from("profiles") as unknown as {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{ data: { face_verified: boolean } | null }>;
            };
          };
        })
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
  }, [navigate, redirect, force]);

  const handleVerified = () => {
    toast.success("Identity verified!");
    navigate(redirect, { replace: true });
  };

  const handleSkip = async () => {
    sessionStorage.removeItem(PENDING_KEY);
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  if (checking || autoSubmitting) {
    return (
      <AuthShell title={autoSubmitting ? "Verifying your photo…" : "Checking…"} subtitle="One moment">
        <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {autoSubmitting ? "Running face match" : "Loading"}
        </div>
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
