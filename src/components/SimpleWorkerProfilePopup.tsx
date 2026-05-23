import { useNavigate, Link } from "react-router-dom";
import { Star, BadgeCheck, Phone, X, MapPin, Briefcase, MessageCircle } from "lucide-react";
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

const SimpleWorkerProfilePopup = ({ worker, open, onOpenChange, isAuthed }: Props) => {
  const navigate = useNavigate();
  if (!worker) return null;

  const initials = worker.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const phone = sanitizePhone(worker.phone);
  const savedMethods: ContactMethod[] = (worker.contactMethods || []).filter((m) => (m.value || "").trim().length > 0);
  const dist = worker.distance;
  const hasDistance = typeof dist === "number" && dist > 0 && isFinite(dist);
  const available = !!worker.available;
  const firstName = worker.name.split(" ")[0];

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
        className="w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-border bg-background p-0 [&>button:last-child]:hidden"
      >
        <VisuallyHidden>
          <DialogTitle>{worker.name}</DialogTitle>
          <DialogDescription>Worker profile preview</DialogDescription>
        </VisuallyHidden>

        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 z-20 rounded-full bg-muted/70 p-1.5 text-muted-foreground backdrop-blur hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 p-4">
          <div className="relative shrink-0">
            <Avatar className="h-16 w-16 rounded-2xl border border-border">
              <AvatarImage src={worker.profilePhoto} alt={worker.name} className="object-cover" />
              <AvatarFallback className="rounded-2xl bg-muted text-base font-bold text-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            {available && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-base font-bold text-foreground">{worker.name}</h3>
              {worker.verified && <BadgeCheck className="h-4 w-4 shrink-0 fill-primary text-primary-foreground" />}
            </div>
            {worker.profession && (
              <p className="truncate text-xs font-medium text-muted-foreground">{worker.profession}</p>
            )}
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {worker.rating?.toFixed(1) || "—"}
                {worker.reviewCount > 0 && (
                  <span className="font-normal text-muted-foreground">({worker.reviewCount})</span>
                )}
              </span>
              {worker.city && (
                <>
                  <span className="text-border">·</span>
                  <span className="inline-flex min-w-0 items-center gap-0.5 truncate text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" /> {worker.city}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {worker.description && (
          <p className="mx-4 mb-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {worker.description}
          </p>
        )}

        <div className="mx-4 mb-3 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2">
            <MapPin className="h-4 w-4 text-primary" />
            <div>
              <div className="text-sm font-bold text-foreground">
                {hasDistance ? dist : "—"}{hasDistance && <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">km</span>}
              </div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Distance</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2">
            <Briefcase className="h-4 w-4 text-primary" />
            <div>
              <div className="text-sm font-bold text-foreground">
                {worker.experience > 0 ? `${worker.experience}+` : "—"}
              </div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Years Exp</div>
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t border-border bg-muted/20 px-4 py-3">
          {(worker as any).showContact !== false ? (
            <>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 flex-1 rounded-xl text-xs font-semibold"
                  onClick={requireAuth(() => { if (phone) window.location.href = `tel:${phone}`; })}
                >
                  <Phone className="mr-1.5 h-4 w-4" /> Call
                </Button>
                <Button
                  size="sm"
                  className="h-10 flex-[1.4] rounded-xl text-xs font-bold"
                  onClick={requireAuth(() => navigate(`/messages?worker=${worker.id}`))}
                >
                  <MessageCircle className="mr-1.5 h-4 w-4" /> Message {firstName}
                </Button>
              </div>
              {savedMethods.length > 0 && (
                <div className="flex justify-center">
                  <ContactMethodsBar
                    methods={savedMethods}
                    onChannelClick={isAuthed ? undefined : (() => { onOpenChange(false); navigate("/login"); })}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-10 flex-1 rounded-xl text-xs font-semibold"
                onClick={() => navigate(`/w/${(worker as any).uid || worker.id}`, { state: { distance: worker.distance } })}
              >
                View Profile
              </Button>
              <Button asChild size="sm" className="h-10 flex-[1.4] rounded-xl text-xs font-bold">
                <Link to={`/chat/${(worker as any).userId || worker.userId}`}>
                  <MessageCircle className="mr-1.5 h-4 w-4" /> Message
                </Link>
              </Button>
            </div>
          )}
          <button
            onClick={() => { navigate(`/w/${(worker as any).uid || worker.id}`, { state: { distance: worker.distance } }); onOpenChange(false); }}
            className="block w-full text-center text-[11px] font-semibold text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
          >
            View Full Profile
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SimpleWorkerProfilePopup;
