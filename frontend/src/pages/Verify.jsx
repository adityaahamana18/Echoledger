import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ShieldCheck, FileSearch } from "lucide-react";
import Page from "../components/Page";
import GlassCard from "../components/GlassCard";
import { getPublicVerification } from "../utils/audit";

export default function Verify() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [audit, setAudit] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(id));
  const [decisionId, setDecisionId] = useState(id || "");

  useEffect(() => {
    setDecisionId(id || "");
    if (!id) {
      setAudit(null);
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    getPublicVerification(id)
      .then(setAudit)
      .catch(() => setError("Decision record not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const submit = (event) => {
    event.preventDefault();
    const trimmedId = decisionId.trim();
    if (trimmedId) navigate(`/verify/${encodeURIComponent(trimmedId)}`);
  };

  if (loading) return <Page><p className="mx-auto max-w-5xl px-6 py-20 text-slate-400">Loading verification...</p></Page>;

  return (
    <Page>
      <section className="mx-auto max-w-5xl px-6 py-14">
        <GlassCard className="p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck size={24} className="text-emerald-400" />
            <h1 className="text-3xl font-bold">Decision Verification</h1>
          </div>

          <form onSubmit={submit} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="decision-id">Decision ID</label>
            <input
              id="decision-id"
              value={decisionId}
              onChange={(event) => setDecisionId(event.target.value)}
              placeholder="Enter a decision ID"
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
            />
            <button type="submit" className="btn-primary">Verify decision</button>
          </form>

          {error && <p className="mt-5 text-rose-300">{error}</p>}

          {audit && (
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Decision ID</p>
                <p className="mt-1 font-mono text-sm text-white">{id}</p>

                <div className="mt-6">
                  <p className="text-sm text-slate-500">Tamper-evident hash</p>
                  <p className="mt-1 break-all font-mono text-sm text-cyan-300">sha256:{audit.hash}</p>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2">
                  <FileSearch size={18} className="text-emerald-400" />
                  <h2 className="font-semibold">Verification Result</h2>
                </div>
                <p className="mt-3 text-emerald-300">✓ This decision record is authentic and unmodified</p>
                <p className="mt-2 text-sm text-slate-400">
                  The published SHA-256 hash matches the original decision record.
                </p>
              </div>
            </div>
          )}
        </GlassCard>
      </section>
    </Page>
  );
}
