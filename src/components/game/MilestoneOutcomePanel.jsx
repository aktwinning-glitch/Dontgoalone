import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Skull, AlertTriangle, Heart, Package, Users } from "lucide-react";

/**
 * Cinematic milestone outcome panel.
 * Replaces the abstract "team score" overlay.
 */
export default function MilestoneOutcomePanel({ event, party, onDismiss }) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 300);
    return () => clearTimeout(t);
  }, []);

  if (!event) return null;

  const alive  = party?.filter(m => m.isAlive && !m.isMissing).length ?? 0;
  const total  = party?.length ?? 0;
  const dead   = party?.filter(m => !m.isAlive).length ?? 0;
  const injured = party?.filter(m => m.isInjured).length ?? 0;

  const titleColor = event.pass ? "hsl(123 68% 60%)" : "hsl(351 78% 65%)";
  const panelGlow  = event.pass ? "hsl(123 68% 55% / 0.15)" : "hsl(351 78% 60% / 0.15)";
  const borderClr  = event.pass ? "hsl(123 68% 55% / 0.4)"  : "hsl(351 78% 60% / 0.4)";

  const OUTCOMES = [
    { icon: Users,         label: "Survivors",   value: `${alive}/${total}`, color: "hsl(123 68% 55%)" },
    { icon: Skull,         label: "Lost",         value: dead,               color: "hsl(351 78% 60%)" },
    { icon: AlertTriangle, label: "Injured",      value: injured,            color: "hsl(40 90% 62%)"  },
    { icon: Heart,         label: "Group Fear",   value: event.fearLabel || "—", color: "hsl(351 78% 60%)" },
  ];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-40 flex items-center justify-center p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0" style={{ background: "hsl(252 13% 6% / 0.88)" }} />

        <motion.div
          initial={{ scale: 0.82, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="relative max-w-xs w-full rounded-3xl overflow-hidden"
          style={{
            background: "hsl(252 12% 13%)",
            border: `1.5px solid ${borderClr}`,
            boxShadow: `0 0 60px ${panelGlow}`,
          }}
        >
          {/* Top color band */}
          <div
            className="h-1.5 w-full"
            style={{ background: `linear-gradient(90deg, transparent, ${titleColor}, transparent)` }}
          />

          <div className="p-6 space-y-5">
            {/* Title */}
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring" }}
                className="text-4xl mb-2"
              >
                {event.pass ? "⚡" : "💀"}
              </motion.div>
              <h2 className="font-display text-2xl tracking-wide" style={{ color: titleColor }}>
                {event.pass ? "Night Outcome" : "What It Cost You"}
              </h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">The Night Decides</p>
            </div>

            {/* Outcome grid */}
            <div className="grid grid-cols-2 gap-2">
              {OUTCOMES.map((o, i) => {
                const Icon = o.icon;
                return (
                  <motion.div
                    key={o.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 10 }}
                    transition={{ delay: 0.15 + i * 0.08 }}
                    className="rounded-xl p-3 text-center"
                    style={{ background: `${o.color}12`, border: `1px solid ${o.color}25` }}
                  >
                    <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: o.color }} />
                    <p className="font-display text-xl" style={{ color: o.color }}>{o.value}</p>
                    <p className="text-[8px] uppercase tracking-wider text-muted-foreground">{o.label}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Emotional consequence */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: revealed ? 1 : 0 }}
              transition={{ delay: 0.6 }}
              className="rounded-xl px-4 py-3 text-center"
              style={{ background: "hsl(252 10% 18%)", border: "1px solid hsl(252 10% 24%)" }}
            >
              <p className="text-sm italic font-display text-foreground leading-relaxed">
                {event.message}
              </p>
            </motion.div>

            {/* CTA */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              whileTap={{ scale: 0.96 }}
              onClick={onDismiss}
              className="w-full h-12 rounded-xl text-sm font-semibold text-white"
              style={{
                background: event.pass
                  ? "linear-gradient(135deg, hsl(123 68% 40%), hsl(123 68% 32%))"
                  : "linear-gradient(135deg, hsl(351 78% 50%), hsl(351 78% 40%))",
                boxShadow: `0 4px 20px ${panelGlow}`,
              }}
            >
              Keep Moving →
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}