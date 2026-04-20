import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { detectFaceDescriptor, loadFaceModels } from "@/lib/faceApi";

type Status = "idle" | "starting" | "ready" | "captured" | "submitting" | "success" | "error";

interface FaceVerificationProps {
  onVerified: () => void;
  onSkip?: () => void;
}

const FaceVerification = ({ onVerified, onSkip }: FaceVerificationProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

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
    loadFaceModels().catch(() => {/* will retry on submit */});
    startCamera();
    return () => stopStream();
  }, [startCamera, stopStream]);

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
    // mirror horizontally to match preview
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setPreview(dataUrl);
    setStatus("captured");
    stopStream();
  }, [stopStream]);

  const retake = useCallback(() => {
    setPreview(null);
    setError(null);
    startCamera();
  }, [startCamera]);

  const submit = useCallback(async () => {
    if (!preview || status === "submitting") return;
    setStatus("submitting");
    setError(null);
    try {
      const detection = await detectFaceDescriptor(preview);
      if (detection.count === 0) throw new Error("No face detected. Please retake.");
      if (detection.count > 1) throw new Error("Multiple faces detected. Only you should be in frame.");

      const { data, error: fnError } = await supabase.functions.invoke("verify-face", {
        body: { image: preview, descriptor: detection.descriptor },
      });
      if (fnError) {
        // Try to extract structured error message returned in body
        let message = fnError.message;
        try {
          const ctx = (fnError as unknown as { context?: { json?: () => Promise<{ error?: string }> } }).context;
          if (ctx?.json) {
            const j = await ctx.json();
            if (j?.error) message = j.error;
          }
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }
      if ((data as { error?: string })?.error) {
        throw new Error((data as { error: string }).error);
      }
      setStatus("success");
      setTimeout(() => onVerified(), 800);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Verification failed";
      setError(msg);
      setStatus("error");
    }
  }, [preview, status, onVerified]);

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Face Verification</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Take a quick selfie to confirm it's really you.
        </p>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-muted">
        {!preview ? (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            {/* Face guide overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-3/4 w-3/5 rounded-[50%] border-2 border-dashed border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
            <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
              {status === "starting" && "Starting camera…"}
              {status === "ready" && "Position your face in the oval"}
              {status === "error" && "Camera unavailable"}
            </div>
          </>
        ) : (
          <img src={preview} alt="Captured selfie" className="h-full w-full object-cover" />
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {status === "success" && (
        <div className="flex items-center gap-2 rounded-2xl border border-success/30 bg-success/5 p-3 text-sm font-medium text-success">
          <CheckCircle2 className="h-4 w-4" /> Verified! Continuing…
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        We use your photo only for verification purposes. It is stored securely and never shared.
      </p>

      <div className="flex flex-col gap-2">
        {!preview && status !== "success" && (
          <Button
            type="button"
            onClick={capture}
            disabled={status !== "ready"}
            variant="hero"
            size="lg"
            className="w-full"
          >
            <Camera className="h-4 w-4" /> Capture Photo
          </Button>
        )}

        {preview && status !== "success" && (
          <>
            <Button
              type="button"
              onClick={submit}
              disabled={status === "submitting"}
              variant="hero"
              size="lg"
              className="w-full"
            >
              {status === "submitting" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" /> Use This Photo
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={retake}
              disabled={status === "submitting"}
              variant="outline"
              size="lg"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4" /> Retake
            </Button>
          </>
        )}

        {status === "error" && !preview && (
          <Button type="button" onClick={startCamera} variant="outline" size="lg" className="w-full">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        )}

        {onSkip && status !== "success" && (
          <button
            type="button"
            onClick={onSkip}
            className="mt-1 text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Sign out and start over
          </button>
        )}
      </div>
    </div>
  );
};

export default FaceVerification;
