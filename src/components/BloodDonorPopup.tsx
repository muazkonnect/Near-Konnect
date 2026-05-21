import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Droplet, BadgeCheck, MapPin, X, HeartPulse, Eye, EyeOff, MessageSquare, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import ContactMethodsBar from "@/components/ContactMethodsBar";
import { parseContactMethods, type ContactMethod } from "@/lib/contactMethods";

export interface BloodDonorPopupData {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  blood_group: string | null;
  city: string | null;
  distance?: number;
  phone?: string | null;
  contact_methods?: unknown;
}

interface Props {
  donor: BloodDonorPopupData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthed?: boolean;
}

const BloodDonorPopup = ({ donor, open, onOpenChange, isAuthed }: Props) => {
  const navigate = useNavigate();
  const [showContact, setShowContact] = useState(true);

  useEffect(() => {
    if (open) setShowContact(true);
  }, [open, donor?.user_id]);

  if (!donor) return null;

  const name = donor.full_name || "Donor";
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const dist = donor.distance;
  const hasDist = typeof dist === "number" && isFinite(dist) && dist > 0;

  let methods: ContactMethod[] = parseContactMethods(donor.contact_methods);
  if (methods.length === 0 && donor.phone) {
    methods = [{ type: "phone", value: donor.phone }];
  }

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
        className="max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-destructive/20 bg-background p-0 text-foreground shadow-2xl sm:max-w-lg [&>button.absolute]:hidden"
      >
        <VisuallyHidden>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>Blood donor profile preview</DialogDescription>
        </VisuallyHidden>

        {/* Decorative red header */}
        <div className="relative bg-gradient-to-br from-destructive/15 via-destructive/5 to-transparent px-6 pt-8 pb-6 md:px-8">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 z-10 rounded-full p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="absolute right-4 top-16 opacity-10">
            <HeartPulse className="h-24 w-24 text-destructive" />
          </div>

          <div className="relative flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="h-28 w-28 border-4 border-destructive/30">
                <AvatarImage src={donor.avatar_url ?? undefined} alt={name} className="object-cover" />
                <AvatarFallback className="bg-destructive/10 text-2xl font-bold text-destructive">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 rounded-full border-4 border-white bg-destructive p-1.5 text-destructive-foreground">
                <Droplet className="h-4 w-4 fill-current" />
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5">
                <h2 className="text-2xl font-bold tracking-tight">{name}</h2>
                <BadgeCheck className="h-5 w-5 text-destructive" />
              </div>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-destructive/80">
                Verified Donor
              </p>

              {(hasDist || donor.city) && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-4 py-1.5 text-destructive">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm font-bold leading-none">
                    {hasDist ? `${(dist as number).toFixed(1)} km away` : donor.city}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 md:px-8 md:pb-8">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-destructive/15 bg-destructive/5 p-3 text-center">
              <p className="text-2xl font-extrabold text-destructive">{donor.blood_group || "—"}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Blood Group
              </p>
            </div>
            <div className="rounded-xl border border-destructive/15 bg-destructive/5 p-3 text-center">
              <p className="text-2xl font-extrabold text-destructive">
                {hasDist ? `${(dist as number).toFixed(1)}` : "—"}
                {hasDist && <span className="ml-1 text-sm font-bold">km</span>}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Distance
              </p>
            </div>
          </div>

          {/* Contact section with show/hide toggle */}
          <div className="mt-5 rounded-2xl border border-destructive/15 bg-gradient-to-br from-destructive/[0.04] to-transparent p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-destructive" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                  Contact Donor
                </span>
              </div>
              <button
                onClick={() => setShowContact((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full border border-destructive/20 bg-white px-2.5 py-1 text-[11px] font-semibold text-destructive transition hover:bg-destructive/10"
              >
                {showContact ? (
                  <>
                    <EyeOff className="h-3 w-3" /> Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" /> Show
                  </>
                )}
              </button>
            </div>

            {showContact ? (
              methods.length > 0 ? (
                <ContactMethodsBar
                  methods={methods}
                  variant="card"
                  className="!gap-2 justify-center [&>a]:!h-10 [&>a]:!w-10 [&>a>svg]:!h-4 [&>a>svg]:!w-4"
                />
              ) : (
                <p className="text-center text-xs text-muted-foreground">
                  No contact options shared.
                </p>
              )
            ) : (
              <p className="text-center text-xs italic text-muted-foreground">
                Contact details hidden
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="mt-5 flex gap-3">
            <Button
              className="flex-1 rounded-xl bg-destructive py-6 font-semibold text-destructive-foreground hover:bg-destructive/90"
              onClick={requireAuth(() => {
                onOpenChange(false);
                navigate(`/chat/${donor.user_id}`);
              })}
            >
              <MessageSquare className="mr-2 h-4 w-4" /> Message
            </Button>
            <Button
              variant="outline"
              className="flex-1 rounded-xl border-destructive/30 py-6 font-semibold text-destructive hover:bg-destructive/10"
              onClick={() => {
                onOpenChange(false);
                navigate("/blood-donors");
              }}
            >
              View All Donors
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BloodDonorPopup;
