import { useNavigate } from "react-router-dom";
import { Star, BadgeCheck, Phone, MessageCircle, MessageSquare, Video, Lock, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
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
  const expertise = (worker.serviceAreas || []).slice(0, 6);
  const isPremium = worker.verified;

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
              <h2 className="font-sora text-2xl font-semibold tracking-tight">{worker.name}</h2>
              <div className="mt-1 flex items-center justify-center gap-3">
                <div className="flex items-center gap-1 text-primary">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="text-sm font-semibold">{worker.rating?.toFixed(1) || "—"}</span>
                </div>
                {isPremium && (
                  <>
                    <span className="text-hero-muted">•</span>
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                      Premium
                    </span>
                  </>
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
            {expertise.length > 0 && (
              <div className="col-span-2 rounded-xl border border-white/10 bg-white/5 p-3">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-hero-muted">Expertise</span>
                <div className="flex flex-wrap gap-2">
                  {expertise.map((e) => (
                    <span key={e} className="rounded border border-white/10 bg-white/10 px-2 py-1 text-[11px] font-bold uppercase">
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}
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
                onClick={() => { onOpenChange(false); navigate(`/worker/${worker.id}`); }}
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
