import React from "react";
import { motion } from "framer-motion";
import { Play, Trash2 } from "lucide-react";

/**
 * Session Resume Card — shows saved run and allows resuming or deleting
 */
export default function SessionResume({ onResume, onDelete, sessionData }) {
  if (!sessionData) return null;

  const { player, party } = sessionData;
  if (!player) return null;

  const alive = party?.filter(m => m.isAlive && !m.isMissing).length || 0;
  const total = party?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-3xl p-5 space-y-3"
      style={{
        background: "linear-gradient(135deg, hsl(271 87% 55% / 0.15), hsl(271 87% 55% / 0.08))",
        border: "1.5px solid hsl(271 87% 65% / 0.4)",
        boxShadow: "0 8px 32px hsl(271 87% 55% / 0.1), inset 0 1px 0 hsl(271 87% 65% / 0.15)",
      }}
    >
      {/* Header */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">📋 Saved Run</p>
        <p className="font-display text-lg text-foreground tracking-wide">{player.characterName}</p>
        <p className="text-xs text-muted-foreground">{player.storyTitle || "The Rental"}</p>
      </div>

      {/* Stats row */}
      <div className="flex justify-between gap-2 text-[10px]">
        <div className="flex-1 flex items-center gap-1">
          <span className="text-sm">👥</span>
          <span className="text-muted-foreground">{alive}/{total} alive</span>
        </div>
        <div className="flex-1 flex items-center gap-1">
          <span className="text-sm">😨</span>
          <span className="text-destructive font-bold">{player.stats?.fear || 0}</span>
        </div>
        <div className="flex-1 flex items-center gap-1">
          <span className="text-sm">⚠️</span>
          <span className="text-warning font-bold">{player.threat || 0}</span>
        </div>
        <div className="flex-1 flex items-center gap-1">
          <span className="text-sm">🌙</span>
          <span className="text-primary font-bold">{player.night || 1}</span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onResume}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all"
          style={{
            background: "linear-gradient(135deg, hsl(271 87% 55%), hsl(271 87% 48%))",
            boxShadow: "0 4px 16px hsl(271 87% 55% / 0.35)",
          }}
        >
          <Play className="w-4 h-4" />
          Resume
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground transition-colors"
          style={{
            background: "hsl(252 12% 18%)",
            border: "1px solid hsl(252 10% 24%)",
          }}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}