import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, AlertCircle, CheckCircle2, Video, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Status = "idle" | "starting" | "ready" | "preview" | "confirmed" | "error";

interface SignupFaceCaptureProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

const SignupFaceCapture = ({ value, onChange }: SignupFaceCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Local preview holds the just-captured image until the user confirms it.
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(value ? "confirmed" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStatus("ready");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Camera permission denied";
      setError(msg);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const size = Math.min(video.videoWidth, video.videoHeight) || 480;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setPreview(dataUrl);
    setStatus("preview");
    stopStream();
  }, [stopStream]);

  const retake = useCallback(() => {
    setPreview(null);
    onChange(null);
    setError(null);
    setStatus("idle");
    startCamera();
  }, [onChange, startCamera]);

  const confirmImage = useCallback(async () => {
    if (!preview) return;
    setChecking(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("check-face-duplicate", {
        body: { image: preview },
      });
      // Parse non-2xx error body if present
      let errMsg: string | null = null;
      let isDup = false;
      if (fnError) {
        const ctx = (fnError as { context?: { response?: Response } }).context;
        if (ctx?.response) {
          try {
            const body = await ctx.response.clone().json();
            if (body?.error) errMsg = body.error;
            if (body?.duplicate) isDup = true;
          } catch { /* ignore */ }
        }
        if (!errMsg) errMsg = fnError.message;
      } else {
        const res = (data ?? {}) as { duplicate?: boolean; error?: string };
        if (res.duplicate) {
          isDup = true;
          errMsg = res.error ?? "This face is already registered with another account.";
        } else if (res.error) {
          errMsg = res.error;
        }
      }
      if (errMsg) {
        setError(errMsg);
        toast.error(errMsg);
        if (isDup) {
          // Force a retake — duplicate face cannot proceed.
          setPreview(null);
          onChange(null);
          setStatus("idle");
        }
        return;
      }
      // Cleared — commit the image to the parent form.
      onChange(preview);
      setStatus("confirmed");
      toast.success("Face check passed.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Face check failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setChecking(false);
    }
  }, [preview, onChange]);

  // What to display in the frame
  const displayed = preview ?? value;

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Face verification *</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Required to complete signup. We check this face isn't already registered. This photo also becomes your profile picture.
        </p>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl border border-border bg-background">
        {displayed ? (
          <img src={displayed} alt="Captured selfie" className="h-full w-full object-cover" />
        ) : status === "ready" || status === "starting" ? (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-3/4 w-3/5 rounded-[50%] border-2 border-dashed border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
            <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white">
              {status === "starting" ? "Starting camera…" : "Position your face in the oval"}
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={startCamera}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
          >
            <Video className="h-8 w-8" />
            Tap to start camera
          </button>
        )}
        {checking && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 text-sm font-medium text-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            Checking face…
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {status === "confirmed" && value && (
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 p-2.5 text-xs font-medium text-success">
          <CheckCircle2 className="h-3.5 w-3.5" /> Face check passed. You can submit the form.
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {!displayed && (status === "ready" || status === "starting") && (
          <Button type="button" onClick={capture} disabled={status !== "ready"} variant="hero" size="sm" className="w-full">
            <Camera className="h-4 w-4" /> Capture Photo
          </Button>
        )}
        {status === "preview" && preview && (
          <>
            <Button type="button" onClick={confirmImage} disabled={checking} variant="hero" size="sm" className="w-full">
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {checking ? "Checking…" : "Use this image"}
            </Button>
            <Button type="button" onClick={retake} disabled={checking} variant="outline" size="sm" className="w-full">
              <RefreshCw className="h-4 w-4" /> Retake
            </Button>
          </>
        )}
        {status === "confirmed" && value && (
          <Button type="button" onClick={retake} variant="outline" size="sm" className="w-full">
            <RefreshCw className="h-4 w-4" /> Retake
          </Button>
        )}
        {status === "error" && !displayed && (
          <Button type="button" onClick={startCamera} variant="outline" size="sm" className="w-full">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        )}
      </div>
    </div>
  );
};

export default SignupFaceCapture;
