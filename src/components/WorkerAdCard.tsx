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
  Trophy,
  BadgeCheck,
  Hammer,
  Home,
  Crown,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AuthRequiredDialog from "@/components/AuthRequiredDialog";
import WorkerProfilePopup from "@/components/WorkerProfilePopup";
import { trackAdEvent } from "@/hooks/usePromoted";
import { getExpertise } from "@/lib/categoryExpertise";
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

  // Premium = gold theme, otherwise neon-lime theme
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
        label: "Promoted",
        Icon: Gem,
      };

  const positivePct = worker.reviewCount > 0 ? 100 : 0;
  const isTopRated = (worker.rating || 0) >= 4.5;
  const firstName = worker.name.split(" ")[0];

  return (
    <>
      <div
        ref={cardRef}
        className={`group relative w-[330px] sm:w-[400px] rounded-[24px] p-[1.5px] bg-gradient-to-br ${t.grad} ${t.glow}`}
      >
        <article
          onClick={handleOpen}
          className="relative cursor-pointer overflow-hidden rounded-[22px] bg-[#0a0d0a] text-white transition-transform duration-200 active:scale-[0.995]"
        >
          {/* ── BANNER BACKGROUND ─────────────────────────────────── */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]">
            {worker.bannerUrl ? (
              <img src={worker.bannerUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-70" />
            ) : worker.profilePhoto ? (
              <img src={worker.profilePhoto} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover opacity-40 blur-2xl" />
            ) : null}
            {/* dot grid texture */}
            <div
              className="absolute inset-0 opacity-[0.18]"
              style={{
                backgroundImage: "radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)",
                backgroundSize: "14px 14px",
              }}
            />
            {/* readability gradient */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(900px 320px at -10% -20%, rgba(${t.rgb},0.16), transparent 60%), radial-gradient(700px 260px at 110% 110%, rgba(${t.rgb},0.10), transparent 60%), linear-gradient(180deg, rgba(10,13,10,0.82) 0%, rgba(5,6,5,0.96) 70%, #050605 100%)`,
              }}
            />
          </div>

          {/* ── CORNER RIBBON ─────────────────────────────────────── */}
          <div
            className={`pointer-events-none absolute -top-px -left-px h-[44px] w-[168px] rounded-tl-[22px] bg-gradient-to-br ${t.grad}`}
            style={{ clipPath: "polygon(0 0, 100% 0, 78% 100%, 0 100%)" }}
          />
          {/* shine */}
          <div className="pointer-events-none absolute -top-px left-[150px] h-[2px] w-12 rotate-[20deg] bg-white/70 blur-[2px]" />

          {/* ── TOP ROW ───────────────────────────────────────────── */}
          <div className="relative flex items-center justify-between px-3.5 pt-3">
            <div className="relative z-10 flex items-center gap-1.5 pl-0.5">
              <t.Icon className="h-3.5 w-3.5 text-black" strokeWidth={2.5} />
              <span className="text-[11px] font-black uppercase tracking-[0.22em] text-black">{t.label}</span>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border ${worker.available ? "border-lime-400/60 text-lime-300" : "border-white/15 text-white/55"} bg-black/50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] backdrop-blur`}
            >
              <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${worker.available ? "bg-lime-400" : "bg-white/40"}`}>
                {worker.available && <span className="absolute inset-0 animate-ping rounded-full bg-lime-400/80" />}
              </span>
              {worker.available ? "Available" : "Busy"}
            </span>
          </div>

          {/* ── HERO ──────────────────────────────────────────────── */}
          <div className="relative mt-3 flex gap-3 px-3.5">
            {/* photo */}
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

            {/* identity */}
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
                  <Hammer className="h-3 w-3 shrink-0" />
                </p>
              )}
              {worker.verified && (
                <div className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full border ${t.border} bg-white/[0.04] px-2 py-[3px]`}>
                  <ShieldCheck className={`h-3 w-3 ${t.textStrong}`} />
                  <span className="text-[10px] font-bold text-white/85">Verified Professional</span>
                </div>
              )}
            </div>

            {/* top-rated emblem */}
            {isTopRated && (
              <div className="relative -mr-1 hidden shrink-0 items-center justify-center xs:flex">
                <div className="relative flex h-[88px] w-[68px] flex-col items-center justify-center rounded-lg border border-amber-400/40 bg-gradient-to-b from-amber-500/20 to-transparent">
                  <Trophy className="absolute -top-2.5 h-5 w-5 fill-amber-400 text-amber-500 drop-shadow" />
                  <span className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Top</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Rated</span>
                  <div className="mt-0.5 flex gap-[1px]">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star key={i} className="h-2 w-2 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── RATING STRIP ──────────────────────────────────────── */}
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

          {/* ── CATEGORY PILLS ────────────────────────────────────── */}
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

          {/* ── STATS GRID ────────────────────────────────────────── */}
          <div className="relative mx-3.5 mt-2.5 grid grid-cols-2 gap-2">
            {/* distance — hero stat */}
            <div className={`relative col-span-2 overflow-hidden rounded-2xl border ${t.border} bg-gradient-to-br ${t.soft} p-3`}>
              {/* faux map dashed path */}
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
                      {hasDistance ? worker.distance.toFixed(2) : "—"}
                    </span>
                    {hasDistance && <span className="text-[11px] font-bold text-white/70">km</span>}
                  </div>
                  <div className={`mt-1 text-[9.5px] font-black uppercase tracking-[0.18em] ${t.textStrong}`}>Distance</div>
                  <div className="text-[9.5px] text-white/55">From your location</div>
                </div>
              </div>
            </div>

            {/* experience */}
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

            {/* expertise */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2.5">
              <div className={`mb-1.5 flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.16em] ${t.textStrong}`}>
                <Sparkles className="h-3 w-3" />
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

          {/* ── CTAs ──────────────────────────────────────────────── */}
          <div className="relative mx-3.5 mt-3 grid grid-cols-[1fr_1.5fr] gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { fireClick(); setPopupOpen(true); }}
              className="group/btn flex items-center justify-between rounded-2xl border border-white/12 bg-white/[0.05] px-3 py-2.5 text-left transition hover:bg-white/[0.09]"
            >
              <div className="flex min-w-0 items-center gap-2">
                <User className={`h-4 w-4 shrink-0 ${t.textStrong}`} />
                <div className="min-w-0">
                  <div className="text-[11.5px] font-black uppercase tracking-[0.12em] text-white">Profile</div>
                  <div className="truncate text-[9px] text-white/55">View details</div>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/60 transition group-hover/btn:translate-x-0.5" />
            </button>

            {(() => {
              const ContactInner = (
                <>
                  <div className="flex min-w-0 items-center gap-2">
                    <MessageCircle className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                    <div className="min-w-0 text-left">
                      <div className="text-[12.5px] font-black uppercase tracking-[0.14em]">Message</div>
                      <div className="truncate text-[9px] font-semibold opacity-80">Chat with {firstName}</div>
                    </div>
                  </div>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/85 text-white">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </>
              );
              const ctaClass = `group/btn flex w-full items-center justify-between rounded-2xl bg-gradient-to-r ${t.grad} px-3 py-2.5 text-black shadow-lg shadow-lime-500/15`;
              if (worker.showContact === false) {
                return isAuthed && worker.userId ? (
                  <Link to={`/chat/${worker.userId}`} onClick={fireClick} className={ctaClass}>{ContactInner}</Link>
                ) : (
                  <AuthRequiredDialog title="Log in to message" description="Sign in to message this provider.">
                    <button className={ctaClass}>{ContactInner}</button>
                  </AuthRequiredDialog>
                );
              }
              return isAuthed ? (
                <button onClick={() => { fireClick(); setPopupOpen(true); }} className={ctaClass}>{ContactInner}</button>
              ) : (
                <AuthRequiredDialog title="Log in to contact" description="Sign in to contact this provider.">
                  <button className={ctaClass}>{ContactInner}</button>
                </AuthRequiredDialog>
              );
            })()}
          </div>

          {/* ── FOOTER TRUST BAR ──────────────────────────────────── */}
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
            <div className="flex flex-col items-center text-center">
              <Trophy className="h-4 w-4 text-amber-400" />
              <div className="mt-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-amber-300">Top Pro</div>
              <div className="text-[8px] leading-tight text-white/50">Near Konnect</div>
            </div>
          </div>
        </article>
      </div>
      <WorkerProfilePopup worker={worker} open={popupOpen} onOpenChange={handleChange} isAuthed={isAuthed} premium={premium} />
    </>
  );
};

export default WorkerAdCard;
