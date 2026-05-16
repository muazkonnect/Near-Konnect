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
  const detectorRef = useRef<any>(null);
  const detectIntervalRef = useRef<number | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [alignment, setAlignment] = useState<{ ok: boolean; hint: string }>({
    ok: false,
    hint: "Position your face inside the oval",
  });
  const detectorSupported = typeof (window as any).FaceDetector === "function";

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
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }
    detectorRef.current = null;
    setStreaming(false);
    setReady(false);
    setAlignment({ ok: false, hint: "Position your face inside the oval" });
  };

  useEffect(() => () => stopCamera(), []);

  // Face alignment detection loop
  useEffect(() => {
    if (!streaming || !ready || capturedUrl) return;
    const v = videoRef.current;
    if (!v) return;

    if (!detectorSupported) {
      // No native detector — fall back to allowing capture once camera is ready
      setAlignment({ ok: true, hint: "Camera ready" });
      return;
    }

    try {
      detectorRef.current = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    } catch {
      setAlignment({ ok: true, hint: "Camera ready" });
      return;
    }

    const tick = async () => {
      const vid = videoRef.current;
      const det = detectorRef.current;
      if (!vid || !det || vid.readyState < 2) return;
      try {
        const faces = await det.detect(vid);
        if (!faces || faces.length === 0) {
          setAlignment({ ok: false, hint: "No face detected" });
          return;
        }
        if (faces.length > 1) {
          setAlignment({ ok: false, hint: "Only one person in frame" });
          return;
        }
        const box = faces[0].boundingBox;
        const vw = vid.videoWidth, vh = vid.videoHeight;
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        const offX = Math.abs(cx - vw / 2) / vw;
        const offY = Math.abs(cy - vh / 2) / vh;
        const sizeRatio = box.height / vh;

        if (sizeRatio < 0.35) {
          setAlignment({ ok: false, hint: "Move closer" });
        } else if (sizeRatio > 0.85) {
          setAlignment({ ok: false, hint: "Move back a little" });
        } else if (offX > 0.12 || offY > 0.12) {
          setAlignment({ ok: false, hint: "Center your face" });
        } else {
          setAlignment({ ok: true, hint: "Looks good — hold still" });
        }
      } catch {
        // ignore transient detection errors
      }
    };

    detectIntervalRef.current = window.setInterval(tick, 350);
    return () => {
      if (detectIntervalRef.current) {
        clearInterval(detectIntervalRef.current);
        detectIntervalRef.current = null;
      }
    };
  }, [streaming, ready, capturedUrl, detectorSupported]);

  const capture = async () => {
    const v = videoRef.current;
    if (!v || v.readyState < 2 || !v.videoWidth || !v.videoHeight || v.paused || v.ended) {
      // Wait briefly for the stream to become ready
      const waited = await new Promise<boolean>((resolve) => {
        let tries = 0;
        const id = setInterval(() => {
          tries++;
          if (v && v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0 && !v.paused) {
            clearInterval(id);
            resolve(true);
          } else if (tries > 20) {
            clearInterval(id);
            resolve(false);
          }
        }, 100);
      });
      if (!waited) {
        setError("Camera not ready yet. Please wait a moment and try again.");
        return;
      }
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
    // Guard against an all-black frame
    const sample = ctx.getImageData(256, 256, 1, 1).data;
    if (sample[0] === 0 && sample[1] === 0 && sample[2] === 0 && sample[3] === 255) {
      // Try one more frame after a short delay
      await new Promise((r) => setTimeout(r, 150));
      ctx.drawImage(v, sx, sy, size, size, 0, 0, 512, 512);
    }
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

        {/* Face guideline overlay */}
        {streaming && !capturedUrl && (
          <div className="pointer-events-none absolute inset-0">
            {/* Dim outside the oval using SVG mask */}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <mask id="faceMask">
                  <rect width="100" height="100" fill="white" />
                  <ellipse cx="50" cy="50" rx="32" ry="42" fill="black" />
                </mask>
              </defs>
              <rect width="100" height="100" fill="rgba(0,0,0,0.45)" mask="url(#faceMask)" />
              <ellipse
                cx="50" cy="50" rx="32" ry="42"
                fill="none" stroke="#d9ff7a" strokeWidth="0.6"
                strokeDasharray="2 2" vectorEffect="non-scaling-stroke"
              />
              {/* Corner ticks */}
              <g stroke="#d9ff7a" strokeWidth="0.8" vectorEffect="non-scaling-stroke" fill="none">
                <path d="M6 6 H14 M6 6 V14" />
                <path d="M94 6 H86 M94 6 V14" />
                <path d="M6 94 H14 M6 94 V86" />
                <path d="M94 94 H86 M94 94 V86" />
              </g>
            </svg>
            <div
              className={`absolute inset-x-0 bottom-2 text-center text-[11px] font-semibold drop-shadow ${
                alignment.ok ? "text-[#d9ff7a]" : "text-amber-300"
              }`}
            >
              {alignment.hint}
            </div>
          </div>
        )}

        {verifying && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d9ff7a] border-t-transparent" />
            <span className="text-xs font-medium text-[#d9ff7a]">Verifying…</span>
          </div>
        )}
      </div>

      {/* Capture tips */}
      {!capturedUrl && (
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-[#c4c7c7]">
          <li>• Good lighting on face</li>
          <li>• Look straight at camera</li>
          <li>• Remove sunglasses/mask</li>
          <li>• Keep face centered</li>
        </ul>
      )}

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
            disabled={!ready || !alignment.ok}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#d9ff7a] text-sm font-semibold text-[#151f00] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="h-4 w-4" /> {!ready ? "Preparing camera…" : alignment.ok ? "Capture" : alignment.hint}
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
