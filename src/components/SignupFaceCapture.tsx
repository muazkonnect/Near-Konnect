import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, AlertCircle, CheckCircle2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "idle" | "starting" | "ready" | "captured" | "error";

interface SignupFaceCaptureProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

const SignupFaceCapture = ({ value, onChange }: SignupFaceCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<Status>(value ? "captured" : "idle");
  const [error, setError] = useState<string | null>(null);

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
    onChange(dataUrl);
    setStatus("captured");
    stopStream();
  }, [onChange, stopStream]);

  const retake = useCallback(() => {
    onChange(null);
    setError(null);
    startCamera();
  }, [onChange, startCamera]);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Face verification *</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Required to complete signup. We use this only to confirm it's really you. This photo also becomes your profile picture.
        </p>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl border border-border bg-background">
        {value ? (
          <img src={value} alt="Captured selfie" className="h-full w-full object-cover" />
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
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {value && (
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 p-2.5 text-xs font-medium text-success">
          <CheckCircle2 className="h-3.5 w-3.5" /> Photo captured. You can submit the form.
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {!value && (status === "ready" || status === "starting") && (
          <Button type="button" onClick={capture} disabled={status !== "ready"} variant="hero" size="sm" className="w-full">
            <Camera className="h-4 w-4" /> Capture Photo
          </Button>
        )}
        {value && (
          <Button type="button" onClick={retake} variant="outline" size="sm" className="w-full">
            <RefreshCw className="h-4 w-4" /> Retake
          </Button>
        )}
        {status === "error" && !value && (
          <Button type="button" onClick={startCamera} variant="outline" size="sm" className="w-full">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        )}
      </div>
    </div>
  );
};

export default SignupFaceCapture;
