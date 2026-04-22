import { ArrowRight, Sparkles, ExternalLink } from "lucide-react";
import type { NativeAd } from "@/hooks/useSponsored";

interface Props {
  ad: NativeAd;
  variant?: "banner" | "feed";
}

const NativeAdCard = ({ ad, variant = "feed" }: Props) => {
  const isBanner = variant === "banner";

  if (isBanner) {
    return (
      <a
        href={ad.cta_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="group relative block w-full overflow-hidden rounded-2xl border bg-card transition-all hover:shadow-lg"
      >
        <div className="flex h-32 md:h-28 w-full items-center overflow-hidden">
          {ad.image_url && (
            <div className="relative h-full w-32 md:w-48 shrink-0 overflow-hidden">
              <img
                src={ad.image_url}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card" />
            </div>
          )}

          <div className="relative flex flex-1 items-center justify-between gap-4 p-4 md:px-6">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary ring-1 ring-primary/20">
                  <Sparkles className="h-2.5 w-2.5" /> Sponsored
                </span>
              </div>
              <h3 className="text-base md:text-lg font-bold tracking-tight text-card-foreground line-clamp-1">
                {ad.title}
              </h3>
              {ad.description && (
                <p className="text-xs md:text-sm text-muted-foreground/80 line-clamp-1">
                  {ad.description}
                </p>
              )}
            </div>

            <div className="shrink-0">
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-all group-hover:bg-primary/90">
                {ad.cta_label} <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </div>
        </div>
      </a>
    );
  }

  return (
    <a
      href={ad.cta_url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:bg-accent/50 hover:shadow-md"
    >
      {ad.image_url && (
        <div className="aspect-video w-full overflow-hidden border-b">
          <img
            src={ad.image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute right-3 top-3 z-10 rounded-full bg-black/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
            Sponsored
          </div>
        </div>
      )}
      
      <div className="flex-1 p-4 min-w-0">
        <div className="flex items-center justify-between gap-2">
          {!ad.image_url && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">
              Sponsored
            </span>
          )}
          <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        
        <p className="font-bold text-card-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors">
          {ad.title}
        </p>
        
        {ad.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {ad.description}
          </p>
        )}

        <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-primary">
          {ad.cta_label} <ArrowRight className="h-3 w-3" />
        </div>
      </div>
    </a>
  );
};

export default NativeAdCard;

