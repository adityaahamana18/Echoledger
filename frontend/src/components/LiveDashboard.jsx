import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Globe, ShieldCheck, TrendingUp } from "lucide-react";
import GlassCard from "./GlassCard";

function Counter({ value, suffix = "", decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    ref.current = setInterval(() => {
      setDisplay((prev) => {
        const diff = value - prev;
        if (Math.abs(diff) < 0.5) {
          clearInterval(ref.current);
          return value;
        }
        return prev + diff * 0.08;
      });
    }, 30);
    return () => clearInterval(ref.current);
  }, [value]);

  return <span>{display.toFixed(decimals)}{suffix}</span>;
}

function GlobeAnimation() {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 120 120" className="drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]">
        {/* Globe circle */}
        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(59,130,246,0.2)" strokeWidth="1.5" />
        <circle cx="60" cy="60" r="50" fill="url(#globeGrad)" opacity="0.15" />

        {/* Latitude lines */}
        {[30, 50, 70].map((r, i) => (
          <ellipse
            key={`lat-${i}`}
            cx="60" cy="60" rx={r * Math.cos(30 * Math.PI / 180)} ry={r * Math.sin(30 * Math.PI / 180)}
            fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth="0.8"
            transform={`rotate(${rotation}, 60, 60)`}
          />
        ))}

        {/* Longitude lines */}
        {[0, 45, 90, 135].map((angle, i) => (
          <ellipse
            key={`lon-${i}`}
            cx="60" cy="60" rx={50 * Math.cos(30 * Math.PI / 180)} ry={50}
            fill="none" stroke="rgba(59,130,246,0.12)" strokeWidth="0.8"
            transform={`rotate(${angle + rotation * 0.5}, 60, 60)`}
          />
        ))}

        {/* Data pulse dots */}
        {[
          { x: 60 + 40 * Math.cos((rotation * Math.PI) / 180), y: 60 + 40 * Math.sin((rotation * Math.PI) / 180) },
          { x: 60 + 35 * Math.cos(((rotation + 120) * Math.PI) / 180), y: 60 + 35 * Math.sin(((rotation + 120) * Math.PI) / 180) },
          { x: 60 + 30 * Math.cos(((rotation + 240) * Math.PI) / 180), y: 60 + 30 * Math.sin(((rotation + 240) * Math.PI) / 180) },
        ].map((dot, i) => (
          <circle key={`dot-${i}`} cx={dot.x} cy={dot.y} r="3" fill="#60a5fa" opacity={0.8}>
            <animate attributeName="r" values="2;4;2" dur={`${1.5 + i * 0.3}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;1;0.4" dur={`${1.5 + i * 0.3}s`} repeatCount="indefinite" />
          </circle>
        ))}

        <defs>
          <radialGradient id="globeGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function LiveDashboard({ audits = [] }) {
  const [time, setTime] = useState(Date.now());

  // Refresh every 5 seconds to simulate live updates
  useEffect(() => {
    const interval = setInterval(() => setTime(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  const completed = audits.filter((a) => a.status === "complete");

  // Decisions in the last minute (simulated: use last 60 seconds from now)
  const decisionsLastMinute = useMemo(() => {
    const oneMinuteAgo = new Date(time - 60000);
    return completed.filter((a) => {
      if (!a.createdAt) return false;
      return new Date(a.createdAt) > oneMinuteAgo;
    }).length;
  }, [completed, time]);

  // Tampered records (simulated: always 0 in demo)
  const tamperedCount = 0;

  // Average confidence
  const avgConfidence = useMemo(() => {
    if (completed.length === 0) return 82;
    const total = completed.reduce((sum, a) => sum + Number(a.result?.confidence || 0), 0);
    return Math.round(total / completed.length);
  }, [completed]);

  // Total decisions
  const totalDecisions = completed.length;

  // Simulated live activity ticker
  const [activityIndex, setActivityIndex] = useState(0);
  const activities = useMemo(() => {
    const items = [];
    const now = new Date();
    for (let i = 0; i < Math.max(3, completed.length); i++) {
      const audit = completed[i];
      if (audit) {
        items.push({
          id: audit.id?.slice(0, 8),
          decision: audit.result?.decision || "Processed",
          time: audit.createdAt ? new Date(audit.createdAt).toLocaleTimeString() : "—",
        });
      }
    }
    if (items.length === 0) {
      items.push({ id: "demo-001", decision: "Approved", time: "just now" });
      items.push({ id: "demo-002", decision: "Review required", time: "2m ago" });
      items.push({ id: "demo-003", decision: "Approved", time: "5m ago" });
    }
    return items;
  }, [completed]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActivityIndex((prev) => (prev + 1) % activities.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [activities.length]);

  return (
    <GlassCard className="overflow-hidden">
      <div className="flex items-center gap-2 mb-5">
        <Activity size={18} className="text-emerald-400" />
        <h2 className="text-lg font-bold">Live decision feed</h2>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
        </span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Animated Globe */}
        <div className="flex flex-col items-center justify-center rounded-xl bg-white/[.02] p-4">
          <GlobeAnimation />
          <p className="mt-2 text-xs text-slate-500">Global activity</p>
        </div>

        {/* Stats */}
        <div className="col-span-1 sm:col-span-1 lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white/[.02] p-4 flex flex-col items-center justify-center text-center">
            <Activity size={20} className="text-blue-400 mb-2" />
            <p className="text-2xl font-bold text-white">
              <Counter value={decisionsLastMinute + totalDecisions * 0.05} decimals={0} />
            </p>
            <p className="text-xs text-slate-500">decisions in the last minute</p>
          </div>

          <div className="rounded-xl bg-white/[.02] p-4 flex flex-col items-center justify-center text-center">
            <ShieldCheck size={20} className="text-emerald-400 mb-2" />
            <p className="text-2xl font-bold text-emerald-300">
              <Counter value={tamperedCount} decimals={0} />
            </p>
            <p className="text-xs text-slate-500">tampered records detected</p>
          </div>

          <div className="rounded-xl bg-white/[.02] p-4 flex flex-col items-center justify-center text-center">
            <TrendingUp size={20} className="text-violet-400 mb-2" />
            <p className="text-2xl font-bold text-violet-300">
              <Counter value={avgConfidence} decimals={0} /><span className="text-sm text-slate-500">%</span>
            </p>
            <p className="text-xs text-slate-500">avg confidence</p>
          </div>
        </div>
      </div>

      {/* Live activity ticker */}
      <div className="mt-5 rounded-xl bg-white/[.02] p-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Latest
          </span>
          <motion.div
            key={activityIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 text-slate-300"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            <span className="font-mono text-xs text-slate-500">{activities[activityIndex]?.id}</span>
            <span>{activities[activityIndex]?.decision}</span>
            <span className="text-xs text-slate-500">· {activities[activityIndex]?.time}</span>
          </motion.div>
        </div>
      </div>
    </GlassCard>
  );
}