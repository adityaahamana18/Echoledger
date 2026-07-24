import { useMemo } from "react";
import { Scale } from "lucide-react";
import GlassCard from "./GlassCard";

// ── Per-industry bias config ──────────────────────────────────────────────────
const INDUSTRY_BIAS = {
  banking: {
    dimensions: ["Credit score band", "Loan-to-income ratio", "Employment type", "Age group"],
    excluded: "Name, Age (computed), Gender, Religion, Caste",
    signals: (a) => {
      const score = Number(a.creditScore || 0);
      const ratio = Number(a.loanAmount || 0) / Math.max(Number(a.income || 0) * 12, 1);
      const age = Number(a.age || 0);
      const penalties = [];
      if (score < 580) penalties.push({ p: 18, msg: "Applicants with sub-580 credit scores face statistically higher rejection rates" });
      else if (score < 650) penalties.push({ p: 8, msg: "Marginal credit range shows moderate outcome disparity across demographics" });
      if (ratio > 4) penalties.push({ p: 12, msg: "High loan-to-income ratios correlate with uneven approval distribution" });
      else if (ratio > 3) penalties.push({ p: 5, msg: "Elevated exposure ratio may amplify demographic bias signals" });
      if (a.employment === "Contract" || a.employment === "Self-employed") penalties.push({ p: 7, msg: "Non-salaried employment types show variance in automated decision outcomes" });
      if (age > 55) penalties.push({ p: 4, msg: "Older applicants may experience slight confidence degradation in model predictions" });
      return penalties;
    },
  },
  insurance: {
    dimensions: ["Policy type", "Smoking status", "Pre-existing conditions", "Occupation risk tier"],
    excluded: "Name, Age (computed), Gender, Race, Religion, Marital status",
    signals: (a) => {
      const penalties = [];
      if (a.smokingStatus === "Smoker") penalties.push({ p: 20, msg: "Smokers face significantly higher premium rates and rejection likelihood" });
      else if (a.smokingStatus === "Ex-smoker") penalties.push({ p: 8, msg: "Ex-smokers may face residual risk scoring disparities" });
      if (a.preExistingConditions && a.preExistingConditions !== "None") penalties.push({ p: 15, msg: `Pre-existing condition (${a.preExistingConditions}) increases underwriting scrutiny` });
      if (a.policyType === "Life") penalties.push({ p: 5, msg: "Life policies apply stricter actuarial thresholds that may correlate with demographic factors" });
      return penalties;
    },
  },
  hiring: {
    dimensions: ["Years of experience", "Education level", "Skills match", "CTC gap"],
    excluded: "Name, Gender, Age, Race, Religion, Nationality, Photo",
    signals: (a) => {
      const penalties = [];
      const exp = Number(a.yearsExperience || 0);
      const ctcGap = Number(a.expectedCTC || 0) - Number(a.currentCTC || 0);
      if (exp < 2) penalties.push({ p: 15, msg: "Low experience candidates face higher automated rejection rates regardless of skill quality" });
      if (a.education === "High School" || a.education === "Diploma") penalties.push({ p: 10, msg: "Degree-based filtering may disadvantage skilled candidates without formal qualifications" });
      if (ctcGap > 500000) penalties.push({ p: 8, msg: "Large CTC expectation gaps may introduce economic bias in shortlisting" });
      if (!a.skills || a.skills.split(",").length < 2) penalties.push({ p: 7, msg: "Sparse skill declarations reduce match scores disproportionately for non-traditional backgrounds" });
      return penalties;
    },
  },
  healthcare: {
    dimensions: ["Insurance coverage", "Urgency level", "Referral source", "Condition severity"],
    excluded: "Name, Gender, Race, Religion, Nationality, Socioeconomic status",
    signals: (a) => {
      const penalties = [];
      if (a.insuranceCoverage === "No") penalties.push({ p: 20, msg: "Uninsured patients face statistically higher treatment deferral rates" });
      else if (a.insuranceCoverage === "Partial") penalties.push({ p: 10, msg: "Partial coverage may introduce financial bias in treatment prioritisation" });
      if (a.referralSource === "Self-referred") penalties.push({ p: 8, msg: "Self-referred patients may receive lower priority scores than GP-referred patients" });
      if (a.urgency === "Routine") penalties.push({ p: 5, msg: "Routine cases may be deprioritised in ways that correlate with socioeconomic factors" });
      return penalties;
    },
  },
  government: {
    dimensions: ["Income threshold", "Household size", "Employment status", "Geographic region"],
    excluded: "Name, Gender, Race, Religion, Caste, Political affiliation",
    signals: (a) => {
      const penalties = [];
      const perCapita = Number(a.annualIncome || 0) / Math.max(Number(a.householdSize || 1), 1);
      if (perCapita > 40000 && perCapita < 60000) penalties.push({ p: 10, msg: "Near-threshold income levels create cliff-edge eligibility disparities" });
      if (a.employmentStatus === "Self-employed") penalties.push({ p: 8, msg: "Self-employed applicants face income verification challenges that may bias outcomes" });
      if (!a.state?.trim()) penalties.push({ p: 5, msg: "Missing geographic data may affect scheme-specific eligibility scoring" });
      return penalties;
    },
  },
  education: {
    dimensions: ["GPA band", "Entrance score percentile", "Financial need", "Institution tier"],
    excluded: "Name, Gender, Race, Religion, Caste, Nationality, Family background",
    signals: (a) => {
      const penalties = [];
      const gpa = Number(a.gpa || 0);
      const entrance = Number(a.entranceScore || 0);
      if (gpa < 6) penalties.push({ p: 15, msg: "Low GPA applicants face higher rejection rates even when entrance scores are strong" });
      if (entrance < 50) penalties.push({ p: 12, msg: "Below-median entrance scores correlate with socioeconomic disadvantage in test access" });
      if (a.financialNeed === "Yes") penalties.push({ p: 6, msg: "Financial need declarations may inadvertently signal socioeconomic background to the model" });
      return penalties;
    },
  },
  "customer-support": {
    dimensions: ["Issue severity", "Previous ticket count", "Product tier", "Resolution type"],
    excluded: "Name, Gender, Race, Religion, Nationality, Account value",
    signals: (a) => {
      const penalties = [];
      const tickets = Number(a.previousTickets || 0);
      if (tickets >= 5) penalties.push({ p: 12, msg: "High repeat-contact customers may be deprioritised despite legitimate unresolved issues" });
      if (a.severity === "Low") penalties.push({ p: 8, msg: "Low-severity classifications may under-represent issues from less assertive customers" });
      if (a.issueType === "Refund") penalties.push({ p: 6, msg: "Refund requests show variance in resolution rates across customer segments" });
      return penalties;
    },
  },
};

function computeBiasScore(application) {
  const industry = application.industry || "banking";
  const config = INDUSTRY_BIAS[industry] || INDUSTRY_BIAS.banking;
  const penalties = config.signals(application);
  const totalPenalty = Math.min(penalties.reduce((s, p) => s + p.p, 0), 70);
  const score = Math.max(0, 90 - totalPenalty);
  return {
    score,
    level: score >= 80 ? "Low" : score >= 60 ? "Moderate" : "High",
    reasons: penalties.slice(0, 3).map((p) => p.msg),
    evaluatedDimensions: config.dimensions,
    excluded: config.excluded,
  };
}

function getScoreColor(score) {
  if (score >= 80) return { text: "text-emerald-300", bg: "bg-emerald-500/15", label: "Low bias risk" };
  if (score >= 60) return { text: "text-amber-200", bg: "bg-amber-500/15", label: "Moderate bias risk" };
  return { text: "text-rose-300", bg: "bg-rose-500/15", label: "High bias risk" };
}

export default function BiasScoreCard({ application }) {
  const { score, level, reasons, evaluatedDimensions, excluded } = useMemo(
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
        <h3 className="text-lg font-semibold">Bias Score</h3>
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
                <stop offset="0%" stopColor={score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : "#fb7185"} />
                <stop offset="100%" stopColor={score >= 80 ? "#22d3ee" : score >= 60 ? "#f97316" : "#e11d48"} />
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
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Bias indicators</p>
          {reasons.map((reason, i) => (
            <p key={i} className="text-xs leading-5 text-slate-400">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${color.bg} mr-2`} />
              {reason}
            </p>
          ))}
        </div>
      )}

      <div className="mt-4 border-t border-white/5 pt-3 text-[11px] text-slate-500">
        Protected attributes excluded from model: {excluded}
      </div>
    </GlassCard>
  );
}
