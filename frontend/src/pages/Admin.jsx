import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  PieChart,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import Page from "../components/Page";
import GlassCard from "../components/GlassCard";
import StatsCard from "../components/StatsCard";
import Button from "../components/Button";
import api from "../api/api";
import { getAudits } from "../utils/audit";

const statusStyles = {
  "Pending review": "bg-amber-500/15 text-amber-200",
  "Under review": "bg-blue-500/15 text-blue-200",
  Resolved: "bg-emerald-500/15 text-emerald-200",
  Rejected: "bg-rose-500/15 text-rose-200",
};

const CHART_COLORS = {
  approved: "#34d399",
  review: "#fbbf24",
  low: "#34d399",
  medium: "#fbbf24",
  high: "#fb7185",
  cyan: "#22d3ee",
  blue: "#60a5fa",
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 120, damping: 14 },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 200, damping: 18 },
  },
};

export default function Admin() {
  const [user, setUser] = useState(null);
  const [audits, setAudits] = useState([]);
  const [loadingAudits, setLoadingAudits] = useState(true);
  const [auditError, setAuditError] = useState("");

  const [challenges, setChallenges] = useState([]);
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState("");

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // Load user's own decisions
  const loadAudits = async () => {
    setLoadingAudits(true);
    setAuditError("");
    try {
      const data = await getAudits();
      setAudits(data || []);
    } catch (err) {
      setAuditError(err.message || "Could not load your decisions.");
    } finally {
      setLoadingAudits(false);
    }
  };

  useEffect(() => {
    if (user) loadAudits();
    else setLoadingAudits(false);
  }, [user]);

  // Load admin challenges
  const loadChallenges = async () => {
    setLoading(true);
    setError("");
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Sign in with an administrator account to view the challenge queue.");
      const { data } = await api.get("/admin/challenges", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChallenges(data.challenges || []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          requestError.message ||
          "Could not load the challenge queue."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadChallenges();
  }, [user]);

  const visibleChallenges = useMemo(
    () =>
      filter === "All"
        ? challenges
        : challenges.filter((item) => item.challenge.status === filter),
    [challenges, filter]
  );
  const countS = (status) =>
    challenges.filter((item) => item.challenge.status === status).length;

  const updateStatus = async (item, status) => {
    const reviewNote =
      status === "Resolved"
        ? "Reviewed and resolved by EchoLedger operations."
        : status === "Rejected"
        ? "Reviewed and closed by EchoLedger operations."
        : "Review started by EchoLedger operations.";
    setUpdating(`${item.userId}-${item.id}`);
    setError("");
    try {
      const token = await auth.currentUser?.getIdToken();
      await api.patch(
        `/admin/challenges/${item.userId}/${item.id}`,
        { status, reviewNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setChallenges((items) =>
        items.map((challenge) =>
          challenge.id === item.id && challenge.userId === item.userId
            ? { ...challenge, challenge: { ...challenge.challenge, status, reviewNote } }
            : challenge
        )
      );
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Could not update this challenge.");
    } finally {
      setUpdating("");
    }
  };

  const completed = audits.filter((a) => a.status === "complete");
  const processing = audits.filter((a) => a.status === "processing");
  const completedCount = completed.length;
  const processingCount = processing.length;
  const challengedCount = audits.filter((a) => a.challenge).length;

  // Chart data
  const approvedCount = completed.filter((a) => a.result?.decision?.toLowerCase().includes("approv")).length;
  const reviewCount = completed.filter((a) => !a.result?.decision?.toLowerCase().includes("approv")).length;
  const outcomeData = [
    { name: "Approved", value: approvedCount, color: CHART_COLORS.approved },
    { name: "Review required", value: reviewCount, color: CHART_COLORS.review },
  ];

  const riskLow = completed.filter((a) => a.result?.risk === "Low").length;
  const riskMedium = completed.filter((a) => a.result?.risk === "Medium").length;
  const riskHigh = completed.filter((a) => a.result?.risk === "High").length;
  const riskData = [
    { name: "Low", value: riskLow, color: CHART_COLORS.low },
    { name: "Medium", value: riskMedium, color: CHART_COLORS.medium },
    { name: "High", value: riskHigh, color: CHART_COLORS.high },
  ];

  const confidenceBuckets = [0, 0, 0, 0, 0];
  completed.forEach((a) => {
    const c = Number(a.result?.confidence) || 0;
    if (c <= 20) confidenceBuckets[0]++;
    else if (c <= 40) confidenceBuckets[1]++;
    else if (c <= 60) confidenceBuckets[2]++;
    else if (c <= 80) confidenceBuckets[3]++;
    else confidenceBuckets[4]++;
  });
  const confidenceData = [
    { range: "0-20%", count: confidenceBuckets[0] },
    { range: "21-40%", count: confidenceBuckets[1] },
    { range: "41-60%", count: confidenceBuckets[2] },
    { range: "61-80%", count: confidenceBuckets[3] },
    { range: "81-100%", count: confidenceBuckets[4] },
  ];

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split("T")[0];
  });
  const decisionsByDate = last30Days.map((date) => {
    const count = audits.filter((a) => {
      if (!a.createdAt) return false;
      return new Date(a.createdAt).toISOString().split("T")[0] === date;
    }).length;
    return { date: new Date(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }), count };
  });

  const avgApprovedConfidence = approvedCount
    ? Math.round(completed.filter((a) => a.result?.decision?.toLowerCase().includes("approv")).reduce((s, a) => s + Number(a.result.confidence || 0), 0) / approvedCount)
    : 0;
  const avgReviewConfidence = reviewCount
    ? Math.round(completed.filter((a) => !a.result?.decision?.toLowerCase().includes("approv")).reduce((s, a) => s + Number(a.result.confidence || 0), 0) / reviewCount)
    : 0;
  const avgConfidenceData = [
    { name: "Approved", confidence: avgApprovedConfidence },
    { name: "Review req.", confidence: avgReviewConfidence },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-white/10 bg-slate-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur"
        >
          <p className="font-medium text-white">{label || payload[0].name}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>
          ))}
        </motion.div>
      );
    }
    return null;
  };

  const showCharts = completed.length >= 1 && user;

  return (
    <Page>
      <section className="mx-auto max-w-7xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"
        >
          <div>
            <span className="eyebrow"><ShieldCheck size={14} /> Insights dashboard</span>
            <h1 className="mt-4 text-4xl font-bold">Your <span className="gradient-text">decisions</span></h1>
            <p className="mt-2 text-slate-400">
              {user
                ? `Hi, ${user.displayName?.split(" ")[0] || "there"}! View all your past decision records.`
                : "Sign in to see your decision history."}
            </p>
          </div>
          {user && (
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button onClick={loadAudits} disabled={loadingAudits}>
                <RefreshCw size={16} className={loadingAudits ? "animate-spin" : ""} /> Refresh
              </Button>
            </motion.div>
          )}
        </motion.div>

        {/* Stats cards */}
        {user && audits.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {[
              { icon: FileText, tone: "text-blue-300", label: "Total decisions", value: audits.length, detail: "All your submitted applications" },
              { icon: CheckCircle2, tone: "text-emerald-400", label: "Completed", value: completedCount, detail: "Fully processed decisions" },
              { icon: Clock3, tone: "text-amber-300", label: "Processing", value: processingCount, detail: "Awaiting completion" },
              { icon: ShieldAlert, tone: "text-purple-300", label: "Challenged", value: challengedCount, detail: "Decisions under dispute" },
            ].map((card, i) => (
              <motion.div key={card.label} variants={itemVariants}>
                <StatsCard {...card} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Charts */}
        {showCharts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-8"
          >
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="flex items-center gap-2 mb-5"
            >
              <BarChart3 size={20} className="text-blue-400" />
              <h2 className="text-xl font-bold">Analytics & charts</h2>
            </motion.div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
            >
              {/* Outcome Pie */}
              <motion.div variants={scaleIn}>
                <GlassCard>
                  <div className="flex items-center gap-2 mb-3">
                    <PieChart size={18} className="text-emerald-400" />
                    <h3 className="font-semibold">Decision outcomes</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <RechartsPie>
                      <Pie data={outcomeData.filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                        {outcomeData.filter(d => d.value > 0).map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </RechartsPie>
                  </ResponsiveContainer>
                  <div className="mt-2 flex justify-center gap-4 text-xs">
                    {outcomeData.map(d => (
                      <span key={d.name} className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.name}: {d.value}
                      </span>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>

              {/* Risk Bar */}
              <motion.div variants={scaleIn}>
                <GlassCard>
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 size={18} className="text-violet-400" />
                    <h3 className="font-semibold">Risk distribution</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={riskData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {riskData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </GlassCard>
              </motion.div>

              {/* Confidence Area */}
              <motion.div variants={scaleIn}>
                <GlassCard>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={18} className="text-cyan-400" />
                    <h3 className="font-semibold">Confidence scores</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={confidenceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="range" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="count" stroke={CHART_COLORS.cyan} fill={CHART_COLORS.cyan} fillOpacity={0.15} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </GlassCard>
              </motion.div>

              {/* Timeline (full width) */}
              <motion.div variants={scaleIn} className="sm:col-span-2 xl:col-span-3">
                <GlassCard>
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 size={18} className="text-blue-400" />
                    <h3 className="font-semibold">Decisions over time (last 30 days)</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={decisionsByDate}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={CHART_COLORS.blue}>
                        {decisionsByDate.map((entry, i) => <Cell key={i} fill={entry.count > 0 ? CHART_COLORS.blue : "rgba(96,165,250,0.15)"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </GlassCard>
              </motion.div>

              {/* Avg confidence (full width) */}
              <motion.div variants={scaleIn} className="sm:col-span-2 xl:col-span-3">
                <GlassCard>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={18} className="text-emerald-400" />
                    <h3 className="font-semibold">Average confidence by outcome</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={avgConfidenceData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                      <Bar dataKey="confidence" radius={[0, 6, 6, 0]} barSize={28}>
                        {avgConfidenceData.map((entry, i) => <Cell key={i} fill={i === 0 ? CHART_COLORS.approved : CHART_COLORS.review} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </GlassCard>
              </motion.div>
            </motion.div>
          </motion.div>
        )}

        {/* Decision history */}
        {!user ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <GlassCard className="mt-9 p-10 text-center">
              <p className="text-slate-400">Please sign in to view your decision history and insights.</p>
            </GlassCard>
          </motion.div>
        ) : loadingAudits ? (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-9 text-center text-slate-400">Loading your decisions…</motion.p>
        ) : auditError ? (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-9 rounded-xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">{auditError}</motion.p>
        ) : audits.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 20 }}>
            <GlassCard className="mt-9 p-10 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, delay: 0.15 }}>
                <FileText size={40} className="mx-auto text-slate-600" />
              </motion.div>
              <h3 className="mt-4 text-lg font-semibold">No decisions yet</h3>
              <p className="mt-2 text-sm text-slate-400">You haven't submitted any applications yet. Start a new decision to see it here.</p>
              <motion.div className="mt-6" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link to="/loan" className="btn-primary inline-flex">New decision <ArrowRight size={17} /></Link>
              </motion.div>
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <GlassCard className="mt-9 overflow-hidden p-0">
              <div className="border-b border-white/10 px-6 py-4">
                <h2 className="font-semibold">Your decision history</h2>
                <p className="mt-1 text-sm text-slate-400">All your past decisions, sorted by most recent</p>
              </div>
              <div className="divide-y divide-white/10">
                {audits.map((audit, index) => {
                  const app = audit.application || {};
                  const res = audit.result || {};
                  const statusColor = audit.status === "complete"
                    ? "text-emerald-300"
                    : audit.status === "processing"
                    ? "text-amber-200"
                    : "text-slate-500";
                  return (
                    <motion.div
                      key={audit.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + index * 0.04, duration: 0.3 }}
                      className="p-5 transition hover:bg-white/[.02]"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-white truncate">{app.name || "Unnamed"}</h3>
                            <span className={`text-xs font-medium uppercase tracking-wider ${statusColor}`}>{audit.status}</span>
                            {audit.challenge && (
                              <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-xs font-medium text-purple-200">Challenged</span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {audit.id?.slice(0, 12)}... ·{" "}
                            {audit.createdAt ? new Date(audit.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                          </p>
                          {res.decision && (
                            <p className="mt-2 text-sm text-slate-300">
                              <span className="font-medium">{res.decision}</span>
                              {res.confidence && ` · ${res.confidence}% confidence`}
                              {res.risk && ` · ${res.risk} risk`}
                            </p>
                          )}
                          {app.loanAmount && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              ₹{Number(app.loanAmount).toLocaleString("en-IN")} · {app.employment || "—"}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          {audit.status === "complete" && (
                            <>
                              <Link to={`/decision/${audit.id}`} className="secondary-btn !px-3 !py-2 text-xs">View</Link>
                              <Link to={`/trace/${audit.id}`} className="secondary-btn !px-3 !py-2 text-xs">Trace</Link>
                            </>
                          )}
                          {audit.status === "processing" && (
                            <Link to={`/processing/${audit.id}`} className="secondary-btn !px-3 !py-2 text-xs">Processing</Link>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Admin challenge queue */}
        {challenges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-12 border-t border-white/10 pt-10"
          >
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
              <div>
                <h2 className="text-2xl font-bold">Challenge <span className="gradient-text">queue</span></h2>
                <p className="mt-1 text-sm text-slate-400">Review and resolve challenges submitted across every EchoLedger account.</p>
              </div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button onClick={loadChallenges} disabled={loading}>
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
                </Button>
              </motion.div>
            </div>

            {error && <p className="mt-6 rounded-xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</p>}

            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { icon: ShieldAlert, tone: "text-amber-300", label: "All challenges", value: challenges.length, detail: "Every submitted review request" },
                { icon: Clock3, tone: "text-blue-300", label: "Open queue", value: countS("Pending review") + countS("Under review"), detail: "Awaiting a final outcome" },
                { icon: CheckCircle2, tone: "text-emerald-400", label: "Resolved", value: countS("Resolved"), detail: "Closed with resolution" },
                { icon: XCircle, tone: "text-rose-400", label: "Rejected", value: countS("Rejected"), detail: "Closed without change" },
              ].map((card) => (
                <motion.div key={card.label} variants={itemVariants}>
                  <StatsCard {...card} />
                </motion.div>
              ))}
            </motion.div>

            <GlassCard className="mt-6 overflow-hidden p-0">
              <div className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-semibold">All submitted challenges</h2>
                  <p className="mt-1 text-sm text-slate-400">Only users with the Firebase admin role can view or update these records.</p>
                </div>
                <select value={filter} onChange={e => setFilter(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
                  <option>All</option>
                  {Object.keys(statusStyles).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              {loading ? (
                <p className="p-10 text-center text-slate-400">Loading administrator queue…</p>
              ) : visibleChallenges.length ? (
                <div className="divide-y divide-white/10">
                  {visibleChallenges.map((item, i) => (
                    <motion.div
                      key={`${item.userId}-${item.id}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.25 }}
                    >
                      <ChallengeRow item={item} updating={updating === `${item.userId}-${item.id}`} onUpdate={updateStatus} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="p-10 text-center text-slate-500">No challenges match this filter.</p>
              )}
            </GlassCard>
          </motion.div>
        )}
      </section>
    </Page>
  );
}

function ChallengeRow({ item, updating, onUpdate }) {
  const { application = {}, challenge = {}, result = {} } = item;
  return (
    <article className="p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-semibold text-white">{application.name || "Unnamed applicant"}</h3>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[challenge.status] || statusStyles["Pending review"]}`}>
              {challenge.status || "Pending review"}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">{item.requester} · {new Date(challenge.submittedAt || item.createdAt).toLocaleString()}</p>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-200">{challenge.reason}</p>
          {challenge.evidence && <p className="mt-3 text-xs text-blue-300">Evidence attached: {challenge.evidence}</p>}
        </div>
        <div className="min-w-48 rounded-xl border border-white/10 bg-black/10 p-4 text-sm">
          <p className="text-slate-500">Decision record</p>
          <p className="mt-1 font-medium">{result.decision || "Processing"}</p>
          <p className="mt-1 text-slate-400">Risk: {result.risk || "—"} · Confidence: {result.confidence ?? "—"}%</p>
        </div>
      </div>
      {challenge.reviewNote && <p className="mt-4 rounded-lg bg-white/[.04] p-3 text-sm text-slate-300">Reviewer note: {challenge.reviewNote}</p>}
      <div className="mt-5 flex flex-wrap gap-2">
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          disabled={updating || challenge.status === "Under review"}
          onClick={() => onUpdate(item, "Under review")}
          className="secondary-btn !px-3 !py-2 text-xs"
        >Start review</motion.button>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          disabled={updating || challenge.status === "Resolved"}
          onClick={() => onUpdate(item, "Resolved")}
          className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-200 disabled:opacity-50"
        >Resolve</motion.button>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          disabled={updating || challenge.status === "Rejected"}
          onClick={() => onUpdate(item, "Rejected")}
          className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-medium text-rose-200 disabled:opacity-50"
        >Reject</motion.button>
      </div>
    </article>
  );
}