import React from "react";
import { motion } from "framer-motion";
import { MILESTONE_INTERVAL, getMilestoneLabel } from "@/lib/milestoneEngine";

export default function MilestoneTracker({ choiceCount = 0, night = 1 }) {
  const currentMs = Math.floor(choiceCount / MILESTONE_INTERVAL);
  const progressInMs = choiceCount % MILESTONE_INTERVAL;
  const progressPct = (progressInMs / MILESTONE_INTERVAL) * 100;
  const label = getMilestoneLabel(choiceCount);
  const totalDots = 5;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">
          {label}
        </span>
        <span className="text-[9px] text-muted-foreground font-semibold">
          Milestone {currentMs + 1}
        </span>
      </div>

      {/* Progress track */}
      <div className="relative h-1 rounded-full overflow-hidden" style={{ background: "hsl(252 10% 22%)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{
            background: "linear-gradient(90deg, hsl(271 87% 65%), hsl(351 78% 60%))",
          }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        {/* Milestone dots */}
        {[...Array(totalDots - 1)].map((_, i) => {
          const dotPct = ((i + 1) / totalDots) * 100;
          const passed = progressPct >= dotPct;
          return (
            <motion.div
              key={i}
              className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full border"
              style={{
                left: `calc(${dotPct}% - 3px)`,
                background: passed ? "hsl(271 87% 65%)" : "hsl(252 10% 28%)",
                borderColor: passed ? "hsl(271 87% 65%)" : "hsl(252 10% 32%)",
                boxShadow: passed ? "0 0 6px hsl(271 87% 65% / 0.8)" : "none",
              }}
              animate={passed ? { scale: [1, 1.4, 1] } : {}}
              transition={{ duration: 0.3 }}
            />
          );
        })}
      </div>
    </div>
  );
}