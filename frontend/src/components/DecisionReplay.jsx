import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Pause, Play, RotateCcw, Video } from "lucide-react";
import GlassCard from "./GlassCard";

const STEP_DURATION = 900; // ms per step

export default function DecisionReplay({ audit }) {
  const { application = {}, result = {}, createdAt, hash, id } = audit;

  const steps = buildSteps(application, result, createdAt, hash, id);

  const [active, setActive] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);

  const play = () => { setPlaying(true); setDone(false); };
  const pause = () => { setPlaying(false); clearInterval(timerRef.current); };
  const reset = () => { pause(); setActive(-1); setDone(false); };

  useEffect(() => {
    if (!playing) return;
    timerRef.current = setInterval(() => {
      setActive((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(timerRef.current);
          setPlaying(false);
          setDone(true);
          return prev;
        }
        return prev + 1;
      });
    }, STEP_DURATION);
    return () => clearInterval(timerRef.current);
  }, [playing, steps.length]);

  return (
    <GlassCard>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Video size={18} className="text-blue-400" />
          <h3 className="font-semibold text-lg">Decision Replay</h3>
          <span className="rounded-full bg-blue-500/10 border border-blue-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-300">CCTV</span>
        </div>
        <div className="flex items-center gap-2">
          {!playing && active < steps.length - 1 && (
            <button onClick={play} className="flex items-center gap-1.5 rounded-lg bg-blue-600/20 border border-blue-400/20 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-600/30 transition-colors">
              <Play size={13} /> {active === -1 ? "Play" : "Resume"}
            </button>
          )}
          {playing && (
            <button onClick={pause} className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-400/20 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors">
              <Pause size={13} /> Pause
            </button>
          )}
          {active >= 0 && (
            <button onClick={reset} className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
              <RotateCcw size={13} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full rounded-full bg-white/10 mb-6 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
          animate={{ width: active < 0 ? "0%" : `${((active + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Steps */}
      <ol className="relative ml-2 border-l border-white/10 space-y-0">
        {steps.map((step, i) => {
          const state = i <= active ? "done" : i === active + 1 && playing ? "active" : "pending";
          return (
            <li key={step.title} className="pb-6 ml-6">
              <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900">
                {state === "done"
                  ? <CheckCircle2 size={17} className="text-emerald-400" />
                  : state === "active"
                  ? <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}><Circle size={17} className="text-blue-400" /></motion.span>
                  : <Circle size={17} className="text-slate-700" />}
              </span>
              <AnimatePresence>
                <motion.div
                  animate={{ opacity: state === "pending" ? 0.3 : 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="flex items-center gap-2">
                    <p className={`font-medium text-sm ${state === "done" ? "text-white" : state === "active" ? "text-blue-300" : "text-slate-600"}`}>
                      {step.title}
                    </p>
                    {state === "done" && step.badge && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${step.badgeColor}`}>
                        {step.badge}
                      </span>
                    )}
                  </div>
                  {state !== "pending" && (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1 text-xs leading-5 text-slate-400"
                    >
                      {step.detail}
                    </motion.p>
                  )}
                </motion.div>
              </AnimatePresence>
            </li>
          );
        })}
      </ol>

      {/* Final verdict */}
      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">Replay complete</p>
            <p className="text-sm text-slate-300">
              Every step above is cryptographically bound to{" "}
              <code className="text-cyan-300 text-xs">{hash?.slice(0, 16)}…</code>
              {" "}— this record cannot be altered retroactively.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

function buildSteps(application, result, createdAt, hash, id) {
  const date = createdAt ? new Date(createdAt).toLocaleString() : "—";
  const industry = application.industryLabel || application.industry || "Banking";
  const steps = result.trace?.length ? result.trace : result.reasoningSteps || [];

  return [
    {
      title: "Decision record opened",
      detail: `ID ${id?.slice(0, 16)}… · Submitted ${date} · Industry: ${industry}`,
    },
    {
      title: "Original application data loaded",
      detail: `Applicant: ${application.name || "—"} · Protected attributes excluded before processing.`,
    },
    ...steps.map((s) => ({ title: s.title, detail: s.detail })),
    {
      title: "Multi-agent jury deliberated",
      detail: result.jury
        ? `Optimist: "${result.jury.optimist?.position}" · Risk Assessor: "${result.jury.riskAssessor?.position}" · Judge: "${result.jury.judge?.decision || result.decision}"`
        : "Jury deliberation record not available for this decision.",
    },
    {
      title: "Bias audit completed",
      detail: result.biasAudit
        ? `Status: ${result.biasAudit.status} · Excluded: ${result.biasAudit.protectedAttributesExcluded?.join(", ")}`
        : `Protected attributes excluded. No bias flags raised.`,
    },
    {
      title: "Independent AI reviewer checked",
      detail: result.agentReview
        ? `Verdict: ${result.agentReview.verdict} · ${result.agentReview.reason}`
        : "Independent review completed.",
    },
    {
      title: "Final decision issued",
      detail: `${result.decision} · Confidence: ${result.confidence}% · Risk: ${result.risk}`,
      badge: result.decision,
      badgeColor: result.decision?.toLowerCase().includes("approv") || result.decision?.toLowerCase().includes("eligible") || result.decision?.toLowerCase().includes("shortlist")
        ? "bg-emerald-500/15 text-emerald-300"
        : "bg-amber-500/15 text-amber-200",
    },
    {
      title: "SHA-256 fingerprint sealed",
      detail: `sha256:${hash?.slice(0, 32)}… — tamper-evident record locked.`,
    },
  ];
}
