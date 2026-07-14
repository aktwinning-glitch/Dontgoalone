/**
 * TensionWarning — Phase 2
 * Displays pre-danger environmental warning signs.
 * Appears briefly before lethal/high-threat events.
 * Auto-dismisses after a delay.
 */
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function TensionWarning({ text, visible, tier = "RISING" }) {
  const [showing, setShowing] = useState(false);

  useEffect(() => {
    if (!visible || !text) { setShowing(false); return; }
    setShowing(true);
    const t = setTimeout(() => setShowing(false), 3800);
    return () => clearTimeout(t);
  }, [visible, text]);

  const tierStyles = {
    UNEASY:   { border: "hsl(40 90% 62% / 0.3)",  bg: "hsl(40 90% 62% / 0.05)",  color: "hsl(40 90% 72%)",  icon: "·" },
    RISING:   { border: "hsl(18 75% 60% / 0.35)", bg: "hsl(18 75% 60% / 0.06)",  color: "hsl(18 75% 72%)",  icon: "⚠" },
    DANGER:   { border: "hsl(351 78% 60% / 0.4)", bg: "hsl(351 78% 60% / 0.07)", color: "hsl(351 78% 75%)", icon: "▲" },
    IMMINENT: { border: "hsl(351 78% 60% / 0.7)", bg: "hsl(351 78% 60% / 0.12)", color: "hsl(351 78% 85%)", icon: "✗" },
  };

  const s = tierStyles[tier] || tierStyles.RISING;

  return (
    <AnimatePresence>
      {showing && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="rounded-xl px-3 py-2 flex items-start gap-2.5"
          style={{ background: s.bg, border: `1px solid ${s.border}` }}
        >
          <span className="text-[11px] mt-0.5 shrink-0 opacity-70" style={{ color: s.color }}>{s.icon}</span>
          <p className="text-[11px] italic leading-snug" style={{ color: s.color }}>{text}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}