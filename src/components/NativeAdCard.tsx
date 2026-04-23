import { ArrowRight, ExternalLink } from "lucide-react";
import type { NativeAd } from "@/hooks/useSponsored";
import { useAdImpression, useAdClick } from "@/hooks/useAdTracking";
import type { Coords } from "@/lib/geolocation";

interface Props {
  ad: NativeAd;
  variant?: "banner" | "feed" | "inline";
  viewerCoords?: Coords | null;
  /** Skip tracking (e.g. when used as a preview in admin). */
  preview?: boolean;
}

const NativeAdCard = ({ ad, variant = "feed", viewerCoords, preview = false }: Props) => {
  const impressionRef = useAdImpression(preview ? undefined : ad.id, ad.placement, viewerCoords);
  const trackClick = useAdClick();

  const onClick = () => {
    if (preview) return;
    trackClick(ad.id, ad.placement, viewerCoords);
  };

  const SponsoredTag = (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
      <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
      Sponsored
    </span>
  );

  if (variant === "inline") {
    return (
      <a
        ref={impressionRef as React.RefObject<HTMLAnchorElement>}
        href={ad.cta_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={onClick}
        className="group flex items-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/60"
      >
        {ad.image_url && (
          <img
            src={ad.image_url}
            alt=""
            loading="lazy"
            className="h-10 w-10 shrink-0 rounded-lg object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">{SponsoredTag}</div>
          <p className="truncate text-sm font-medium text-foreground">{ad.title}</p>
          {ad.description && (
            <p className="truncate text-xs text-muted-foreground">{ad.description}</p>
          )}
        </div>
        <span className="shrink-0 text-xs font-medium text-primary">
          {ad.cta_label} <ArrowRight className="ml-0.5 inline h-3 w-3" />
        </span>
      </a>
    );
  }

  if (variant === "banner") {
    return (
      <a
        ref={impressionRef as React.RefObject<HTMLAnchorElement>}
        href={ad.cta_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={onClick}
        className="group relative block w-full overflow-hidden rounded-2xl border border-border/60 bg-card transition-colors hover:bg-accent/30"
      >
        <div className="flex h-28 w-full items-center md:h-24">
          {ad.image_url && (
            <div className="relative h-full w-28 shrink-0 overflow-hidden md:w-40">
              <img
                src={ad.image_url}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="relative flex flex-1 items-center justify-between gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1">{SponsoredTag}</div>
              <p className="truncate text-sm font-semibold text-card-foreground md:text-base">
                {ad.title}
              </p>
              {ad.description && (
                <p className="truncate text-xs text-muted-foreground">{ad.description}</p>
              )}
            </div>
            <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-primary sm:inline-flex">
              {ad.cta_label}
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </a>
    );
  }

  // feed variant
  return (
    <a
      ref={impressionRef as React.RefObject<HTMLAnchorElement>}
      href={ad.cta_url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-colors hover:bg-accent/30"
    >
      {ad.image_url && (
        <div className="aspect-[16/9] w-full overflow-hidden border-b">
          <img
            src={ad.image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="flex-1 p-4">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          {SponsoredTag}
          <ExternalLink className="h-3 w-3 text-muted-foreground/60" />
        </div>

        <p className="text-sm font-semibold text-card-foreground line-clamp-1">
          {ad.title}
        </p>

        {ad.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {ad.description}
          </p>
        )}

        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary">
          {ad.cta_label}
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </a>
  );
};

export default NativeAdCard;
