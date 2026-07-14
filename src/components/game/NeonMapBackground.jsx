/**
 * NeonMapBackground — darkened map base layer for all gameplay screens.
 * Renders a SceneAsset keyed "mapImage" or "gameMap" as a full-screen base layer,
 * with a 55% dark overlay so the map is visible but never obstructs UI.
 */
import React from "react";
import { motion } from "framer-motion";

export default function NeonMapBackground({ mapImageUrl, fear = 0 }) {
  const fearRatio = Math.min(1, fear / 100);
  // Lift base darkness so map remains a visible atmosphere layer
  const overlayOpacity = 0.42 + fearRatio * 0.1;

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Map base */}
      {mapImageUrl ? (
        <img
          src={mapImageUrl}
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: "saturate(0.2) brightness(0.55) contrast(1.1)" }}
        />
      ) : (
        /* Blueprint grid fallback */
        <div
          className="w-full h-full"
          style={{
            background: "#050507",
            backgroundImage: `
              linear-gradient(hsl(185 100% 50% / 0.04) 1px, transparent 1px),
              linear-gradient(90deg, hsl(185 100% 50% / 0.04) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
          }}
        />
      )}

      {/* Dark overlay — blueprint feel */}
      <div
        className="absolute inset-0"
        style={{ background: `rgba(5,5,7,${overlayOpacity})` }}
      />

      {/* Subtle neon vignette rim */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(5,5,7,0.55) 100%)",
        }}
      />

      {/* High fear — pulsing red edges */}
      {fear > 65 && (
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: [0.0, 0.08, 0.0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 50%, #B3003C55 100%)",
          }}
        />
      )}
    </div>
  );
}