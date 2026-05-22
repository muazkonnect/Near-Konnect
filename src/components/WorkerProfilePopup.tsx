import { useNavigate } from "react-router-dom";
import { Star, BadgeCheck, Phone, MessageSquare, X, MapPin, Briefcase, ShieldCheck, Crown, Sparkles, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import ContactMethodsBar from "@/components/ContactMethodsBar";
import type { ContactMethod } from "@/lib/contactMethods";
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
  const savedMethods: ContactMethod[] = (worker.contactMethods || []).filter((m) => (m.value || "").trim().length > 0);
  const premium = !!worker.verified;
  const dist = worker.distance;
  const hasDistance = typeof dist === "number" && dist > 0 && isFinite(dist);
  const available = !!worker.available;
  const badgeLabel = premium ? "Featured Pro" : "Profile";
  const BadgeIcon = premium ? Crown : Sparkles;

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
        className={`max-w-md overflow-hidden rounded-[24px] border-0 p-[1px] text-hero-foreground [&>button:last-child]:hidden ${
          premium
            ? "bg-gradient-to-br from-primary/70 via-primary/30 to-primary/50 shadow-[0_12px_32px_-18px_hsl(var(--primary)/0.5)]"
            : "bg-gradient-to-br from-primary/30 via-hero-foreground/10 to-primary/15"
        }`}
      >
        <VisuallyHidden>
          <DialogTitle>{worker.name}</DialogTitle>
          <DialogDescription>Worker profile preview</DialogDescription>
        </VisuallyHidden>

        <div className="relative overflow-hidden rounded-[23px] bg-hero">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 z-20 rounded-full bg-hero/70 p-1.5 text-hero-muted backdrop-blur-md ring-1 ring-hero-foreground/15 hover:text-hero-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* COVER BAND */}
          <div className="relative h-[110px] w-full overflow-hidden">
            {worker.bannerUrl ? (
              <img src={worker.bannerUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
            ) : worker.profilePhoto ? (
              <img src={worker.profilePhoto} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-primary/20 to-hero" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-hero/30 via-hero/55 to-hero" />

            <div className="relative flex items-center justify-between px-4 pt-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.18em] ${
                  premium
                    ? "bg-gradient-to-r from-primary to-primary/85 text-primary-foreground shadow-sm shadow-primary/30"
                    : "bg-hero-foreground/15 text-hero-foreground backdrop-blur-md ring-1 ring-hero-foreground/15"
                }`}
              >
                <BadgeIcon className="h-3 w-3" />
                {badgeLabel}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full bg-hero/60 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider backdrop-blur-md ring-1 ${
                  available ? "text-emerald-400 ring-emerald-500/30" : "text-hero-muted ring-hero-foreground/15"
                }`}
              >
                <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${available ? "bg-emerald-400" : "bg-hero-foreground/40"}`}>
                  {available && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />}
                </span>
                {available ? "Available" : "Busy"}
              </span>
            </div>

            {(worker as any).shopName && (
              <div className="absolute bottom-2 left-[140px] right-4">
                <span className="block text-[18px] font-black uppercase tracking-tight text-hero-foreground [text-shadow:0_1px_3px_rgba(0,0,0,0.75)]">
                  {(worker as any).shopName}
                </span>
              </div>
            )}
          </div>

          {/* AVATAR + RATING */}
          <div className="relative -mt-[60px] flex items-end gap-3 px-4">
            <div className="relative shrink-0">
              <Avatar className="relative h-[112px] w-[104px] rounded-[18px] border-[3px] border-hero shadow-xl">
                <AvatarImage src={worker.profilePhoto} alt={worker.name} className="object-cover" />
                <AvatarFallback className="rounded-[16px] bg-gradient-to-br from-primary/20 to-hero-foreground/10 text-xl font-extrabold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {worker.verified && (
                <div className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-md ring-[3px] ring-hero">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
                </div>
              )}
            </div>
            <div className="mb-1 flex flex-1 items-center justify-end">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-amber-500/5 px-2.5 py-1 ring-1 ring-amber-500/20 backdrop-blur">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-[13px] font-extrabold leading-none text-hero-foreground">
                  {worker.rating?.toFixed(1) || "—"}
                </span>
                {worker.reviewCount > 0 && (
                  <span className="text-[9.5px] font-semibold leading-none text-hero-muted">
                    {worker.reviewCount} {worker.reviewCount === 1 ? "review" : "reviews"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* NAME */}
          <div className="relative mt-3 px-4">
            <div className="flex items-start gap-1.5">
              <h3 className="line-clamp-2 text-[24px] font-black leading-[1.05] tracking-tight text-hero-foreground">
                {worker.name}
              </h3>
              {worker.verified && <BadgeCheck className="mt-1.5 h-5 w-5 shrink-0 fill-primary text-hero" />}
            </div>
            {worker.profession && (
              <p className="mt-1 truncate text-[13px] font-bold uppercase tracking-wide text-primary">
                {worker.profession}
              </p>
            )}
            {worker.city && (
              <span className="mt-1 inline-flex min-w-0 items-center gap-1 text-[11px] font-semibold text-hero-muted">
                <MapPin className="h-3 w-3 shrink-0 text-primary/70" />
                <span className="truncate">{worker.city}</span>
              </span>
            )}
          </div>

          {/* DESCRIPTION */}
          {worker.description && (
            <p className="relative mx-4 mt-3 line-clamp-3 border-l-2 border-primary/40 pl-2 text-[12px] leading-snug text-hero-foreground/75">
              {worker.description}
            </p>
          )}

          {/* STATS */}
          <div className="relative mx-4 mt-3 grid grid-cols-2 gap-2">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/85 px-3 py-2.5 text-primary-foreground shadow-md shadow-primary/20">
              <div className="relative flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-hero-foreground/15 backdrop-blur">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[17px] font-black leading-none">
                    {hasDistance ? dist : "—"}
                    {hasDistance && <span className="ml-0.5 text-[10px] font-bold opacity-90">km</span>}
                  </div>
                  <div className="mt-1 text-[8.5px] font-extrabold uppercase tracking-[0.12em] opacity-85">Distance</div>
                </div>
              </div>
            </div>
            <div className="relative flex items-center gap-2.5 rounded-2xl bg-hero-foreground/[0.05] px-3 py-2.5 ring-1 ring-hero-foreground/10">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Briefcase className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[17px] font-black leading-none text-hero-foreground">
                  {worker.experience > 0 ? `${worker.experience}+` : "—"}
                </div>
                <div className="mt-1 text-[8.5px] font-extrabold uppercase tracking-[0.12em] text-hero-muted">Years Exp</div>
              </div>
            </div>
          </div>

          {/* SERVICE AREAS */}
          {worker.serviceAreas && worker.serviceAreas.length > 0 && (
            <div className="relative mx-4 mt-3 flex items-center gap-1.5 overflow-hidden">
              <span className="shrink-0 text-[9px] font-extrabold uppercase tracking-[0.15em] text-hero-muted">Serves</span>
              <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                {worker.serviceAreas.slice(0, 5).map((area, i) => (
                  <span
                    key={i}
                    className="truncate rounded-full bg-hero-foreground/5 px-2 py-0.5 text-[9.5px] font-bold text-hero-foreground/85 ring-1 ring-hero-foreground/10"
                  >
                    {area}
                  </span>
                ))}
                {worker.serviceAreas.length > 5 && (
                  <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[9.5px] font-extrabold text-primary ring-1 ring-primary/30">
                    +{worker.serviceAreas.length - 5}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ACTIONS */}
          <div className="relative mt-4 space-y-3 border-t border-hero-foreground/8 bg-gradient-to-b from-hero-foreground/[0.02] to-transparent px-4 py-4">
            {(worker as any).showContact !== false ? (
              <>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-11 flex-1 rounded-xl border border-hero-foreground/12 bg-hero-foreground/[0.04] text-[12px] font-extrabold uppercase tracking-wider text-hero-foreground hover:bg-hero-foreground/10"
                    onClick={requireAuth(() => { if (phone) window.location.href = `tel:${phone}`; })}
                  >
                    <Phone className="mr-1.5 h-4 w-4" /> Call
                  </Button>
                  <Button
                    size="sm"
                    className="h-11 flex-[1.4] rounded-xl bg-gradient-to-r from-primary to-primary/85 text-[12.5px] font-black uppercase tracking-wider shadow-md shadow-primary/25"
                    onClick={requireAuth(() => navigate(`/messages?worker=${worker.id}`))}
                  >
                    <Zap className="mr-1 h-4 w-4 fill-current" /> Message
                  </Button>
                </div>

                {savedMethods.length > 0 && (
                  <div className="flex justify-center">
                    <ContactMethodsBar
                      methods={savedMethods}
                      variant="hero"
                      onChannelClick={isAuthed ? undefined : (() => { onOpenChange(false); navigate("/login"); })}
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="rounded-xl border border-hero-foreground/10 bg-hero-foreground/[0.04] px-3 py-2.5 text-center text-[11px] font-semibold text-hero-muted">
                Contact info is hidden by this provider.
              </p>
            )}

            <div className="text-center">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/w/${(worker as any).uid || worker.id}`, { state: { distance: worker.distance } }); onOpenChange(false); }}
                className="inline-block py-1 text-xs font-semibold text-hero-muted underline decoration-primary/30 transition hover:text-primary"
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
