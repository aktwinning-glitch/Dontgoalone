import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import CharacterPortrait, { CHARACTER_PRESETS } from "./CharacterPortrait";

/**
 * Displays a single micro-reaction line from a party member.
 * Auto-dismisses after a delay.
 */
export default function MicroReaction({ speakerName, line, visible, speakerImage, presetIndex = 0 }) {
  if (!line || !speakerName) return null;
  if (!speakerImage && !speakerName) {
    console.warn("[MicroReaction] No portrait available for speaker");
  }
  const preset = CHARACTER_PRESETS[presetIndex % CHARACTER_PRESETS.length];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs italic"
          style={{
            background: "hsl(252 12% 16%)",
            border: "1px solid hsl(271 87% 65% / 0.2)",
            boxShadow: "0 2px 12px hsl(252 13% 6% / 0.5), 0 0 0 1px hsl(271 87% 65% / 0.06)",
          }}
        >
          {/* Speaker portrait bubble */}
          <div
            className="shrink-0 rounded-full overflow-hidden"
            style={{
              width: 28,
              height: 28,
              boxShadow: "0 0 0 1.5px hsl(271 87% 65% / 0.5), 0 0 8px hsl(271 87% 65% / 0.25)",
            }}
          >
            {speakerImage ? (
              <img src={speakerImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <CharacterPortrait {...preset} expression="uneasy" size={28} />
            )}
          </div>

          <div className="flex-1">
            <span className="font-bold not-italic block text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "hsl(271 87% 75%)" }}>
              {speakerName}
            </span>
            <span className="text-muted-foreground text-[11px] leading-snug">"{line}"</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}