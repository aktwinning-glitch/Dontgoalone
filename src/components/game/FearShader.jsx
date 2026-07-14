import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * CSS-based screen shader that intensifies as fear rises.
 * Layers:
 *  0–30  fear: subtle desaturation tint
 *  30–60 fear: stronger desaturation + blue-tinted vignette  
 *  60–80 fear: blur edges + pulsing red vignette
 *  80+   fear: heavy red flicker + strong desaturation + blur
 */
export default function FearShader({ fear = 0 }) {
  const f = Math.max(0, Math.min(100, fear));

  // Normalised stages
  const isLow    = f >= 30 && f < 60;
  const isMid    = f >= 60 && f < 80;
  const isHigh   = f >= 80;

  // Desaturation: ramps from 0% at fear=30 to 70% at fear=100
  const desatPct = f < 30 ? 0 : Math.round(((f - 30) / 70) * 70);

  // Red vignette opacity
  const redOpacity = f < 60 ? 0 : Math.min(0.55, ((f - 60) / 40) * 0.55);

  // Blur: 0px → 2.5px at edges only (via radial gradient mask on a backdrop-blur div)
  const blurPx = f < 70 ? 0 : Math.min(3, ((f - 70) / 30) * 3);

  return (
    <>
      {/* 1. Desaturation — CSS filter on a transparent overlay with mix-blend-mode */}
      {desatPct > 0 && (
        <div
          className="fixed inset-0 pointer-events-none z-20"
          style={{
            backdropFilter: `saturate(${100 - desatPct}%)`,
            WebkitBackdropFilter: `saturate(${100 - desatPct}%)`,
            // Mask: apply only at periphery using radial gradient
            maskImage: "radial-gradient(ellipse 80% 75% at 50% 50%, transparent 30%, black 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 75% at 50% 50%, transparent 30%, black 100%)",
            opacity: 0.85,
          }}
        />
      )}

      {/* Full-screen desaturation layer at very high fear */}
      {f >= 75 && (
        <div
          className="fixed inset-0 pointer-events-none z-20"
          style={{
            backdropFilter: `saturate(${Math.max(20, 100 - desatPct - 20)}%)`,
            WebkitBackdropFilter: `saturate(${Math.max(20, 100 - desatPct - 20)}%)`,
            opacity: Math.min(1, (f - 75) / 25),
          }}
        />
      )}

      {/* 2. Edge blur — peripheral only */}
      {blurPx > 0 && (
        <div
          className="fixed inset-0 pointer-events-none z-21"
          style={{
            backdropFilter: `blur(${blurPx}px)`,
            WebkitBackdropFilter: `blur(${blurPx}px)`,
            maskImage: "radial-gradient(ellipse 65% 60% at 50% 50%, transparent 0%, black 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 65% 60% at 50% 50%, transparent 0%, black 100%)",
          }}
        />
      )}

      {/* 3. Red vignette — smooth pulse */}
      {redOpacity > 0 && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-22"
          animate={{ opacity: [redOpacity * 0.7, redOpacity, redOpacity * 0.7] }}
          transition={{ duration: isHigh ? 1.2 : 2.4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background: "radial-gradient(ellipse at center, transparent 35%, hsl(351 80% 40% / 1) 100%)",
          }}
        />
      )}

      {/* 4. High-fear flicker — random red flash */}
      <AnimatePresence>
        {isHigh && (
          <motion.div
            key="flicker"
            className="fixed inset-0 pointer-events-none z-23"
            animate={{
              opacity: [0, 0, 0.08, 0, 0, 0, 0.04, 0, 0],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              repeatDelay: 0.6 + Math.random() * 1.5,
              ease: "linear",
            }}
            style={{ background: "hsl(351 80% 50%)" }}
          />
        )}
      </AnimatePresence>

      {/* 5. Chromatic aberration hint — very high fear only */}
      {f >= 88 && (
        <div
          className="fixed inset-0 pointer-events-none z-24"
          style={{
            background: "transparent",
            boxShadow: `inset 0 0 0 2px hsl(351 80% 60% / 0.12), inset 0 0 40px hsl(351 80% 50% / 0.08)`,
          }}
        />
      )}
    </>
  );
}