import WorkerCard from "@/components/WorkerCard";
import NativeAdCard, { type NativeAd } from "@/components/NativeAdCard";
import type { Worker } from "@/data/mockData";

type FeedWorker = Worker & { isSponsored?: boolean };

interface MonetizedWorkerGridProps {
  workers: FeedWorker[];
  ads: NativeAd[];
  adFrequencyMin?: number;
  className?: string;
}

const MonetizedWorkerGrid = ({
  workers,
  ads,
  adFrequencyMin = 4,
  className = "grid gap-3 md:grid-cols-2 xl:grid-cols-3",
}: MonetizedWorkerGridProps) => {
  const safeInterval = Math.max(4, adFrequencyMin || 4);
  const effectiveAds: NativeAd[] = ads.length
    ? ads
    : [
        {
          id: "placeholder-ad",
          title: "Your Ad Here",
          description: "Promote your business to nearby clients with native placements.",
          image_url: null,
          cta_label: "Learn More",
          cta_url: "#",
        },
      ];
  const feed: Array<{ type: "worker"; worker: FeedWorker } | { type: "ad"; ad: NativeAd }> = [];
  let adIndex = 0;
  let insertedAds = 0;

  workers.forEach((worker) => {
    feed.push({ type: "worker", worker });
    const workerCount = feed.filter((item) => item.type === "worker").length;
    if (workerCount % safeInterval === 0) {
      feed.push({ type: "ad", ad: effectiveAds[adIndex % effectiveAds.length] });
      adIndex += 1;
      insertedAds += 1;
    }
  });

  if (insertedAds === 0) {
    feed.push({ type: "ad", ad: effectiveAds[0] });
  }

  return (
    <div className={className}>
      {feed.map((item, index) =>
        item.type === "worker" ? (
          <WorkerCard key={`worker-${item.worker.id}-${index}`} worker={item.worker} index={index} sponsored={item.worker.isSponsored} />
        ) : (
          <NativeAdCard key={`ad-${item.ad.id}-${index}`} ad={item.ad} />
        ),
      )}
    </div>
  );
};

export default MonetizedWorkerGrid;