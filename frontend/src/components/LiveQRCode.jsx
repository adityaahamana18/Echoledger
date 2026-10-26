import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Smartphone } from "lucide-react";
import GlassCard from "./GlassCard";

export default function LiveQRCode({ decisionId, size = 160 }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!canvasRef.current || !decisionId) return;
    // Use the deployed URL while developing locally, so a phone can open the QR link.
    const baseUrl = (import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, "");
    const verifyUrl = `${baseUrl}/verify/${decisionId}`;
    setError("");
    QRCode.toCanvas(canvasRef.current, verifyUrl, {
      width: size,
      margin: 2,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    }).catch(() => setError("Unable to generate QR code."));
  }, [decisionId, size]);

  return (
    <GlassCard className="flex flex-col items-center text-center">
      <div className="flex items-center gap-2 mb-2">
        <Smartphone size={16} className="text-cyan-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Scan to verify
        </span>
      </div>
      <canvas
        ref={canvasRef}
        className="rounded-xl"
        style={{ width: size, height: size }}
      />
      {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
      <p className="mt-3 text-xs text-slate-500">
        Point your phone camera at this QR code to instantly verify the decision
        record's integrity.
      </p>
    </GlassCard>
  );
}
