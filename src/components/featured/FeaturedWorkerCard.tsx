import { Star } from "lucide-react";
import WorkerCard from "@/components/WorkerCard";

type Props = { worker: any; index?: number };

export default function FeaturedWorkerCard({ worker, index = 0 }: Props) {
  return (
    <div className="relative">
      <div className="absolute -top-2 left-3 z-10 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-md ring-2 ring-background">
        <Star className="h-3 w-3" fill="currentColor" /> Featured
      </div>
      <div className="rounded-2xl ring-2 ring-amber-400/40 shadow-[0_8px_24px_-8px_hsl(45_93%_47%/0.35)]">
        <WorkerCard worker={worker} index={index} />
      </div>
    </div>
  );
}

