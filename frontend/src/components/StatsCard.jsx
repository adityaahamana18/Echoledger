import { motion } from "framer-motion";

export default function StatsCard({ icon: Icon, label, value, detail, tone = "text-blue-400" }) {
  return <motion.div whileHover={{ y: -3 }} className="glass rounded-2xl p-5"><div className="flex items-start justify-between"><span className="text-sm text-slate-400">{label}</span><span className={`rounded-xl bg-white/5 p-2 ${tone}`}><Icon size={18} /></span></div><p className="mt-4 text-3xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></motion.div>;
}
