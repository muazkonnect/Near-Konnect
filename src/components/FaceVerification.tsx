import { useEffect, useRef, useState } from "react";
import { Camera, Check, RefreshCw, ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  onVerified: (dataUrl: string, blob: Blob) => void;
  verifiedDataUrl: string | null;
}

const FaceVerification = ({ onVerified, verifiedDataUrl }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [verifying, setVerifying] = useState(false);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      setStreaming(true);
    } catch (e) {
      console.error("getUserMedia failed", e);
      setError("Camera access denied. Please enable camera permissions and try again.");
    }
  };

  // Attach stream once the <video> element is mounted
  useEffect(() => {
    const v = videoRef.current;
    if (!streaming || !v || !streamRef.current) return;
    setReady(false);
    v.srcObject = streamRef.current;
    const onReady = () => {
      if (v.videoWidth > 0 && v.videoHeight > 0 && v.readyState >= 2) setReady(true);
    };
    v.addEventListener("loadedmetadata", onReady);
    v.addEventListener("loadeddata", onReady);
    v.addEventListener("playing", onReady);
    v.play().then(onReady).catch((err) => console.error("video play failed", err));
    return () => {
      v.removeEventListener("loadedmetadata", onReady);
      v.removeEventListener("loadeddata", onReady);
      v.removeEventListener("playing", onReady);
    };
  }, [streaming]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  };

  useEffect(() => () => stopCamera(), []);

  const capture = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth || !v.videoHeight) {
      setError("Camera not ready yet. Please wait a moment and try again.");
      return;
    }
    const size = Math.min(v.videoWidth, v.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) { setError("Capture failed"); return; }
    const sx = (v.videoWidth - size) / 2;
    const sy = (v.videoHeight - size) / 2;
    ctx.drawImage(v, sx, sy, size, size, 0, 0, 512, 512);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob((b) => res(b), "image/jpeg", 0.85),
    );
    if (!blob) { setError("Capture failed"); return; }
    stopCamera();
    setCapturedUrl(dataUrl);
    setCapturedBlob(blob);
    await verify(dataUrl, blob);
  };

  const verify = async (dataUrl: string, blob: Blob) => {
    setVerifying(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("verify-face-human", {
        body: { imageBase64: dataUrl },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      if (data?.isHuman) {
        onVerified(dataUrl, blob);
      } else {
        setError(data?.reason || "We couldn't detect a real human face. Please try again.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const retake = () => {
    setCapturedUrl(null);
    setCapturedBlob(null);
    setError(null);
    startCamera();
  };

  if (verifiedDataUrl) {
    return (
      <div className="rounded-xl border border-[#d9ff7a]/40 bg-[#d9ff7a]/5 p-4">
        <div className="flex items-center gap-3">
          <img
            src={verifiedDataUrl}
            alt="Verified"
            className="h-16 w-16 rounded-full object-cover border-2 border-[#d9ff7a]"
          />
          <div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-[#d9ff7a]">
              <ShieldCheck className="h-4 w-4" /> Face Verified
            </div>
            <p className="text-xs text-[#c4c7c7] mt-0.5">
              This will be your permanent profile photo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#444748]/30 bg-[#1a1a1a]/80 p-5 backdrop-blur-md">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-[#d9ff7a]" />
        <h3 className="text-base font-semibold">Verify You're Human</h3>
      </div>
      <p className="mb-4 text-xs text-[#c4c7c7]">
        Near Konnect is for real humans only. Capture a clear, front-facing photo. It becomes
        your permanent, unchangeable profile picture.
      </p>

      <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl border-2 border-dashed border-[#444748]/50 bg-[#0f0f0f]">
        {capturedUrl ? (
          <img src={capturedUrl} alt="Captured" className="h-full w-full object-cover" />
        ) : streaming ? (
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#c4c7c7]">
            <Camera className="h-10 w-10 opacity-40" />
          </div>
        )}
        {verifying && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d9ff7a] border-t-transparent" />
            <span className="text-xs font-medium text-[#d9ff7a]">Verifying…</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {!streaming && !capturedUrl && (
          <button
            type="button"
            onClick={startCamera}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#d9ff7a] text-sm font-semibold text-[#151f00]"
          >
            <Camera className="h-4 w-4" /> Start Camera
          </button>
        )}
        {streaming && (
          <button
            type="button"
            onClick={capture}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#d9ff7a] text-sm font-semibold text-[#151f00]"
          >
            <Check className="h-4 w-4" /> Capture
          </button>
        )}
        {capturedUrl && !verifying && (
          <button
            type="button"
            onClick={retake}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#444748]/40 text-sm font-semibold text-[#e5e2e1]"
          >
            <RefreshCw className="h-4 w-4" /> Retake
          </button>
        )}
      </div>
    </div>
  );
};

export default FaceVerification;
