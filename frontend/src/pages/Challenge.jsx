import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Paperclip, Scale } from "lucide-react";
import Page from "../components/Page";
import GlassCard from "../components/GlassCard";
import Button from "../components/Button";
import { challengeAudit, getAudit } from "../utils/audit";

export default function Challenge() {
  const [audit, setAudit] = useState(null);
  const { id } = useParams();
  const [reason, setReason] = useState("");
  const [file, setFile] = useState(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      await challengeAudit(id, {
        reason,
        evidence: file?.name || null,
        status: "Pending review",
        source: "Human",
      });
      setSent(true);
    } catch (challengeError) {
      setError(challengeError.message || "Challenge submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page>
      <section className="mx-auto max-w-2xl px-6 py-14">
        <span className="eyebrow"><Scale size={14} /> Challenge decision</span>
        <h1 className="mt-4 text-4xl font-bold">Challenge this <span className="gradient-text">decision</span></h1>
        <p className="mt-3 text-slate-400">Submit your concerns for a human admin review. Your challenge will be logged and reviewed transparently.</p>

        <GlassCard className="mt-9">
          {sent ? (
            <div className="py-8 text-center">
              <CheckCircle2 size={44} className="mx-auto text-emerald-400" />
              <h2 className="mt-4 text-2xl font-semibold">Challenge submitted</h2>
              <p className="mt-2 text-slate-400">An admin will review your challenge. You can track its status on the dashboard.</p>
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
              {error && <p className="text-sm text-rose-300">{error}</p>}
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit challenge for review"}
              </Button>
            </form>
          )}
        </GlassCard>
      </section>
    </Page>
  );
}
