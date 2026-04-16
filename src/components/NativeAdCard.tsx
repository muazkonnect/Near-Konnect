import { ExternalLink, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface NativeAd {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  cta_label?: string | null;
  cta_url: string;
}

interface NativeAdCardProps {
  ad: NativeAd;
}

const NativeAdCard = ({ ad }: NativeAdCardProps) => {
  const isPlaceholder = ad.id === "placeholder-ad";

  return (
    <article className="rounded-2xl border border-[hsl(var(--secondary))] border-primary/25 bg-card p-3 md:p-4">
      {ad.image_url ? (
        <img
          src={ad.image_url}
          alt={ad.title}
          className="mb-3 h-36 w-full rounded-xl object-cover"
          loading="lazy"
        />
      ) : (
        <div className="mb-3 flex h-36 w-full items-center justify-center rounded-xl border border-dashed bg-muted/40 text-sm font-medium text-muted-foreground">
          Ad Image Placeholder
        </div>
      )}
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge variant="outline" className="gap-1 rounded-full">
          <Megaphone className="h-3 w-3" /> Sponsored Ad
        </Badge>
      </div>
      <h3 className="line-clamp-1 text-sm font-semibold text-card-foreground md:text-base">{isPlaceholder ? "Your Ad Here" : ad.title}</h3>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground md:text-sm">
        {ad.description || "Reach local clients where they discover trusted services."}
      </p>
      <Button asChild variant="outline" className="mt-3 w-full gap-1 rounded-xl">
        <a href={ad.cta_url} target="_blank" rel="noreferrer">
          {ad.cta_label || "Learn More"} <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </Button>
    </article>
  );
};

export default NativeAdCard;