import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  className?: string;
  label?: string;
}

const VerifiedBadge = ({ className, label = "Verified" }: VerifiedBadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success",
      className,
    )}
  >
    <ShieldCheck className="h-3 w-3" /> {label}
  </span>
);

export default VerifiedBadge;
