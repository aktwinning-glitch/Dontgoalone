import React from "react";
import { motion } from "framer-motion";

const FEAR_STAGES = [
  { max: 25,  label: "Calm",      color: "hsl(123 68% 55%)",   bg: "hsl(123 68% 55% / 0.15)" },
  { max: 50,  label: "Uneasy",    color: "hsl(40 90% 62%)",    bg: "hsl(40 90% 62% / 0.15)"  },
  { max: 75,  label: "Panicking", color: "hsl(18 75% 62%)",    bg: "hsl(18 75% 62% / 0.15)"  },
  { max: 100, label: "Breaking",  color: "hsl(351 78% 60%)",   bg: "hsl(351 78% 60% / 0.15)" },
];

export function getFearStage(fear) {
  return FEAR_STAGES.find(s => fear <= s.max) || FEAR_STAGES[FEAR_STAGES.length - 1];
}

export default function FearBar({ fear = 0, compact = false }) {
  const stage = getFearStage(fear);
  const pct = Math.min(100, fear);
  const isPulsing = fear > 75;

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-1">
        <span className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground w-8 shrink-0">Fear</span>
        <div className="flex-1 relative h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(252 10% 22%)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: stage.color }}
            animate={{
              width: `${pct}%`,
              boxShadow: isPulsing ? [`0 0 6px ${stage.color}`, `0 0 14px ${stage.color}`, `0 0 6px ${stage.color}`] : `0 0 4px ${stage.color}60`,
            }}
            transition={{
              width: { duration: 0.4 },
              boxShadow: { duration: 0.9, repeat: Infinity, ease: "easeInOut" },
            }}
          />
        </div>
        <motion.span
          className="text-[9px] font-bold shrink-0"
          style={{ color: stage.color }}
          animate={isPulsing ? { opacity: [1, 0.5, 1] } : {}}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          {stage.label}
        </motion.span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">Fear</span>
        <motion.span
          className="text-[10px] font-bold"
          style={{ color: stage.color }}
          animate={isPulsing ? { opacity: [1, 0.4, 1] } : {}}
          transition={{ duration: 0.7, repeat: Infinity }}
        >
          {stage.label}
        </motion.span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(252 10% 22%)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: stage.color }}
          animate={{
            width: `${pct}%`,
            boxShadow: isPulsing
              ? [`0 0 8px ${stage.color}`, `0 0 18px ${stage.color}`, `0 0 8px ${stage.color}`]
              : `0 0 4px ${stage.color}60`,
          }}
          transition={{
            width: { duration: 0.4 },
            boxShadow: { duration: 0.9, repeat: Infinity, ease: "easeInOut" },
          }}
        />
      </div>
    </div>
  );
}