import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import CharacterPortrait, { CHARACTER_PRESETS, getExpressionForMember } from "./CharacterPortrait";
import { getMemberStatus, MEMBER_STATUS } from "@/lib/partyEngine";
import { getLoyaltyState, LOYALTY_COLORS } from "@/lib/dialogueEngine";

const STAT_COLS = [
  { key: "strength",    label: "STR", color: "hsl(18 75% 62%)"  },
  { key: "speed",       label: "SPD", color: "hsl(200 65% 55%)" },
  { key: "resilience",  label: "RES", color: "hsl(123 68% 55%)" },
  { key: "intelligence",label: "INT", color: "hsl(271 87% 65%)" },
  { key: "charm",       label: "WIT", color: "hsl(40 90% 62%)"  },
];

const STATE_LABELS = {
  [MEMBER_STATUS.NORMAL]:  { label: "Steady",      color: "hsl(123 68% 55%)" },
  [MEMBER_STATUS.NERVOUS]: { label: "Shaken",      color: "hsl(40 90% 62%)"  },
  [MEMBER_STATUS.INJURED]: { label: "Injured",     color: "hsl(18 75% 62%)"  },
  [MEMBER_STATUS.MISSING]: { label: "Missing",     color: "hsl(252 8% 55%)"  },
  [MEMBER_STATUS.DEAD]:    { label: "Unraveling",  color: "hsl(351 78% 60%)" },
};

export default function CharacterModal({ member, presetIndex, onClose, assetImage }) {
  if (!member) return null;

  const status = getMemberStatus(member);
  const stateInfo = STATE_LABELS[status] || STATE_LABELS[MEMBER_STATUS.NORMAL];
  const preset = CHARACTER_PRESETS[presetIndex % CHARACTER_PRESETS.length];
  const expression = getExpressionForMember(member);
  const loyalty = getLoyaltyState(member.trustWithPlayer);
  const loyaltyColor = LOYALTY_COLORS[loyalty];

  const hook = member.roleTag || "Keeps to themselves. You don't know enough yet.";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0" style={{ background: "hsl(252 13% 6% / 0.75)" }} />

        <motion.div
          className="relative w-full max-w-sm rounded-2xl overflow-hidden"
          initial={{ y: 60, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 60, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: "hsl(252 12% 14%)",
            border: "1.5px solid hsl(252 10% 22%)",
            boxShadow: "0 -4px 40px hsl(252 13% 6% / 0.8)",
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-4 p-4 pb-0">
            <div
              className="rounded-full overflow-hidden shrink-0"
              style={{
                boxShadow: `0 0 0 2.5px ${loyaltyColor}, 0 0 16px ${loyaltyColor}50`,
                animation: "float 4s ease-in-out infinite",
              }}
            >
              <CharacterPortrait {...preset} expression={expression} size={60} assetImage={assetImage} />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-display text-xl text-foreground tracking-wide leading-none">{member.name}</h3>
              <p className="text-[10px] italic text-muted-foreground mt-1 line-clamp-2">{hook}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: `${loyaltyColor}20`, color: loyaltyColor, border: `1px solid ${loyaltyColor}40` }}
                >
                  {loyalty}
                </span>
                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: `${stateInfo.color}15`, color: stateInfo.color, border: `1px solid ${stateInfo.color}30` }}
                >
                  {stateInfo.label}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "hsl(252 10% 22%)" }}
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Stats */}
          <div className="p-4 pt-3 space-y-2">
            {STAT_COLS.map(s => {
              const val = member[s.key] || 5;
              const pct = (val / 10) * 100;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <span className="text-[9px] font-bold w-6 shrink-0" style={{ color: s.color }}>{s.label}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(252 10% 22%)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: s.color, boxShadow: `0 0 6px ${s.color}80` }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground w-3 text-right">{val}</span>
                </div>
              );
            })}
          </div>

          {/* Fear */}
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-muted-foreground w-6 shrink-0">FEAR</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(252 10% 22%)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${member.fearLevel || 0}%`,
                    background: "hsl(351 78% 60%)",
                    boxShadow: "0 0 6px hsl(351 78% 60% / 0.6)",
                  }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground w-5 text-right">{member.fearLevel || 0}</span>
            </div>
          </div>

          {/* Status text */}
          {member.currentStatusText && (
            <div
              className="mx-4 mb-4 rounded-xl px-3 py-2 text-[10px] italic text-muted-foreground"
              style={{ background: "hsl(252 10% 18%)", border: "1px solid hsl(252 10% 22%)" }}
            >
              {member.currentStatusText}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}