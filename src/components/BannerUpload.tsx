import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { compressImage } from "@/lib/imageCompress";
import { toast } from "sonner";

interface Props {
  currentUrl?: string | null;
  workerId: string;
  onChange?: (url: string | null) => void;
}

const BannerUpload = ({ currentUrl, workerId, onChange }: Props) => {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image");
      return;
    }
    setBusy(true);
    try {
      const blob = await compressImage(file, { maxDim: 1800, quality: 0.82 });
      const path = `${user.id}/banner-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("worker-media")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("worker-media").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: dbErr } = await (supabase as any)
        .from("workers")
        .update({ banner_url: url })
        .eq("id", workerId);
      if (dbErr) throw dbErr;
      toast.success("Banner updated");
      onChange?.(url);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await (supabase as any)
      .from("workers")
      .update({ banner_url: null })
      .eq("id", workerId);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Banner removed");
      onChange?.(null);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-hero-foreground/10 bg-hero-foreground/5">
      <div className="relative h-32 w-full bg-gradient-to-br from-primary/30 via-primary/10 to-hero-foreground/5">
        {currentUrl && (
          <img src={currentUrl} alt="Banner" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-hero/70 via-transparent to-transparent" />
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-hero-foreground/90">Profile banner</p>
            <p className="text-[10px] text-hero-foreground/70">Shown on your profile & ad cards</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {currentUrl && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={remove}
                className="h-8 gap-1 rounded-lg bg-hero/60 px-2 text-[11px] text-hero-foreground backdrop-blur hover:bg-hero/80"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="h-8 gap-1 rounded-lg px-2.5 text-[11px]"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : currentUrl ? <Camera className="h-3 w-3" /> : <ImagePlus className="h-3 w-3" />}
              {currentUrl ? "Change" : "Upload"}
            </Button>
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
    </div>
  );
};

export default BannerUpload;
