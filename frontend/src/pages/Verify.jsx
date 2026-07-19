import Page from "../components/Page";
import OnChainVerification from "../components/OnChainVerification";

export default function Verify() { return <Page><section className="mx-auto max-w-2xl px-6 py-16"><p className="eyebrow">Public audit tool</p><h1 className="mt-4 text-4xl font-bold">Verify a decision <span className="gradient-text">on-chain</span></h1><p className="mt-3 text-slate-400">Any judge can compare the displayed decision fingerprint to the immutable commitment.</p><div className="mt-8"><OnChainVerification /></div></section></Page>; }
