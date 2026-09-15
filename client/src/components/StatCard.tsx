import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon?: ReactNode;
  delay?: number;
  accent?: boolean;
}

export function StatCard({ label, value, sublabel, icon, delay = 0, accent = false }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1], delay }}
      className={`rounded-xl border p-4 ${accent ? "bg-brand-500 border-brand-500 text-white" : "bg-white border-brand-100"}`}
    >
      <div className={`text-sm flex items-center gap-1.5 ${accent ? "text-white/70" : "text-brand-500"}`}>
        {icon && <span className="w-4 h-4 flex-shrink-0">{icon}</span>}
        {label}
      </div>
      <div className={`text-2xl font-semibold mt-0.5 tabular-nums ${accent ? "text-white" : "text-brand-900"}`}>{value}</div>
      {sublabel && <div className={`text-xs mt-0.5 ${accent ? "text-white/70" : "text-brand-400"}`}>{sublabel}</div>}
    </motion.div>
  );
}
