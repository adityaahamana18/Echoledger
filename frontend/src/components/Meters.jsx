import { percent } from "../utils/audit";

export function ConfidenceMeter({ value }) {
  return <Meter label="Model confidence" value={value} tone="from-blue-500 to-violet-500" />;
}

export function RiskMeter({ risk }) {
  const levels = { Low: 24, Medium: 56, High: 84 };
  const value = levels[risk] ?? 50;
  return <Meter label="Risk exposure" value={value} suffix={risk || "Medium"} tone={value < 40 ? "from-emerald-500 to-cyan-400" : value < 70 ? "from-amber-400 to-orange-500" : "from-rose-500 to-red-600"} />;
}

function Meter({ label, value, suffix, tone }) {
  return <div><div className="mb-2 flex justify-between text-sm"><span className="text-slate-400">{label}</span><span className="font-semibold text-white">{suffix || percent(value)}</span></div>
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full bg-gradient-to-r ${tone}`} style={{ width: `${Math.max(4, Math.min(100, value))}%` }} /></div></div>;
}
