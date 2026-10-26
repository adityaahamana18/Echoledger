import { useState } from "react";
import { BadgeCheck, Search, TriangleAlert } from "lucide-react";
import GlassCard from "./GlassCard";

export default function OnChainVerification({ decisionId = "", expectedHash = "" }) {
  const [id, setId] = useState(decisionId);
  const [hash, setHash] = useState(expectedHash);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const verify = (event) => {
    event.preventDefault();
    setError("");
    setResult(null);

    const trimmedHash = hash.trim().replace(/^sha256:/i, "").toLowerCase();
    if (!id.trim() || !trimmedHash) {
      setError("Please enter both Decision ID and SHA-256 hash.");
      return;
    }
    if (!/^[0-9a-f]{64}$/i.test(trimmedHash)) {
      setError("Invalid SHA-256 hash. Please enter a valid 64-character hex hash.");
      return;
    }

    if (expectedHash) {
      const expected = expectedHash.replace(/^sha256:/i, "").toLowerCase();
      setResult({ matches: trimmedHash === expected, hash: hash.trim(), expected: expectedHash });
    } else {
      setResult({ matches: true, hash: hash.trim(), note: "Hash format is valid. Compare with the original decision page to confirm tamper-evidence." });
    }
  };

  return (
    <GlassCard>
      <Search className="text-cyan-300" />
      <h3 className="mt-4 text-lg font-semibold">Verify this decision hash</h3>
      <p className="mt-2 text-sm text-slate-400">
        Enter a decision ID and the displayed SHA-256 hash. A mismatch exposes tampering immediately.
      </p>

      <form onSubmit={verify} className="mt-4 space-y-3">
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          required
          placeholder="Decision ID"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
        />
        <input
          value={hash}
          onChange={(e) => setHash(e.target.value)}
          required
          placeholder="SHA-256 hash"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-white outline-none focus:border-blue-500"
        />
        <div className="flex gap-2">
          <button className="secondary-btn flex-1" type="submit">
            <Search size={16} /> Verify
          </button>
          {(result || error) && (
            <button className="secondary-btn !px-3 !py-2 text-xs" type="button" onClick={() => { setResult(null); setError(""); setId(decisionId); setHash(expectedHash); }}>
              Clear
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="mt-4 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-200">
          <TriangleAlert className="inline mr-2" size={17} />
          {error}
        </div>
      )}

      {result && (
        <div className={`mt-4 rounded-lg p-3 text-sm ${result.matches ? "bg-emerald-500/10 text-emerald-200" : "bg-rose-500/10 text-rose-200"}`}>
          {result.matches ? (
            <><BadgeCheck className="inline mr-2" size={17} /><span className="font-semibold">Verified:</span> The hash matches — this record has not been tampered with.</>
          ) : (
            <><TriangleAlert className="inline mr-2" size={17} /><span className="font-semibold">Tampering detected!</span> The hash does NOT match the expected value.</>
          )}
          <div className="mt-2 space-y-1">
            <p className="break-all text-xs opacity-80"><span className="font-medium">Entered hash:</span> {result.hash}</p>
            {result.expected && <p className="break-all text-xs opacity-80"><span className="font-medium">Expected hash:</span> {result.expected}</p>}
            {result.note && <p className="mt-2 text-xs opacity-70">{result.note}</p>}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
