import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Landmark, ShieldPlus, Briefcase, HeartPulse, Building2, GraduationCap, Headphones } from "lucide-react";
import Page from "../components/Page";

const industries = [
  { id: "banking",          label: "Banking",           sub: "Loan & credit decisions",         icon: Landmark,      color: "text-blue-400",    border: "hover:border-blue-400/50" },
  { id: "insurance",        label: "Insurance",         sub: "Policy & claim assessment",        icon: ShieldPlus,    color: "text-emerald-400", border: "hover:border-emerald-400/50" },
  { id: "hiring",           label: "Hiring",            sub: "Candidate screening",              icon: Briefcase,     color: "text-violet-400",  border: "hover:border-violet-400/50" },
  { id: "healthcare",       label: "Healthcare",        sub: "Treatment eligibility",            icon: HeartPulse,    color: "text-rose-400",    border: "hover:border-rose-400/50" },
  { id: "government",       label: "Government Welfare",sub: "Benefit & subsidy eligibility",   icon: Building2,     color: "text-amber-400",   border: "hover:border-amber-400/50" },
  { id: "education",        label: "Education",         sub: "Admission & scholarship review",   icon: GraduationCap, color: "text-cyan-400",    border: "hover:border-cyan-400/50" },
  { id: "customer-support", label: "Customer Support",  sub: "Escalation & resolution routing", icon: Headphones,    color: "text-pink-400",    border: "hover:border-pink-400/50" },
];

export { industries };

export default function IndustrySelector() {
  const navigate = useNavigate();

  return (
    <Page>
      <section className="mx-auto max-w-5xl px-6 py-14 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold md:text-5xl">Choose your <span className="gradient-text">industry</span></h1>
          <p className="mt-4 text-slate-400">Same AI governance engine. Tailored form for your domain.</p>
        </div>

        <motion.div
          className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
        >
          {industries.map(({ id, label, sub, icon: Icon, color, border }) => (
            <motion.button
              key={id}
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              onClick={() => navigate(`/apply/${id}`)}
              className={`group rounded-2xl border border-white/10 bg-white/[.03] p-6 text-left transition-all duration-200 hover:bg-white/[.06] ${border}`}
            >
              <Icon size={28} className={color} />
              <h2 className="mt-4 text-lg font-semibold text-white">{label}</h2>
              <p className="mt-1 text-sm text-slate-400">{sub}</p>
            </motion.button>
          ))}
        </motion.div>
      </section>
    </Page>
  );
}
