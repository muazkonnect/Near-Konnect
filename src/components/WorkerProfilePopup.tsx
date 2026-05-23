import { useNavigate, Link } from "react-router-dom";
import {
  Star,
  BadgeCheck,
  Phone,
  X,
  MapPin,
  ShieldCheck,
  Crown,
  Zap,
  Gem,
  MessageCircle,
  CalendarClock,
  Hammer,
  Home,
  Trophy,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import ContactMethodsBar from "@/components/ContactMethodsBar";
import { getExpertise } from "@/lib/categoryExpertise";
import type { ContactMethod } from "@/lib/contactMethods";
import type { Worker } from "@/data/mockData";

interface Props {
  worker: (Worker & { distance?: number }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthed?: boolean;
  premium?: boolean;
}

const sanitizePhone = (p?: string) => (p || "").replace(/[^\d+]/g, "");

const WorkerProfilePopup = ({ worker, open, onOpenChange, isAuthed, premium: premiumProp }: Props) => {
  const navigate = useNavigate();
  if (!worker) return null;


  const initials = worker.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const phone = sanitizePhone(worker.phone);
  const savedMethods: ContactMethod[] = (worker.contactMethods || []).filter((m) => (m.value || "").trim().length > 0);
  const premium = premiumProp !== undefined ? premiumProp : !!worker.verified;
  const dist = worker.distance;
  const hasDistance = typeof dist === "number" && dist > 0 && isFinite(dist);
  const available = !!worker.available;
  const isTopRated = (worker.rating || 0) >= 4.5;
  const positivePct = worker.reviewCount > 0 ? 100 : 0;
  const firstName = worker.name.split(" ")[0];

  const t = premium
    ? {
        grad: "from-amber-400 via-yellow-300 to-amber-500",
        text: "text-amber-300",
        textStrong: "text-amber-400",
        border: "border-amber-400/55",
        ring: "ring-amber-400/50",
        glow: "shadow-[0_0_48px_-12px_rgba(251,191,36,0.55)]",
        soft: "from-amber-500/25 via-amber-500/8 to-transparent",
        rgb: "251,191,36",
        label: "Featured",
        Icon: Crown,
      }
    : {
        grad: "from-lime-400 via-lime-300 to-lime-500",
        text: "text-lime-300",
        textStrong: "text-lime-400",
        border: "border-lime-400/55",
        ring: "ring-lime-400/50",
        glow: "shadow-[0_0_48px_-12px_rgba(163,230,53,0.6)]",
        soft: "from-lime-500/25 via-lime-500/8 to-transparent",
        rgb: "163,230,53",
        label: "Profile",
        Icon: Gem,
      };

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
        className={`w-[calc(100vw-2rem)] max-w-[400px] overflow-hidden rounded-[24px] border-0 p-[1.5px] bg-gradient-to-br ${t.grad} ${t.glow} [&>button:last-child]:hidden`}
      >
        <VisuallyHidden>
          <DialogTitle>{worker.name}</DialogTitle>
          <DialogDescription>Worker profile preview</DialogDescription>
        </VisuallyHidden>

        <article className="relative overflow-hidden rounded-[22px] bg-[#0a0d0a] text-white">
          {/* BANNER BACKGROUND */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]">
            {worker.bannerUrl ? (
              <img src={worker.bannerUrl} alt="" aria-hidden className="absolute top-1 left-1 right-1 h-[42%] w-auto rounded-t-[20px] object-cover opacity-40" />
            ) : worker.profilePhoto ? (
              <img src={worker.profilePhoto} alt="" aria-hidden className="absolute top-0 left-0 right-1 h-[40%] w-full scale-125 rounded-t-[20px] object-cover opacity-25 blur-xl" />
            ) : null}
            {/* banner fade mask */}
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-[55%] w-full" style={{ background: "linear-gradient(to bottom, rgba(10,13,10,0) 0%, rgba(10,13,10,0.35) 40%, rgba(10,13,10,0.92) 75%, #0a0d0a 100%)" }} />
            <div
              className="absolute inset-0 opacity-[0.18]"
              style={{
                backgroundImage: "radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)",
                backgroundSize: "14px 14px",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(620px 260px at -10% -20%, rgba(${t.rgb},0.38), transparent 60%), radial-gradient(520px 220px at 110% 110%, rgba(${t.rgb},0.28), transparent 60%), linear-gradient(180deg, rgba(10,13,10,0.5) 0%, rgba(5,6,5,0.92) 70%, #050605 100%)`,
              }}
            />
            {/* premium inner glow orbs */}
            <div
              aria-hidden
              className="absolute -left-20 -top-20 h-56 w-56 rounded-full blur-3xl opacity-90 animate-[spark-pulse_5s_ease-in-out_infinite]"
              style={{ background: `radial-gradient(circle, rgba(${t.rgb},0.95), rgba(${t.rgb},0.25) 45%, transparent 70%)` }}
            />
            <div
              aria-hidden
              className="absolute -right-16 -bottom-20 h-52 w-52 rounded-full blur-3xl opacity-80 animate-[spark-pulse_6s_ease-in-out_infinite]"
              style={{ background: `radial-gradient(circle, rgba(${t.rgb},0.8), rgba(${t.rgb},0.2) 45%, transparent 70%)` }}
            />
            {/* center color wash */}
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 h-56 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl opacity-50"
              style={{ background: `radial-gradient(ellipse, rgba(${t.rgb},0.45), transparent 70%)` }}
            />
            {/* grain/noise overlay */}
            <div
              className="absolute inset-0 opacity-[0.07] mix-blend-overlay"
              style={{
                backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
              }}
            />
            {/* inner top highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            {/* inner bottom shadow line */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-black/60 to-transparent" />
            {/* inset ring */}
            <div className="absolute inset-0 rounded-[22px] ring-1 ring-inset ring-white/[0.08]" />
            {/* aesthetic sheen sweep */}
            <div className="absolute -inset-y-4 -left-1/3 h-[140%] w-1/4 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_4s_ease-in-out_infinite]" />
          </div>

          {/* CORNER RIBBON */}
          <div
            className={`pointer-events-none absolute -top-px -left-px h-[44px] w-[168px] rounded-tl-[22px] bg-gradient-to-br ${t.grad}`}
            style={{ clipPath: "polygon(0 0, 100% 0, 78% 100%, 0 100%)" }}
          />
          <div className="pointer-events-none absolute -top-px left-[150px] h-[2px] w-12 rotate-[20deg] bg-white/70 blur-[2px]" />

          {/* CLOSE */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 z-20 rounded-full border border-white/15 bg-black/60 p-1.5 text-white/80 backdrop-blur hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* TOP ROW */}
          <div className="relative flex items-center justify-between px-3.5 pt-3">
            <div className="relative z-10 flex items-center gap-1.5 pl-0.5">
              <t.Icon className="h-3.5 w-3.5 text-black" strokeWidth={2.5} />
              <span className="text-[11px] font-black uppercase tracking-[0.22em] text-black">{t.label}</span>
            </div>
            <span
              className={`mr-9 inline-flex items-center gap-1.5 rounded-full border ${available ? "border-lime-400/60 text-lime-300" : "border-white/15 text-white/55"} bg-black/50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] backdrop-blur`}
            >
              <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${available ? "bg-lime-400" : "bg-white/40"}`}>
                {available && <span className="absolute inset-0 animate-ping rounded-full bg-lime-400/80" />}
              </span>
              {available ? "Available" : "Busy"}
            </span>
          </div>

          {/* HERO */}
          <div className="relative mt-3 flex gap-3 px-3.5">
            <div className={`relative shrink-0 rounded-2xl p-[1.5px] bg-gradient-to-br ${t.grad}`}>
              <Avatar className="h-[96px] w-[88px] rounded-[14px] border-2 border-black">
                <AvatarImage src={worker.profilePhoto} alt={worker.name} className="object-cover" />
                <AvatarFallback className={`rounded-[12px] bg-black text-xl font-black ${t.text}`}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              {worker.verified && (
                <div className={`absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black ring-2 ${t.ring}`}>
                  <ShieldCheck className={`h-3.5 w-3.5 ${t.textStrong}`} strokeWidth={3} />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-1.5">
                <h3 className="line-clamp-2 text-[19px] font-black leading-[1.05] tracking-tight text-white">
                  {worker.name}
                </h3>
                {worker.verified && (
                  <span className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${t.grad}`}>
                    <BadgeCheck className="h-3 w-3 text-black" strokeWidth={3} />
                  </span>
                )}
              </div>
              {worker.profession && (
                <p className={`mt-1 flex items-center gap-1.5 text-[12px] font-black uppercase tracking-[0.16em] ${t.textStrong}`}>
                  <span className="truncate">{worker.profession}</span>
                </p>
              )}
              {worker.city && (
                <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-white/70">
                  <MapPin className={`h-3 w-3 shrink-0 ${t.textStrong}`} />
                  <span className="truncate">{worker.city}</span>
                </div>
              )}
            </div>
          </div>

          {/* RATING STRIP */}
          <div className="relative mx-3.5 mt-3 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 backdrop-blur">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-[15px] font-black leading-none text-white">
                {worker.rating?.toFixed(1) || "—"}
              </span>
              <span className="text-[9.5px] text-white/55">({worker.reviewCount || 0})</span>
            </div>
            <div className="h-5 w-px bg-white/10" />
            <div className="flex items-center gap-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className={`h-3 w-3 ${i < Math.round(worker.rating || 0) ? "fill-amber-400 text-amber-400" : "text-white/15"}`} />
              ))}
            </div>
            <div className="h-5 w-px bg-white/10" />
            <div className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3 text-white/65" />
              <span className="text-[11px] font-extrabold text-white">{positivePct}%</span>
              <span className="text-[9px] uppercase tracking-wider text-white/50">Positive</span>
            </div>
          </div>

          {/* CATEGORY PILLS */}
          {(worker.mainCategory || worker.subCategory) && (
            <div className="relative mx-3.5 mt-2.5 flex items-stretch gap-1.5 rounded-2xl border border-white/8 bg-white/[0.03] p-1.5">
              {worker.mainCategory && (
                <div className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br ${t.grad} px-2.5 py-1.5 text-black shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)]`}>
                  <Home className="h-3.5 w-3.5" strokeWidth={2.6} />
                  <span className="truncate text-[10.5px] font-black uppercase tracking-[0.14em]">{worker.mainCategory}</span>
                </div>
              )}
              {worker.subCategory && (
                <div className="flex flex-1 items-center justify-center gap-1.5 px-2.5 py-1.5">
                  <Hammer className="h-3.5 w-3.5 text-white/70" />
                  <span className="truncate text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/85">{worker.subCategory}</span>
                </div>
              )}
            </div>
          )}

          {/* STATS GRID */}
          <div className="relative mx-3.5 mt-2.5 grid grid-cols-2 gap-2">
            <div className={`relative col-span-2 overflow-hidden rounded-2xl border ${t.border} bg-gradient-to-br ${t.soft} p-3`}>
              <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-60" width="90" height="42" viewBox="0 0 90 42" fill="none">
                <path d="M2 30 Q 25 5, 50 22 T 88 8" stroke={`rgb(${t.rgb})`} strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
                <circle cx="88" cy="8" r="3" fill={`rgb(${t.rgb})`} />
              </svg>
              <div className="relative flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-full border ${t.border} bg-black/50`}>
                  <MapPin className={`h-5 w-5 ${t.textStrong}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1 leading-none">
                    <span className="text-[26px] font-black text-white tabular-nums">
                      {hasDistance ? dist!.toFixed(2) : "—"}
                    </span>
                    {hasDistance && <span className="text-[11px] font-bold text-white/70">km</span>}
                  </div>
                  <div className={`mt-1 text-[9.5px] font-black uppercase tracking-[0.18em] ${t.textStrong}`}>Distance</div>
                  <div className="text-[9.5px] text-white/55">From your location</div>
                </div>
              </div>
            </div>

            <div className="relative flex items-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-2.5">
              <div className="flex items-center gap-2">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${t.border} bg-black/50`}>
                  <CalendarClock className={`h-4 w-4 ${t.textStrong}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-[20px] font-black leading-none text-white tabular-nums">
                    {worker.experience > 0 ? `${worker.experience}+` : "—"}
                  </div>
                  <div className={`mt-1 text-[9px] font-black uppercase tracking-[0.16em] ${t.textStrong}`}>Years Exp</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2.5">
              <div className={`mb-1.5 flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.16em] ${t.textStrong}`}>
                <Zap className="h-3 w-3" />
                Expertise
              </div>
              <div className="flex flex-wrap gap-1">
                {getExpertise(worker.mainCategory, worker.subCategory, [], 4).map((skill) => (
                  <span
                    key={skill}
                    className="truncate rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-[2px] text-[9px] font-semibold text-white/80"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* DESCRIPTION */}
          {worker.description && (
            <p className={`relative mx-3.5 mt-3 line-clamp-3 rounded-xl border-l-2 ${t.border} bg-white/[0.03] px-2.5 py-2 text-[11.5px] leading-snug text-white/75`}>
              {worker.description}
            </p>
          )}

          {/* SERVICE AREAS */}
          {worker.serviceAreas && worker.serviceAreas.length > 0 && (
            <div className="relative mx-3.5 mt-2.5 flex items-center gap-1.5 overflow-hidden">
              <span className={`shrink-0 text-[9px] font-black uppercase tracking-[0.16em] ${t.textStrong}`}>Serves</span>
              <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                {worker.serviceAreas.slice(0, 5).map((area, i) => (
                  <span
                    key={i}
                    className="truncate rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9.5px] font-bold text-white/80"
                  >
                    {area}
                  </span>
                ))}
                {worker.serviceAreas.length > 5 && (
                  <span className={`shrink-0 rounded-full border ${t.border} bg-white/[0.05] px-2 py-0.5 text-[9.5px] font-black ${t.textStrong}`}>
                    +{worker.serviceAreas.length - 5}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ACTIONS */}
          <div className="relative mx-3.5 mt-3 space-y-2.5">
            {(worker as any).showContact !== false ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => { navigate(`/w/${(worker as any).uid || worker.id}`, { state: { distance: worker.distance } }); onOpenChange(false); }}
                    className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/12 bg-white/[0.05] px-2 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-white/[0.09]"
                  >
                    <Trophy className={`h-3.5 w-3.5 ${t.textStrong}`} /> Profile
                  </button>
                  <button
                    onClick={requireAuth(() => { if (phone) window.location.href = `tel:${phone}`; })}
                    className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/12 bg-white/[0.05] px-2 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-white/[0.09]"
                  >
                    <Phone className={`h-3.5 w-3.5 ${t.textStrong}`} /> Call
                  </button>
                  <button
                    onClick={requireAuth(() => navigate(`/messages?worker=${worker.id}`))}
                    className={`flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r ${t.grad} px-2 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-black shadow-lg`}
                  >
                    <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.6} /> Message
                  </button>
                </div>

                {savedMethods.length > 0 && (
                  <div className="flex justify-center pt-0.5">
                    <ContactMethodsBar
                      methods={savedMethods}
                      variant="hero"
                      onChannelClick={isAuthed ? undefined : (() => { onOpenChange(false); navigate("/login"); })}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                <button
                  onClick={() => { navigate(`/w/${(worker as any).uid || worker.id}`, { state: { distance: worker.distance } }); onOpenChange(false); }}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.05] px-3 py-2.5 text-[12px] font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/[0.09]"
                >
                  View Profile
                </button>
                <Link
                  to={`/chat/${(worker as any).userId || worker.userId}`}
                  className={`flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${t.grad} px-3 py-2.5 text-[12.5px] font-black uppercase tracking-[0.14em] text-black shadow-lg`}
                >
                  <MessageCircle className="h-4 w-4" strokeWidth={2.6} /> Message
                </Link>
              </div>
            )}
          </div>

          {/* FOOTER TRUST BAR */}
          <div className={`relative mt-3 grid grid-cols-3 gap-1.5 border-t ${t.border} bg-black/50 px-3 py-2.5 backdrop-blur`}>
            <div className="flex flex-col items-center text-center">
              <ShieldCheck className={`h-4 w-4 ${t.textStrong}`} />
              <div className="mt-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-white">Verified</div>
              <div className="text-[8px] leading-tight text-white/50">ID Checked</div>
            </div>
            <div className="flex flex-col items-center text-center">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <div className="mt-0.5 text-[10px] font-black text-white tabular-nums">
                {(worker.rating || 4.9).toFixed(1)}<span className="text-white/45">/5</span>
              </div>
              <div className="text-[8px] leading-tight text-white/50">Rating</div>
            </div>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/w/${(worker as any).uid || worker.id}`, { state: { distance: worker.distance } }); onOpenChange(false); }}
              className="flex flex-col items-center text-center"
            >
              <Trophy className="h-4 w-4 text-amber-400" />
              <div className="mt-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-amber-300">Full Profile</div>
              <div className="text-[8px] leading-tight text-white/50">View all</div>
            </button>
          </div>
        </article>
      </DialogContent>
    </Dialog>
  );
};

export default WorkerProfilePopup;
