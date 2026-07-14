import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CharacterPortrait, { CHARACTER_PRESETS, getExpressionForMember } from "./CharacterPortrait";
import { getDialogueLine, getCharacterRole, pickSpeaker } from "@/lib/dialogueEngine";

export default function DeathPanel({ deadMember, party = [], charImageMap = {}, onDismiss }) {
  if (!deadMember) return null;

  const idx = party.findIndex(m => m.id === deadMember.id);
  const preset = CHARACTER_PRESETS[Math.max(0, idx) % CHARACTER_PRESETS.length];
  const assetImage = charImageMap?.[deadMember.id] || null;

  // Pick 1-2 survivors who react
  const survivors = party.filter(m => m.isAlive && !m.isMissing && m.id !== deadMember.id);
  const reactors = survivors.slice(0, 2);

  return (
    <AnimatePresence>
      <motion.div
        key="death-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
        style={{ background: "hsl(0 0% 0% / 0.88)", backdropFilter: "blur(8px)" }}
      >
        {/* Red pulse vignette */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0, 0.18, 0, 0.1, 0] }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          style={{ background: "radial-gradient(ellipse at center, hsl(351 78% 40%) 0%, transparent 70%)" }}
        />

        <motion.div
          initial={{ scale: 0.75, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 240, damping: 22 }}
          className="w-full max-w-xs space-y-5 relative"
        >
          {/* Portrait — large, desaturated */}
          <div className="flex flex-col items-center gap-3">
            <motion.div
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="rounded-full overflow-hidden"
              style={{
                width: 96,
                height: 96,
                filter: "grayscale(0.8) brightness(0.7)",
                boxShadow: "0 0 0 3px hsl(351 78% 55% / 0.4), 0 0 40px hsl(351 78% 55% / 0.2)",
              }}
            >
              <CharacterPortrait
                {...preset}
                expression="unstable"
                size={96}
                assetImage={assetImage}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="text-center"
            >
              <p className="text-[9px] uppercase tracking-[0.3em] font-bold mb-1" style={{ color: "hsl(351 78% 60%)" }}>
                Gone
              </p>
              <h2 className="font-display text-2xl text-foreground">{deadMember.name}</h2>
              {deadMember.currentStatusText && (
                <p className="text-xs text-muted-foreground italic mt-1 leading-relaxed">
                  {deadMember.currentStatusText}
                </p>
              )}
            </motion.div>
          </div>

          {/* Survivor reactions */}
          {reactors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="space-y-2"
            >
              {reactors.map((r, i) => {
                const role = getCharacterRole(r);
                const line = getDialogueLine("hurt", role);
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.75 + i * 0.15 }}
                    className="flex items-start gap-2 rounded-xl px-3 py-2"
                    style={{ background: "hsl(252 12% 14%)", border: "1px solid hsl(252 10% 20%)" }}
                  >
                    <span className="text-[9px] font-bold shrink-0 mt-0.5" style={{ color: "hsl(271 87% 68%)" }}>
                      {r.name?.split(" ")[0]}
                    </span>
                    <p className="text-xs text-muted-foreground italic leading-relaxed">"{line}"</p>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Dismiss button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            whileTap={{ scale: 0.96 }}
            onClick={onDismiss}
            className="w-full h-11 rounded-xl text-sm font-bold text-foreground"
            style={{
              background: "hsl(252 12% 20%)",
              border: "1px solid hsl(351 78% 55% / 0.3)",
            }}
          >
            Keep moving →
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}