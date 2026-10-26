import { useMemo } from "react";
import { Scale } from "lucide-react";
import GlassCard from "./GlassCard";

// ── Scholarship & Job Bias Configuration ─────────────────────────────────────
const CATEGORY_BIAS = {
  scholarship: {
    dimensions: ["Academic Merit Band", "Income Threshold Alignment", "Course Specialization", "Document Completeness"],
    excluded: "Name, Gender, Race, Caste, Religion, Nationality, Photo",
    signals: (a) => {
      const score = Number(a.academicScore || 0);
      const scale = Number(a.gpaScale || 10);
      const percentage = scale === 4 ? (score / 4) * 100 : scale === 10 ? score * 10 : score;
      const income = Number(a.annualIncome || 0);
      const penalties = [];

      if (percentage < 60) {
        penalties.push({ p: 15, msg: "Sub-60% marks restrict eligibility for central and premier state scholarship schemes." });
      }
      if (income > 450000 && income < 600000) {
        penalties.push({ p: 10, msg: "Near-boundary household income creates cliff-edge eligibility friction for means-tested aid." });
      }
      if (!a.verifiedDocuments || a.verifiedDocuments.length < 2) {
        penalties.push({ p: 8, msg: "Incomplete verification documentation requires manual administrative validation." });
      }
      return penalties;
    },
  },
  job: {
    dimensions: ["Core Skills Match", "Project & Portfolio Depth", "Experience Context", "Compensation Alignment"],
    excluded: "Name, Gender, Age, Race, Religion, Nationality, Photo, Marital Status",
    signals: (a) => {
      const penalties = [];
      const exp = Number(a.yearsExperience || 0);
      const skills = typeof a.skills === "string" ? a.skills.split(",").map((s) => s.trim()) : (a.skills || []);

      if (skills.length < 2) {
        penalties.push({ p: 15, msg: "Sparse skill declarations reduce automated matching accuracy regardless of candidate capability." });
      }
      if (exp === 0 && !a.portfolioUrl) {
        penalties.push({ p: 10, msg: "Entry-level candidate without linked GitHub or portfolio repository requires human code review." });
      }
      if (Number(a.expectedCtc) > 2500000 && exp < 3) {
        penalties.push({ p: 8, msg: "Wide compensation expectations compared to benchmark band may trigger screening review." });
      }
      return penalties;
    },
  },
};

// Aliases for compatibility
CATEGORY_BIAS.education = CATEGORY_BIAS.scholarship;
CATEGORY_BIAS.hiring = CATEGORY_BIAS.job;
CATEGORY_BIAS.banking = CATEGORY_BIAS.scholarship;

function computeBiasScore(application) {
  const norm = (application.category || application.industry || "scholarship").toLowerCase();
  const categoryKey = norm.includes("job") || norm.includes("hiring") ? "job" : "scholarship";
  const config = CATEGORY_BIAS[categoryKey] || CATEGORY_BIAS.scholarship;
  const penalties = config.signals(application);
  const totalPenalty = Math.min(penalties.reduce((s, p) => s + p.p, 0), 60);
  const score = Math.max(0, 95 - totalPenalty);

  return {
    score,
    level: score >= 85 ? "Low" : score >= 65 ? "Moderate" : "High",
    reasons: penalties.slice(0, 3).map((p) => p.msg),
    evaluatedDimensions: config.dimensions,
    excluded: config.excluded,
  };
}

function getScoreColor(score) {
  if (score >= 85) return { text: "text-emerald-300", bg: "bg-emerald-500/15", label: "Low bias risk (Protected attributes excluded)" };
  if (score >= 65) return { text: "text-amber-200", bg: "bg-amber-500/15", label: "Moderate bias risk" };
  return { text: "text-rose-300", bg: "bg-rose-500/15", label: "High bias risk" };
}

export default function BiasScoreCard({ application }) {
  const { score, reasons, evaluatedDimensions, excluded } = useMemo(
    () => computeBiasScore(application),
    [application]
  );
  const color = getScoreColor(score);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * score) / 100;

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <Scale size={18} className="text-violet-400" />
        <h3 className="text-lg font-semibold">Bias & Fairness Audit</h3>
      </div>

      <div className="flex flex-col items-center">
        <div className="relative flex items-center justify-center">
          <svg width="140" height="140" className="-rotate-90">
            <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
            <circle cx="70" cy="70" r={radius} fill="none" stroke={`url(#biasGrad-${score})`} strokeWidth="10"
              strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out" />
            <defs>
              <linearGradient id={`biasGrad-${score}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={score >= 85 ? "#34d399" : score >= 65 ? "#fbbf24" : "#fb7185"} />
                <stop offset="100%" stopColor={score >= 85 ? "#22d3ee" : score >= 65 ? "#f97316" : "#e11d48"} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${color.text}`}>{score}</span>
            <span className="text-[10px] text-slate-500">/ 100</span>
          </div>
        </div>
        <span className={`mt-2 rounded-full px-3 py-1 text-xs font-medium ${color.bg} ${color.text}`}>{color.label}</span>
      </div>

      <div className="mt-5">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Evaluated dimensions</p>
        <div className="flex flex-wrap gap-1.5">
          {evaluatedDimensions.map((dim) => (
            <span key={dim} className="rounded-md bg-white/[.04] px-2 py-1 text-xs text-slate-400">{dim}</span>
          ))}
        </div>
      </div>

      {reasons.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Fairness notes</p>
          {reasons.map((reason, i) => (
            <p key={i} className="text-xs leading-5 text-slate-400">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${color.bg} mr-2`} />
              {reason}
            </p>
          ))}
        </div>
      )}

      <div className="mt-4 border-t border-white/5 pt-3 text-[11px] text-slate-500">
        Protected attributes strictly excluded: {excluded}
      </div>
    </GlassCard>
  );
}
