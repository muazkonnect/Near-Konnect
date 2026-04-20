import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, Droplet } from "lucide-react";
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type Step = "platform" | "blood" | "done";

/** Custom DialogContent without the default close button (we control flow). */
const PlainDialogContent = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <DialogPortal>
    <DialogOverlay className="bg-black/70 backdrop-blur-sm" />
    <DialogPrimitive.Content
      onInteractOutside={(e) => e.preventDefault()}
      onEscapeKeyDown={(e) => e.preventDefault()}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 w-[calc(100%-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%]",
        "rounded-3xl border border-border bg-card p-0 shadow-2xl duration-200",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className,
      )}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
);

const DisclosureModals = () => {
  const [step, setStep] = useState<Step>("done");
  const [turningOff, setTurningOff] = useState(false);

  useEffect(() => {
    let hadSession = false;
    // Seed from current session so existing logged-in users don't trigger
    supabase.auth.getSession().then(({ data }) => {
      hadSession = !!data.session;
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Only show on a real sign-in transition (no prior session) — not on token refresh or page reload
      if (event === "SIGNED_IN" && !hadSession) {
        setStep("platform");
      }
      hadSession = !!session;
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const finish = () => setStep("done");

  const handleTurnOff = async () => {
    setTurningOff(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from("profiles")
          .update({ is_blood_donor: false, donor_status: "inactive" })
          .eq("user_id", user.id);
        if (error) throw error;
      }
    } catch (err) {
      console.error("Failed to turn off blood donor option", err);
    } finally {
      setTurningOff(false);
      finish();
    }
  };

  return (
    <>
      {/* Step 1 — Platform notice */}
      <Dialog open={step === "platform"} onOpenChange={() => { /* controlled */ }}>
        <PlainDialogContent>
          {/* Hero strip */}
          <div className="relative overflow-hidden rounded-t-3xl bg-hero px-6 pt-7 pb-6 text-hero-foreground">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: "radial-gradient(hsl(var(--hero-foreground)) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />
            <div className="relative flex flex-col items-center text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight">Important Notice</h2>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-hero-muted">
                Please read before continuing
              </p>
            </div>
          </div>

          <div className="space-y-4 px-6 pt-5 pb-6">
            <div className="space-y-3 rounded-2xl bg-muted/50 p-4 text-sm leading-relaxed text-foreground">
              <p>
                We act <strong>only as a platform</strong> to connect customers with independent service providers.
              </p>
              <p>
                We are <strong>not responsible</strong> for payments, service quality, safety, or disputes between users and workers.
              </p>
              <p>Please verify and proceed at your own discretion.</p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <Button
                variant="hero"
                size="lg"
                className="w-full rounded-2xl text-base font-semibold"
                onClick={() => setStep("blood")}
              >
                I Understand
              </Button>
              <Link
                to="/terms"
                onClick={() => setStep("blood")}
                className="text-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Learn More
              </Link>
            </div>
          </div>
        </PlainDialogContent>
      </Dialog>

      {/* Step 2 — Blood donation privacy */}
      <Dialog open={step === "blood"} onOpenChange={() => { /* controlled */ }}>
        <PlainDialogContent>
          <div className="relative overflow-hidden rounded-t-3xl bg-hero px-6 pt-7 pb-6 text-hero-foreground">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: "radial-gradient(hsl(var(--hero-foreground)) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />
            <div className="relative flex flex-col items-center text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-destructive text-destructive-foreground shadow-lg">
                <Droplet className="h-7 w-7 fill-current" />
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight">Blood Donation Privacy Notice</h2>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-hero-muted">
                For emergency donor matching
              </p>
            </div>
          </div>

          <div className="space-y-4 px-6 pt-5 pb-6">
            <div className="space-y-3 rounded-2xl bg-muted/50 p-4 text-sm leading-relaxed text-foreground">
              <p>
                If you enable the <strong>"Willing to Donate Blood"</strong> option, your <strong>Name</strong>,{" "}
                <strong>Phone Number</strong>, and <strong>Real-Time Location</strong> may be publicly visible to people in need.
              </p>
              <p>By continuing, you agree to share this information for emergency purposes.</p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <Button
                variant="hero"
                size="lg"
                className="w-full rounded-2xl text-base font-semibold"
                onClick={finish}
              >
                Agree &amp; Continue
              </Button>
              <Button
                variant="ghost"
                size="lg"
                disabled={turningOff}
                className="w-full rounded-2xl text-base font-medium text-muted-foreground hover:text-foreground"
                onClick={handleTurnOff}
              >
                {turningOff ? "Turning off..." : "Turn Off Option"}
              </Button>
            </div>
          </div>
        </PlainDialogContent>
      </Dialog>
    </>
  );
};

export default DisclosureModals;
