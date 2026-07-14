import React from "react";
import { motion } from "framer-motion";
import { calculateSuccessChance } from "@/lib/gameEngine";
import { Zap, Brain, Shield, Wind, Heart, Users, Sparkles, Lock } from "lucide-react";
import { checkItemRequirements } from "@/lib/itemRequirements";

const STAT_ICONS = {
  strength: Zap,
  speed: Wind,
  resilience: Shield,
  intelligence: Brain,
  fear: Heart,
  charm: Sparkles,
  influence: Users,
};

const STAT_SHORT = {
  strength: "STR",
  speed: "SPD",
  resilience: "RES",
  intelligence: "INT",
  fear: "FEAR",
  charm: "CHA",
  influence: "INF",
};

// Gothic neon stat color map
const STAT_NEON = {
  strength:     { edge: "#B3003C", label: "ruby" },
  intelligence: { edge: "#1A4FFF", label: "sapphire" },
  resilience:   { edge: "#0FAF6A", label: "emerald" },
  charm:        { edge: "#A020F0", label: "amethyst" },
  influence:    { edge: "#A020F0", label: "amethyst" },
  speed:        { edge: "#00F0FF", label: "cyan" },
  fear:         { edge: "#FF2DAA", label: "pink" },
};

function getRiskColor(chance, isPanic, statUsed) {
  const statNeon = STAT_NEON[statUsed] || { edge: "#00F0FF" };
  if (isPanic) return { edge: "#B3003C", glow: "#B3003C55", bg: "#B3003C11", highlight: "#B3003C22" };
  if (chance >= 70) return { edge: statNeon.edge, glow: statNeon.edge + "55", bg: statNeon.edge + "11", highlight: statNeon.edge + "18" };
  if (chance >= 45) return { edge: "#FF2DAA",  glow: "#FF2DAA55", bg: "#FF2DAA11", highlight: "#FF2DAA18" };
  return { edge: "#B3003C", glow: "#B3003C55", bg: "#B3003C11", highlight: "#B3003C18" };
}

const TONE_MAP = {
  strength:     (c) => c >= 50 ? "Bold"      : "Reckless",
  speed:        (c) => c >= 50 ? "Quick"     : "Desperate",
  resilience:   (c) => c >= 50 ? "Steady"    : "Grim",
  intelligence: (c) => c >= 50 ? "Precise"   : "Gamble",
  charm:        (c) => c >= 50 ? "Emotional" : "Plea",
  influence:    (c) => c >= 50 ? "Decisive"  : "Risky",
  fear:         () => "Instinct",
};

export default function ChoiceButton({ choice, player, index, onSelect, disabled, isPanic }) {
  const Icon = STAT_ICONS[choice.statUsed] || Zap;
  const statValue = player.stats[choice.statUsed] || 5;
  const chance = calculateSuccessChance(statValue, choice.difficulty, player.stats.fear, player.threat || 0);
  const risk = getRiskColor(chance, isPanic, choice.statUsed);
  const toneLabel = TONE_MAP[choice.statUsed]?.(chance) ?? (chance >= 70 ? "Safe" : chance >= 45 ? "Risky" : "Danger");
  
  const hasRequiredItems = checkItemRequirements(player.inventory || [], choice.requiredItems || []);
  const isDisabled = disabled || !hasRequiredItems;

  return (
    <motion.button
      initial={{ opacity: 0, y: 14, scale: 0.93 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ boxShadow: `0 0 0 3px ${risk.edge}, 0 0 28px ${risk.edge}66` }}
      whileTap={{ scale: 0.97 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 360, damping: 26 }}
      onClick={() => onSelect(choice)}
      disabled={isDisabled}
      className="w-full text-left relative disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        borderRadius: 999,
        background: `linear-gradient(160deg, #0F0F1A 0%, #050507 100%)`,
        border: `1.5px solid ${risk.edge}`,
        boxShadow: `0 0 0 0px ${risk.edge}, inset 0 1px 0 ${risk.edge}22`,
      }}
    >
      {/* Neon glow top line */}
      <div className="absolute inset-x-4 top-0 h-px pointer-events-none" style={{
        background: `linear-gradient(90deg, transparent, ${risk.edge}88, transparent)`,
      }} />

      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Stat icon badge */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: `${risk.edge}18`,
            border: `1px solid ${risk.edge}55`,
            boxShadow: `0 0 10px ${risk.edge}33`,
          }}
        >
          {isPanic
            ? <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 1 }}>
                <Icon style={{ color: risk.edge, width: 17, height: 17 }} />
              </motion.div>
            : <Icon style={{ color: risk.edge, width: 17, height: 17 }} />
          }
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold leading-snug tracking-tight" style={{ color: "#E8E6D9" }}>
            {choice.text}
          </p>
          {choice.subtext && (
            <p className="text-[9px] mt-0.5 italic" style={{ color: "#A3A3B2" }}>{choice.subtext}</p>
          )}
          {/* Stat tag pill */}
          {choice.statUsed && (
            <span className="inline-flex items-center gap-1 mt-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full" style={{
              background: `${risk.edge}18`,
              border: `1px solid ${risk.edge}44`,
              color: risk.edge,
            }}>
              <Icon style={{ width: 8, height: 8 }} />
              {STAT_SHORT[choice.statUsed] || choice.statUsed}
            </span>
          )}
          {choice.requiredItems && choice.requiredItems.length > 0 && (
            <div className="mt-1 flex items-center gap-1 text-[8px] font-bold px-2 py-0.5 rounded-full w-fit" style={{
              background: hasRequiredItems ? "#0FAF6A18" : "#B3003C18",
              border: `1px solid ${hasRequiredItems ? "#0FAF6A55" : "#B3003C55"}`,
              color: hasRequiredItems ? "#0FAF6A" : "#B3003C",
            }}>
              <Lock className="w-2.5 h-2.5" />
              <span>{hasRequiredItems ? "Items ready" : "Missing items"}</span>
            </div>
          )}
        </div>

        {/* Chance pill */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className="text-[12px] font-black px-3 py-1 rounded-full"
            style={{
              background: `${risk.edge}22`,
              border: `1px solid ${risk.edge}66`,
              color: risk.edge,
              boxShadow: `0 0 8px ${risk.edge}44`,
            }}
          >
            {chance}%
          </span>
          <span className="text-[8px] font-black uppercase tracking-wider" style={{ color: risk.edge }}>
            {toneLabel}
          </span>
        </div>
      </div>
    </motion.button>
  );
}