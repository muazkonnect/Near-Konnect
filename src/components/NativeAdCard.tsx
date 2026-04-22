import { ArrowRight, Sparkles } from "lucide-react";
import type { NativeAd } from "@/hooks/useSponsored";

interface Props {
  ad: NativeAd;
  variant?: "banner" | "feed";
}

const NativeAdCard = ({ ad, variant = "feed" }: Props) => {
  const isBanner = variant === "banner";
  return (
    <a
      href={ad.cta_url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={`group relative block overflow-hidden rounded-3xl border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md ${
        isBanner ? "p-5 md:p-6" : "p-4"
      }`}
    >
      <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
        <Sparkles className="h-2.5 w-2.5" /> Sponsored
      </span>

      <div className={`flex gap-4 ${isBanner ? "items-center" : "items-start"}`}>
        {ad.image_url && (
          <img
            src={ad.image_url}
            alt=""
            loading="lazy"
            className={`shrink-0 rounded-2xl object-cover ${isBanner ? "h-20 w-20 md:h-24 md:w-24" : "h-16 w-16"}`}
          />
        )}
        <div className="min-w-0 flex-1 pt-5">
          <p className={`font-bold text-card-foreground ${isBanner ? "text-lg" : "text-sm"}`}>{ad.title}</p>
          {ad.description && (
            <p className={`mt-1 text-muted-foreground line-clamp-2 ${isBanner ? "text-sm" : "text-xs"}`}>
              {ad.description}
            </p>
          )}
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
            {ad.cta_label} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </a>
  );
};

export default NativeAdCard;
