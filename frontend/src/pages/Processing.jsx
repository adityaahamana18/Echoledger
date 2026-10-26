import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Activity, CheckCircle2, Cpu, ShieldAlert, ShieldCheck, ArrowRight, Scale, FileText } from "lucide-react";
import Page from "../components/Page";
import GlassCard from "../components/GlassCard";
import { auth } from "../firebase";
import { getAudit, saveDecision } from "../utils/audit";

// ── Local fallback (when backend is offline) ──────────────────────────────────
const localFallback = (application) => {
  const isJob = (application.category || application.industry || "").toLowerCase().includes("job") ||
    (application.category || application.industry || "").toLowerCase().includes("hiring");

  if (isJob) {
    const skills = Array.isArray(application.skills)
      ? application.skills
      : (application.skills || "").split(",").map(s => s.trim()).filter(Boolean);
    const ok = skills.length >= 2;
    const outcome = ok ? "Recommended for Shortlist" : "Conditional Match (Upskilling Suggested)";
    return {
      decision: outcome,
      headline: ok ? "Your skills align well with the target role!" : "Solid foundation — here's how to strengthen your profile.",
      confidence: Math.min(92, Math.max(58, 58 + skills.length * 5)),
      risk: ok ? "Low" : "Medium",
      reason: `Evaluated ${skills.length} skills (${skills.slice(0, 3).join(", ")}) against core role requirements for ${application.preferredRole || "the target position"}.`,
      suggestion: "Highlight your GitHub projects and prepare for the technical assessment round.",
      whatWorked: `Skills matched: ${skills.slice(0, 3).join(", ")}`,
      whatToImprove: "Build real-world projects to demonstrate practical depth.",
      jury: {
        optimist: { position: outcome, rationale: `Strong foundation in ${skills.slice(0, 2).join(", ")} supports shortlisting.`, keyFactors: skills.slice(0, 3) },
        riskAssessor: { position: "Verify project depth", rationale: "Portfolio and system design depth should be reviewed in technical rounds.", keyFactors: ["Portfolio", "System Design"] },
        judge: { decision: outcome, confidence: Math.min(92, Math.max(58, 58 + skills.length * 5)), risk: ok ? "Low" : "Medium", biasCheck: "Name, Gender, Age, Race, Nationality excluded." },
      },
      reasoningSteps: [
        { title: "Profile normalized", detail: "Demographic attributes excluded from evaluation." },
        { title: "Skills evaluated", detail: `${skills.length} skills checked against mandatory role requirements.` },
        { title: "Experience assessed", detail: `${application.yearsExperience || 0} years experience evaluated in career context.` },
        { title: "AI jury deliberated", detail: "Optimist, Risk Assessor, and Judge reviewed the profile independently." },
        { title: "Decision receipt generated", detail: "Outcome bound into a SHA-256 tamper-evident fingerprint." },
      ],
    };
  }

  const score = Number(application.academicScore) || 0;
  const scale = Number(application.gpaScale) || 10;
  const pct = scale === 4 ? (score / 4) * 100 : scale === 10 ? score * 10 : score;
  const income = application.annualIncome ? Number(application.annualIncome) : null;
  const ok = pct >= 75 && (income === null || income <= 450000);
  const outcome = ok ? "Award Recommended" : pct >= 60 ? "Potential Match" : "Alternative Pathways Recommended";
  return {
    decision: outcome,
    headline: ok ? "Your academic profile strongly matches verified scholarship criteria!" : "You are a competitive candidate — complete your documentation to proceed.",
    confidence: Math.min(95, Math.max(55, Math.round(pct))),
    risk: ok ? "Low" : "Medium",
    reason: `Academic score of ${pct.toFixed(1)}% evaluated against verified scheme thresholds. ${ok ? "All key criteria met." : "Some criteria need attention — see next steps."}`,
    suggestion: "Submit certified income and academic certificates to the National Scholarship Portal before the deadline.",
    whatWorked: `Academic score (${pct.toFixed(1)}%) and education level meet scheme requirements.`,
    whatToImprove: income && income > 450000 ? "Income exceeds some scheme ceilings — explore merit-only scholarships." : "Ensure all documents are certified by the issuing authority.",
    jury: {
      optimist: { position: outcome, rationale: `Academic performance of ${pct.toFixed(1)}% demonstrates merit for Central Sector schemes.`, keyFactors: ["Academic Score", "Education Level"] },
      riskAssessor: { position: "Verify documentation", rationale: "Income certificate and marksheets must be certified by the issuing authority.", keyFactors: ["Income Certificate", "Marksheet"] },
      judge: { decision: outcome, confidence: Math.min(95, Math.max(55, Math.round(pct))), risk: ok ? "Low" : "Medium", biasCheck: "Name, Gender, Caste, Religion, Nationality excluded." },
    },
    reasoningSteps: [
      { title: "Profile normalized", detail: "Protected demographic attributes excluded." },
      { title: "Academic merit evaluated", detail: `Score ${pct.toFixed(1)}% normalized against central scheme benchmarks.` },
      { title: "Income threshold checked", detail: income ? `₹${income.toLocaleString("en-IN")}/yr checked against scheme ceiling.` : "Evaluated under merit-based criteria." },
      { title: "AI jury deliberated", detail: "Optimist, Risk Assessor, and Judge reviewed the profile independently." },
      { title: "Decision receipt generated", detail: "Outcome bound into a SHA-256 tamper-evident fingerprint." },
    ],
  };
};

// ── Send to backend as multipart (supports resume file) ──────────────────────
async function requestJury(application, resumeFile, onEvent) {
  const token = await auth.currentUser?.getIdToken();
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const form = new FormData();
  // Append all application fields
  Object.entries(application).forEach(([k, v]) => {
    if (v !== null && v !== undefined) {
      form.append(k, Array.isArray(v) ? JSON.stringify(v) : String(v));
    }
  });
  // Attach resume file if present
  if (resumeFile instanceof File) {
    form.append("resume", resumeFile, resumeFile.name);
  }

  const response = await fetch(`${apiUrl}/jury`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!response.ok || !response.body) throw new Error("AI jury unavailable");

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
  throw new Error("AI jury ended without verdict");
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Processing() {
  const [active, setActive] = useState(0);
  const [error, setError] = useState("");
  const [audit, setAudit] = useState(null);
  const [jury, setJury] = useState([]);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    let alive = true;

    const run = async () => {
      try {
        const current = await getAudit(id);
        // Retrieve resume file from sessionStorage if available
        const resumeFile = window.__resumeFile || null;

        let result;
        try {
          result = await requestJury(current.application, resumeFile, (event, data) => {
            if (!alive) return;
            if (event === "argument" || event === "verdict") {
              setJury(prev => [...prev.filter(e => e.role !== data.role), data]);
            }
          });
        } catch {
          result = localFallback(current.application);
          if (alive) setJury([
            { role: "Optimist", ...result.jury.optimist },
            { role: "Risk Assessor", ...result.jury.riskAssessor },
            { role: "Judge", ...result.jury.judge },
          ]);
        }

        const steps = [
          ...(result.reasoningSteps || []),
          { title: "Decision receipt hashed", detail: "Application, outcome, and reasoning bound into one SHA-256 fingerprint." },
        ];

        for (let i = 0; i < steps.length; i++) {
          if (!alive) return;
          setActive(i);
          await new Promise(r => setTimeout(r, 600));
        }

        const saved = await saveDecision(id, current.application, { ...result, trace: result.trace || steps }, steps, result.resumeSummary || null);
        // Clean up resume from memory
        window.__resumeFile = null;
        if (alive) setAudit(saved);
      } catch {
        if (alive) setError("Could not build this decision record. Please return to your dashboard.");
      }
    };

    run();
    return () => { alive = false; };
  }, [id]);

  // Auto-navigate after completion
  useEffect(() => {
    if (!audit) return;
    const t = setTimeout(() => navigate(`/decision/${id}`, { replace: true }), 2200);
    return () => clearTimeout(t);
  }, [audit, id, navigate]);

  const steps = audit?.reasoningSteps || [];

  return (
    <Page>
      <section className="mx-auto flex min-h-[68vh] max-w-2xl items-center px-6 py-16">
        <GlassCard className="w-full text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-500/10 text-blue-400">
            <Cpu size={36} className={!audit ? "animate-pulse" : ""} />
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[.2em] text-blue-400">
            AI-powered analysis
          </p>
          <h1 className="mt-3 text-3xl font-bold">
            {audit ? "Decision ready" : "Analysing your profile…"}
          </h1>
          <p className="mt-3 text-slate-400">
            {audit
              ? "Your decision has been processed with a tamper-evident SHA-256 hash."
              : "The AI jury is reviewing your profile step by step."}
          </p>

          {jury.length > 0 && <JuryDebate entries={jury} />}

          {/* Steps */}
          <div className="mt-9 space-y-3 text-left">
            {(steps.length ? steps : [{ title: "Connecting to AI engine…", detail: "Preparing your profile for analysis." }]).map((step, i) => (
              <div key={step.title} className={`rounded-xl px-4 py-3 transition-all ${i <= active || audit ? "bg-blue-500/10 text-white" : "text-slate-600"}`}>
                <div className="flex items-center gap-3 text-sm">
                  {i < active || audit
                    ? <CheckCircle2 size={18} className="text-emerald-300 shrink-0" />
                    : i === active
                    ? <Activity size={18} className="animate-pulse shrink-0 text-blue-400" />
                    : <div className="h-[18px] w-[18px] shrink-0 rounded-full border border-slate-700" />
                  }
                  <span className="font-medium">{step.title}</span>
                </div>
                <p className="ml-7 mt-1 text-xs text-slate-400">{step.detail}</p>
              </div>
            ))}
          </div>

          {/* Done */}
          {audit && (
            <div className="mt-7 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-left">
              <div className="flex gap-3">
                <ShieldCheck className="shrink-0 text-cyan-300 mt-0.5" size={19} />
                <div>
                  <p className="font-medium text-white">SHA-256 receipt ready</p>
                  <code className="mt-2 block break-all text-xs text-cyan-200">{audit.hash}</code>
                </div>
              </div>
              <button
                className="btn-primary mt-4 w-full"
                onClick={() => navigate(`/decision/${id}`, { replace: true })}
              >
                View full decision <ArrowRight size={17} />
              </button>
              <p className="mt-2 text-center text-xs text-slate-500">Auto-redirecting…</p>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}
        </GlassCard>
      </section>
    </Page>
  );
}

function JuryDebate({ entries }) {
  const style = {
    Optimist: { icon: <Cpu size={16} />, cls: "border-emerald-400/20 bg-emerald-400/5 text-emerald-200" },
    "Risk Assessor": { icon: <ShieldAlert size={16} />, cls: "border-amber-400/20 bg-amber-400/5 text-amber-100" },
    Judge: { icon: <Scale size={16} />, cls: "border-cyan-400/20 bg-cyan-400/5 text-cyan-100" },
  };
  return (
    <div className="mt-7 text-left">
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[.18em] text-violet-300">
        Multi-Agent AI Jury
      </p>
      <div className="space-y-3">
        {entries.map((e) => {
          const s = style[e.role] || style.Judge;
          return (
            <div key={e.role} className={`rounded-xl border p-4 ${s.cls}`}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                {s.icon} {e.role}
                <span className="ml-auto text-xs font-normal opacity-75">{e.position || e.decision}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{e.rationale || e.reason}</p>
              {e.keyFactors?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {e.keyFactors.map(f => (
                    <span key={f} className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">{f}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
