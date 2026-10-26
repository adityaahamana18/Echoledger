import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Briefcase, ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";
import Page from "../components/Page";

const decisionCategories = [
  {
    id: "scholarship",
    label: "Scholarship Decision Assistant",
    tagline: "Academic Grants & Financial Aid",
    sub: "Deterministic eligibility checks against verified central, state, and institutional scholarship schemes.",
    icon: GraduationCap,
    color: "text-cyan-400",
    bgIcon: "bg-cyan-500/10",
    border: "border-cyan-500/30 hover:border-cyan-400",
    glow: "hover:shadow-[0_0_30px_rgba(34,211,238,0.15)]",
    features: [
      "Deterministic CGPA & income threshold verification",
      "Official scheme guidelines (NSP, INSPIRE, Merit-cum-Means)",
      "Zero-hallucination award amounts & deadlines",
      "Tamper-evident SHA-256 evaluation certificate",
    ],
  },
  {
    id: "job",
    label: "Job Decision Assistant",
    tagline: "Career Fit & Fair Hiring Match",
    sub: "Evidence-based candidate matching distinguishing mandatory qualifications from preferred skill sets.",
    icon: Briefcase,
    color: "text-violet-400",
    bgIcon: "bg-violet-500/10",
    border: "border-violet-500/30 hover:border-violet-400",
    glow: "hover:shadow-[0_0_30px_rgba(167,139,250,0.15)]",
    features: [
      "Mandatory requirement checks vs. preferred qualifications",
      "Actionable skill gap analysis without unfair auto-rejection",
      "Support for students, entry-level, and experienced applicants",
      "Transparent alternative pathways & structured upskilling",
    ],
  },
];

// Export both names for seamless backward-compatibility
export { decisionCategories, decisionCategories as industries };

export default function IndustrySelector() {
  const navigate = useNavigate();

  return (
    <Page>
      <section className="mx-auto max-w-5xl px-6 py-14 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow">
            <Sparkles size={14} className="text-blue-400" /> Two Primary Decision Streams
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">
            Choose your <span className="gradient-text">Decision Assistant</span>
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-400 md:text-lg">
            Transparent, verifiable, and evidence-led decisions powered by verified institutional rules and an explainable AI jury.
          </p>
        </div>

        <motion.div
          className="mt-12 grid gap-8 sm:grid-cols-2"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {decisionCategories.map(({ id, label, tagline, sub, icon: Icon, color, bgIcon, border, glow, features }) => (
            <motion.div
              key={id}
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              onClick={() => navigate(`/apply/${id}`)}
              className={`group relative flex cursor-pointer flex-col justify-between rounded-3xl border bg-slate-900/60 p-8 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 ${border} ${glow}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${bgIcon}`}>
                    <Icon size={30} className={color} />
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-xs font-medium text-slate-300">
                    {tagline}
                  </span>
                </div>

                <h2 className="mt-6 text-2xl font-bold text-white transition group-hover:text-cyan-300">
                  {label}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {sub}
                </p>

                <div className="mt-6 space-y-2.5 border-t border-white/10 pt-5">
                  {features.map((feat) => (
                    <div key={feat} className="flex items-center gap-2.5 text-xs text-slate-300">
                      <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5 text-sm font-semibold text-white">
                <span className="flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck size={14} className="text-blue-400" /> Demographic attributes excluded
                </span>
                <span className={`flex items-center gap-1.5 transition-transform duration-200 group-hover:translate-x-1 ${color}`}>
                  Start assessment <ArrowRight size={16} />
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </Page>
  );
}
