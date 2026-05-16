import { useNavigate } from "react-router-dom";
import { Star, BadgeCheck, Phone, MessageCircle, MessageSquare, Video, Lock, X, MapPin, Sparkles, Circle, Crown } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { getExpertise } from "@/lib/categoryExpertise";
import type { Worker } from "@/data/mockData";

interface Props {
  worker: (Worker & { distance?: number }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthed?: boolean;
}

const sanitizePhone = (p?: string) => (p || "").replace(/[^\d+]/g, "");

const WorkerProfilePopup = ({ worker, open, onOpenChange, isAuthed }: Props) => {
  const navigate = useNavigate();
  if (!worker) return null;

  const initials = worker.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const phone = sanitizePhone(worker.phone);
  const expertise = getExpertise(worker.mainCategory, worker.subCategory, [worker.profession, ...(worker.serviceAreas || [])], 5);
  const isPremium = worker.verified;
  const dist = worker.distance;
  const hasDist = typeof dist === "number" && dist > 0 && isFinite(dist);
  const distLabel = hasDist ? `${dist} km away` : "Distance unknown";
  const available = !!worker.available;

  const requireAuth = (fn: () => void) => () => {
    if (!isAuthed) {
      onOpenChange(false);
      navigate("/login");
      return;
    }
    fn();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onPointerDownOutside={() => onOpenChange(false)}
        onInteractOutside={() => onOpenChange(false)}
        className="max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-hero/95 p-0 text-hero-foreground backdrop-blur-xl shadow-2xl [&>button.absolute]:hidden"
      >
        <VisuallyHidden>
          <DialogTitle>{worker.name}</DialogTitle>
          <DialogDescription>Professional profile preview</DialogDescription>
        </VisuallyHidden>

        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-hero-muted hover:bg-white/10 hover:text-hero-foreground transition"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="h-1 w-12 rounded-full bg-white/15" />
        </div>

        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-full bg-primary opacity-20 blur transition duration-700 group-hover:opacity-30" />
              <Avatar className="relative z-10 h-32 w-32 border-2 border-primary">
                <AvatarImage src={worker.profilePhoto} alt={worker.name} className="object-cover" />
                <AvatarFallback className="bg-white/10 text-2xl font-bold text-primary">{initials}</AvatarFallback>
              </Avatar>
              {worker.verified && (
                <div className="absolute bottom-1 right-1 z-20 rounded-full border-4 border-hero bg-primary p-1 text-primary-foreground">
                  <BadgeCheck className="h-4 w-4" />
                </div>
              )}
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 flex-nowrap">
                <h2 className="font-sora text-2xl font-semibold tracking-tight leading-none">{worker.name}</h2>
                {isPremium && (
                  <span
                    title="Premium Worker"
                    aria-label="Premium Worker"
                    className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground shadow-[0_0_20px_-2px_hsl(var(--primary)/0.9)] ring-2 ring-primary/30"
                  >
                    <Crown className="h-4 w-4" />
                    <span className="absolute inset-0 rounded-full bg-primary/30 blur-md -z-10 animate-pulse" />
                  </span>
                )}
              </div>

              {/* Prominent distance pill */}
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-4 py-1.5 text-primary shadow-[0_0_18px_-6px_hsl(var(--primary)/0.6)]">
                <MapPin className="h-4 w-4 fill-current/0" />
                <span className="font-sora text-base font-bold leading-none">
                  {hasDist ? `${dist} km` : "—"}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
                  {hasDist ? "away" : "distance n/a"}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <div className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1">
                  <Star className="h-3 w-3 fill-current text-primary" />
                  <span className="text-[11px] font-semibold">{worker.rating?.toFixed(1) || "—"}</span>
                </div>
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                    available
                      ? "border border-primary/40 bg-primary/15 text-primary"
                      : "border border-white/15 bg-white/5 text-hero-muted"
                  }`}
                >
                  <Circle className={`h-2 w-2 fill-current ${available ? "animate-pulse" : ""}`} />
                  {available ? "Available now" : "Offline"}
                </div>
                {worker.experience > 0 && (
                  <div className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-hero-foreground">
                    <Sparkles className="h-3 w-3 text-primary" />
                    {worker.experience}+ yrs
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bento Grid */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-hero-muted">Category</span>
              <span className="block font-sora text-base font-semibold uppercase">{worker.mainCategory || "—"}</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-hero-muted">Sub-Category</span>
              <span className="block font-sora text-base font-semibold uppercase">{worker.subCategory || "—"}</span>
            </div>
            <div className="col-span-2 rounded-xl border border-primary/15 bg-gradient-to-br from-primary/10 to-transparent p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-hero-muted">Top Expertise</span>
              </div>
              {expertise.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {expertise.map((e) => (
                    <span
                      key={e}
                      className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-hero-muted">—</span>
              )}
            </div>
          </div>

          {/* Bio */}
          {worker.description && (
            <p className="mt-5 text-center text-sm italic leading-relaxed text-hero-muted md:text-left">
              “{worker.description}”
            </p>
          )}

          {/* Actions */}
          <div className="mt-6 space-y-4">
            <div className="flex gap-3">
              <Button
                className="flex-1 rounded-xl py-6 font-sora text-base font-semibold"
                onClick={requireAuth(() => { if (phone) window.location.href = `tel:${phone}`; })}
              >
                <Phone className="mr-2 h-4 w-4" /> Call
              </Button>
              <Button
                variant="outline"
                className="flex-1 rounded-xl border-white/15 bg-transparent py-6 font-sora text-base font-semibold text-hero-foreground hover:bg-white/10"
                onClick={requireAuth(() => navigate(`/messages?worker=${worker.id}`))}
              >
                <MessageSquare className="mr-2 h-4 w-4" /> Message
              </Button>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={requireAuth(() => { if (phone) window.open(`https://wa.me/${phone.replace(/^\+/, "")}`, "_blank"); })}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-hero-muted transition hover:border-primary/50 hover:text-primary"
                aria-label="WhatsApp"
              >
                <MessageCircle className="h-5 w-5" />
              </button>
              <button
                onClick={requireAuth(() => {})}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-hero-muted transition hover:border-primary/50 hover:text-primary"
                aria-label="Imo"
              >
                <Video className="h-5 w-5" />
              </button>
              <button
                onClick={requireAuth(() => {})}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-hero-muted transition hover:border-primary/50 hover:text-primary"
                aria-label="Signal"
              >
                <Lock className="h-5 w-5" />
              </button>
            </div>

            <div className="text-center">
              <button
                onClick={() => { onOpenChange(false); navigate(`/worker/${worker.id}`, { state: { distance: worker.distance } }); }}
                className="inline-block py-2 text-sm text-hero-muted underline decoration-primary/30 transition hover:text-primary"
              >
                View Full Profile
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkerProfilePopup;
