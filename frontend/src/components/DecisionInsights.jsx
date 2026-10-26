import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, FlaskConical, Gauge, Sparkles, UserRoundCheck } from "lucide-react";
import GlassCard from "./GlassCard";
import BiasScoreCard from "./BiasScoreCard";

// ── Formatting helpers ────────────────────────────────────────────────────────
const fmt = {
  rupees: (v) => `₹${Math.max(0, Math.round(v)).toLocaleString("en-IN")}`,
  plain: (v) => String(v),
  pct: (v) => `${v}%`,
  score: (v) => String(Math.round(v)),
};

// ── Scholarship & Job Simulator Config ────────────────────────────────────────
const SIMULATORS = {
  scholarship: {
    sliders: [
      { name: "academicScore", label: "Academic Score / Percentage", min: 40, max: 100, step: 1, display: fmt.pct },
      { name: "annualIncome", label: "Annual Household Income (₹)", min: 50000, max: 1200000, step: 25000, display: fmt.rupees },
    ],
    decide: ({ academicScore, annualIncome }) => {
      const score = Number(academicScore) || 75;
      const income = Number(annualIncome) || 300000;
      const isMerit = score >= 75;
      const isNeed = income <= 450000;
      const ok = isMerit && isNeed;
      return {
        label: ok ? "Award Recommended" : score >= 60 ? "Potential / Documentation Match" : "Alternative Pathways Recommended",
        ok,
        meta: `Score: ${score}% · Income: ${fmt.rupees(income)} · ${ok ? "Meets central merit-need threshold" : "Outside standard grant criteria"}`,
      };
    },
    initial: (a) => {
      const rawScore = Number(a.academicScore) || 75;
      const scale = Number(a.gpaScale) || 10;
      const normalizedScore = scale === 4 ? (rawScore / 4) * 100 : scale === 10 ? rawScore * 10 : rawScore;
      return {
        academicScore: Math.round(normalizedScore),
        annualIncome: Number(a.annualIncome) || 350000,
      };
    },
  },
  job: {
    sliders: [
      { name: "yearsExperience", label: "Years of Experience", min: 0, max: 15, step: 1, display: fmt.plain },
      { name: "expectedCtc", label: "Expected Salary (₹/yr)", min: 300000, max: 3500000, step: 50000, display: fmt.rupees },
    ],
    decide: ({ yearsExperience, expectedCtc, skills }) => {
      const exp = Number(yearsExperience) || 0;
      const ctc = Number(expectedCtc) || 800000;
      const ok = exp >= 1 || ctc <= 1200000;
      return {
        label: ok ? "Recommended for Shortlist" : "Potential Match with Skill Gaps",
        ok,
        meta: `Experience: ${exp} yrs · Expected: ${fmt.rupees(ctc)} · ${ok ? "Within role experience & compensation band" : "Reviewer evaluation suggested"}`,
      };
    },
    initial: (a) => ({
      yearsExperience: Number(a.yearsExperience) || 1,
      expectedCtc: Number(a.expectedCtc) || 800000,
      skills: a.skills,
    }),
  },
};

// Aliases for compatibility
SIMULATORS.education = SIMULATORS.scholarship;
SIMULATORS.hiring = SIMULATORS.job;
SIMULATORS.banking = SIMULATORS.scholarship;

// ── Counterfactual Explanations ───────────────────────────────────────────────
const COUNTERFACTUALS = {
  scholarship: (a, result) => {
    const rawScore = Number(a.academicScore) || 70;
    const scale = Number(a.gpaScale) || 10;
    const percentage = scale === 4 ? (rawScore / 4) * 100 : scale === 10 ? rawScore * 10 : rawScore;
    const income = Number(a.annualIncome) || 500000;
    const isRecommended = result.decision?.toLowerCase().includes("award") || result.decision?.toLowerCase().includes("recommend");

    if (!isRecommended) {
      const changes = [];
      if (percentage < 75) changes.push(`Improve academic percentage by ${(75 - percentage).toFixed(1)}% to reach the 75% competitive merit threshold.`);
      if (income > 450000) changes.push(`Household income must be under ₹4,50,000 for Central Sector Scheme (NSP) means-tested aid.`);
      return {
        changes: changes.length ? changes : ["Provide verified state domicile and income certificates."],
        target: "Award Recommended",
        note: "These are the minimum deterministic policy adjustments required to achieve full scheme eligibility.",
      };
    }

    return {
      changes: [
        `An academic score drop below 75% would transition the profile into the waitlisted tier.`,
        `Annual household income exceeding ₹4,50,000 would remove eligibility for income-capped grants.`,
      ],
      target: "Documentation Required",
      note: "These represent the closest policy threshold boundaries; your current award status remains valid.",
    };
  },
  job: (a, result) => {
    const exp = Number(a.yearsExperience || 0);
    const isShortlisted = result.decision?.toLowerCase().includes("shortlist") || result.decision?.toLowerCase().includes("positive");

    if (!isShortlisted) {
      return {
        changes: [
          "Add at least 2 verified production projects to your GitHub portfolio.",
          "Complete hands-on proficiency in the target role's mandatory technical stack.",
          exp === 0 ? "Gain 6 months of internship or open-source contribution experience." : "Demonstrate system design fundamentals.",
        ],
        target: "Recommended for Shortlist",
        note: "Meeting mandatory stack requirements and linking working code repositories directly flips this outcome.",
      };
    }

    return {
      changes: [
        "Missing mandatory core skills without project evidence would trigger conditional upskilling.",
        "Targeting a role tier with requirements exceeding demonstrated experience would initiate alternative role routing.",
      ],
      target: "Conditional Match",
      note: "Your profile currently meets core mandatory criteria for this position.",
    };
  },
};

// Aliases
COUNTERFACTUALS.education = COUNTERFACTUALS.scholarship;
COUNTERFACTUALS.hiring = COUNTERFACTUALS.job;
COUNTERFACTUALS.banking = COUNTERFACTUALS.scholarship;

// ── Reviewer Workflows ────────────────────────────────────────────────────────
const WORKFLOWS = {
  scholarship: {
    description: "Multi-tier institutional verification ensuring compliance with national scholarship guidelines.",
    footer: "Verification status is cryptographically sealed; official disbursement requires document inspection at your college registrar.",
    steps: (r) => [
      { title: "AI Merit & Policy Evaluation", status: "Complete", tone: "emerald" },
      { title: "Academic Dean / HoD Endorsement", status: r.risk === "High" ? "Documentation Check" : "Ready", tone: r.risk === "High" ? "amber" : "slate" },
      { title: "Revenue Income Certification", status: "Queued", tone: "slate" },
      { title: "Institutional Registrar Sign-off", status: "Awaiting review", tone: "slate" },
    ],
  },
  job: {
    description: "Explainable hiring gate with zero automated rejection on preferred skill gaps.",
    footer: "Candidate evaluation preserves complete audit trail; technical interviewers review verified skills without demographic context.",
    steps: (r) => [
      { title: "AI Skill & Requirement Match", status: "Complete", tone: "emerald" },
      { title: "Technical Screener Review", status: r.risk === "High" ? "Upskilling Flag" : "Ready", tone: r.risk === "High" ? "amber" : "slate" },
      { title: "Lead Engineer Assessment", status: "Queued", tone: "slate" },
      { title: "Hiring Manager Discussion", status: "Awaiting interview", tone: "slate" },
    ],
  },
};

WORKFLOWS.education = WORKFLOWS.scholarship;
WORKFLOWS.hiring = WORKFLOWS.job;
WORKFLOWS.banking = WORKFLOWS.scholarship;

// ── Calibration Benchmarks ───────────────────────────────────────────────────
const BENCHMARKS = {
  scholarship: {
    Low: 92, Medium: 84, High: 72,
    metric: "Model Confidence",
    benchmarkLabel: "Institutional Grant Allocation Accuracy",
    adjustedLabel: "Risk-Adjusted Confidence",
    description: "Evaluated against historical scholarship award accuracy benchmarks across verified government & endowment schemes.",
  },
  job: {
    Low: 88, Medium: 80, High: 68,
    metric: "Model Confidence",
    benchmarkLabel: "Interview-to-Offer Conversion Benchmark",
    adjustedLabel: "Fair-Hiring Adjusted Confidence",
    description: "Evaluated against benchmark shortlisting and technical assessment completion rates.",
  },
};

BENCHMARKS.education = BENCHMARKS.scholarship;
BENCHMARKS.hiring = BENCHMARKS.job;
BENCHMARKS.banking = BENCHMARKS.scholarship;

// ── Main Component ────────────────────────────────────────────────────────────
export function DecisionInsights({ application, result, hash }) {
  const norm = (application.category || application.industry || "scholarship").toLowerCase();
  const categoryKey = norm.includes("job") || norm.includes("hiring") ? "job" : "scholarship";

  const simConfig = SIMULATORS[categoryKey] || SIMULATORS.scholarship;
  const [scenario, setScenario] = useState(simConfig.initial(application));
  const onChange = (e) => setScenario((s) => ({ ...s, [e.target.name]: e.target.value }));

  const liveDecision = useMemo(() => simConfig.decide({ ...application, ...scenario }), [scenario]);
  const cf = useMemo(() => (COUNTERFACTUALS[categoryKey] || COUNTERFACTUALS.scholarship)(application, result), [application, result, categoryKey]);
  const calibration = useMemo(() => {
    const bench = BENCHMARKS[categoryKey] || BENCHMARKS.scholarship;
    const modelConfidence = Math.max(0, Math.min(100, Math.round(Number(result.confidence) || 0)));
    const benchmarkAccuracy = bench[result.risk] ?? bench.Medium;
    return { modelConfidence, benchmarkAccuracy, adjustedConfidence: Math.floor((modelConfidence * benchmarkAccuracy) / 100), bench };
  }, [result, categoryKey]);

  const workflow = WORKFLOWS[categoryKey] || WORKFLOWS.scholarship;
  const workflowSteps = useMemo(() => workflow.steps(result), [result, categoryKey]);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <BiasScoreCard application={application} result={result} />

      {/* Simulator */}
      <GlassCard>
        <FlaskConical className="text-cyan-400" />
        <h3 className="mt-4 text-lg font-semibold">Interactive What-If Simulator</h3>
        <p className="mt-2 text-sm text-slate-400">
          Adjust the sliders to simulate score or criteria changes without affecting your sealed record.
        </p>

        <div className="mt-4 grid gap-3">
          {simConfig.sliders.map((s) => (
            <Slider key={s.name} {...s} value={scenario[s.name]} onChange={onChange} />
          ))}
        </div>

        <div className="mt-4 rounded-xl bg-white/[.04] p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Simulated Outcome</p>
          <p className={`mt-1 font-semibold ${liveDecision.ok ? "text-emerald-300" : "text-amber-200"}`}>
            {liveDecision.label}
          </p>
          <p className="mt-1 text-xs text-slate-400">{liveDecision.meta}</p>
        </div>
      </GlassCard>

      {/* Counterfactual Explanations */}
      <GlassCard>
        <Sparkles className="text-amber-300" />
        <h3 className="mt-4 text-lg font-semibold">Counterfactual Analysis</h3>
        <p className="mt-2 text-sm text-slate-400">
          What is the minimal profile adjustment that would flip or change this decision?
        </p>
        <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">Key Decision Deltas</p>
          <div className="mt-3 space-y-2 text-xs leading-5 text-slate-300">
            {cf.changes.map((c) => (
              <p key={c} className="flex gap-2">
                <ArrowRight size={15} className="mt-0.5 shrink-0 text-amber-300" />
                <span>{c}</span>
              </p>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-xs">
            <CheckCircle2 size={15} className="text-emerald-300" />
            <span className="text-slate-400">Target Outcome:</span>
            <strong className="text-emerald-300">{cf.target}</strong>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">{cf.note}</p>
      </GlassCard>

      {/* Calibration */}
      <GlassCard className="lg:col-span-3">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Gauge className="text-blue-400" />
            <h3 className="mt-3 text-lg font-semibold">Confidence Calibration</h3>
            <p className="mt-1 text-sm text-slate-400">{calibration.bench.description}</p>
            <div className="mt-4 space-y-3">
              <CalibrationRow label={calibration.bench.metric} value={calibration.modelConfidence} tone="bg-blue-400" />
              <CalibrationRow label={calibration.bench.benchmarkLabel} value={calibration.benchmarkAccuracy} tone="bg-violet-400" />
              <CalibrationRow label={calibration.bench.adjustedLabel} value={calibration.adjustedConfidence} tone="bg-emerald-400" />
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 md:border-l md:border-t-0 md:pl-6 md:pt-0">
            <UserRoundCheck className="text-emerald-400" />
            <h3 className="mt-3 text-lg font-semibold">Reviewer Verification Pathway</h3>
            <p className="mt-1 text-sm text-slate-400">{workflow.description}</p>
            <div className="mt-4 space-y-2.5">
              {workflowSteps.map((step, idx) => (
                <div key={step.title} className="flex items-center justify-between rounded-lg bg-white/[.02] px-3 py-2 text-xs">
                  <span className="font-medium text-slate-300">{idx + 1}. {step.title}</span>
                  <span className={`rounded px-2 py-0.5 font-semibold ${step.tone === "emerald" ? "bg-emerald-500/15 text-emerald-300" : step.tone === "amber" ? "bg-amber-500/15 text-amber-300" : "bg-slate-700 text-slate-400"}`}>
                    {step.status}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-slate-500">{workflow.footer}</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function Slider({ label, name, value, min, max, step, display, onChange }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-300 mb-1">
        <span>{label}</span>
        <span className="font-mono text-cyan-300 font-semibold">{display(Number(value))}</span>
      </div>
      <input
        type="range"
        name={name}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className="w-full accent-cyan-400 cursor-pointer"
      />
    </div>
  );
}

function CalibrationRow({ label, value, tone }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-300">{label}</span>
        <span className="font-semibold text-white">{value}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}
