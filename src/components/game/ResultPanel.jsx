import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { getCurrentPhase } from "@/lib/phaseSystem";

const PHASE_ACT_LABEL = {
  arrival: "Act 1 Outcome",
  exploration: "Act 1 Outcome",
  escalation: "Act 2 Outcome",
  survival: "Act 2 Outcome",
  collapse: "Act 3 Outcome",
  resolution: "Final Outcome",
  final: "Final Outcome",
};

export default function ResultPanel({ result, onContinue, affectedPortrait, affectedName, choiceCount = 0 }) {
  const outcomeText = result?.outcomeText;

  // Auto-continue immediately when there is no authored outcomeText
  // Must be called unconditionally (Rules of Hooks)
  useEffect(() => {
    if (result && !outcomeText) {
      const t = setTimeout(onContinue, 120);
      return () => clearTimeout(t);
    }
  }, [result, outcomeText, onContinue]);

  if (!result) return null;

  const { success, statChanges, fearChange, threatChange, consequenceTags } = result;
  const phase = getCurrentPhase(choiceCount);
  const actLabel = PHASE_ACT_LABEL[phase.id] || "Outcome";

  const changes = [];
  if (statChanges) {
    for (const [stat, delta] of Object.entries(statChanges)) {
      if (delta !== 0) changes.push({ label: stat.toUpperCase(), value: delta });
    }
  }
  if (fearChange && fearChange !== 0) changes.push({ label: "FEAR", value: fearChange });
  if (threatChange && threatChange !== 0) changes.push({ label: "THREAT", value: threatChange });

  const accentColor = success ? "#5ae87a" : "#e8705a";
  const bgColor = success ? "hsl(123 68% 55% / 0.07)" : "hsl(351 78% 60% / 0.08)";
  const borderColor = success ? "hsl(123 68% 55% / 0.4)" : "hsl(351 78% 60% / 0.45)";
  const emoji = success ? "✓" : "✗";
  const label = success ? "Survived" : "Failed";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.93 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className={`rounded-3xl overflow-hidden ${success ? "animate-glow-success" : "animate-shake"}`}
        style={{
          background: bgColor,
          border: `2px solid ${borderColor}`,
          boxShadow: `0 0 40px ${accentColor}30, inset 0 1px 0 ${accentColor}20`,
        }}
      >
        {/* Top strip */}
        <div
          className="h-1.5 w-full"
          style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
        />

        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 440, damping: 18 }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0"
              style={{
                background: `${accentColor}18`,
                border: `2px solid ${accentColor}50`,
                boxShadow: `0 0 16px ${accentColor}40`,
              }}
            >
              {success
                ? <CheckCircle2 className="w-5 h-5" style={{ color: accentColor }} />
                : <XCircle className="w-5 h-5" style={{ color: accentColor }} />
              }
            </motion.div>

            <div className="flex-1">
              <div>
                <p
                  className="text-[8px] font-black uppercase tracking-widest opacity-60"
                  style={{ color: accentColor }}
                >
                  {actLabel}
                </p>
                <p
                  className="text-[11px] font-black uppercase tracking-widest"
                  style={{ color: accentColor }}
                >
                  {emoji} {label}
                </p>
              </div>
            </div>

            {/* Affected portrait thumbnail */}
            {affectedPortrait && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="shrink-0 flex flex-col items-center gap-0.5"
              >
                <div
                  className="w-10 h-10 rounded-full overflow-hidden"
                  style={{ boxShadow: `0 0 0 2px ${accentColor}, 0 0 10px ${accentColor}50` }}
                >
                  <img src={affectedPortrait} alt="" className="w-full h-full object-cover" />
                </div>
                {affectedName && (
                  <span className="text-[7px] font-bold text-muted-foreground truncate" style={{ maxWidth: 44 }}>
                    {affectedName.split(" ")[0]}
                  </span>
                )}
              </motion.div>
            )}
          </div>

          {/* Outcome text — only render if authored outcomeText exists */}
          {outcomeText && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl px-4 py-3"
              style={{ background: "hsl(252 12% 13%)", border: "1px solid hsl(252 10% 21%)" }}
            >
              <p className="text-sm font-display italic leading-relaxed text-foreground">
                {outcomeText}
              </p>
            </motion.div>
          )}

          {/* Stat change chips */}
          {changes.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap gap-1.5"
            >
              {changes.map(({ label, value }) => {
                const positive = value > 0;
                const isBad = (label === "FEAR" || label === "THREAT") ? positive : !positive;
                const chipColor = isBad ? "#e8705a" : "#5ae87a";
                const Icon = positive ? TrendingUp : TrendingDown;
                return (
                  <motion.div
                    key={label}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                    style={{
                      background: `${chipColor}12`,
                      border: `1.5px solid ${chipColor}35`,
                      boxShadow: `0 0 8px ${chipColor}20`,
                    }}
                  >
                    <Icon className="w-2.5 h-2.5" style={{ color: chipColor }} />
                    <span className="text-[9px] font-bold" style={{ color: chipColor }}>{label}</span>
                    <span className="text-[10px] font-black" style={{ color: chipColor }}>
                      {value > 0 ? "+" : ""}{value}
                    </span>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Consequence tags — story feedback */}
          {consequenceTags && consequenceTags.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-1.5"
            >
              {consequenceTags.map((tag, i) => (
                <span
                  key={i}
                  className="text-[8px] font-bold px-2 py-1 rounded-lg"
                  style={{
                    background: "hsl(252 12% 20%)",
                    border: "1px solid hsl(252 10% 28%)",
                    color: "hsl(40 30% 65%)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </motion.div>
          )}

          {/* Continue */}
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={onContinue}
            className="w-full h-12 rounded-2xl text-sm font-black flex items-center justify-center gap-2 text-white"
            style={{
              background: `linear-gradient(135deg, ${accentColor}cc, ${accentColor}77)`,
              boxShadow: `0 4px 20px ${accentColor}45`,
            }}
          >
            Keep Moving
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}