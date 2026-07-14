/**
 * ReactionBubble — Phase 2
 * A character reaction card that appears after major events.
 * Displays personality-driven emotional reactions — deeper than MicroReaction.
 * Shows reaction type label + line + member name.
 */
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { REACTION_TYPES } from "@/lib/reactionEngine";

const TYPE_META = {
  [REACTION_TYPES.DEATH]:      { icon: "💀", label: "Reacting to death",     color: "hsl(351 78% 65%)" },
  [REACTION_TYPES.FEAR_SPIKE]: { icon: "😨", label: "Frightened",            color: "hsl(271 87% 72%)" },
  [REACTION_TYPES.ISOLATION]:  { icon: "🔦", label: "Isolated",              color: "hsl(40 90% 68%)"  },
  [REACTION_TYPES.BETRAYAL]:   { icon: "🗡️",  label: "Betrayed",             color: "hsl(18 75% 65%)"  },
  [REACTION_TYPES.DISCOVERY]:  { icon: "🔍", label: "Discovery",             color: "hsl(200 65% 65%)" },
  [REACTION_TYPES.INJURY]:     { icon: "🩸", label: "Injured",               color: "hsl(351 78% 55%)" },
  [REACTION_TYPES.SURVIVAL]:   { icon: "✔",  label: "Survived",             color: "hsl(123 68% 60%)" },
};

export default function ReactionBubble({ member, line, reactionType, visible, portraitUrl }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!visible || !line || !member) { setShow(false); return; }
    setShow(true);
    const t = setTimeout(() => setShow(false), 4200);
    return () => clearTimeout(t);
  }, [visible, line, member]);

  if (!member || !line) return null;

  const meta = TYPE_META[reactionType] || TYPE_META[REACTION_TYPES.FEAR_SPIKE];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -6 }}
          transition={{ duration: 0.22, type: "spring", stiffness: 340, damping: 24 }}
          className="flex items-start gap-2.5 rounded-2xl px-3 py-2.5"
          style={{
            background: `${meta.color}0C`,
            border: `1px solid ${meta.color}30`,
            boxShadow: `0 0 16px ${meta.color}10`,
          }}
        >
          {/* Portrait */}
          <div
            className="shrink-0 rounded-full overflow-hidden mt-0.5"
            style={{
              width: 32,
              height: 32,
              boxShadow: `0 0 0 1.5px ${meta.color}60`,
            }}
          >
            {portraitUrl
              ? <img src={portraitUrl} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-[11px]" style={{ background: `${meta.color}18`, color: meta.color }}>{meta.icon}</div>
            }
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: meta.color }}>
                {member.name?.split(" ")[0]}
              </span>
              <span className="text-[7px] opacity-50 uppercase tracking-wider" style={{ color: meta.color }}>
                {meta.icon} {meta.label}
              </span>
            </div>
            <p className="text-[11px] italic leading-snug text-foreground/80">
              {line}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}