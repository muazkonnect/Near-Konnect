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
        glow: "shadow-[0_0_80px_-10px_rgba(163,230,53,0.85),0_0_24px_-4px_rgba(163,230,53,0.5)]",
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
        className={`group relative w-full max-w-[680px] rounded-[22px] p-[1.5px] bg-gradient-to-br ${t.grad} ${t.glow}`}
      >
        <article
          onClick={handleOpen}
          className="relative flex cursor-pointer overflow-hidden rounded-[20px] bg-[#0a0d0a] text-white transition-transform duration-200 active:scale-[0.995]"
        >
          {/* ── BANNER BACKGROUND ─────────────────────────────────── */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[20px]">
            {worker.bannerUrl ? (
              <img src={worker.bannerUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-60" />
            ) : worker.profilePhoto ? (
              <img src={worker.profilePhoto} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover opacity-30 blur-2xl" />
            ) : null}
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
                backgroundImage: `radial-gradient(600px 240px at -10% -20%, rgba(${t.rgb},0.18), transparent 60%), radial-gradient(500px 200px at 110% 110%, rgba(${t.rgb},0.12), transparent 60%), linear-gradient(90deg, rgba(10,13,10,0.55) 0%, rgba(5,6,5,0.92) 55%, #050605 100%)`,
              }}
            />
          </div>

          {/* ── CORNER RIBBON ─────────────────────────────────────── */}
          <div
            className={`pointer-events-none absolute -top-px -left-px z-10 h-[28px] w-[120px] rounded-tl-[20px] bg-gradient-to-br ${t.grad}`}
            style={{ clipPath: "polygon(0 0, 100% 0, 78% 100%, 0 100%)" }}
          />
          <div className="pointer-events-none absolute -top-px left-[108px] z-10 h-[2px] w-8 rotate-[20deg] bg-white/70 blur-[2px]" />
          <div className="pointer-events-none absolute top-[7px] left-2 z-20 flex items-center gap-1">
            <t.Icon className="h-2.5 w-2.5 text-black" strokeWidth={2.5} />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-black">{t.label}</span>
          </div>

          {/* ── LEFT: PHOTO COLUMN ────────────────────────────────── */}
          <div className="relative w-[120px] shrink-0 flex-col p-2.5 pt-7 flex items-center justify-center px-0 py-0 my-px gap-[5px]">
            <div className={`relative rounded-2xl p-[1.5px] bg-gradient-to-br ${t.grad}`}>
              <Avatar className="h-[96px] w-[88px] rounded-[12px] border-2 border-black">
                <AvatarImage src={worker.profilePhoto} alt={worker.name} className="object-cover" />
                <AvatarFallback className={`rounded-[10px] bg-black text-2xl font-black ${t.text}`}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              {worker.verified && (
                <div className={`absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black ring-2 ${t.ring}`}>
                  <ShieldCheck className={`h-3 w-3 ${t.textStrong}`} strokeWidth={3} />
                </div>
              )}
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full border ${worker.available ? "border-lime-400/60 text-lime-300" : "border-white/15 text-white/55"} bg-black/60 px-1.5 py-[2px] text-[8px] font-extrabold uppercase tracking-[0.16em] backdrop-blur my-[6px]`}
            >
              <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${worker.available ? "bg-lime-400" : "bg-white/40"}`}>
                {worker.available && <span className="absolute inset-0 animate-ping rounded-full bg-lime-400/80" />}
              </span>
              {worker.available ? "Available" : "Busy"}
            </span>
            {isTopRated && (
              <div className="gap-1 rounded-md border border-amber-400/40 bg-amber-500/10 px-1.5 py-[2px] flex-row flex items-center justify-start my-0">
                <Trophy className="h-2.5 w-2.5 fill-amber-400 text-amber-500" />
                <span className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-300">Top Rated</span>
              </div>
            )}
          </div>

          {/* ── RIGHT: INFO COLUMN ────────────────────────────────── */}
          <div className="relative min-w-0 flex-1 flex-col p-2.5 pt-7 pr-3 flex items-start justify-center gap-0">
            {/* identity */}
            <div className="min-w-0">
              <div className="flex items-start gap-1.5">
                <h3 className="line-clamp-1 font-black leading-tight tracking-tight text-white text-3xl">
                  {worker.name}
                </h3>
                {worker.verified && (
                  <span className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${t.grad}`}>
                    <BadgeCheck className="h-3 w-3 text-black" strokeWidth={3} />
                  </span>
                )}
              </div>
              {worker.profession && (
                <p className={`mt-0.5 flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] ${t.textStrong}`}>
                  <Hammer className="h-3 w-3 shrink-0" />
                  <span className="truncate">{worker.profession}</span>
                </p>
              )}
            </div>

            {/* rating strip */}
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 backdrop-blur">
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="text-[12px] font-black leading-none text-white">{worker.rating?.toFixed(1) || "—"}</span>
                <span className="text-[9px] text-white/55">({worker.reviewCount || 0})</span>
              </div>
              <div className="h-3 w-px bg-white/10" />
              <div className="flex items-center gap-1">
                <MessageCircle className="h-2.5 w-2.5 text-white/65" />
                <span className="text-[9px] font-extrabold text-white">{positivePct}%</span>
              </div>
            </div>

            {/* stats row: distance + experience */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className={`relative overflow-hidden rounded-lg border ${t.border} bg-gradient-to-br ${t.soft} px-2 py-1.5`}>
                <div className="flex items-center gap-1.5">
                  <MapPin className={`h-3.5 w-3.5 shrink-0 ${t.textStrong}`} />
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-0.5 leading-none">
                      <span className="text-[14px] font-black text-white tabular-nums">
                        {hasDistance ? worker.distance.toFixed(2) : "—"}
                      </span>
                      {hasDistance && <span className="text-[8px] font-bold text-white/70">km</span>}
                    </div>
                    <div className={`mt-0.5 text-[7.5px] font-black uppercase tracking-[0.16em] ${t.textStrong}`}>Distance</div>
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5">
                <div className="flex items-center gap-1.5">
                  <CalendarClock className={`h-3.5 w-3.5 shrink-0 ${t.textStrong}`} />
                  <div className="min-w-0">
                    <div className="text-[14px] font-black leading-none text-white tabular-nums">
                      {worker.experience > 0 ? `${worker.experience}+` : "—"}
                    </div>
                    <div className={`mt-0.5 text-[7.5px] font-black uppercase tracking-[0.16em] ${t.textStrong}`}>Yrs Exp</div>
                  </div>
                </div>
              </div>
            </div>

            {/* expertise pills */}
            <div className="flex flex-wrap items-center gap-1">
              <Sparkles className={`h-2.5 w-2.5 ${t.textStrong}`} />
              {getExpertise(worker.mainCategory, worker.subCategory, [], 3).map((skill) => (
                <span
                  key={skill}
                  className="truncate rounded border border-white/10 bg-white/[0.04] px-1 py-[1px] text-[8px] font-semibold text-white/80"
                >
                  {skill}
                </span>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-0.5 grid grid-cols-[1fr_1.5fr] gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => { fireClick(); setPopupOpen(true); }}
                className="group/btn flex items-center justify-between rounded-xl border border-white/12 bg-white/[0.05] px-2 py-1.5 text-left transition hover:bg-white/[0.09]"
              >
                <div className="flex min-w-0 items-center gap-1">
                  <User className={`h-3 w-3 shrink-0 ${t.textStrong}`} />
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white">Profile</div>
                </div>
                <ChevronRight className="h-3 w-3 shrink-0 text-white/60" />
              </button>
              {(() => {
                const ContactInner = (
                  <>
                    <div className="flex min-w-0 items-center gap-1">
                      <MessageCircle className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                      <div className="text-[10.5px] font-black uppercase tracking-[0.14em] px-[13px]">Message</div>
                    </div>
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-black/85 text-white">
                      <ChevronRight className="h-2.5 w-2.5" />
                    </span>
                  </>
                );
                const ctaClass = `group/btn flex w-full items-center justify-between rounded-xl bg-gradient-to-r ${t.grad} px-2 py-1.5 text-black shadow-lg shadow-lime-500/15 text-center`;
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
          </div>
        </article>
      </div>
      <WorkerProfilePopup worker={worker} open={popupOpen} onOpenChange={handleChange} isAuthed={isAuthed} premium={premium} />
    </>
  );
};

export default WorkerAdCard;
