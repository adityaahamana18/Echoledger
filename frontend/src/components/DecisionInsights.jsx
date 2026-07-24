import { useMemo, useState } from "react";
import { ArrowDown, ArrowRight, Bot, CheckCircle2, FlaskConical, Gauge, Scale, ShieldCheck, Sparkles, UserRoundCheck } from "lucide-react";
import GlassCard from "./GlassCard";
import BiasScoreCard from "./BiasScoreCard";

// ── Formatting helpers ────────────────────────────────────────────────────────
const fmt = {
  rupees: (v) => `₹${Math.max(0, Math.round(v)).toLocaleString("en-IN")}`,
  plain: (v) => String(v),
  pct: (v) => `${v}%`,
  score: (v) => String(Math.round(v)),
};

// ── Industry simulator config ─────────────────────────────────────────────────
const SIMULATORS = {
  banking: {
    sliders: [
      { name: "income",      label: "Monthly salary",   min: 10000,  max: 200000,  step: 1000,  display: fmt.rupees },
      { name: "creditScore", label: "Credit score",     min: 300,    max: 900,     step: 1,     display: fmt.plain },
      { name: "loanAmount",  label: "Loan amount",      min: 50000,  max: 5000000, step: 50000, display: fmt.rupees },
    ],
    decide: ({ income, creditScore, loanAmount }) => {
      const ratio = Number(loanAmount) / Math.max(Number(income) * 12, 1);
      const ok = Number(creditScore) >= 650 && ratio <= 5;
      return { label: ok ? "Approved" : "Human review required", ok, meta: `Model confidence: ${Math.max(58, Math.min(96, Math.round(Number(creditScore) / 10 - ratio * 2)))}% · Loan-to-income: ${ratio.toFixed(1)}×` };
    },
    initial: (a) => ({ income: a.income, creditScore: a.creditScore, loanAmount: a.loanAmount }),
  },
  insurance: {
    sliders: [
      { name: "coverageAmount", label: "Coverage amount", min: 100000, max: 10000000, step: 100000, display: fmt.rupees },
    ],
    decide: ({ smokingStatus, preExistingConditions, coverageAmount }) => {
      const highRisk = smokingStatus === "Smoker" || (preExistingConditions && preExistingConditions !== "None");
      const ok = !highRisk || Number(coverageAmount) < 500000;
      return { label: ok ? "Policy eligible" : "Review required", ok, meta: `Coverage: ${fmt.rupees(Number(coverageAmount))} · Risk: ${highRisk ? "Elevated" : "Standard"}` };
    },
    initial: (a) => ({ smokingStatus: a.smokingStatus, preExistingConditions: a.preExistingConditions, coverageAmount: a.coverageAmount }),
  },
  hiring: {
    sliders: [
      { name: "yearsExperience", label: "Years of experience", min: 0, max: 30, step: 1, display: fmt.plain },
      { name: "expectedCTC",     label: "Expected CTC (₹/yr)", min: 300000, max: 5000000, step: 100000, display: fmt.rupees },
    ],
    decide: ({ yearsExperience, education, skills, expectedCTC }) => {
      const score = Number(yearsExperience) * 10 + (education === "Master's" || education === "PhD" ? 20 : 0) + (skills?.split(",").length || 0) * 5;
      const ok = score >= 40;
      return { label: ok ? "Shortlisted" : "Not shortlisted", ok, meta: `Profile score: ${Math.min(100, score)} · Expected CTC: ${fmt.rupees(Number(expectedCTC))}` };
    },
    initial: (a) => ({ yearsExperience: a.yearsExperience, education: a.education, skills: a.skills, expectedCTC: a.expectedCTC }),
  },
  healthcare: {
    sliders: [],
    decide: ({ urgency, insuranceCoverage }) => {
      const ok = urgency === "Emergency" || urgency === "Urgent" || insuranceCoverage === "Yes";
      return { label: ok ? "Treatment approved" : "Review required", ok, meta: `Urgency: ${urgency} · Insurance: ${insuranceCoverage}` };
    },
    initial: (a) => ({ urgency: a.urgency, insuranceCoverage: a.insuranceCoverage }),
  },
  government: {
    sliders: [
      { name: "annualIncome",  label: "Annual income",   min: 0,      max: 500000, step: 5000, display: fmt.rupees },
      { name: "householdSize", label: "Household size",  min: 1,      max: 12,     step: 1,    display: fmt.plain },
    ],
    decide: ({ annualIncome, householdSize, employmentStatus }) => {
      const perCapita = Number(annualIncome) / Math.max(Number(householdSize), 1);
      const ok = perCapita < 50000 || employmentStatus === "Unemployed";
      return { label: ok ? "Eligible" : "Not eligible", ok, meta: `Per-capita income: ${fmt.rupees(perCapita)} · Status: ${employmentStatus}` };
    },
    initial: (a) => ({ annualIncome: a.annualIncome, householdSize: a.householdSize, employmentStatus: a.employmentStatus }),
  },
  education: {
    sliders: [
      { name: "gpa",           label: "GPA (out of 10)",       min: 0,  max: 10,  step: 0.1, display: fmt.plain },
      { name: "entranceScore", label: "Entrance score (pct.)", min: 0,  max: 100, step: 1,   display: fmt.pct },
    ],
    decide: ({ gpa, entranceScore }) => {
      const score = Number(gpa) * 10 + Number(entranceScore) * 0.3;
      const ok = score >= 90;
      return { label: ok ? "Admitted" : "Waitlisted", ok, meta: `Combined score: ${Math.round(score)} · GPA: ${gpa} · Entrance: ${entranceScore}%` };
    },
    initial: (a) => ({ gpa: a.gpa, entranceScore: a.entranceScore }),
  },
  "customer-support": {
    sliders: [
      { name: "previousTickets", label: "Previous tickets", min: 0, max: 20, step: 1, display: fmt.plain },
    ],
    decide: ({ severity, previousTickets }) => {
      const escalate = severity === "Critical" || severity === "High" || Number(previousTickets) >= 3;
      return { label: escalate ? "Escalate to senior agent" : "Standard resolution", ok: !escalate, meta: `Severity: ${severity} · Previous tickets: ${previousTickets}` };
    },
    initial: (a) => ({ severity: a.severity, previousTickets: a.previousTickets }),
  },
};

// ── Industry counterfactual config ────────────────────────────────────────────
const COUNTERFACTUALS = {
  banking: (a, result) => {
    const score = Number(a.creditScore || 0), income = Number(a.income || 0), loan = Number(a.loanAmount || 0);
    const minIncome = Math.ceil(loan / 60), maxLoan = Math.floor(income * 60);
    const approved = result.decision?.toLowerCase().includes("approv");
    if (!approved) {
      const changes = [];
      const gap = Math.max(0, 650 - score);
      if (gap) changes.push(`Raise credit score by ${gap} points to 650.`);
      const incGap = Math.max(0, minIncome - income);
      if (incGap) changes.push(`Increase monthly income by ${fmt.rupees(incGap)} to ${fmt.rupees(minIncome)}.`);
      const loanRed = Math.max(0, loan - maxLoan);
      if (loanRed) changes.push(`Or reduce loan by ${fmt.rupees(loanRed)} to ${fmt.rupees(maxLoan)}.`);
      return { changes, target: "Approved", note: "All applicable threshold changes are required to flip this policy outcome." };
    }
    return { changes: [`A credit score drop of ${Math.max(0, score - 649)} points (to 649) would trigger review.`, `A monthly income drop of ${fmt.rupees(Math.max(0, income - Math.floor(loan / 60)) + 1)} would exceed the affordability threshold.`], target: "Human review", note: "These are the closest policy boundaries; the original decision remains unchanged." };
  },
  insurance: (a, result) => {
    const eligible = result.decision?.toLowerCase().includes("eligible");
    if (!eligible) return { changes: ["Switch smoking status to Non-smoker.", "Resolve or declare no pre-existing conditions."], target: "Policy eligible", note: "Underwriting rules require both conditions to be met." };
    return { changes: ["Declaring a pre-existing condition would trigger underwriter review.", "Smoker status would increase risk tier to High."], target: "Review required", note: "These are the closest underwriting boundaries." };
  },
  hiring: (a, result) => {
    const shortlisted = result.decision?.toLowerCase().includes("shortlist");
    if (!shortlisted) {
      const changes = [];
      if (Number(a.yearsExperience) < 4) changes.push(`Gain ${4 - Number(a.yearsExperience)} more years of experience.`);
      if (a.education === "High School" || a.education === "Diploma") changes.push("Upgrade qualification to Bachelor's or higher.");
      if (!a.skills || a.skills.split(",").length < 3) changes.push("Add at least 3 relevant skills to the profile.");
      return { changes: changes.length ? changes : ["Strengthen overall profile score above threshold."], target: "Shortlisted", note: "Meeting any two of these conditions typically crosses the shortlisting threshold." };
    }
    return { changes: ["Reducing experience below 2 years would drop the profile score below threshold.", "Removing key skills would reduce match score significantly."], target: "Not shortlisted", note: "These are the closest shortlisting boundaries." };
  },
  healthcare: (a, result) => {
    const approved = result.decision?.toLowerCase().includes("approv");
    if (!approved) return { changes: ["Obtain insurance coverage.", "Escalate urgency classification to Urgent or Emergency.", "Obtain a GP or specialist referral."], target: "Treatment approved", note: "Any one of these changes may be sufficient to flip the outcome." };
    return { changes: ["Removing insurance coverage would require pre-authorisation review.", "Downgrading urgency to Routine would reduce priority score."], target: "Review required", note: "These are the closest clinical boundaries." };
  },
  government: (a, result) => {
    const eligible = result.decision?.toLowerCase().includes("eligible");
    const perCapita = Number(a.annualIncome || 0) / Math.max(Number(a.householdSize || 1), 1);
    if (!eligible) return { changes: [`Reduce annual income below ₹${(50000 * Number(a.householdSize || 1)).toLocaleString("en-IN")}.`, "Change employment status to Unemployed."], target: "Eligible", note: "Either condition alone may be sufficient for eligibility." };
    return { changes: [`Increasing annual income above ₹${(50000 * Number(a.householdSize || 1)).toLocaleString("en-IN")} would exceed the threshold.`, "Changing employment status to Employed would remove the unemployment override."], target: "Not eligible", note: "Both conditions must change to flip the outcome." };
  },
  education: (a, result) => {
    const admitted = result.decision?.toLowerCase().includes("admit");
    const gpa = Number(a.gpa || 0), entrance = Number(a.entranceScore || 0);
    const score = gpa * 10 + entrance * 0.3;
    if (!admitted) {
      const needed = 90 - score;
      return { changes: [`Raise GPA by ${Math.min(needed / 10, 10 - gpa).toFixed(1)} points.`, `Raise entrance score by ${Math.min(needed / 0.3, 100 - entrance).toFixed(0)} percentile points.`], target: "Admitted", note: "Combined score must reach 90 to cross the admission threshold." };
    }
    return { changes: [`A GPA drop of ${(score - 90) / 10 > 0 ? ((score - 90) / 10).toFixed(1) : "0.1"} points would push the combined score below threshold.`], target: "Waitlisted", note: "These are the closest admission boundaries." };
  },
  "customer-support": (a, result) => {
    const escalated = result.decision?.toLowerCase().includes("escalate");
    if (!escalated) return { changes: ["Raise severity to High or Critical.", "Accumulate 3 or more previous unresolved tickets."], target: "Escalate to senior agent", note: "Either condition alone triggers escalation." };
    return { changes: ["Reducing severity to Medium or Low would route to standard resolution.", "Fewer than 3 previous tickets with Medium severity would avoid escalation."], target: "Standard resolution", note: "Both conditions must change to avoid escalation." };
  },
};

// ── Industry workflow config ──────────────────────────────────────────────────
const WORKFLOWS = {
  banking: {
    description: "Route credit decisions through risk, compliance, and legal reviewer gates before final disbursement.",
    footer: "Preview only: reviewer approvals must be connected to your core banking system and identity management before they can be recorded.",
    steps: (r) => [
      { title: "AI credit decision",  status: "Complete",                                          tone: "emerald" },
      { title: "Risk Officer",        status: r.risk === "High" ? "Review required" : "Ready",      tone: r.risk === "High" ? "amber" : "slate" },
      { title: "Compliance",          status: "Queued",                                             tone: "slate" },
      { title: "Legal",               status: "Queued",                                             tone: "slate" },
      { title: "Disbursement approval", status: "Awaiting reviewers",                              tone: "slate" },
    ],
  },
  insurance: {
    description: "Route policy assessments through underwriting, actuarial review, and compliance before issuance.",
    footer: "Preview only: underwriter sign-offs must be connected to your policy management system before they can be recorded.",
    steps: (r) => [
      { title: "AI risk assessment",  status: "Complete",                                          tone: "emerald" },
      { title: "Underwriter",         status: r.risk === "High" ? "Manual review required" : "Ready", tone: r.risk === "High" ? "amber" : "slate" },
      { title: "Actuary",             status: "Queued",                                             tone: "slate" },
      { title: "Compliance check",    status: "Queued",                                             tone: "slate" },
      { title: "Policy issuance",     status: "Awaiting sign-off",                                  tone: "slate" },
    ],
  },
  hiring: {
    description: "Route candidate decisions through HR, technical, and hiring manager gates before an offer is extended.",
    footer: "Preview only: interviewer feedback must be connected to your ATS before reviewer decisions can be recorded.",
    steps: (r) => [
      { title: "AI screening",        status: "Complete",                                          tone: "emerald" },
      { title: "HR review",           status: r.risk === "High" ? "Flag for review" : "Ready",     tone: r.risk === "High" ? "amber" : "slate" },
      { title: "Technical interview", status: "Queued",                                             tone: "slate" },
      { title: "Hiring manager",      status: "Queued",                                             tone: "slate" },
      { title: "Offer extended",      status: "Awaiting approval",                                  tone: "slate" },
    ],
  },
  healthcare: {
    description: "Route treatment eligibility through clinical, insurance, and scheduling reviewer gates.",
    footer: "Preview only: clinician approvals must be connected to your EHR and insurance pre-auth system before they can be recorded.",
    steps: (r) => [
      { title: "AI eligibility check", status: "Complete",                                         tone: "emerald" },
      { title: "Clinician review",    status: r.risk === "High" ? "Urgent review" : "Ready",        tone: r.risk === "High" ? "amber" : "slate" },
      { title: "Insurance pre-auth",  status: "Queued",                                             tone: "slate" },
      { title: "Treatment scheduling", status: "Awaiting confirmation",                             tone: "slate" },
    ],
  },
  government: {
    description: "Route welfare applications through case officer review, document verification, and enrollment gates.",
    footer: "Preview only: case officer decisions must be connected to your benefits management system before they can be recorded.",
    steps: (r) => [
      { title: "AI eligibility check", status: "Complete",                                         tone: "emerald" },
      { title: "Case officer",        status: r.risk === "High" ? "Review required" : "Ready",      tone: r.risk === "High" ? "amber" : "slate" },
      { title: "Document verification", status: "Queued",                                          tone: "slate" },
      { title: "Benefit enrollment",  status: "Awaiting confirmation",                              tone: "slate" },
    ],
  },
  education: {
    description: "Route admission decisions through admissions officer, department, and scholarship committee gates.",
    footer: "Preview only: admissions officer decisions must be connected to your SIS before they can be recorded.",
    steps: (r) => [
      { title: "AI academic assessment", status: "Complete",                                       tone: "emerald" },
      { title: "Admissions officer",  status: r.risk === "High" ? "Review required" : "Ready",     tone: r.risk === "High" ? "amber" : "slate" },
      { title: "Department review",   status: "Queued",                                             tone: "slate" },
      { title: "Scholarship committee", status: "Queued",                                          tone: "slate" },
      { title: "Offer letter",        status: "Awaiting dispatch",                                  tone: "slate" },
    ],
  },
  "customer-support": {
    description: "Route support cases through tier-1, tier-2, and resolution gates based on severity and history.",
    footer: "Preview only: agent resolutions must be connected to your CRM and ticketing system before they can be recorded.",
    steps: (r) => [
      { title: "AI routing",          status: "Complete",                                          tone: "emerald" },
      { title: "Tier-1 agent",        status: r.risk === "High" ? "Escalating" : "Assigned",       tone: r.risk === "High" ? "amber" : "slate" },
      { title: "Tier-2 / Senior agent", status: r.risk === "High" ? "Queued" : "Not required",     tone: "slate" },
      { title: "Resolution & close",  status: "Awaiting action",                                    tone: "slate" },
    ],
  },
};

// ── Industry calibration benchmarks ──────────────────────────────────────────
const BENCHMARKS = {
  banking: {
    Low: 78, Medium: 74, High: 70,
    metric: "Model confidence", benchmarkLabel: "Repayment accuracy benchmark", adjustedLabel: "Risk-adjusted confidence",
    description: "Confidence is adjusted against observed loan repayment accuracy by risk tier.",
    footer: "Connect verified repayment outcome data to replace this estimated benchmark with measured historical accuracy.",
  },
  insurance: {
    Low: 80, Medium: 75, High: 68,
    metric: "Model confidence", benchmarkLabel: "Claims accuracy benchmark", adjustedLabel: "Underwriting-adjusted confidence",
    description: "Confidence is adjusted against historical claims outcome accuracy by policy risk tier.",
    footer: "Connect verified claims data to replace this estimated benchmark with measured underwriting accuracy.",
  },
  hiring: {
    Low: 72, Medium: 68, High: 62,
    metric: "Model confidence", benchmarkLabel: "Hire conversion benchmark", adjustedLabel: "Hiring-adjusted confidence",
    description: "Confidence is adjusted against historical shortlisting-to-successful-hire conversion rates.",
    footer: "Connect post-hire performance data to replace this estimated benchmark with measured hiring accuracy.",
  },
  healthcare: {
    Low: 85, Medium: 78, High: 72,
    metric: "Model confidence", benchmarkLabel: "Clinical accuracy benchmark", adjustedLabel: "Clinically-adjusted confidence",
    description: "Confidence is adjusted against historical treatment eligibility decision accuracy by urgency tier.",
    footer: "Connect verified treatment outcome data to replace this estimated benchmark with measured clinical accuracy.",
  },
  government: {
    Low: 82, Medium: 76, High: 70,
    metric: "Model confidence", benchmarkLabel: "Eligibility accuracy benchmark", adjustedLabel: "Policy-adjusted confidence",
    description: "Confidence is adjusted against historical welfare eligibility decision accuracy by scheme tier.",
    footer: "Connect verified enrollment outcome data to replace this estimated benchmark with measured eligibility accuracy.",
  },
  education: {
    Low: 79, Medium: 73, High: 66,
    metric: "Model confidence", benchmarkLabel: "Admission accuracy benchmark", adjustedLabel: "Academic-adjusted confidence",
    description: "Confidence is adjusted against historical admission decision accuracy by academic performance tier.",
    footer: "Connect verified enrollment and completion data to replace this estimated benchmark with measured admission accuracy.",
  },
  "customer-support": {
    Low: 84, Medium: 77, High: 71,
    metric: "Model confidence", benchmarkLabel: "Resolution accuracy benchmark", adjustedLabel: "SLA-adjusted confidence",
    description: "Confidence is adjusted against historical routing-to-resolution accuracy by severity tier.",
    footer: "Connect verified resolution outcome data to replace this estimated benchmark with measured routing accuracy.",
  },
};

// ── Main component ────────────────────────────────────────────────────────────
export function DecisionInsights({ application, result, hash }) {
  const industry = application.industry || "banking";
  const simConfig = SIMULATORS[industry] || SIMULATORS.banking;
  const [scenario, setScenario] = useState(simConfig.initial(application));
  const onChange = (e) => setScenario((s) => ({ ...s, [e.target.name]: e.target.value }));

  const liveDecision = useMemo(() => simConfig.decide({ ...application, ...scenario }), [scenario]);
  const cf = useMemo(() => (COUNTERFACTUALS[industry] || COUNTERFACTUALS.banking)(application, result), [application, result]);
  const calibration = useMemo(() => {
    const bench = BENCHMARKS[industry] || BENCHMARKS.banking;
    const modelConfidence = Math.max(0, Math.min(100, Math.round(Number(result.confidence) || 0)));
    const benchmarkAccuracy = bench[result.risk] ?? bench.Medium;
    return { modelConfidence, benchmarkAccuracy, adjustedConfidence: Math.floor(modelConfidence * benchmarkAccuracy / 100), bench };
  }, [result, industry]);
  const workflow = WORKFLOWS[industry] || WORKFLOWS.banking;
  const workflowSteps = useMemo(() => workflow.steps(result), [result, industry]);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <BiasScoreCard application={application} result={result} />

      {/* Simulator */}
      <GlassCard>
        <FlaskConical className="text-violet-400" />
        <h3 className="mt-4 text-lg font-semibold">AI Decision Simulator</h3>
        <p className="mt-2 text-sm text-slate-400">Move the sliders to explore a policy scenario without changing the original record.</p>
        {simConfig.sliders.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {simConfig.sliders.map((s) => (
              <Slider key={s.name} {...s} value={scenario[s.name]} onChange={onChange} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs text-slate-500">This industry's decision is driven by categorical inputs. Adjust the form to explore different scenarios.</p>
        )}
        <div className="mt-4 rounded-lg bg-white/[.04] p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Live decision</p>
          <p className={`mt-1 font-semibold ${liveDecision.ok ? "text-emerald-300" : "text-amber-200"}`}>{liveDecision.label}</p>
          <p className="mt-1 text-xs text-slate-400">{liveDecision.meta}</p>
        </div>
      </GlassCard>

      {/* Counterfactual */}
      <GlassCard>
        <Sparkles className="text-amber-300" />
        <h3 className="mt-4 text-lg font-semibold">Counterfactual AI</h3>
        <p className="mt-2 text-sm text-slate-400">What is the smallest policy change that would change this outcome?</p>
        <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">If these conditions changed</p>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            {cf.changes.map((c) => <p key={c} className="flex gap-2"><ArrowRight size={16} className="mt-0.5 shrink-0 text-amber-300" />{c}</p>)}
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-sm">
            <CheckCircle2 size={16} className="text-emerald-300" />
            <span className="text-slate-400">Decision becomes</span><strong className="text-emerald-300">{cf.target}</strong>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">{cf.note}</p>
      </GlassCard>

      {/* Calibration */}
      <GlassCard>
        <Gauge className="text-blue-300" />
        <h3 className="mt-4 text-lg font-semibold">Confidence calibration</h3>
        <p className="mt-2 text-sm text-slate-400">{calibration.bench.description}</p>
        <div className="mt-4 space-y-3">
          <CalibrationRow label={calibration.bench.metric} value={calibration.modelConfidence} tone="bg-blue-400" />
          <CalibrationRow label={calibration.bench.benchmarkLabel} value={calibration.benchmarkAccuracy} tone="bg-violet-400" />
          <CalibrationRow label={calibration.bench.adjustedLabel} value={calibration.adjustedConfidence} tone="bg-emerald-400" strong />
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">{calibration.bench.footer}</p>
      </GlassCard>

      {/* Workflow */}
      <GlassCard>
        <UserRoundCheck className="text-cyan-300" />
        <div className="mt-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Enterprise Mode</h3>
          <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-xs font-medium text-cyan-200">Workflow preview</span>
        </div>
        <p className="mt-2 text-sm text-slate-400">{workflow.description}</p>
        <div className="mt-5 space-y-1">
          {workflowSteps.map((step, i) => (
            <div key={step.title}>
              {i > 0 && <ArrowDown className="mx-auto text-slate-600" size={16} />}
              <WorkflowStep title={step.title} status={step.status} tone={step.tone} />
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">{workflow.footer}</p>
      </GlassCard>

      {/* Hash + agent review */}
      <GlassCard>
        <Bot className="text-cyan-300" />
        <h3 className="mt-4 text-lg font-semibold">Tamper-evident hash</h3>
        <p className={`mt-3 text-sm font-medium ${result.agentReview?.disagrees ? "text-amber-200" : "text-emerald-300"}`}>
          {result.agentReview?.verdict || "Review completed"}
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          {result.agentReview?.reason || "A second AI reviewer independently cross-checks the decision."}
        </p>
        <code className="mt-4 block break-all rounded-lg bg-black/20 p-3 text-xs text-cyan-300">sha256:{hash}</code>
        <p className="mt-3 text-xs text-slate-500">
          This SHA-256 hash binds the application data, result, and timestamp. Verify it on the Verify page or compare it with any copy of this decision.
        </p>
      </GlassCard>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function CalibrationRow({ label, value, tone, strong = false }) {
  return (
    <div>
      <div className={`mb-1 flex justify-between text-sm ${strong ? "font-semibold text-white" : "text-slate-300"}`}><span>{label}</span><span>{value}%</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${tone}`} style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function Slider({ name, label, value, min, max, step, display, onChange }) {
  const num = Math.min(max, Math.max(min, Number(value) || min));
  return (
    <label className="block rounded-lg border border-white/10 bg-white/[.03] px-3 py-2.5">
      <span className="flex items-center justify-between text-xs text-slate-400"><span>{label}</span><strong className="text-sm text-white">{display(num)}</strong></span>
      <input className="mt-3 w-full accent-violet-400" name={name} type="range" min={min} max={max} step={step} value={num} onChange={onChange} />
      <span className="flex justify-between text-[10px] text-slate-600"><span>{display(min)}</span><span>{display(max)}</span></span>
    </label>
  );
}

function WorkflowStep({ title, status, tone }) {
  const tones = { emerald: "border-emerald-400/20 bg-emerald-400/5 text-emerald-300", amber: "border-amber-400/20 bg-amber-400/5 text-amber-200", slate: "border-white/10 bg-white/[.03] text-slate-300" };
  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${tones[tone] || tones.slate}`}>
      <span className="text-sm font-medium">{title}</span>
      <span className="text-xs">{status}</span>
    </div>
  );
}
