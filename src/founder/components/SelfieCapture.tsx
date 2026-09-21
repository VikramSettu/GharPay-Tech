import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}

export function SelfieCapture({ open, title, subtitle, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [snap, setSnap] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setReady(false);
    setSnap(null);
    setStarting(true);

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (e: any) {
        setError(e?.message || "Camera permission denied");
      } finally {
        setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  if (!open) return null;

  const handleCapture = () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    const size = Math.min(v.videoWidth, v.videoHeight);
    c.width = 480;
    c.height = 480;
    const sx = (v.videoWidth - size) / 2;
    const sy = (v.videoHeight - size) / 2;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    // mirror selfie
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, sx, sy, size, size, 0, 0, c.width, c.height);
    const data = c.toDataURL("image/jpeg", 0.78);
    setSnap(data);
  };

  const handleConfirm = () => {
    if (snap) onCapture(snap);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display font-semibold text-base">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="aspect-square bg-black relative overflow-hidden">
          {!snap && (
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          )}
          {snap && <img src={snap} alt="selfie preview" className="w-full h-full object-cover" />}
          {(starting || (!ready && !error && !snap)) && (
            <div className="absolute inset-0 flex items-center justify-center text-white/80">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/90 bg-black/70">
              {error}. Allow camera access in your browser to continue.
            </div>
          )}
          <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/60 text-[10px] uppercase tracking-widest text-white/80 font-mono">
            Live · Front cam
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="p-4 flex items-center gap-2">
          {!snap && (
            <Button onClick={handleCapture} disabled={!ready} className="flex-1">
              <Camera className="h-4 w-4 mr-2" /> Capture selfie
            </Button>
          )}
          {snap && (
            <>
              <Button variant="outline" onClick={() => setSnap(null)} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" /> Retake
              </Button>
              <Button onClick={handleConfirm} className="flex-1">
                Confirm
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
