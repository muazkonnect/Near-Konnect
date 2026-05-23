import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCircle2, XCircle, Clock, ArrowLeft, Zap } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { fetchPaymentRequest, getProofSignedUrl } from "@/services/walletService";
import { formatPrice } from "@/lib/sparkPricing";
import { useEffect, useState } from "react";

const STATUS: Record<string, { icon: any; label: string; tone: string }> = {
  pending: { icon: Clock, label: "Pending Review", tone: "text-yellow-400 bg-yellow-500/15 border-yellow-500/30" },
  approved: { icon: CheckCircle2, label: "Approved", tone: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" },
  rejected: { icon: XCircle, label: "Rejected", tone: "text-rose-400 bg-rose-500/15 border-rose-500/30" },
  cancelled: { icon: XCircle, label: "Cancelled", tone: "text-hero-foreground/60 bg-hero-foreground/10 border-hero-foreground/20" },
};

const PaymentStatusPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: req, isLoading } = useQuery({
    queryKey: ["payment_request", id],
    queryFn: () => fetchPaymentRequest(id),
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.status;
      return status && status !== "pending" ? false : 5_000;
    },
  });
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (req?.proof_url) {
        const url = await getProofSignedUrl(req.proof_url);
        setProofUrl(url);
      }
    })();
  }, [req?.proof_url]);

  if (isLoading) return <AppLayout title="Payment"><div className="h-40 animate-pulse rounded-2xl bg-hero-foreground/[0.05]" /></AppLayout>;
  if (!req) return <AppLayout title="Payment"><p className="text-hero-foreground/60">Not found.</p></AppLayout>;

  const s = STATUS[req.status] || STATUS.pending;
  const Icon = s.icon;

  return (
    <AppLayout title="Payment Status">
      <div className="space-y-5">
        <button onClick={() => navigate("/wallet")} className="inline-flex items-center gap-1 text-xs text-hero-foreground/60 hover:text-hero-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to wallet
        </button>

        <div className={`flex items-center gap-3 rounded-2xl border px-4 py-4 ${s.tone}`}>
          <Icon className="h-6 w-6" />
          <div>
            <p className="text-sm font-bold">{s.label}</p>
            <p className="text-xs opacity-80">Submitted {format(new Date(req.created_at), "MMM d, yyyy · HH:mm")}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 to-transparent p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-hero-foreground/60">
            <Zap className="h-3.5 w-3.5" /> Sparks
          </div>
          <p className="mt-1 text-3xl font-extrabold tabular-nums">{(req.sparks_amount + req.bonus_sparks).toLocaleString()}</p>
          <p className="text-xs text-hero-foreground/60">{req.payment_method.toUpperCase()} · {req.currency} {Number(req.price_amount).toLocaleString()}</p>
        </div>

        <div className="space-y-2 rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-4">
          <div className="flex justify-between text-sm"><span className="text-hero-foreground/60">Reference</span><span className="font-semibold">{req.reference}</span></div>
          {req.admin_note && (
            <div className="rounded-xl bg-hero-foreground/[0.05] p-3 text-xs">
              <p className="text-hero-foreground/60">Admin note</p>
              <p className="mt-1">{req.admin_note}</p>
            </div>
          )}
        </div>

        {proofUrl && (
          <div>
            <p className="mb-2 text-xs uppercase tracking-wider text-hero-foreground/60">Payment proof</p>
            <img src={proofUrl} alt="proof" className="w-full max-h-96 rounded-2xl border border-hero-foreground/10 object-contain bg-hero-foreground/5" />
          </div>
        )}

        {req.status === "approved" && (
          <Button asChild className="w-full rounded-full"><Link to="/wallet">View wallet</Link></Button>
        )}
        {req.status === "rejected" && (
          <Button asChild className="w-full rounded-full"><Link to="/wallet/buy">Try again</Link></Button>
        )}
      </div>
    </AppLayout>
  );
};

export default PaymentStatusPage;
