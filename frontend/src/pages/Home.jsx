import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BrainCircuit, FileCheck2, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import Page from "../components/Page";
import GlassCard from "../components/GlassCard";
import Button from "../components/Button";
import { ConfidenceMeter, RiskMeter } from "../components/Meters";
import SignInModal from "../components/SignInModal";
import LiveDashboard from "../components/LiveDashboard";
import { getAudits } from "../utils/audit";

const features = [
  { icon: FileCheck2, title: "Explainable outcomes", text: "Clear rationale and useful next steps with every decision." },
  { icon: ShieldCheck, title: "Verifiable records", text: "Every decision receives a tamper-evident SHA-256 fingerprint." },
  { icon: BrainCircuit, title: "Human challenge path", text: "People can add context and request a transparent review." },
];

export default function Home() {
  const [user, setUser] = useState(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [audits, setAudits] = useState([]);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // Load audits for the live dashboard when user is signed in
  useEffect(() => {
    if (user) {
      getAudits().then(setAudits).catch(() => {});
    }
  }, [user]);

  const handleNewDecision = (e) => {
    if (!user) {
      e.preventDefault();
      setShowSignIn(true);
    }
  };

  return (
    <Page>
      <section className="mx-auto max-w-6xl px-6 pb-14 pt-16 md:pb-20 md:pt-24">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <span className="eyebrow"><Sparkles size={14} /> AI governance, made tangible</span>
            <h1 className="mt-5 max-w-xl text-4xl font-bold leading-tight tracking-tight md:text-5xl">Trust every <span className="gradient-text">AI decision.</span></h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-400 md:text-lg">EchoLedger turns a black-box response into an explanation, evidence trail, and challengeable decision record.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/apply" onClick={handleNewDecision}>
                <Button>Run a decision <ArrowRight size={17} /></Button>
              </Link>
              <Link to="/verify" className="secondary-btn"><ShieldCheck size={16} /> Verify</Link>
              <Link to="/admin" className="secondary-btn">Explore insights</Link>
            </div>
            <div className="mt-9 flex gap-6 border-t border-white/10 pt-5 text-sm">
              <div><strong className="block text-lg">SHA-256</strong><span className="text-slate-500">Decision proof</span></div>
              <div><strong className="block text-lg">Human-first</strong><span className="text-slate-500">Challenge path</span></div>
              <div><strong className="block text-lg">Firebase</strong><span className="text-slate-500">Cloud storage</span></div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .1 }}>
            <GlassCard className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-400">Decision record</p>
                  <h2 className="mt-1 text-2xl font-semibold">Loan approved</h2>
                  <p className="mt-1 text-xs text-slate-500">EL-A2F91C4B · just now</p>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">Verified</span>
              </div>
              <div className="mt-7 space-y-5">
                <ConfidenceMeter value={92} />
                <RiskMeter risk="Low" />
              </div>
              <div className="mt-6 rounded-xl border border-white/10 bg-black/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Plain-language explanation</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Income stability and credit history meet the policy threshold for this request.</p>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* Live Dashboard */}
      <section className="mx-auto max-w-6xl px-6 pb-6">
        <LiveDashboard audits={audits} />
      </section>

      <section className="border-y border-white/[.07] bg-white/[.015]">
        <div className="mx-auto grid max-w-6xl gap-4 px-6 py-12 md:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <GlassCard key={title} hover className="p-5">
              <Icon size={22} className="text-blue-400" />
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
            </GlassCard>
          ))}
        </div>
      </section>
      {/* AI Governance Score */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-white/[.08] bg-white/[.03] px-8 py-10"
        >
          <div className="mb-8">
            <span className="eyebrow"><ShieldCheck size={14} /> AI Governance Score</span>
            <p className="mt-3 text-slate-400 text-sm">Every organization gets</p>
          </div>
          <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-center">
            {/* Trust Score ring */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-4 border-blue-500/30 bg-blue-500/10">
                <div className="absolute inset-0 rounded-full" style={{ background: "conic-gradient(#3b82f6 91%, rgba(255,255,255,0.06) 0)" }} />
                <div className="relative z-10 flex flex-col items-center">
                  <span className="text-3xl font-bold">91%</span>
                  <span className="text-xs text-slate-400">Trust Score</span>
                </div>
              </div>
            </div>
            {/* Metric bars */}
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: "Transparency", value: 97, color: "from-blue-500 to-cyan-400" },
                { label: "Bias", value: 2, color: "from-rose-500 to-pink-400" },
                { label: "Appeals", value: 4, color: "from-amber-500 to-yellow-400" },
                { label: "Compliance", value: 94, color: "from-emerald-500 to-teal-400" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-300 font-medium">{label}</span>
                    <span className="text-slate-400">{value}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${value}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                      className={`h-full rounded-full bg-gradient-to-r ${color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="rounded-2xl border border-blue-400/15 bg-gradient-to-r from-blue-600/10 to-violet-600/10 px-6 py-9 md:flex md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-300">Built for the moments that matter</p>
            <h2 className="mt-2 text-2xl font-semibold">Give every decision a receipt.</h2>
          </div>
          <Link to="/apply" onClick={handleNewDecision} className="btn-primary mt-5 md:mt-0">
            Start the demo <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <SignInModal
        open={showSignIn}
        onClose={() => setShowSignIn(false)}
        onSuccess={() => setShowSignIn(false)}
      />
    </Page>
  );
}