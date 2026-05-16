import { useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Download, Share2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  uid: string;
  name?: string;
}

const SHARE_DOMAIN = "https://www.nearkonnect.com";

const WorkerShareCard = ({ uid, name }: Props) => {
  const [showQr, setShowQr] = useState(false);
  const qrRef = useRef<HTMLDivElement | null>(null);

  const url = useMemo(() => `${SHARE_DOMAIN}/w/${uid}`, [uid]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: name ? `${name} on NearKonnect` : "NearKonnect Worker",
          text: name ? `Check out ${name}'s profile on NearKonnect` : "Check out this worker",
          url,
        });
      } catch { /* user cancelled */ }
    } else {
      copy();
    }
  };

  const downloadQr = () => {
    const canvas = qrRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `nearkonnect-${uid}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="rounded-2xl border border-hero-foreground/10 bg-hero text-hero-foreground p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-hero-muted">Your share link</p>
          <p className="font-mono text-sm text-primary">{uid}</p>
        </div>
        <button
          onClick={() => setShowQr((v) => !v)}
          className="rounded-full border border-hero-foreground/15 bg-hero-foreground/5 px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 hover:bg-hero-foreground/10 transition text-hero-foreground"
        >
          <QrCode className="h-3.5 w-3.5" />
          {showQr ? "Hide QR" : "Show QR"}
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-hero-foreground/10 bg-hero-foreground/5 px-3 py-2">
        <span className="flex-1 truncate text-xs text-hero-muted">{url}</span>
        <button onClick={copy} className="text-hero-muted hover:text-primary transition" aria-label="Copy link">
          <Copy className="h-4 w-4" />
        </button>
      </div>

      {showQr && (
        <div className="flex flex-col items-center gap-3 pt-2">
          <div ref={qrRef} className="rounded-xl bg-white p-3">
            <QRCodeCanvas
              value={url}
              size={180}
              level="M"
              includeMargin={false}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={downloadQr}
            className="gap-2 border-hero-foreground/20 bg-hero-foreground/5 text-hero-foreground hover:bg-hero-foreground/10 hover:text-hero-foreground"
          >
            <Download className="h-4 w-4" />
            Download QR
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copy}
          className="gap-2 border-hero-foreground/20 bg-hero-foreground/5 text-hero-foreground hover:bg-hero-foreground/10 hover:text-hero-foreground"
        >
          <Copy className="h-4 w-4" /> Copy link
        </Button>
        <Button type="button" size="sm" onClick={share} className="gap-2">
          <Share2 className="h-4 w-4" /> Share
        </Button>
      </div>
    </div>
  );
};

export default WorkerShareCard;
