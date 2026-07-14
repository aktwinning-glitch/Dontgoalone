/**
 * SocialTensionBanner — Phase 2
 * Shows escalating argument/accusation lines and panic actions.
 * Appears when cohesion is low or fear is high.
 * Can show an accusation, argument, or refusal line.
 */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

const STAGE_STYLES = {
  STRAINED:   { color: "hsl(40 90% 68%)",  border: "hsl(40 90% 50% / 0.35)", bg: "hsl(40 90% 50% / 0.06)" },
  FRACTURING: { color: "hsl(18 75% 68%)",  border: "hsl(18 75% 50% / 0.4)",  bg: "hsl(18 75% 50% / 0.07)" },
  COLLAPSED:  { color: "hsl(351 78% 72%)", border: "hsl(351 78% 55% / 0.5)", bg: "hsl(351 78% 55% / 0.10)" },
};

export default function SocialTensionBanner({ speakerName, line, stageLabel, visible, panicAction }) {
  if (!line && !panicAction) return null;

  const s = STAGE_STYLES[stageLabel] || STAGE_STYLES.STRAINED;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.22 }}
          className="rounded-xl px-3 py-2.5 space-y-1"
          style={{ background: s.bg, border: `1px solid ${s.border}` }}
        >
          {panicAction && (
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3 h-3 shrink-0" style={{ color: s.color }} />
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: s.color }}>
                Panic Decision
              </span>
            </div>
          )}
          {speakerName && !panicAction && (
            <span className="text-[9px] font-bold uppercase tracking-widest block" style={{ color: s.color }}>
              {speakerName}
            </span>
          )}
          <p className="text-[11px] italic leading-snug" style={{ color: s.color }}>
            {panicAction ? panicAction.text : line}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}