import { CheckCircle2, Circle } from "lucide-react";

export default function Timeline({ steps, compact = false }) {
  return <ol className="relative ml-2 border-l border-white/10">{steps.map((step, index) => <li key={step.title} className={`${compact ? "pb-5" : "pb-8"} ml-6`}>
    <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900">{step.complete === false ? <Circle size={17} className="text-slate-600" /> : <CheckCircle2 size={17} className="text-emerald-400" />}</span>
    <div className="flex flex-wrap items-center gap-x-3"><h3 className="font-medium">{step.title}</h3>{step.time && <time className="text-xs text-slate-500">{step.time}</time>}</div><p className="mt-1 text-sm leading-6 text-slate-400">{step.detail}</p>
  </li>)}</ol>;
}
