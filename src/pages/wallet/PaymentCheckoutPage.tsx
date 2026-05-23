import { useState, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Copy, CheckCircle2, ArrowLeft, Loader2, Smartphone, Wallet } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ProofUploader from "@/components/wallet/ProofUploader";
import { useAuth } from "@/contexts/AuthContext";
import { usePaymentRegion } from "@/hooks/usePaymentRegion";
import { useAppSetting } from "@/hooks/useAppSettings";
import {
  fetchPackageById, fetchPaymentSettings, uploadPaymentProof, createPaymentRequest,
} from "@/services/walletService";

type Method = "easypaisa" | "jazzcash" | "usdt";
type UsdtNet = "trc" | "bep" | "erc";
const NET_META: Record<UsdtNet, { label: string; full: string; addrKey: keyof any; qrKey: keyof any }> = {
  trc: { label: "TRC20", full: "Tron (TRC20)", addrKey: "usdt_address_trc", qrKey: "usdt_qr_trc_url" },
  bep: { label: "BEP20", full: "BNB Smart Chain (BEP20)", addrKey: "usdt_address_bep", qrKey: "usdt_qr_bep_url" },
  erc: { label: "ERC20", full: "Ethereum (ERC20)", addrKey: "usdt_address_erc", qrKey: "usdt_qr_erc_url" },
};

const CopyBtn = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        if (!value) return;
        await navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success("Copied");
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/25"
    >
      {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl border border-hero-foreground/10 bg-hero-foreground/[0.04] px-3 py-2.5">
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-hero-foreground/50">{label}</p>
      <p className="text-sm font-semibold truncate">{value || "—"}</p>
    </div>
    {value ? <CopyBtn value={value} /> : null}
  </div>
);

const PaymentCheckoutPage = () => {
  const { packageId = "" } = useParams();
  const [params] = useSearchParams();
  const customSparks = Number(params.get("sparks") || 0);
  const isCustom = packageId === "custom";

  const navigate = useNavigate();
  const { user } = useAuth();
  const { region } = usePaymentRegion();

  const { data: pkg } = useQuery({
    queryKey: ["package", packageId],
    queryFn: () => fetchPackageById(packageId),
    enabled: !!packageId && !isCustom,
  });

  const { data: settings } = useQuery({
    queryKey: ["payment_settings"],
    queryFn: fetchPaymentSettings,
  });

  const sparks = isCustom ? customSparks : pkg?.sparks ?? 0;
  const bonus = isCustom ? 0 : pkg?.bonus_sparks ?? 0;
  const pricePkr = isCustom ? customSparks * 5 : Number(pkg?.price_pkr ?? 0);
  const priceUsdt = isCustom ? +(customSparks * 0.02).toFixed(2) : Number(pkg?.price_usdt ?? 0);

  const defaultMethod: Method = region === "pk" ? "easypaisa" : "usdt";
  const [method, setMethod] = useState<Method>(defaultMethod);
  const [usdtNet, setUsdtNet] = useState<UsdtNet>("trc");
  const [reference, setReference] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const price = method === "usdt" ? priceUsdt : pricePkr;
  const currency = method === "usdt" ? "USDT" : "PKR";
  const usdtAddr = (settings as any)?.[NET_META[usdtNet].addrKey as string] || (usdtNet === "trc" ? settings?.usdt_address : "") || "";
  const usdtQr = (settings as any)?.[NET_META[usdtNet].qrKey as string] || (usdtNet === "trc" ? settings?.usdt_qr_url : "") || "";

  const submit = async () => {
    if (!user) return;
    if (!sparks || sparks <= 0) return toast.error("Invalid Sparks amount");
    if (!reference.trim()) return toast.error("Enter transaction reference / hash");
    if (!proof) return toast.error("Upload payment screenshot");
    if (proof.size > 5 * 1024 * 1024) return toast.error("Image must be < 5MB");

    setSubmitting(true);
    try {
      const proofPath = await uploadPaymentProof(user.id, proof);
      const req = await createPaymentRequest({
        userId: user.id,
        packageId: isCustom ? null : packageId,
        sparks,
        bonusSparks: bonus,
        priceAmount: price,
        currency,
        method,
        reference: reference.trim() + (method === "usdt" ? ` (${NET_META[usdtNet].label})` : ""),
        proofUrl: proofPath,
      });
      toast.success("Payment submitted for review");
      navigate(`/wallet/payment/${req.id}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const showPK = region === "pk";

  return (
    <AppLayout title="Checkout" subtitle="Complete your Sparks purchase.">
      <div className="space-y-5">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-xs text-hero-foreground/60 hover:text-hero-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/20 to-transparent p-5">
          <p className="text-xs uppercase tracking-wider text-hero-foreground/60">Order summary</p>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <p className="text-3xl font-extrabold tabular-nums">{(sparks + bonus).toLocaleString()} <span className="text-base font-semibold text-hero-foreground/60">Sparks</span></p>
              {bonus > 0 && <p className="text-xs text-emerald-400">includes {bonus} bonus</p>}
            </div>
            <p className="text-2xl font-bold text-primary">{currency === "PKR" ? `PKR ${price.toLocaleString()}` : `$${price} USDT`}</p>
          </div>
        </motion.div>

        <Tabs value={method} onValueChange={(v) => setMethod(v as Method)}>
          <TabsList className="grid w-full grid-cols-3 bg-hero-foreground/[0.06]">
            {showPK && <TabsTrigger value="easypaisa"><Smartphone className="mr-1 h-3.5 w-3.5" />Easypaisa</TabsTrigger>}
            {showPK && <TabsTrigger value="jazzcash"><Smartphone className="mr-1 h-3.5 w-3.5" />JazzCash</TabsTrigger>}
            <TabsTrigger value="usdt" className={!showPK ? "col-span-3" : ""}><Wallet className="mr-1 h-3.5 w-3.5" />USDT</TabsTrigger>
          </TabsList>

          <TabsContent value="easypaisa" className="mt-4 space-y-3">
            <InfoRow label="Account Number" value={settings?.easypaisa_number || ""} />
            <InfoRow label="Account Name" value={settings?.easypaisa_account_name || ""} />
            {settings?.easypaisa_qr_url && <img src={settings.easypaisa_qr_url} alt="Easypaisa QR" className="mx-auto h-40 w-40 rounded-xl border border-hero-foreground/10 object-contain bg-white p-2" />}
          </TabsContent>
          <TabsContent value="jazzcash" className="mt-4 space-y-3">
            <InfoRow label="Account Number" value={settings?.jazzcash_number || ""} />
            <InfoRow label="Account Name" value={settings?.jazzcash_account_name || ""} />
            {settings?.jazzcash_qr_url && <img src={settings.jazzcash_qr_url} alt="JazzCash QR" className="mx-auto h-40 w-40 rounded-xl border border-hero-foreground/10 object-contain bg-white p-2" />}
          </TabsContent>
          <TabsContent value="usdt" className="mt-4 space-y-3">
            <div className="flex gap-2">
              {(["trc", "bep", "erc"] as UsdtNet[]).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setUsdtNet(n)}
                  className={`flex-1 rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                    usdtNet === n
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-hero-foreground/10 text-hero-foreground/70 hover:border-hero-foreground/30"
                  }`}
                >
                  {NET_META[n].label}
                  <div className="text-[10px] font-normal opacity-70">{NET_META[n].full.split("(")[0].trim()}</div>
                </button>
              ))}
            </div>
            <InfoRow label={`USDT Address (${NET_META[usdtNet].full})`} value={usdtAddr} />
            {usdtQr && <img src={usdtQr} alt={`USDT ${NET_META[usdtNet].label} QR`} className="mx-auto h-40 w-40 rounded-xl border border-hero-foreground/10 object-contain bg-white p-2" />}
            {!usdtAddr && <p className="text-center text-xs text-amber-500">No {NET_META[usdtNet].label} address configured yet. Try another network.</p>}
          </TabsContent>
        </Tabs>

        {settings?.instructions && (
          <p className="rounded-xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-3 text-xs text-hero-foreground/70">
            {settings.instructions}
          </p>
        )}

        <div className="space-y-3 rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-hero-foreground/60">
              {method === "usdt" ? "Transaction Hash" : "Transaction ID / Reference"}
            </Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={method === "usdt" ? "0x..." : "TID123456"}
              className="mt-1 bg-hero-foreground/5 border-hero-foreground/15 text-hero-foreground"
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wider text-hero-foreground/60">Payment Proof</Label>
            <ProofUploader value={proof} onChange={setProof} disabled={submitting} />
          </div>
        </div>

        <Button onClick={submit} disabled={submitting} className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-bold">
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Payment"}
        </Button>
        <p className="text-center text-[11px] text-hero-foreground/50">
          Your payment will be reviewed by our team. Sparks will be credited after approval.
        </p>
      </div>
    </AppLayout>
  );
};

export default PaymentCheckoutPage;
