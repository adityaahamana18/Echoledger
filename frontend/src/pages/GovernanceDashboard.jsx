import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  DollarSign,
  Flame,
  Scale,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { getAudits } from "../utils/audit";
import Page from "../components/Page";
import GlassCard from "../components/GlassCard";

const COST_PER_DECISION = 0.04; // $ per AI decision (Groq estimate)

const DEPT_MAP = {
  banking: "Banking",
  insurance: "Insurance",
  hiring: "HR & Hiring",
  healthcare: "Healthcare",
  government: "Government",
  education: "Education",
  "customer-support": "Customer Support",
};

const RISK_COLOR = { Low: "#34d399", Medium: "#fbbf24", High: "#fb7185" };

function TrustRing({ score }) {
  const r = 72;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 85 ? "#34d399" : score >= 65 ? "#fbbf24" : "#fb7185";

  return (
    <div className="relative flex items-center justify-center">
      <svg width={180} height={180} className="-rotate-90">
        <circle cx={90} cy={90} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={14} />
        <motion.circle
          cx={90} cy={90} r={r} fill="none"
          stroke={color} strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span
          className="text-4xl font-bold text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-slate-400 mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color = "text-blue-400", trend }) {
  return (
    <GlassCard className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Icon size={18} className={color} />
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs font-semibold text-slate-300">{label}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </GlassCard>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/95 px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-white mb-1">{label || payload[0].name}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }} className="font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function GovernanceDashboard() {
  const [user, setUser] = useState(null);
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const data = await getAudits();
          setAudits(data || []);
        } catch (_) {}
      }
      setLoading(false);
    });
  }, []);

  const completed = audits.filter((a) => a.status === "complete");
  const total = audits.length;

  // --- Trust Score (composite) ---
  const approvedCount = completed.filter((a) =>
    a.result?.decision?.toLowerCase().match(/approv|eligible|shortlist|admit|standard/)
  ).length;
  const avgConfidence = completed.length
    ? Math.round(completed.reduce((s, a) => s + Number(a.result?.confidence || 0), 0) / completed.length)
    : 0;
  const biasCount = completed.filter((a) => Number(a.result?.biasAudit?.score || 0) > 30).length;
  const challengedCount = audits.filter((a) => a.challenge).length;
  const biasRate = completed.length ? Math.round((biasCount / completed.length) * 100) : 0;
  const appealRate = total ? Math.round((challengedCount / total) * 100) : 0;
  const trustScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(avgConfidence * 0.4 + (100 - biasRate) * 0.3 + (100 - appealRate) * 0.2 + (completed.length ? 10 : 0))
    )
  );

  // --- Compliance score ---
  const withHash = completed.filter((a) => a.hash).length;
  const complianceScore = completed.length ? Math.round((withHash / completed.length) * 100) : 0;

  // --- AI Cost ---
  const aiCost = (total * COST_PER_DECISION).toFixed(2);

  // --- Departments breakdown ---
  const deptMap = {};
  audits.forEach((a) => {
    const dept = DEPT_MAP[a.application?.industry] || "Other";
    if (!deptMap[dept]) deptMap[dept] = { decisions: 0, approved: 0 };
    deptMap[dept].decisions++;
    if (a.result?.decision?.toLowerCase().match(/approv|eligible|shortlist|admit|standard/))
      deptMap[dept].approved++;
  });
  const deptData = Object.entries(deptMap)
    .map(([name, d]) => ({ name, decisions: d.decisions, approved: d.approved }))
    .sort((a, b) => b.decisions - a.decisions);

  // --- Risk Heatmap ---
  const HEATMAP_DEPTS = [
    { key: "banking",          label: "Banking" },
    { key: "insurance",        label: "Insurance" },
    { key: "hiring",           label: "HR & Hiring" },
    { key: "healthcare",       label: "Healthcare" },
    { key: "government",       label: "Government" },
    { key: "education",        label: "Education" },
    { key: "customer-support", label: "Customer Support" },
  ];
  const HEATMAP_DIMS = ["Bias", "Confidence", "Appeals", "Compliance"];

  const heatmapRows = HEATMAP_DEPTS.map(({ key, label }) => {
    const rows = completed.filter((a) => a.application?.industry === key);
    if (rows.length === 0) return null;

    const avgBias = rows.reduce((s, a) => s + Number(a.result?.biasAudit?.score || 0), 0) / rows.length;
    const avgConf = rows.reduce((s, a) => s + Number(a.result?.confidence || 0), 0) / rows.length;
    const appeals = audits.filter((a) => a.application?.industry === key && a.challenge).length;
    const appealPct = (appeals / rows.length) * 100;
    const hashed = rows.filter((a) => a.hash).length;
    const compPct = (hashed / rows.length) * 100;

    // score: 0=green, 1=yellow, 2=red
    const biasScore   = avgBias > 40 ? 2 : avgBias > 20 ? 1 : 0;
    const confScore   = avgConf < 50 ? 2 : avgConf < 70 ? 1 : 0;
    const appealScore = appealPct > 30 ? 2 : appealPct > 10 ? 1 : 0;
    const compScore   = compPct < 60 ? 2 : compPct < 90 ? 1 : 0;
    const overall     = Math.max(biasScore, confScore, appealScore, compScore);

    return { label, scores: [biasScore, confScore, appealScore, compScore], overall, count: rows.length };
  }).filter(Boolean);

  const HEAT_COLOR = [
    { bg: "bg-emerald-500/20", border: "border-emerald-500/30", text: "text-emerald-300", dot: "#34d399", label: "Low" },
    { bg: "bg-amber-500/20",   border: "border-amber-500/30",   text: "text-amber-300",   dot: "#fbbf24", label: "Med" },
    { bg: "bg-rose-500/20",    border: "border-rose-500/30",    text: "text-rose-300",    dot: "#fb7185", label: "High" },
  ];

  // --- Top Risks ---
  const highRisk = completed.filter((a) => a.result?.risk === "High");
  const topRisks = [
    highRisk.length > 0 && {
      label: "High-risk decisions",
      detail: `${highRisk.length} decision${highRisk.length > 1 ? "s" : ""} flagged as high risk`,
      severity: "High",
    },
    biasCount > 0 && {
      label: "Elevated bias signals",
      detail: `${biasCount} decision${biasCount > 1 ? "s" : ""} with bias score > 30`,
      severity: "Medium",
    },
    challengedCount > 0 && {
      label: "Pending appeals",
      detail: `${challengedCount} challenge${challengedCount > 1 ? "s" : ""} awaiting resolution`,
      severity: "Medium",
    },
    completed.filter((a) => !a.hash).length > 0 && {
      label: "Unverified decisions",
      detail: `${completed.filter((a) => !a.hash).length} records missing audit hash`,
      severity: "Low",
    },
  ].filter(Boolean);

  // --- 30-day timeline ---
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split("T")[0];
  });
  const timelineData = last14.map((date) => ({
    date: new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    decisions: audits.filter((a) => a.createdAt?.startsWith(date)).length,
  }));

  if (!user && !loading) {
    return (
      <Page>
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <ShieldCheck size={40} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">Sign in to view the Governance Dashboard.</p>
        </div>
      </Page>
    );
  }

  if (loading) {
    return (
      <Page>
        <p className="mx-auto max-w-5xl px-6 py-20 text-center text-slate-400">Loading dashboard…</p>
      </Page>
    );
  }

  return (
    <Page>
      <section className="mx-auto max-w-7xl px-6 py-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <span className="eyebrow"><ShieldCheck size={14} /> CEO Governance Dashboard</span>
          <h1 className="mt-4 text-4xl font-bold">
            AI <span className="gradient-text">Governance</span> Overview
          </h1>
          <p className="mt-2 text-slate-400">
            Real-time trust, compliance, and risk metrics across all AI decisions.
          </p>
        </motion.div>

        {/* Trust Score + KPIs */}
        <div className="mt-10 grid gap-6 lg:grid-cols-4">
          {/* Trust Score Ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="lg:col-span-1"
          >
            <GlassCard className="flex flex-col items-center gap-3 py-7">
              <p className="eyebrow text-center"><Zap size={13} /> Trust Score</p>
              <TrustRing score={trustScore} />
              <p className="text-xs text-slate-400 text-center max-w-[160px]">
                Composite of confidence, bias, appeals & compliance
              </p>
            </GlassCard>
          </motion.div>

          {/* KPI grid */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="lg:col-span-3 grid grid-cols-2 gap-4 sm:grid-cols-3"
          >
            <KpiCard icon={CheckCircle2} label="Compliance Score" value={`${complianceScore}%`} sub="Decisions with audit hash" color="text-emerald-400" trend={complianceScore > 80 ? 2 : -3} />
            <KpiCard icon={Scale} label="Bias Rate" value={`${biasRate}%`} sub="Decisions with bias > 30" color="text-violet-400" trend={biasRate === 0 ? 0 : -biasRate} />
            <KpiCard icon={AlertTriangle} label="Appeals" value={challengedCount} sub={`${appealRate}% of total decisions`} color="text-amber-400" />
            <KpiCard icon={BarChart3} label="Avg Confidence" value={`${avgConfidence}%`} sub="Across completed decisions" color="text-cyan-400" trend={avgConfidence > 70 ? 4 : -2} />
            <KpiCard icon={ShieldCheck} label="Total Decisions" value={total} sub={`${completed.length} completed`} color="text-slate-300" />
          </motion.div>
        </div>

        {/* Timeline + Departments */}
        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          {/* Decision timeline */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3"
          >
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={17} className="text-blue-400" />
                <h2 className="font-semibold">Decision volume (last 14 days)</h2>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="decisions" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.12} strokeWidth={2} name="Decisions" />
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>

          {/* Departments */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="lg:col-span-2"
          >
            <GlassCard className="h-full">
              <div className="flex items-center gap-2 mb-4">
                <Building2 size={17} className="text-violet-400" />
                <h2 className="font-semibold">Departments</h2>
              </div>
              {deptData.length === 0 ? (
                <p className="text-sm text-slate-500">No department data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={deptData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="decisions" radius={[0, 6, 6, 0]} fill="#818cf8" name="Decisions" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </GlassCard>
          </motion.div>
        </div>

        {/* Risk Heatmap */}
        {heatmapRows.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="mt-8"
          >
            <GlassCard>
              <div className="flex items-center gap-2 mb-6">
                <Flame size={17} className="text-orange-400" />
                <h2 className="font-semibold">AI Risk Heatmap</h2>
                <span className="ml-auto flex items-center gap-3 text-xs text-slate-500">
                  {HEAT_COLOR.map((c) => (
                    <span key={c.label} className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full" style={{ background: c.dot }} />
                      {c.label} risk
                    </span>
                  ))}
                </span>
              </div>

              {/* Header row */}
              <div className="grid gap-2" style={{ gridTemplateColumns: "160px repeat(4, 1fr) 80px" }}>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Department</p>
                {HEATMAP_DIMS.map((d) => (
                  <p key={d} className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">{d}</p>
                ))}
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">Overall</p>
              </div>

              <div className="mt-3 space-y-2">
                {heatmapRows.map((row, i) => (
                  <motion.div
                    key={row.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="grid items-center gap-2 rounded-xl border border-white/[.06] bg-white/[.02] px-3 py-3"
                    style={{ gridTemplateColumns: "160px repeat(4, 1fr) 80px" }}
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{row.label}</p>
                      <p className="text-[10px] text-slate-500">{row.count} decision{row.count > 1 ? "s" : ""}</p>
                    </div>
                    {row.scores.map((s, j) => {
                      const c = HEAT_COLOR[s];
                      return (
                        <div key={j} className={`mx-auto flex h-8 w-full max-w-[80px] items-center justify-center rounded-lg border text-xs font-bold ${c.bg} ${c.border} ${c.text}`}>
                          {c.label}
                        </div>
                      );
                    })}
                    <div className={`mx-auto flex h-8 w-16 items-center justify-center rounded-lg border text-xs font-bold ${HEAT_COLOR[row.overall].bg} ${HEAT_COLOR[row.overall].border} ${HEAT_COLOR[row.overall].text}`}>
                      {HEAT_COLOR[row.overall].label}
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Top Risks */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <GlassCard>
            <div className="flex items-center gap-2 mb-5">
              <AlertTriangle size={17} className="text-rose-400" />
              <h2 className="font-semibold">Top Risks</h2>
            </div>
            {topRisks.length === 0 ? (
              <div className="flex items-center gap-3 text-emerald-400">
                <CheckCircle2 size={18} />
                <p className="text-sm font-medium">No active risks detected. All systems nominal.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {topRisks.map((risk, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + i * 0.06 }}
                    className="rounded-xl border border-white/10 bg-white/[.03] p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <AlertTriangle size={15} className={RISK_COLOR[risk.severity] ? "" : "text-slate-400"} style={{ color: RISK_COLOR[risk.severity] }} />
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: RISK_COLOR[risk.severity], background: `${RISK_COLOR[risk.severity]}18` }}
                      >
                        {risk.severity}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white">{risk.label}</p>
                    <p className="mt-1 text-xs text-slate-400">{risk.detail}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      </section>
    </Page>
  );
}
