import React from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * KillPauseOverlay: Cinematic pause mode for major death events.
 * Desaturates screen, hides UI noise, requires tap to resume.
 */
export default function KillPauseOverlay({ isActive, onResume }) {
  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="kill-pause-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.2 }}
        className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center"
        style={{
          background: "rgba(0, 0, 0, 0.25)",
        }}
      >
        {/* Desaturation layer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, rgba(100, 100, 120, 0.15), rgba(80, 80, 100, 0.15))",
            mixBlendMode: "desaturate",
          }}
        />

        {/* Tap to continue prompt - subtle, delayed appearance */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 2, duration: 0.8 }}
          onClick={onResume}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-auto text-center space-y-2"
        >
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground"
          >
            tap to continue
          </motion.p>
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}