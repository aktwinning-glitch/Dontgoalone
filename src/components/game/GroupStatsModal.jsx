import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Zap, Wind, Brain, Heart, Users } from "lucide-react";
import { calcTeamScore, MILESTONE_PASS_THRESHOLD } from "@/lib/milestoneEngine";
import { getFearStage } from "@/components/game/FearBar";

const STAT_ROWS = [
  { key: "strength",    label: "Strength",    icon: Zap,    color: "hsl(18 75% 62%)"  },
  { key: "speed",       label: "Speed",       icon: Wind,   color: "hsl(200 65% 55%)" },
  { key: "resilience",  label: "Resilience",  icon: Shield, color: "hsl(123 68% 55%)" },
  { key: "intelligence",label: "Intelligence",icon: Brain,  color: "hsl(271 87% 65%)" },
  { key: "charm",       label: "Wit",         icon: Users,  color: "hsl(40 90% 62%)"  },
];

export default function GroupStatsModal({ player, party, onClose }) {
  if (!player) return null;

  const alive = party?.filter(m => m.isAlive && !m.isMissing) || [];
  const dead  = party?.filter(m => !m.isAlive).length || 0;
  const missing = party?.filter(m => m.isMissing).length || 0;
  const score = calcTeamScore(player, party);
  const canSurvive = score >= MILESTONE_PASS_THRESHOLD;
  const fearStage = getFearStage(player.stats.fear);

  // Group fear average
  const avgFear = alive.length
    ? Math.round(alive.reduce((s, m) => s + (m.fearLevel || 0), 0) / alive.length)
    : player.stats.fear;

  // Survival projection label
  const projectionLabel = canSurvive
    ? "You should make it through."
    : score > MILESTONE_PASS_THRESHOLD * 0.7
    ? "It will be close. Someone may fall."
    : "Unlikely. Someone will be lost.";

  const projectionColor = canSurvive
    ? "hsl(123 68% 55%)"
    : score > MILESTONE_PASS_THRESHOLD * 0.7
    ? "hsl(40 90% 62%)"
    : "hsl(351 78% 60%)";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <div className="absolute inset-0" style={{ background: "hsl(252 13% 6% / 0.8)" }} />

        <motion.div
          className="relative w-full max-w-sm rounded-2xl overflow-hidden"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={e => e.stopPropagation()}
          style={{ background: "hsl(252 12% 14%)", border: "1.5px solid hsl(252 10% 22%)", boxShadow: "0 -4px 40px hsl(252 13% 6% / 0.8)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <h3 className="font-display text-xl text-foreground tracking-wide">Group Condition</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Can you survive the next milestone?</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "hsl(252 10% 22%)" }}>
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Survival projection */}
          <div className="mx-5 mb-4 rounded-xl p-3 text-center" style={{ background: `${projectionColor}15`, border: `1px solid ${projectionColor}35` }}>
            <p className="text-xs font-semibold italic" style={{ color: projectionColor }}>{projectionLabel}</p>
          </div>

          {/* Group status */}
          <div className="px-5 pb-4 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Alive",   value: alive.length,          color: "hsl(123 68% 55%)" },
              { label: "Missing", value: missing,                color: "hsl(252 8% 55%)"  },
              { label: "Gone",    value: dead,                   color: "hsl(351 78% 60%)" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-2.5" style={{ background: "hsl(252 10% 18%)", border: "1px solid hsl(252 10% 22%)" }}>
                <p className="font-display text-2xl" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[8px] uppercase tracking-wider text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Team stats */}
          <div className="px-5 pb-4 space-y-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Team Stats</p>
            {STAT_ROWS.map(s => {
              const Icon = s.icon;
              const val = player.stats[s.key] || 5;
              const pct = (val / 10) * 100;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <Icon className="w-3 h-3 shrink-0" style={{ color: s.color }} />
                  <span className="text-[9px] font-bold w-16 shrink-0" style={{ color: s.color }}>{s.label}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(252 10% 22%)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color, boxShadow: `0 0 6px ${s.color}80` }} />
                  </div>
                  <span className="text-[9px] text-muted-foreground w-4 text-right">{val}</span>
                </div>
              );
            })}
          </div>

          {/* Group fear */}
          <div className="px-5 pb-5">
            <div className="flex items-center gap-2 rounded-xl p-3" style={{ background: "hsl(252 10% 18%)", border: "1px solid hsl(252 10% 22%)" }}>
              <Heart className="w-3.5 h-3.5 shrink-0" style={{ color: fearStage.color }} />
              <span className="text-[9px] font-bold flex-1" style={{ color: fearStage.color }}>
                Group Fear — {fearStage.label}
              </span>
              <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(252 10% 26%)" }}>
                <div className="h-full rounded-full" style={{ width: `${avgFear}%`, background: fearStage.color }} />
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}