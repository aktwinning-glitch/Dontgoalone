import React from "react";
import { motion } from "framer-motion";

/**
 * Global atmospheric background layer.
 * Renders behind all content. Handles:
 *  - breathing gradient (slow pulse)
 *  - vignette edges
 *  - faint flicker glow
 *  - tension-tier flicker (Phase 2)
 *  - danger zone darkening (Phase 2)
 */
export default function AtmosphereLayer({ fear = 0, threat = 0, tensionTier = null }) {
  const fearRatio = Math.min(1, fear / 100);
  const threatRatio = Math.min(1, threat / 100);
  const combined = fearRatio * 0.6 + threatRatio * 0.4;

  // Shift hue from plum → blood coral as combined tension rises
  const glowHue = Math.round(271 - combined * 80);
  const glowOpacity = 0.04 + combined * 0.12;

  // Tension-tier flicker params
  const tier = tensionTier?.label || "CALM";
  const flickerRate = tier === "IMMINENT" ? 0.12 : tier === "DANGER" ? 0.22 : 0.38;
  const flickerDelay = tier === "IMMINENT" ? 0.8 : tier === "DANGER" ? 1.4 : 2.5;
  const flickerOpacity = tier === "IMMINENT" ? 0.07 : tier === "DANGER" ? 0.04 : 0.025;
  const flickerColor = threat > 70 ? "hsl(351 78% 40%)" : "hsl(271 60% 30%)";
  const showFlicker = fearRatio > 0.45 || threatRatio > 0.45 || tier === "DANGER" || tier === "IMMINENT";

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Breathing gradient */}
      <motion.div
        className="absolute inset-0"
        animate={{
          opacity: [glowOpacity, glowOpacity * 1.6, glowOpacity],
        }}
        transition={{
          duration: 9 - combined * 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          background: `radial-gradient(ellipse at 50% 20%, hsl(${glowHue} 70% 50% / 1) 0%, transparent 65%)`,
        }}
      />

      {/* Vignette — deepens with threat */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, transparent 40%, hsl(252 13% 6% / ${0.75 + threatRatio * 0.18}) 100%)`,
        }}
      />

      {/* Tension flicker — fires earlier and harder based on tier */}
      {showFlicker && (
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: [0, flickerOpacity, 0, flickerOpacity * 0.5, 0] }}
          transition={{
            duration: flickerRate,
            repeat: Infinity,
            repeatDelay: flickerDelay + Math.random() * 2,
          }}
          style={{ background: `${flickerColor} / 1` }}
        />
      )}

      {/* Edge bleed — red corners at IMMINENT */}
      {tier === "IMMINENT" && (
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: [0, 0.08, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background: "radial-gradient(ellipse at center, transparent 55%, hsl(351 78% 30% / 1) 100%)",
          }}
        />
      )}
    </div>
  );
}