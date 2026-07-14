/**
 * EntityPresenceIndicator — Phase 2
 * A subtle, persistent HUD element showing entity threat proximity.
 * Shows aggression state and proximity label. Pulses at high aggression.
 */
import React from "react";
import { motion } from "framer-motion";
import { Eye } from "lucide-react";

const AGGRESSION_STYLES = [
  { label: "Distant",   color: "hsl(252 8% 45%)",   border: "hsl(252 8% 30%)",   bg: "hsl(252 12% 12%)" },
  { label: "Stalking",  color: "hsl(40 90% 62%)",   border: "hsl(40 90% 40%)",   bg: "hsl(40 90% 62% / 0.07)" },
  { label: "Hunting",   color: "hsl(18 75% 62%)",   border: "hsl(18 75% 42%)",   bg: "hsl(18 75% 62% / 0.09)" },
  { label: "Attacking", color: "hsl(351 78% 62%)",  border: "hsl(351 78% 45%)",  bg: "hsl(351 78% 60% / 0.13)" },
];

export default function EntityPresenceIndicator({ presence, compact = false }) {
  if (!presence) return null;

  const { aggressionLevel = 0, proximityLabel = "Gone", isNearby, isStalking, isImminent } = presence;
  const style = AGGRESSION_STYLES[aggressionLevel] || AGGRESSION_STYLES[0];
  const shouldPulse = aggressionLevel >= 2;

  if (compact) {
    return (
      <motion.div
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
        style={{ background: style.bg, border: `1px solid ${style.border}` }}
        animate={shouldPulse ? { boxShadow: [`0 0 0px ${style.color}`, `0 0 10px ${style.color}55`, `0 0 0px ${style.color}`] } : {}}
        transition={shouldPulse ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } : {}}
      >
        <Eye className="w-2.5 h-2.5" style={{ color: style.color }} />
        <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: style.color }}>
          {proximityLabel}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{ background: style.bg, border: `1px solid ${style.border}` }}
      animate={shouldPulse ? { boxShadow: [`0 0 0px ${style.color}`, `0 0 14px ${style.color}44`, `0 0 0px ${style.color}`] } : {}}
      transition={shouldPulse ? { duration: 1.3, repeat: Infinity, ease: "easeInOut" } : {}}
    >
      <motion.div
        animate={isImminent ? { rotate: [0, -5, 5, 0], scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
      >
        <Eye className="w-3.5 h-3.5" style={{ color: style.color }} />
      </motion.div>
      <div className="flex flex-col">
        <span className="text-[9px] font-bold uppercase tracking-widest leading-none" style={{ color: style.color }}>
          {style.label}
        </span>
        <span className="text-[8px] opacity-60 leading-none mt-0.5" style={{ color: style.color }}>
          {proximityLabel}
        </span>
      </div>
    </motion.div>
  );
}