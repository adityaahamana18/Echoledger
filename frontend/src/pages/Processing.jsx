import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Activity, CheckCircle2, Cpu, ShieldAlert, ShieldCheck, ArrowRight, Scale } from "lucide-react";
import Page from "../components/Page";
import GlassCard from "../components/GlassCard";
import Button from "../components/Button";
import api from "../api/api";
import { auth } from "../firebase";
import { anchorDecisionHash, commitDecision, isBlockchainConfigured, isRegistryConfigured } from "../blockchain/simpleDispute";
import { getAudit, saveBlockchainCommit, saveDecision } from "../utils/audit";

const INDUSTRY_FALLBACKS = {
  banking: (a) => { const ratio = Number(a.loanAmount) / Math.max(Number(a.income) * 12, 1); const ok = Number(a.creditScore) >= 650 && ratio <= 5; return { decision: ok ? "Approved" : "Review required", confidence: Math.max(58, Math.min(96, Math.round(Number(a.creditScore) / 10 - ratio * 2))), risk: ok ? "Low" : "High", reason: "Policy inputs evaluated using affordability and credit thresholds.", suggestion: "Provide additional evidence if you want a human reassessment.", jury: { optimist: { position: ok ? "Approve" : "Conditional approval", rationale: "Income and credit profile show the strongest available case.", keyFactors: ["Income", "Credit score", "Employment"] }, riskAssessor: { position: ok ? "Acceptable risk" : "Require review", rationale: "Affordability and credit threshold evaluated.", keyFactors: ["Loan-to-income ratio", "Credit threshold"] }, judge: { decision: ok ? "Approved" : "Review required", rationale: "Policy signals weighed.", biasCheck: "Protected characteristics excluded." } }, reasoningSteps: [ { title: "Application normalized", detail: "Financial inputs validated; protected attributes excluded." }, { title: "Income affordability assessed", detail: `Annualized income: ₹${(Number(a.income) * 12).toLocaleString("en-IN")}.` }, { title: "Credit signal assessed", detail: `Credit score ${a.creditScore} evaluated.` }, { title: "Exposure ratio calculated", detail: `Loan-to-income ratio: ${ratio.toFixed(2)}×.` } ], agentReview: { disagrees: !ok, verdict: !ok ? "Challenge recommended" : "No material disagreement", reason: !ok ? "Independent reviewer requests human review." : "Independent reviewer agrees." } }; },
  insurance: (a) => { const ok = a.smokingStatus !== "Smoker" && (!a.preExistingConditions || a.preExistingConditions === "None"); return { decision: ok ? "Policy eligible" : "Review required", confidence: ok ? 82 : 64, risk: ok ? "Low" : "High", reason: ok ? "Risk profile within acceptable parameters." : "Elevated risk factors require underwriter review.", suggestion: ok ? "Maintain healthy lifestyle." : "Consult an underwriter for a tailored assessment.", jury: { optimist: { position: ok ? "Eligible" : "Conditional", rationale: "Policy inputs support eligibility.", keyFactors: ["Policy type", "Coverage amount"] }, riskAssessor: { position: ok ? "Acceptable" : "Review", rationale: "Risk factors assessed.", keyFactors: ["Smoking status", "Pre-existing conditions"] }, judge: { decision: ok ? "Policy eligible" : "Review required", rationale: "Underwriting signals weighed.", biasCheck: "Protected characteristics excluded." } }, reasoningSteps: [ { title: "Application normalized", detail: "Policy inputs validated; protected attributes excluded." }, { title: "Risk profile assessed", detail: `Policy type: ${a.policyType}.` }, { title: "Lifestyle factors evaluated", detail: `Smoking: ${a.smokingStatus}. Pre-existing: ${a.preExistingConditions}.` }, { title: "Underwriting decision generated", detail: "Combined risk signals evaluated." } ], agentReview: { disagrees: !ok, verdict: !ok ? "Challenge recommended" : "No material disagreement", reason: !ok ? "Elevated risk warrants review." : "Signals support eligibility." } }; },
  hiring: (a) => { const score = Number(a.yearsExperience) * 10 + (a.education === "Master's" || a.education === "PhD" ? 20 : 0) + (a.skills?.split(",").length || 0) * 5; const ok = score >= 40; return { decision: ok ? "Shortlisted" : "Not shortlisted", confidence: Math.min(92, Math.max(55, score)), risk: ok ? "Low" : "Medium", reason: ok ? "Candidate profile meets role requirements." : "Profile does not sufficiently match requirements.", suggestion: ok ? "Proceed to technical interview." : "Consider roles better aligned with experience.", jury: { optimist: { position: ok ? "Shortlist" : "Conditional", rationale: "Experience and skills support shortlisting.", keyFactors: ["Experience", "Skills", "Education"] }, riskAssessor: { position: ok ? "Acceptable" : "Gap identified", rationale: "Role fit assessed.", keyFactors: ["Years of experience", "Education"] }, judge: { decision: ok ? "Shortlisted" : "Not shortlisted", rationale: "Profile signals weighed.", biasCheck: "Protected characteristics excluded." } }, reasoningSteps: [ { title: "Profile normalized", detail: "Candidate inputs validated; demographic attributes excluded." }, { title: "Experience assessed", detail: `${a.yearsExperience} years for ${a.role}.` }, { title: "Education evaluated", detail: `Highest qualification: ${a.education}.` }, { title: "Skills match calculated", detail: "Skills cross-referenced against role requirements." } ], agentReview: { disagrees: !ok, verdict: !ok ? "Challenge recommended" : "No material disagreement", reason: !ok ? "Profile gaps warrant review." : "Signals support shortlisting." } }; },
  healthcare: (a) => { const ok = a.urgency === "Emergency" || a.urgency === "Urgent" || a.insuranceCoverage === "Yes"; return { decision: ok ? "Treatment approved" : "Review required", confidence: ok ? 88 : 62, risk: a.urgency === "Emergency" ? "High" : "Low", reason: ok ? "Clinical urgency and coverage support approval." : "Coverage or priority requires further review.", suggestion: ok ? "Proceed with treatment." : "Obtain specialist referral and pre-authorisation.", jury: { optimist: { position: ok ? "Approve" : "Conditional", rationale: "Clinical inputs support treatment.", keyFactors: ["Urgency", "Insurance coverage"] }, riskAssessor: { position: ok ? "Acceptable" : "Review", rationale: "Coverage and urgency assessed.", keyFactors: ["Insurance", "Referral source"] }, judge: { decision: ok ? "Treatment approved" : "Review required", rationale: "Clinical signals weighed.", biasCheck: "Protected characteristics excluded." } }, reasoningSteps: [ { title: "Patient record normalized", detail: "Clinical inputs validated; demographic attributes excluded." }, { title: "Condition assessed", detail: `Condition: ${a.condition}.` }, { title: "Treatment evaluated", detail: `Requested: ${a.requestedTreatment}.` }, { title: "Urgency and coverage checked", detail: `Urgency: ${a.urgency}.` } ], agentReview: { disagrees: !ok, verdict: !ok ? "Challenge recommended" : "No material disagreement", reason: !ok ? "Coverage gaps warrant review." : "Signals support approval." } }; },
  government: (a) => { const perCapita = Number(a.annualIncome) / Math.max(Number(a.householdSize), 1); const ok = perCapita < 50000 || a.employmentStatus === "Unemployed"; return { decision: ok ? "Eligible" : "Not eligible", confidence: ok ? 85 : 70, risk: ok ? "Low" : "Medium", reason: ok ? "Income and employment meet eligibility criteria." : "Income exceeds the benefit threshold.", suggestion: ok ? "Proceed with benefit enrollment." : "Review alternative schemes.", jury: { optimist: { position: ok ? "Eligible" : "Borderline", rationale: "Income and household size support eligibility.", keyFactors: ["Annual income", "Household size"] }, riskAssessor: { position: ok ? "Acceptable" : "Ineligible", rationale: "Per-capita income assessed.", keyFactors: ["Employment status", "Income threshold"] }, judge: { decision: ok ? "Eligible" : "Not eligible", rationale: "Welfare signals weighed.", biasCheck: "Protected characteristics excluded." } }, reasoningSteps: [ { title: "Application normalized", detail: "Welfare inputs validated; protected attributes excluded." }, { title: "Income threshold checked", detail: `Annual income: ₹${Number(a.annualIncome).toLocaleString("en-IN")}. Household: ${a.householdSize}.` }, { title: "Benefit type assessed", detail: `Requested: ${a.benefitType}.` }, { title: "Eligibility decision generated", detail: "Per-capita income and employment evaluated." } ], agentReview: { disagrees: !ok, verdict: !ok ? "Challenge recommended" : "No material disagreement", reason: !ok ? "Income exceeds threshold." : "Signals support eligibility." } }; },
  education: (a) => { const score = Number(a.gpa) * 10 + Number(a.entranceScore) * 0.3; const ok = score >= 90; return { decision: ok ? "Admitted" : "Waitlisted", confidence: Math.min(94, Math.max(55, Math.round(score))), risk: ok ? "Low" : "Medium", reason: ok ? "Academic profile meets admission threshold." : "Profile is below the competitive threshold.", suggestion: ok ? "Confirm enrollment by the deadline." : "Consider reapplying after improving scores.", jury: { optimist: { position: ok ? "Admit" : "Waitlist", rationale: "Academic signals support admission.", keyFactors: ["GPA", "Entrance score"] }, riskAssessor: { position: ok ? "Acceptable" : "Below threshold", rationale: "Academic gaps assessed.", keyFactors: ["GPA", "Entrance percentile"] }, judge: { decision: ok ? "Admitted" : "Waitlisted", rationale: "Academic signals weighed.", biasCheck: "Protected characteristics excluded." } }, reasoningSteps: [ { title: "Application normalized", detail: "Academic inputs validated; demographic attributes excluded." }, { title: "GPA evaluated", detail: `GPA: ${a.gpa} / 10.` }, { title: "Entrance score assessed", detail: `Percentile: ${a.entranceScore}.` }, { title: "Admission decision generated", detail: `Program: ${a.program}.` } ], agentReview: { disagrees: !ok, verdict: !ok ? "Challenge recommended" : "No material disagreement", reason: !ok ? "Academic profile below threshold." : "Signals support admission." } }; },
  "customer-support": (a) => { const escalate = a.severity === "Critical" || a.severity === "High" || Number(a.previousTickets) >= 3; return { decision: escalate ? "Escalate to senior agent" : "Standard resolution", confidence: escalate ? 90 : 78, risk: escalate ? "High" : "Low", reason: escalate ? "Severity or repeat contact warrants escalation." : "Issue can be resolved through standard workflow.", suggestion: escalate ? "Assign to Tier-2 support immediately." : "Follow standard resolution playbook.", jury: { optimist: { position: escalate ? "Escalate" : "Standard", rationale: "Severity signals assessed.", keyFactors: ["Severity", "Issue type"] }, riskAssessor: { position: escalate ? "Escalate" : "Standard", rationale: "Contact history evaluated.", keyFactors: ["Previous tickets", "Severity"] }, judge: { decision: escalate ? "Escalate to senior agent" : "Standard resolution", rationale: "Routing signals weighed.", biasCheck: "Protected characteristics excluded." } }, reasoningSteps: [ { title: "Case normalized", detail: "Support inputs validated; demographic attributes excluded." }, { title: "Issue type classified", detail: `Type: ${a.issueType}. Product: ${a.productName}.` }, { title: "Severity assessed", detail: `Severity: ${a.severity}.` }, { title: "Routing decision generated", detail: "Escalation path determined." } ], agentReview: { disagrees: escalate, verdict: escalate ? "Escalation recommended" : "No material disagreement", reason: escalate ? "Severity warrants senior review." : "Standard resolution appropriate." } }; },
};

const fallback = (application) => {
  const fn = INDUSTRY_FALLBACKS[application.industry] || INDUSTRY_FALLBACKS.banking;
  return fn(application);
};

async function requestJury(application, onEvent) {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/jury`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(application),
  });
  if (!response.ok || !response.body) throw new Error("AI jury is unavailable");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";
    for (const event of events) {
      const eventName = event.match(/^event:\s*(.+)$/m)?.[1];
      const rawData = event.match(/^data:\s*(.+)$/m)?.[1];
      if (!eventName || !rawData) continue;
      const data = JSON.parse(rawData);
      onEvent(eventName, data);
      if (eventName === "complete") return data;
    }
    if (done) break;
  }
  throw new Error("AI jury ended before producing a verdict");
}

export default function Processing() {
  const [active, setActive] = useState(0);
  const [error, setError] = useState("");
  const [audit, setAudit] = useState(null);
  const [jury, setJury] = useState([]);
  const [committing, setCommitting] = useState(false);
  const [anchoring, setAnchoring] = useState(false);
  const [anchorTx, setAnchorTx] = useState(null);
  const navigate = useNavigate();
  const { id } = useParams();

  // Process the decision
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const current = await getAudit(id);
        let result;
        try {
          result = await requestJury(current.application, (event, data) => {
            if (!alive) return;
            if (event === "argument" || event === "verdict") {
              setJury((currentJury) => [...currentJury.filter((entry) => entry.role !== data.role), data]);
            }
          });
        } catch {
          result = fallback(current.application);
          if (alive) setJury([
            { role: "Optimist", ...result.jury.optimist },
            { role: "Risk Assessor", ...result.jury.riskAssessor },
            { role: "Judge", ...result.jury.judge },
          ]);
        }
        const steps = [
          ...(result.reasoningSteps || []),
          { title: "Decision receipt hashed", detail: "The application, outcome, and reasoning steps are bound into one SHA-256 fingerprint." },
        ];
        for (let index = 0; index < steps.length; index += 1) {
          if (!alive) return;
          setActive(index);
          await new Promise((resolve) => window.setTimeout(resolve, 700));
        }
        const saved = await saveDecision(id, current.application, { ...result, trace: result.trace || steps }, steps);
        if (alive) setAudit(saved);
      } catch {
        if (alive) setError("We could not build this decision record. Please return to your dashboard.");
      }
    };
    run();
    return () => { alive = false; };
  }, [id]);

  // Auto-navigate to decision page after a short delay when processing is complete
  useEffect(() => {
    if (audit && !isBlockchainConfigured()) {
      const timer = setTimeout(() => {
        navigate(`/decision/${id}`, { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [audit, id, navigate]);

  const commit = async () => {
    setCommitting(true);
    setError("");
    setAudit((prev) => prev ? { ...prev, commitFailed: false } : prev);
    try {
      const receipt = await commitDecision(id, audit.hash);
      await saveBlockchainCommit(id, receipt.transactionHash);
      if (audit.result.agentReview?.disagrees) {
        try {
          const token = await auth.currentUser?.getIdToken();
          await api.post("/automated-challenge", { id, hash: audit.hash, reason: audit.result.agentReview.reason }, { headers: { Authorization: `Bearer ${token}` } });
        } catch (automationError) {
          console.warn("Automated challenge was not submitted", automationError);
        }
      }
      navigate(`/decision/${id}`, { replace: true });
    } catch (commitError) {
      setError(commitError.response?.data?.error || commitError.shortMessage || commitError.message || "Blockchain commitment failed.");
      // Even if commit fails, let user go to decision page
      setAudit({ ...audit, commitFailed: true });
    } finally {
      setCommitting(false);
    }
  };

  const steps = audit?.reasoningSteps || [];

  return (
    <Page>
      <section className="mx-auto flex min-h-[68vh] max-w-2xl items-center px-6 py-16">
        <GlassCard className="w-full text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-500/10 text-blue-400">
            <Cpu size={36} className={!audit ? "animate-pulse" : ""} />
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[.2em] text-blue-400">
            Evidence-led processing
          </p>
          <h1 className="mt-3 text-3xl font-bold">
            {audit ? "Decision ready" : "Building your decision receipt"}
          </h1>
          <p className="mt-3 text-slate-400">
            {audit
              ? "Your decision has been processed with a tamper-evident SHA-256 hash."
              : "Each completed step becomes part of the hashed audit record."}
          </p>

          {jury.length > 0 && <JuryDebate entries={jury} />}

          {/* Steps progress */}
          <div className="mt-9 space-y-3 text-left">
            {(steps.length ? steps : [{ title: "Preparing verified reasoning", detail: "Connecting to the decision engine." }]).map((step, index) => (
              <div
                key={step.title}
                className={`rounded-xl px-4 py-3 ${index <= active || audit ? "bg-blue-500/10 text-white" : "text-slate-600"}`}
              >
                <div className="flex items-center gap-3 text-sm">
                  {index < active || audit ? (
                    <CheckCircle2 size={18} className="text-emerald-300" />
                  ) : (
                    <Activity size={18} className="animate-pulse" />
                  )}
                  {step.title}
                </div>
                <p className="ml-7 mt-1 text-xs text-slate-400">{step.detail}</p>
              </div>
            ))}
          </div>

          {/* After processing complete */}
          {audit && (
            <div className="mt-7 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-left">
              <div className="flex gap-3">
                <ShieldCheck className="shrink-0 text-cyan-300" size={19} />
                <div>
                  <p className="font-medium">SHA-256 receipt ready</p>
                  <code className="mt-2 block break-all text-xs text-cyan-200">{audit.hash}</code>
                </div>
              </div>

              {/* Anchor hash on-chain via DecisionHashRegistry */}
              {isRegistryConfigured() && !anchorTx && (
                <button
                  className="secondary-btn mt-3 w-full"
                  onClick={async () => {
                    setAnchoring(true);
                    setError("");
                    try {
                      const receipt = await anchorDecisionHash(audit.hash);
                      setAnchorTx(receipt.transactionHash);
                      // Also notify the backend
                      try {
                        const token = await auth.currentUser?.getIdToken();
                        await api.post("/anchor-onchain", { id, hash: audit.hash }, { headers: { Authorization: `Bearer ${token}` } });
                      } catch (backendErr) {
                        console.warn("Backend anchor notification failed (hash still on-chain)", backendErr);
                      }
                    } catch (err) {
                      setError(err.shortMessage || err.message || "Blockchain anchoring failed.");
                    } finally {
                      setAnchoring(false);
                    }
                  }}
                  disabled={anchoring}
                >
                  {anchoring ? "Anchoring to blockchain…" : "Anchor hash on-chain (DecisionHashRegistry)"}
                </button>
              )}
              {anchorTx && (
                <p className="mt-2 text-xs text-emerald-300">✓ Hash anchored on-chain: {anchorTx.slice(0, 10)}…{anchorTx.slice(-6)}</p>
              )}

              {/* Blockchain commit option (SimpleDispute) */}
              {isBlockchainConfigured() ? (
                <Button className="mt-3 w-full" onClick={commit} disabled={committing}>
                  {committing ? "Waiting for wallet confirmation…" : "Commit decision on-chain"}
                </Button>
              ) : null}

              {/* Always show: View decision button */}
              <button
                className={isBlockchainConfigured() ? "secondary-btn mt-3 w-full" : "btn-primary mt-4 w-full"}
                onClick={() => navigate(`/decision/${id}`, { replace: true })}
              >
                {isBlockchainConfigured() ? "Skip & view decision" : "View decision"} <ArrowRight size={17} />
              </button>

              {!isBlockchainConfigured() && (
                <p className="mt-3 text-xs text-slate-500">
                  Auto-redirecting to decision page...
                </p>
              )}
            </div>
          )}

          {/* Commit failed: show retry + view decision */}
          {audit?.commitFailed && (
            <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-left">
              <p className="text-sm text-amber-300 font-medium">Blockchain commit failed</p>
              <p className="mt-1 text-xs text-amber-200/70">{error || "Transaction was rejected or the network is unavailable."} Your decision is saved locally.</p>
              <div className="mt-3 flex gap-2">
                <Button className="flex-1" onClick={commit} disabled={committing}>
                  {committing ? "Retrying…" : "Retry commit"}
                </Button>
                <button
                  className="secondary-btn flex-1"
                  onClick={() => navigate(`/decision/${id}`, { replace: true })}
                >
                  View decision <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {error && !audit?.commitFailed && (
            <p className="mt-4 text-sm text-rose-400">{error}</p>
          )}
        </GlassCard>
      </section>
    </Page>
  );
}

function JuryDebate({ entries }) {
  const appearance = {
    Optimist: { icon: <Cpu size={17} />, color: "border-emerald-400/20 bg-emerald-400/5 text-emerald-200" },
    "Risk Assessor": { icon: <ShieldAlert size={17} />, color: "border-amber-400/20 bg-amber-400/5 text-amber-100" },
    Judge: { icon: <Scale size={17} />, color: "border-cyan-400/20 bg-cyan-400/5 text-cyan-100" },
  };
  return (
    <div className="mt-7 text-left">
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[.18em] text-violet-300">Multi-Agent AI Jury deliberation</p>
      <div className="space-y-3">
        {entries.map((entry) => {
          const style = appearance[entry.role] || appearance.Judge;
          return (
            <div key={entry.role} className={`rounded-xl border p-4 ${style.color}`}>
              <div className="flex items-center gap-2 text-sm font-semibold">{style.icon}{entry.role}<span className="ml-auto text-xs font-normal opacity-75">{entry.position || entry.decision}</span></div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{entry.rationale || entry.reason}</p>
              {entry.biasCheck && <p className="mt-2 text-xs text-cyan-200">Bias check: {entry.biasCheck}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
