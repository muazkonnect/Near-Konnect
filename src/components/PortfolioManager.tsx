import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Trash2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { compressImage } from "@/lib/imageCompress";
import { toast } from "sonner";

interface Props {
  workerId: string;
  verified: boolean;
}

const UNVERIFIED_MAX = 3;
const VERIFIED_MAX = 5;

export function useWorkerPortfolio(workerId?: string) {
  return useQuery({
    queryKey: ["worker_portfolio", workerId],
    enabled: !!workerId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("worker_portfolio")
        .select("*")
        .eq("worker_id", workerId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Array<{ id: string; image_url: string; caption: string; sort_order: number }>;
    },
    staleTime: 60_000,
  });
}

const PortfolioManager = ({ workerId, verified }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: items = [] } = useWorkerPortfolio(workerId);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const max = verified ? VERIFIED_MAX : UNVERIFIED_MAX;
  const atLimit = items.length >= max;

  const upload = async (file: File) => {
    if (!user) return;
    if (atLimit) {
      toast.error(`You can upload up to ${max} images${verified ? "" : " (verify your profile for more)"}`);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image");
      return;
    }
    setBusy(true);
    try {
      const blob = await compressImage(file, { maxDim: 1400, quality: 0.8 });
      const path = `${user.id}/portfolio/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("worker-media")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("worker-media").getPublicUrl(path);
      const { error: dbErr } = await (supabase as any).from("worker_portfolio").insert({
        worker_id: workerId,
        user_id: user.id,
        image_url: pub.publicUrl,
        sort_order: items.length,
      });
      if (dbErr) throw dbErr;
      toast.success("Image added to portfolio");
      qc.invalidateQueries({ queryKey: ["worker_portfolio", workerId] });
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (id: string, image_url: string) => {
    const { error } = await (supabase as any).from("worker_portfolio").delete().eq("id", id);
    if (error) return toast.error(error.message);
    // best-effort storage cleanup
    try {
      const marker = "/worker-media/";
      const idx = image_url.indexOf(marker);
      if (idx > -1) {
        const path = image_url.slice(idx + marker.length);
        await supabase.storage.from("worker-media").remove([path]);
      }
    } catch { /* ignore */ }
    toast.success("Removed");
    qc.invalidateQueries({ queryKey: ["worker_portfolio", workerId] });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-hero-foreground/10 bg-hero-foreground/5 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-hero-foreground">Portfolio</p>
          <p className="text-[10px] text-hero-foreground/60">
            Showcase previous work. {items.length}/{max} used
            {!verified && (
              <> · <span className="inline-flex items-center gap-0.5 text-primary/90"><Lock className="h-2.5 w-2.5" /> Verify to upload up to {VERIFIED_MAX}</span></>
            )}
            {verified && (
              <> · <span className="inline-flex items-center gap-0.5 text-emerald-400"><ShieldCheck className="h-2.5 w-2.5" /> Verified slots</span></>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {items.map((it) => (
          <div key={it.id} className="group relative aspect-square overflow-hidden rounded-xl border border-hero-foreground/10 bg-hero-foreground/5">
            <img src={it.image_url} alt="Work" className="h-full w-full object-cover" loading="lazy" />
            <button
              type="button"
              onClick={() => remove(it.id, it.image_url)}
              className="absolute right-1 top-1 rounded-md bg-destructive/90 p-1 text-destructive-foreground opacity-0 transition group-hover:opacity-100"
              aria-label="Remove"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {!atLimit && (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-hero-foreground/15 bg-hero-foreground/[0.02] text-hero-foreground/70 transition hover:border-primary/50 hover:bg-primary/5 hover:text-primary disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <ImagePlus className="h-5 w-5" />
                <span className="text-[10px] font-semibold">Add image</span>
              </div>
            )}
          </button>
        )}
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

export default PortfolioManager;
