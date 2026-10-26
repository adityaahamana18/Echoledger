import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  HeartPulse,
  HelpCircle,
  Landmark,
  ShieldCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import Page from "../components/Page";
import GlassCard from "../components/GlassCard";

const PLANS = [
  {
    name: "Starter",
    tag: "Startups & Small Enterprises",
    price: "₹1,49,999",
    period: "/month",
    annual: "Save ₹3,00,000 on annual billing",
    color: "text-blue-400",
    border: "border-blue-500/30",
    glow: "shadow-blue-500/10",
    decisions: "Up to 1,000 decisions/mo",
    features: [
      "Multi-agent AI jury",
      "Explainable decision reports",
      "SHA-256 tamper-evident audit trail",
      "Bias detection per decision",
      "PDF export for regulators",
      "7 industry templates",
      "Email support",
    ],
    missing: ["Governance Dashboard", "Risk Heatmap", "SLA guarantee", "On-premise deployment"],
    cta: "Start free trial",
    ctaLink: "/contact?plan=Starter&type=trial",
    highlight: false,
  },
  {
    name: "Growth",
    tag: "Mid-size Companies",
    price: "₹5,99,999",
    period: "/month",
    annual: "Save ₹12,00,000 on annual billing",
    color: "text-violet-400",
    border: "border-violet-500/40",
    glow: "shadow-violet-500/20",
    decisions: "Up to 10,000 decisions/mo",
    features: [
      "Everything in Starter",
      "CEO Governance Dashboard",
      "AI Risk Heatmap",
      "Decision Replay (CCTV mode)",
      "Analytics & compliance charts",
      "Challenge resolution workflow",
      "RBI & EU AI Act audit reports",
      "Priority support (24hr SLA)",
      "Dedicated onboarding",
    ],
    missing: ["On-premise deployment", "Custom integrations"],
    cta: "Book a demo",
    ctaLink: "/contact?plan=Growth&type=demo",
    highlight: true,
  },
  {
    name: "Enterprise",
    tag: "Large Enterprises & Corporations",
    price: "Custom",
    period: "",
    annual: "Annual contract · volume discounts",
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    glow: "shadow-emerald-500/10",
    decisions: "Unlimited decisions",
    features: [
      "Everything in Growth",
      "On-premise / private cloud",
      "Custom AI model fine-tuning",
      "Core banking system integration",
      "Multi-branch / multi-tenant",
      "Blockchain on-chain commits",
      "Custom audit report templates",
      "99.9% uptime SLA",
      "Dedicated compliance engineer",
      "White-label option",
    ],
    missing: [],
    cta: "Contact sales",
    ctaLink: "/contact?plan=Enterprise&type=sales",
    highlight: false,
  },
];

const COMPARISON = [
  { feature: "Multi-agent AI jury",         starter: true,  growth: true,  enterprise: true  },
  { feature: "Explainable decision PDF",    starter: true,  growth: true,  enterprise: true  },
  { feature: "SHA-256 audit trail",         starter: true,  growth: true,  enterprise: true  },
  { feature: "Bias detection",              starter: true,  growth: true,  enterprise: true  },
  { feature: "Governance Dashboard",        starter: false, growth: true,  enterprise: true  },
  { feature: "AI Risk Heatmap",             starter: false, growth: true,  enterprise: true  },
  { feature: "Decision Replay",             starter: false, growth: true,  enterprise: true  },
  { feature: "RBI / EU AI Act reports",     starter: false, growth: true,  enterprise: true  },
  { feature: "On-premise deployment",       starter: false, growth: false, enterprise: true  },
  { feature: "Core banking integration",    starter: false, growth: false, enterprise: true  },
  { feature: "Blockchain on-chain commits", starter: false, growth: false, enterprise: true  },
  { feature: "White-label",                 starter: false, growth: false, enterprise: true  },
];

const FAQS = [
  {
    q: "Is EchoLedger compliant with RBI's AI governance guidelines?",
    a: "Yes. EchoLedger generates a full audit trail, explainability report, and bias detection record for every decision — meeting RBI's requirements for explainable AI in credit decisions.",
  },
  {
    q: "How does the 14-day free trial work?",
    a: "Sign up, connect your loan origination data, and run up to 100 decisions free. No credit card required. Our team will onboard you within 24 hours.",
  },
  {
    q: "Can EchoLedger integrate with our existing core banking system?",
    a: "Enterprise plan includes custom API integration with Finacle, Temenos, FIS, and other core banking platforms. Growth plan supports REST API webhooks.",
  },
  {
    q: "What happens if we exceed our monthly decision limit?",
    a: "Overage is billed at ₹12 per additional decision on Starter and ₹8 per decision on Growth. Enterprise has no limits.",
  },
  {
    q: "Is our customer data stored in India?",
    a: "Yes. All data is stored on Firebase (Google Cloud Mumbai region). Enterprise customers can opt for on-premise deployment within their own infrastructure.",
  },
];

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, type: "spring", stiffness: 120, damping: 14 } }),
};

export default function Pricing() {
  return (
    <Page>
      <section className="mx-auto max-w-7xl px-6 py-16">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <span className="eyebrow"><ShieldCheck size={13} /> AI governance for every industry</span>
          <h1 className="mt-5 text-5xl font-bold">
            Simple, transparent <span className="gradient-text">pricing</span>
          </h1>
          <p className="mt-4 text-slate-400 max-w-xl mx-auto text-lg">
            One AI governance engine. Explainable, auditable, bias-free decisions — across every industry that uses AI to decide people's futures.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-emerald-400">
            <BadgeCheck size={16} />
            <span>Every industry supported · Bias-free by design · No credit card required</span>
          </div>
        </motion.div>

        {/* Industry grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mt-14"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold">Choose your industry</h2>
            <p className="mt-2 text-slate-400">Same AI governance engine. Tailored form for your domain.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Building2,   label: "Banking",           sub: "Loan & credit decisions",          color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
              { icon: ShieldCheck, label: "Insurance",         sub: "Policy & claim assessment",        color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/20" },
              { icon: Briefcase,   label: "Hiring",            sub: "Candidate screening",              color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
              { icon: HeartPulse,  label: "Healthcare",        sub: "Treatment eligibility",           color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/20" },
              { icon: Landmark,    label: "Government Welfare",sub: "Benefit & subsidy eligibility",   color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
              { icon: BookOpen,    label: "Education",         sub: "Admission & scholarship review",  color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/20" },
              { icon: Users,       label: "Customer Support",  sub: "Escalation & resolution routing", color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/20" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                custom={i}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className={`flex items-start gap-4 rounded-2xl border p-5 ${item.border} bg-white/[.03]`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.bg}`}>
                  <item.icon size={19} className={item.color} />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{item.label}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{item.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Plans */}
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              custom={i}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className={`relative rounded-2xl border p-7 flex flex-col gap-5 shadow-2xl ${plan.border} ${plan.glow} ${plan.highlight ? "bg-white/[.07]" : "bg-white/[.03]"}`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-1 text-xs font-bold text-white shadow-lg">
                    <Zap size={11} /> Most popular
                  </span>
                </div>
              )}

              <div>
                <p className={`text-xs font-bold uppercase tracking-wider ${plan.color}`}>{plan.tag}</p>
                <h2 className="mt-2 text-2xl font-bold text-white">{plan.name}</h2>
                <div className="mt-3 flex items-end gap-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-slate-400 mb-1">{plan.period}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{plan.annual}</p>
                <p className={`mt-3 text-sm font-semibold ${plan.color}`}>{plan.decisions}</p>
              </div>

              <div className="flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2.5">
                    <CheckCircle2 size={15} className="text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-slate-300">{f}</span>
                  </div>
                ))}
                {plan.missing.map((f) => (
                  <div key={f} className="flex items-start gap-2.5 opacity-35">
                    <X size={15} className="text-slate-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-slate-500">{f}</span>
                  </div>
                ))}
              </div>

              <Link
                to={plan.ctaLink}
                className={plan.highlight ? "btn-primary justify-center" : "secondary-btn justify-center"}
              >
                {plan.cta} <ArrowRight size={16} />
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-20"
        >
          <h2 className="text-2xl font-bold text-center mb-8">Full feature comparison</h2>
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-4 bg-white/[.04] px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Feature</span>
              <span className="text-center text-blue-400">Starter</span>
              <span className="text-center text-violet-400">Growth</span>
              <span className="text-center text-emerald-400">Enterprise</span>
            </div>
            {COMPARISON.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-4 px-6 py-3.5 text-sm border-t border-white/[.06] ${i % 2 === 0 ? "bg-white/[.01]" : ""}`}
              >
                <span className="text-slate-300">{row.feature}</span>
                <span className="flex justify-center">{row.starter ? <CheckCircle2 size={16} className="text-emerald-400" /> : <X size={16} className="text-slate-700" />}</span>
                <span className="flex justify-center">{row.growth ? <CheckCircle2 size={16} className="text-emerald-400" /> : <X size={16} className="text-slate-700" />}</span>
                <span className="flex justify-center">{row.enterprise ? <CheckCircle2 size={16} className="text-emerald-400" /> : <X size={16} className="text-slate-700" />}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-20 grid gap-5 sm:grid-cols-3"
        >
          {[
            { quote: "EchoLedger cut our loan rejection dispute resolution time from 3 weeks to 2 days.", name: "Head of Credit Risk", org: "Regional Co-operative Bank, Pune" },
            { quote: "The audit trail alone saved us during our RBI inspection. Every decision was explainable.", name: "Chief Compliance Officer", org: "NBFC, Mumbai" },
            { quote: "Our legal team finally stopped worrying about AI bias claims. The bias audit report is gold.", name: "VP Technology", org: "Private Sector Bank, Bengaluru" },
          ].map((t, i) => (
            <motion.div
              key={i}
              custom={i}
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="rounded-2xl border border-white/10 bg-white/[.03] p-6"
            >
              <p className="text-sm text-slate-300 leading-6">"{t.quote}"</p>
              <div className="mt-4">
                <p className="text-sm font-semibold text-white">{t.name}</p>
                <p className="text-xs text-slate-500">{t.org}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-20"
        >
          <h2 className="text-2xl font-bold text-center mb-8">Frequently asked questions</h2>
          <div className="mx-auto max-w-3xl space-y-4">
            {FAQS.map((faq, i) => (
              <motion.div
                key={i}
                custom={i}
                variants={itemVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="rounded-xl border border-white/10 bg-white/[.03] p-5"
              >
                <div className="flex items-start gap-3">
                  <HelpCircle size={16} className="text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-white text-sm">{faq.q}</p>
                    <p className="mt-2 text-sm text-slate-400 leading-6">{faq.a}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA Banner */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-20 rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-600/10 to-violet-600/10 p-10 text-center"
        >
          <ShieldCheck size={36} className="mx-auto text-blue-400 mb-4" />
          <h2 className="text-3xl font-bold">Ready to make your AI decisions legally defensible?</h2>
          <p className="mt-3 text-slate-400 max-w-lg mx-auto">
            Join banks and NBFCs using EchoLedger to stay ahead of RBI guidelines and EU AI Act requirements.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-4">
            <Link to="/contact?plan=Starter&type=trial" className="btn-primary">Start free trial <ArrowRight size={17} /></Link>
            <Link to="/contact?type=demo" className="secondary-btn">View live demo <ArrowRight size={17} /></Link>
          </div>
          <p className="mt-4 text-xs text-slate-500">No credit card required · 14-day free trial · Cancel anytime</p>
        </motion.div>

      </section>
    </Page>
  );
}
