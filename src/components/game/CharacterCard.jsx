import React from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import StatBar from "./StatBar";
import CharacterPortrait, { CHARACTER_PRESETS } from "./CharacterPortrait";

export default function CharacterCard({ character, onSelect, index }) {
  const preset = CHARACTER_PRESETS[index % CHARACTER_PRESETS.length];
  const coreStats = ["strength", "speed", "resilience", "intelligence"];

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 280, damping: 24 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(character)}
      className="w-full text-left bg-card border border-border rounded-2xl p-4 hover:border-primary/40 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-center gap-4">
        {/* Modular portrait */}
        <div className="shrink-0 rounded-full overflow-hidden ring-2 ring-border shadow-sm">
          <CharacterPortrait {...preset} expression="neutral" size={64} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-display text-base font-bold text-foreground truncate">{character.name}</p>
          {character.description && (
            <p className="text-[10px] text-muted-foreground italic mb-2 line-clamp-1">{character.description}</p>
          )}
          <div className="space-y-1">
            {coreStats.map(stat => (
              <StatBar key={stat} stat={stat} value={character[stat] || 5} compact />
            ))}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
    </motion.button>
  );
}