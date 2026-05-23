import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Star,
  Gem,
  ShieldCheck,
  MapPin,
  CalendarClock,
  User,
  MessageCircle,
  ChevronRight,
  ThumbsUp,
  Clock,
  Handshake,
  Trophy,
  BadgeCheck,
  Hammer,
  Home,
  Crown,
  Radio,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AuthRequiredDialog from "@/components/AuthRequiredDialog";
import WorkerProfilePopup from "@/components/WorkerProfilePopup";
import { trackAdEvent } from "@/hooks/usePromoted";
import type { Worker } from "@/data/mockData";

interface Props {
  worker: Worker & { distance: number };
  premium?: boolean;
  isAuthed: boolean;
  campaignId?: string;
  placement?: string;
}

const WorkerAdCard = ({ worker, premium = false, isAuthed, campaignId, placement }: Props) => {
  const [popupOpen, setPopupOpen] = useState(false);
  const lastClosedRef = useRef(0);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const impressedRef = useRef(false);
  const initials = worker.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const hasDistance = worker.distance > 0 && isFinite(worker.distance);

  useEffect(() => {
    if (!campaignId || !cardRef.current || impressedRef.current) return;
    const el = cardRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !impressedRef.current) {
            impressedRef.current = true;
            trackAdEvent(campaignId, "impression", placement || "unknown");
            io.disconnect();
          }
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [campaignId, placement]);

  const fireClick = () => {
    if (campaignId) trackAdEvent(campaignId, "click", placement || "unknown");
  };

  const handleOpen = () => {
    if (popupOpen) return;
    if (Date.now() - lastClosedRef.current < 300) return;
    fireClick();
    setPopupOpen(true);
  };
  const handleChange = (o: boolean) => {
    if (!o) lastClosedRef.current = Date.now();
    setPopupOpen(o);
  };

  // Color tokens — neon-lime accent for promoted, gold for premium
  const accent = premium ? "amber" : "lime";
  const accentRing = premium ? "ring-amber-400/50" : "ring-lime-400/50";
  const accentText = premium ? "text-amber-300" : "text-lime-300";
  const accentTextStrong = premium ? "text-amber-400" : "text-lime-400";
  const accentBorder = premium ? "border-amber-400/60" : "border-lime-400/50";
  const accentGlow = premium
    ? "shadow-[0_0_40px_-10px_rgba(251,191,36,0.45)]"
    : "shadow-[0_0_40px_-10px_rgba(163,230,53,0.5)]";
  const accentGradient = premium
    ? "from-amber-400 via-amber-300 to-amber-500"
    : "from-lime-400 via-lime-300 to-lime-500";

  const positivePct = worker.reviewCount > 0 ? 100 : 0; // placeholder until real metric exists

  return (
    <>
      <div
        ref={cardRef}
        className={`group relative w-[330px] sm:w-[400px] rounded-[24px] p-[1.5px] bg-gradient-to-br ${accentGradient} ${accentGlow}`}
      >
        <article
          onClick={handleOpen}
          className="relative cursor-pointer overflow-hidden rounded-[22px] bg-[#0a0d0a] text-white transition-transform duration-200 active:scale-[0.995]"
        >
          {/* Banner background */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]">
            {worker.bannerUrl ? (
              <img src={worker.bannerUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-40" />
            ) : worker.profilePhoto ? (
              <img src={worker.profilePhoto} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover opacity-25 blur-2xl" />
            ) : null}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(900px 300px at -10% -20%, rgba(163,230,53,0.10), transparent 60%), radial-gradient(700px 240px at 110% 0%, rgba(163,230,53,0.06), transparent 60%), linear-gradient(180deg, rgba(10,13,10,0.78) 0%, rgba(5,6,5,0.96) 70%, #050605 100%)",
              }}
            />
          </div>
          {/* corner accent ribbon */}
          <div className={`pointer-events-none absolute -top-px -left-px h-[48px] w-[170px] rounded-tl-[22px] bg-gradient-to-br ${accentGradient}`}
            style={{ clipPath: "polygon(0 0, 100% 0, 78% 100%, 0 100%)" }}
          />

          {/* TOP ROW: PROMOTED + AVAILABLE */}
          <div className="relative flex items-start justify-between px-4 pt-3.5">
            <div className="relative z-10 flex items-center gap-2 pl-1">
              {premium ? <Crown className="h-4 w-4 text-black" /> : <Gem className="h-4 w-4 text-black" />}
              <span className="text-[12px] font-black uppercase tracking-[0.22em] text-black">
                {premium ? "Featured" : "Promoted"}
              </span>
            </div>
            <span
              className={`inline-flex items-center gap-2 rounded-full border ${worker.available ? "border-lime-400/60 text-lime-300" : "border-white/15 text-white/60"} bg-black/40 px-3 py-1 text-[11px] font-bold uppercase tracking-widest backdrop-blur`}
            >
              <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${worker.available ? "bg-lime-400" : "bg-white/40"}`}>
                {worker.available && <span className="absolute inset-0 animate-ping rounded-full bg-lime-400/70" />}
              </span>
              {worker.available ? "Available" : "Busy"}
              <Radio className="h-3 w-3 opacity-80" />
            </span>
          </div>

          {/* HERO: photo + identity + emblem */}
          <div className="relative mt-3 grid grid-cols-[112px_1fr] gap-3 px-4 sm:grid-cols-[128px_1fr_auto]">
            {/* photo */}
            <div className={`relative rounded-2xl p-[1.5px] bg-gradient-to-br ${accentGradient}`}>
              <Avatar className="h-[112px] w-[112px] rounded-2xl border-2 border-black sm:h-[128px] sm:w-[128px]">
                <AvatarImage src={worker.profilePhoto} alt={worker.name} className="object-cover" />
                <AvatarFallback className="rounded-2xl bg-black text-2xl font-black text-lime-300">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {worker.verified && (
                <div className={`absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black ring-2 ${accentRing}`}>
                  <ShieldCheck className={`h-4 w-4 ${accentTextStrong}`} strokeWidth={3} />
                </div>
              )}
            </div>

            {/* identity */}
            <div className="min-w-0">
              <div className="flex items-start gap-2">
                <h3 className="line-clamp-2 text-[22px] font-black leading-[1.05] tracking-tight text-white sm:text-[26px]">
                  {worker.name}
                </h3>
                {worker.verified && (
                  <span className={`mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${accentGradient}`}>
                    <BadgeCheck className="h-3.5 w-3.5 text-black" strokeWidth={3} />
                  </span>
                )}
              </div>
              {worker.profession && (
                <p className={`mt-1 flex items-center gap-1.5 text-[14px] font-extrabold uppercase tracking-[0.14em] ${accentTextStrong}`}>
                  {worker.profession}
                  <Hammer className="h-3.5 w-3.5" />
                </p>
              )}
              {worker.verified && (
                <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full border ${accentBorder} bg-white/[0.03] px-2.5 py-1`}>
                  <ShieldCheck className={`h-3.5 w-3.5 ${accentTextStrong}`} />
                  <span className="text-[11px] font-bold text-white/85">Verified Professional</span>
                </div>
              )}

              {/* rating strip */}
              <div className="mt-2.5 flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="text-[16px] font-black leading-none">
                    {worker.rating?.toFixed(1) || "—"}
                  </span>
                  <span className="text-[10px] text-white/50">({worker.reviewCount || 0})</span>
                </div>
                <div className="h-6 w-px bg-white/10" />
                <div className="flex items-center gap-0.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i < Math.round(worker.rating || 0) ? "fill-amber-400 text-amber-400" : "text-white/15"}`}
                    />
                  ))}
                </div>
                <div className="h-6 w-px bg-white/10" />
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5 text-white/70" />
                  <span className="text-[12px] font-bold">{positivePct}%</span>
                  <span className="hidden text-[9.5px] uppercase tracking-wider text-white/50 sm:inline">Positive</span>
                </div>
              </div>
            </div>

            {/* top-rated emblem */}
            {worker.rating >= 4.5 && (
              <div className="hidden sm:flex shrink-0 items-center justify-center">
                <div className="relative flex h-[120px] w-[100px] flex-col items-center justify-center rounded-xl border border-amber-400/40 bg-gradient-to-b from-amber-500/15 to-transparent text-center">
                  <Trophy className="absolute -top-3 h-6 w-6 fill-amber-400 text-amber-500" />
                  <span className="mt-2 text-[12px] font-black uppercase tracking-widest text-amber-300">Top</span>
                  <span className="text-[12px] font-black uppercase tracking-widest text-amber-300">Rated</span>
                  <div className="mt-1 flex gap-0.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star key={i} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CATEGORY PILLS */}
          {(worker.mainCategory || worker.subCategory) && (
            <div className="mx-4 mt-3 flex items-stretch gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-1.5">
              {worker.mainCategory && (
                <div className={`flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br ${accentGradient} px-3 py-2 text-black`}>
                  <Home className="h-4 w-4" strokeWidth={2.5} />
                  <span className="truncate text-[11.5px] font-black uppercase tracking-[0.14em]">
                    {worker.mainCategory}
                  </span>
                </div>
              )}
              {worker.subCategory && (
                <div className="flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2">
                  <Hammer className="h-4 w-4 text-white/70" />
                  <span className="truncate text-[11.5px] font-bold uppercase tracking-[0.14em] text-white/85">
                    {worker.subCategory}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STATS + TRUST GRID */}
          <div className="mx-4 mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-[1.2fr_1fr_1.1fr]">
            {/* distance hero card */}
            <div className={`relative overflow-hidden rounded-2xl border ${accentBorder} bg-gradient-to-br from-lime-500/20 via-lime-500/5 to-transparent p-3.5`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full border ${accentBorder} bg-black/40`}>
                  <MapPin className={`h-5 w-5 ${accentTextStrong}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1 leading-none">
                    <span className="text-[28px] font-black text-white">
                      {hasDistance ? worker.distance.toFixed(2) : "—"}
                    </span>
                    {hasDistance && <span className="text-[12px] font-bold text-white/70">km</span>}
                  </div>
                  <div className={`mt-1 text-[10.5px] font-black uppercase tracking-[0.18em] ${accentTextStrong}`}>
                    Distance
                  </div>
                  <div className="text-[10px] text-white/55">From your location</div>
                </div>
              </div>
            </div>

            {/* experience */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full border ${accentBorder} bg-black/40`}>
                  <CalendarClock className={`h-5 w-5 ${accentTextStrong}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-[24px] font-black leading-none">
                    {worker.experience > 0 ? `${worker.experience}+` : "—"}
                  </div>
                  <div className={`mt-1 text-[10px] font-black uppercase tracking-[0.16em] ${accentTextStrong}`}>
                    Years Experience
                  </div>
                  <div className="text-[10px] text-white/55">Skilled & Trusted</div>
                </div>
              </div>
            </div>

            {/* trust list */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <ul className="space-y-1.5 text-[11px] font-semibold text-white/80">
                {[
                  { icon: ShieldCheck, label: "Background Verified" },
                  { icon: ThumbsUp, label: "High Quality Work" },
                  { icon: Clock, label: "On Time Service" },
                  { icon: Handshake, label: "Trusted by Customers" },
                ].map(({ icon: Icon, label }, i, arr) => (
                  <li key={label} className={`flex items-center gap-2 ${i < arr.length - 1 ? "border-b border-dashed border-white/8 pb-1.5" : ""}`}>
                    <Icon className={`h-3.5 w-3.5 ${accentTextStrong}`} />
                    <span className="truncate">{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* CTAs */}
          <div
            className="mx-4 mt-3 grid grid-cols-[1fr_1.5fr] gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { fireClick(); setPopupOpen(true); }}
              className="group/btn flex items-center justify-between rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-left transition hover:bg-white/[0.08]"
            >
              <div className="flex items-center gap-2.5">
                <User className={`h-5 w-5 ${accentTextStrong}`} />
                <div>
                  <div className="text-[13px] font-black uppercase tracking-[0.14em] text-white">Profile</div>
                  <div className="text-[10px] text-white/55">View full details</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-white/60 transition group-hover/btn:translate-x-0.5" />
            </button>

            {worker.showContact !== false ? (
              isAuthed ? (
                <button
                  onClick={() => { fireClick(); setPopupOpen(true); }}
                  className={`group/btn flex items-center justify-between rounded-2xl bg-gradient-to-r ${accentGradient} px-4 py-3 text-black shadow-lg shadow-lime-500/20`}
                >
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="h-5 w-5" strokeWidth={2.5} />
                    <div>
                      <div className="text-[14px] font-black uppercase tracking-[0.14em]">Message</div>
                      <div className="text-[10px] font-semibold opacity-80">Chat with {worker.name.split(" ")[0]}</div>
                    </div>
                  </div>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/85 text-white">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </button>
              ) : (
                <AuthRequiredDialog title="Log in to contact" description="Sign in to message this provider.">
                  <button className={`group/btn flex w-full items-center justify-between rounded-2xl bg-gradient-to-r ${accentGradient} px-4 py-3 text-black shadow-lg shadow-lime-500/20`}>
                    <div className="flex items-center gap-2.5">
                      <MessageCircle className="h-5 w-5" strokeWidth={2.5} />
                      <div className="text-left">
                        <div className="text-[14px] font-black uppercase tracking-[0.14em]">Message</div>
                        <div className="text-[10px] font-semibold opacity-80">Chat with {worker.name.split(" ")[0]}</div>
                      </div>
                    </div>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/85 text-white">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </button>
                </AuthRequiredDialog>
              )
            ) : isAuthed && worker.userId ? (
              <Link
                to={`/chat/${worker.userId}`}
                onClick={fireClick}
                className={`group/btn flex items-center justify-between rounded-2xl bg-gradient-to-r ${accentGradient} px-4 py-3 text-black shadow-lg shadow-lime-500/20`}
              >
                <div className="flex items-center gap-2.5">
                  <MessageCircle className="h-5 w-5" strokeWidth={2.5} />
                  <div>
                    <div className="text-[14px] font-black uppercase tracking-[0.14em]">Message</div>
                    <div className="text-[10px] font-semibold opacity-80">Chat with {worker.name.split(" ")[0]}</div>
                  </div>
                </div>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/85 text-white">
                  <ChevronRight className="h-4 w-4" />
                </span>
              </Link>
            ) : (
              <AuthRequiredDialog title="Log in to message" description="Sign in to message this provider.">
                <button className={`group/btn flex w-full items-center justify-between rounded-2xl bg-gradient-to-r ${accentGradient} px-4 py-3 text-black shadow-lg shadow-lime-500/20`}>
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="h-5 w-5" strokeWidth={2.5} />
                    <div className="text-left">
                      <div className="text-[14px] font-black uppercase tracking-[0.14em]">Message</div>
                      <div className="text-[10px] font-semibold opacity-80">Chat with {worker.name.split(" ")[0]}</div>
                    </div>
                  </div>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/85 text-white">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </button>
              </AuthRequiredDialog>
            )}
          </div>

          {/* FOOTER TRUST BAR */}
          <div className={`mt-4 grid grid-cols-2 gap-3 border-t ${accentBorder} bg-black/40 px-4 py-3 sm:grid-cols-4`}>
            <div className="flex items-center gap-2">
              <ShieldCheck className={`h-5 w-5 ${accentTextStrong}`} />
              <div className="min-w-0">
                <div className="text-[10.5px] font-black uppercase tracking-[0.14em] text-white">Verified</div>
                <div className="truncate text-[9.5px] text-white/55">ID & Background</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-5 w-5 rounded-full border border-black bg-gradient-to-br from-white/30 to-white/10" />
                ))}
              </div>
              <div className="min-w-0">
                <div className={`text-[11px] font-black ${accentTextStrong}`}>500+</div>
                <div className="truncate text-[9.5px] text-white/55">Happy Customers</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              <div className="min-w-0">
                <div className="text-[11px] font-black text-white">
                  {worker.rating?.toFixed(1) || "4.9"}<span className="text-white/50">/5</span>
                </div>
                <div className="truncate text-[9.5px] text-white/55">Overall Rating</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              <div className="min-w-0">
                <div className="text-[10.5px] font-black uppercase tracking-[0.14em] text-amber-300">Top Rated</div>
                <div className="truncate text-[9.5px] text-white/55">On Near Konnect</div>
              </div>
            </div>
          </div>
        </article>
      </div>
      <WorkerProfilePopup worker={worker} open={popupOpen} onOpenChange={handleChange} isAuthed={isAuthed} />
    </>
  );
};

export default WorkerAdCard;
