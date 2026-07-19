import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, RefreshCw, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import Page from "../components/Page";
import GlassCard from "../components/GlassCard";
import StatsCard from "../components/StatsCard";
import Button from "../components/Button";
import api from "../api/api";
import { auth } from "../firebase";

const statusStyles = {
  "Pending review": "bg-amber-500/15 text-amber-200",
  "Under review": "bg-blue-500/15 text-blue-200",
  Resolved: "bg-emerald-500/15 text-emerald-200",
  Rejected: "bg-rose-500/15 text-rose-200",
};

export default function Admin() {
  const [challenges, setChallenges] = useState([]);
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState("");

  const loadChallenges = async () => {
    setLoading(true); setError("");
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Sign in with an administrator account to view the challenge queue.");
      const { data } = await api.get("/admin/challenges", { headers: { Authorization: `Bearer ${token}` } });
      setChallenges(data.challenges || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || "Could not load the challenge queue.");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadChallenges(); }, []);
  const visibleChallenges = useMemo(() => filter === "All" ? challenges : challenges.filter((item) => item.challenge.status === filter), [challenges, filter]);
  const count = (status) => challenges.filter((item) => item.challenge.status === status).length;
  const updateStatus = async (item, status) => {
    const reviewNote = status === "Resolved" ? "Reviewed and resolved by EchoLedger operations." : status === "Rejected" ? "Reviewed and closed by EchoLedger operations." : "Review started by EchoLedger operations.";
    setUpdating(`${item.userId}-${item.id}`); setError("");
    try {
      const token = await auth.currentUser?.getIdToken();
      await api.patch(`/admin/challenges/${item.userId}/${item.id}`, { status, reviewNote }, { headers: { Authorization: `Bearer ${token}` } });
      setChallenges((items) => items.map((challenge) => challenge.id === item.id && challenge.userId === item.userId ? { ...challenge, challenge: { ...challenge.challenge, status, reviewNote } } : challenge));
    } catch (requestError) { setError(requestError.response?.data?.error || "Could not update this challenge."); }
    finally { setUpdating(""); }
  };

  return <Page><section className="mx-auto max-w-7xl px-6 py-12">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><span className="eyebrow"><ShieldCheck size={14} /> Administrator workspace</span><h1 className="mt-4 text-4xl font-bold">Challenge <span className="gradient-text">queue</span></h1><p className="mt-2 text-slate-400">Review and resolve challenges submitted across every EchoLedger account.</p></div><Button onClick={loadChallenges} disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh</Button></div>
    {error && <p className="mt-6 rounded-xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</p>}
    <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatsCard icon={ShieldAlert} tone="text-amber-300" label="All challenges" value={challenges.length} detail="Every submitted review request" /><StatsCard icon={Clock3} tone="text-blue-300" label="Open queue" value={count("Pending review") + count("Under review")} detail="Awaiting a final outcome" /><StatsCard icon={CheckCircle2} tone="text-emerald-400" label="Resolved" value={count("Resolved")} detail="Closed with resolution" /><StatsCard icon={XCircle} tone="text-rose-400" label="Rejected" value={count("Rejected")} detail="Closed without change" /></div>
    <GlassCard className="mt-6 overflow-hidden p-0"><div className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center"><div><h2 className="font-semibold">All submitted challenges</h2><p className="mt-1 text-sm text-slate-400">Only users with the Firebase admin role can view or update these records.</p></div><select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"><option>All</option>{Object.keys(statusStyles).map((status) => <option key={status}>{status}</option>)}</select></div>
      {loading ? <p className="p-10 text-center text-slate-400">Loading administrator queue…</p> : visibleChallenges.length ? <div className="divide-y divide-white/10">{visibleChallenges.map((item) => <ChallengeRow key={`${item.userId}-${item.id}`} item={item} updating={updating === `${item.userId}-${item.id}`} onUpdate={updateStatus} />)}</div> : <p className="p-10 text-center text-slate-500">No challenges match this filter.</p>}
    </GlassCard>
  </section></Page>;
}

function ChallengeRow({ item, updating, onUpdate }) {
  const { application = {}, challenge = {}, result = {} } = item;
  return <article className="p-6"><div className="flex flex-col justify-between gap-4 lg:flex-row"><div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h3 className="font-semibold text-white">{application.name || "Unnamed applicant"}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[challenge.status] || statusStyles["Pending review"]}`}>{challenge.status || "Pending review"}</span></div><p className="mt-1 text-sm text-slate-400">{item.requester} · {new Date(challenge.submittedAt || item.createdAt).toLocaleString()}</p><p className="mt-4 max-w-3xl text-sm leading-6 text-slate-200">{challenge.reason}</p>{challenge.evidence && <p className="mt-3 text-xs text-blue-300">Evidence attached: {challenge.evidence}</p>}</div><div className="min-w-48 rounded-xl border border-white/10 bg-black/10 p-4 text-sm"><p className="text-slate-500">Decision record</p><p className="mt-1 font-medium">{result.decision || "Processing"}</p><p className="mt-1 text-slate-400">Risk: {result.risk || "—"} · Confidence: {result.confidence ?? "—"}%</p></div></div>
    {challenge.reviewNote && <p className="mt-4 rounded-lg bg-white/[.04] p-3 text-sm text-slate-300">Reviewer note: {challenge.reviewNote}</p>}
    <div className="mt-5 flex flex-wrap gap-2"><button disabled={updating || challenge.status === "Under review"} onClick={() => onUpdate(item, "Under review")} className="secondary-btn !px-3 !py-2 text-xs">Start review</button><button disabled={updating || challenge.status === "Resolved"} onClick={() => onUpdate(item, "Resolved")} className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-200 disabled:opacity-50">Resolve</button><button disabled={updating || challenge.status === "Rejected"} onClick={() => onUpdate(item, "Rejected")} className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-medium text-rose-200 disabled:opacity-50">Reject</button></div>
  </article>;
}
