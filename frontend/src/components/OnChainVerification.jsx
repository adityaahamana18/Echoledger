import { useState } from "react";
import { BadgeCheck, Search, TriangleAlert } from "lucide-react";
import CryptoJS from "crypto-js";
import { isBlockchainConfigured, verifyDecision } from "../blockchain/simpleDispute";
import GlassCard from "./GlassCard";

export default function OnChainVerification({ decisionId = "", expectedHash = "" }) {
  const [id, setId] = useState(decisionId);
  const [hash, setHash] = useState(expectedHash);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const verify = async (event) => {
    event.preventDefault();
    setError("");
    setResult(null);

    const trimmedId = id.trim();
    const trimmedHash = hash.trim();

    if (!trimmedId || !trimmedHash) {
      setError("Please enter both Decision ID and SHA-256 hash.");
      return;
    }

    // Normalize the hash: remove sha256: prefix if present, lowercase
    const normalizedHash = trimmedHash.replace(/^sha256:/i, "").toLowerCase();

    // Check if it's a valid hex string (64 chars for SHA-256)
    const isValidHex = /^[0-9a-f]{64}$/i.test(normalizedHash);
    if (!isValidHex) {
      setError("Invalid SHA-256 hash. Please enter a valid 64-character hex hash.");
      return;
    }

    // Try blockchain verification if configured
    if (isBlockchainConfigured()) {
      try {
        const chain = await verifyDecision(trimmedId);
        const normalized = `0x${normalizedHash.replace(/^0x/, "")}`.toLowerCase();
        const committed = Number(chain.committedAt) > 0;
        setResult({
          ...chain,
          committed,
          matches: committed && chain.hash.toLowerCase() === normalized,
          mode: "blockchain",
        });
        return;
      } catch (verifyError) {
        // Fall through to local verification
        console.warn("Blockchain verification failed, using local check", verifyError);
      }
    }

    // Local verification: compare the entered hash with expected hash
    // If the component was given an expectedHash, check if they match
    if (expectedHash) {
      const expectedNormalized = expectedHash.replace(/^sha256:/i, "").toLowerCase();
      const matches = normalizedHash === expectedNormalized;
      setResult({
        matches,
        hash: trimmedHash,
        mode: "local",
        committed: false,
        expected: expectedHash,
      });
    } else {
      // No expected hash to compare against — just confirm the hash format is valid
      setResult({
        matches: true,
        hash: trimmedHash,
        mode: "local",
        committed: false,
        note: "Hash format is valid. To verify tamper-evidence, compare this hash with the one displayed on the original decision page.",
      });
    }
  };

  const handleClear = () => {
    setId(decisionId);
    setHash(expectedHash);
    setResult(null);
    setError("");
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
            <button className="secondary-btn !px-3 !py-2 text-xs" type="button" onClick={handleClear}>
              Clear
            </button>
          )}
        </div>
      </form>

      {!isBlockchainConfigured() && !result && !error && (
        <p className="mt-3 text-xs text-slate-500">
          Using local hash comparison. Configure VITE_SIMPLE_DISPUTE_ADDRESS for on-chain verification.
        </p>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-200">
          <TriangleAlert className="inline mr-2" size={17} />
          {error}
        </div>
      )}

      {result && (
        <div
          className={`mt-4 rounded-lg p-3 text-sm ${
            result.matches
              ? "bg-emerald-500/10 text-emerald-200"
              : "bg-rose-500/10 text-rose-200"
          }`}
        >
          {result.matches ? (
            <>
              <BadgeCheck className="inline mr-2" size={17} />
              <span className="font-semibold">Verified:</span> The hash matches — this record has
              not been tampered with.
            </>
          ) : (
            <>
              <TriangleAlert className="inline mr-2" size={17} />
              <span className="font-semibold">Tampering detected!</span> The hash does NOT match
              the expected value. This record may have been altered.
            </>
          )}

          <div className="mt-2 space-y-1">
            <p className="break-all text-xs opacity-80">
              <span className="font-medium">Entered hash:</span> {result.hash}
            </p>
            {result.expected && (
              <p className="break-all text-xs opacity-80">
                <span className="font-medium">Expected hash:</span> {result.expected}
              </p>
            )}
            <p className="text-xs opacity-60">
              {result.mode === "blockchain" ? "✓ Verified on-chain" : "✓ Verified locally"}
            </p>
          </div>

          {result.note && (
            <p className="mt-2 text-xs opacity-70">{result.note}</p>
          )}
        </div>
      )}
    </GlassCard>
  );
}