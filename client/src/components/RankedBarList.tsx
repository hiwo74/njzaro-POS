import { motion } from "framer-motion";

export interface RankedBarItem {
  key: string;
  label: string;
  sublabel?: string;
  value: number;
  formattedValue: string;
  color?: string;
}

interface RankedBarListProps {
  items: RankedBarItem[];
  emptyLabel?: string;
  defaultColor?: string;
}

export function RankedBarList({ items, emptyLabel = "No data yet.", defaultColor = "#2a78d6" }: RankedBarListProps) {
  if (items.length === 0) {
    return <div className="text-sm text-brand-500 py-4">{emptyLabel}</div>;
  }

  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={item.key}>
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="text-sm font-medium text-brand-900 truncate">{item.label}</span>
            <span className="text-sm text-brand-500 flex-shrink-0 tabular-nums">{item.formattedValue}</span>
          </div>
          {item.sublabel && <div className="text-xs text-brand-400 mb-1">{item.sublabel}</div>}
          <div className="h-1.5 rounded-full bg-brand-50 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: item.color ?? defaultColor }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1], delay: i * 0.04 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
