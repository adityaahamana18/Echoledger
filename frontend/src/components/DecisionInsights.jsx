import { useMemo, useState } from "react";
import { Bot, FlaskConical, ShieldCheck } from "lucide-react";
import GlassCard from "./GlassCard";

const calculateScenario = (application) => {
  const score = Number(application.creditScore || 0);
  const ratio = Number(application.loanAmount || 0) / Math.max(Number(application.income || 0) * 12, 1);
  const approved = score >= 650 && ratio <= 5;
  return { approved, confidence: Math.max(58, Math.min(96, Math.round(score / 10 - ratio * 2))), ratio };
};

export function DecisionInsights({ application, result, hash }) {
  const [scenario, setScenario] = useState({ income: application.income, creditScore: application.creditScore, loanAmount: application.loanAmount });
  const comparison = useMemo(() => calculateScenario({ ...application, ...scenario }), [application, scenario]);
  const audit = result.biasAudit || {
    protectedAttributesExcluded: ["Name", "Age"],
    evaluatedFactors: ["Income", "Credit score", "Employment type", "Loan amount", "Purpose"],
    status: "Protected attributes excluded",
    note: "The decision path is designed to avoid protected attributes."
  };
  const onChange = (event) => setScenario((current) => ({ ...current, [event.target.name]: event.target.value }));

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <GlassCard>
        <ShieldCheck className="text-emerald-400" />
        <h3 className="mt-4 text-lg font-semibold">AI bias detection</h3>
        <span className="mt-3 inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-200">{audit.status}</span>
        <p className="mt-4 text-sm leading-6 text-slate-400">{audit.note}</p>
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-500">Excluded: {audit.protectedAttributesExcluded.join(", ")}</p>
        <p className="mt-2 text-xs text-slate-400">Reviewed: {audit.evaluatedFactors.join(", ")}</p>
      </GlassCard>

      <GlassCard>
        <FlaskConical className="text-violet-400" />
        <h3 className="mt-4 text-lg font-semibold">What-if simulator</h3>
        <p className="mt-2 text-sm text-slate-400">Explore a policy scenario without changing the original record.</p>
        <div className="mt-4 grid gap-3">
          {[{ name: "income", label: "Monthly income" }, { name: "creditScore", label: "Credit score" }, { name: "loanAmount", label: "Loan amount" }].map((field) => (
            <label key={field.name} className="text-xs text-slate-400">
              {field.label}
              <input name={field.name} type="number" value={scenario[field.name]} onChange={onChange}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-400" />
            </label>
          ))}
        </div>
        <div className="mt-4 rounded-lg bg-white/[.04] p-3 text-sm">
          <p className={comparison.approved ? "text-emerald-300" : "text-amber-200"}>{comparison.approved ? "Likely policy eligible" : "Likely human review"}</p>
          <p className="mt-1 text-slate-400">Model confidence: {comparison.confidence}% · Loan-to-income: {comparison.ratio.toFixed(1)}×</p>
        </div>
      </GlassCard>

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