import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Paperclip, Scale, Wallet, TriangleAlert } from "lucide-react";
import Page from "../components/Page";
import GlassCard from "../components/GlassCard";
import Button from "../components/Button";
import { challengeAudit, getAudit } from "../utils/audit";
import { challengeDecision, isBlockchainConfigured, minimumStake } from "../blockchain/simpleDispute";

export default function Challenge() {
  const [audit, setAudit] = useState(null);
  const { id } = useParams();
  const [reason, setReason] = useState("");
  const [file, setFile] = useState(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [challengeMode, setChallengeMode] = useState("local"); // "local" or "onchain"
  const [challengeTx, setChallengeTx] = useState(null);

  useEffect(() => {
    getAudit(id).then(setAudit).catch(() => setAudit(false));
  }, [id]);

  if (audit === false) return <Page><p className="mx-auto max-w-2xl px-6 py-20 text-rose-300">Decision record not found.</p></Page>;
  if (!audit) return <Page><p className="mx-auto max-w-2xl px-6 py-20 text-slate-400">Loading decision record…</p></Page>;

  const submit = async (event) => {
    event.preventDefault();
    if (reason.trim().length < 20) return setError("Please provide at least 20 characters.");
    setSubmitting(true);
    setError("");

    try {
      if (challengeMode === "onchain" && isBlockchainConfigured()) {
        // On-chain challenge via MetaMask
        const receipt = await challengeDecision(id, reason);
        setChallengeTx(receipt.transactionHash);
        // Also save to Firestore for record
        await challengeAudit(id, {
          reason,
          evidence: file?.name || null,
          status: "Submitted on-chain",
          source: "Human (on-chain)",
          transactionHash: receipt.transactionHash,
          submittedAt: new Date().toISOString(),
        });
      } else {
        // Local/Firebase challenge (demo mode — no ETH/blockchain required)
        await challengeAudit(id, {
          reason,
          evidence: file?.name || null,
          status: "Pending review",
          source: "Human",
        });
      }
      setSent(true);
    } catch (challengeError) {
      setError(challengeError.shortMessage || challengeError.message || "Challenge submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page>
      <section className="mx-auto max-w-2xl px-6 py-14">
        <span className="eyebrow"><Scale size={14} /> Challenge decision</span>
        <h1 className="mt-4 text-4xl font-bold">Challenge this <span className="gradient-text">decision</span></h1>
        <p className="mt-3 text-slate-400">
          {challengeMode === "onchain"
            ? `Submit an on-chain challenge via MetaMask (min. stake: ${minimumStake} ETH).`
            : "Submit your concerns for a human admin review. No ETH or wallet required."}
        </p>

        {/* Mode switcher */}
        {isBlockchainConfigured() && !sent && (
          <div className="mt-5 flex gap-2 rounded-xl border border-white/10 bg-white/[.03] p-1">
            <button
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${challengeMode === "local" ? "bg-blue-500/20 text-blue-300" : "text-slate-400 hover:text-white"}`}
              onClick={() => { setChallengeMode("local"); setError(""); }}
            >
              Demo (Firebase)
            </button>
            <button
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${challengeMode === "onchain" ? "bg-blue-500/20 text-blue-300" : "text-slate-400 hover:text-white"}`}
              onClick={() => { setChallengeMode("onchain"); setError(""); }}
            >
              <Wallet size={14} className="inline mr-1" /> On-chain
            </button>
          </div>
        )}

        <GlassCard className="mt-9">
          {sent ? (
            <div className="py-8 text-center">
              <CheckCircle2 size={44} className="mx-auto text-emerald-400" />
              <h2 className="mt-4 text-2xl font-semibold">Challenge submitted</h2>
              {challengeTx ? (
                <div className="mt-4 space-y-2">
                  <p className="text-slate-400">Your on-chain challenge has been recorded.</p>
                  <p className="break-all rounded-lg bg-black/20 p-3 font-mono text-xs text-cyan-300">
                    Tx: {challengeTx}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-slate-400">An admin will review your challenge. You can track its status on the dashboard.</p>
              )}
              <Link to="/admin" className="btn-primary mt-7 inline-flex">View review queue</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-6">
              <label className="block text-sm font-medium text-slate-300">
                Why should this decision be reviewed?
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required minLength={20}
                  rows={6}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                />
              </label>
              <label className="block cursor-pointer rounded-xl border border-dashed border-slate-600 bg-white/[.02] p-5 text-center text-sm text-slate-400 hover:border-blue-500">
                <Paperclip size={20} className="mx-auto mb-2 text-blue-400" />
                {file ? file.name : "Attach supporting evidence (optional)"}
                <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0])} />
              </label>

              {challengeMode === "onchain" && (
                <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200">
                  <TriangleAlert className="inline mr-2" size={17} />
                  This will open MetaMask to submit an on-chain challenge. A minimum stake of <strong>{minimumStake} ETH</strong> is required.
                </div>
              )}

              {error && <p className="text-sm text-rose-300">{error}</p>}

              <Button type="submit" disabled={submitting}>
                {submitting
                  ? challengeMode === "onchain" ? "Waiting for wallet…" : "Submitting…"
                  : challengeMode === "onchain"
                    ? `Challenge on-chain (${minimumStake} ETH)`
                    : "Submit challenge for review"
                }
              </Button>
            </form>
          )}
        </GlassCard>
      </section>
    </Page>
  );
}