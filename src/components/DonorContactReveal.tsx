import { Button } from "@/components/ui/button";
import { Lock, Check, Clock, X } from "lucide-react";
import { useContactReveal } from "@/hooks/useContactReveal";
import ContactMethodsBar from "@/components/ContactMethodsBar";
import type { ContactMethod } from "@/lib/contactMethods";

interface Props {
  donorUserId: string;
  contactMethods: ContactMethod[];
}

/**
 * Privacy-first contact section for blood donor cards.
 * Shows contact methods only after the donor approves a reveal request.
 */
const DonorContactReveal = ({ donorUserId, contactMethods }: Props) => {
  const { canView, status, request, requesting, isOwner } = useContactReveal(donorUserId);

  if (isOwner) return null;
  if (!contactMethods || contactMethods.length === 0) return null;

  if (canView) {
    return (
      <div className="mt-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-px flex-1 bg-border" />
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-success">
            <Check className="h-3 w-3" /> Contact shared
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <ContactMethodsBar
            methods={contactMethods}
            variant="card"
            className="!gap-1.5 [&>a]:!h-9 [&>a]:!w-9 [&>a>svg]:!h-4 [&>a>svg]:!w-4"
          />
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <Button size="sm" variant="outline" disabled className="mt-2 w-full gap-1.5 rounded-xl">
        <Clock className="h-3.5 w-3.5" /> Contact request pending
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={(e) => {
        e.stopPropagation();
        request();
      }}
      disabled={requesting}
      className="mt-2 w-full gap-1.5 rounded-xl"
    >
      {status === "denied" ? <X className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
      {status === "denied" ? "Re-request contact" : "Request contact"}
    </Button>
  );
};

export default DonorContactReveal;
