import { motion } from "framer-motion";

export default function GlassCard({ children, className = "", hover = false }) {
  return <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} whileHover={hover ? { y: -4 } : {}}
    className={`glass rounded-2xl p-5 shadow-2xl shadow-black/20 ${className}`}>{children}</motion.section>;
}
