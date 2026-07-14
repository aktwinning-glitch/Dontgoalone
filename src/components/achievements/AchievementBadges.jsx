import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { evaluateAchievements } from "@/lib/achievementEngine";
import { X } from "lucide-react";

const RARITY_LABELS = { common: "Common", uncommon: "Uncommon", rare: "Rare" };

function BadgeDetail({ achievement, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "hsl(252 13% 6% / 0.8)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        className="rounded-2xl p-5 max-w-xs w-full space-y-3 text-center"
        style={{
          background: "hsl(252 12% 13%)",
          border: `1.5px solid ${achievement.isEarned ? achievement.border : "hsl(252 10% 22%)"}`,
          boxShadow: achievement.isEarned ? `0 0 32px ${achievement.bg}` : "none",
        }}
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
        <div className="text-4xl" style={{ filter: achievement.isEarned ? "none" : "grayscale(1) opacity(0.3)" }}>
          {achievement.emoji}
        </div>
        <div>
          <p className="font-bold text-foreground" style={{ color: achievement.isEarned ? achievement.color : "hsl(252 8% 45%)" }}>
            {achievement.name}
          </p>
          <span className="text-[8px] uppercase tracking-widest font-bold" style={{ color: "hsl(252 8% 45%)" }}>
            {RARITY_LABELS[achievement.rarity]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{achievement.description}</p>
        <div
          className="rounded-full py-1 px-3 text-[10px] font-bold uppercase tracking-wide"
          style={{
            background: achievement.isEarned ? achievement.bg : "hsl(252 10% 18%)",
            color: achievement.isEarned ? achievement.color : "hsl(252 8% 40%)",
          }}
        >
          {achievement.isEarned ? "✓ Earned" : "Locked"}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AchievementBadges({ runs = [] }) {
  const [selected, setSelected] = useState(null);
  const achievements = evaluateAchievements(runs);
  const earned = achievements.filter(a => a.isEarned).length;

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: "hsl(252 12% 13%)", border: "1.5px solid hsl(252 10% 20%)" }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-foreground">Achievements</p>
          <p className="text-[9px] text-muted-foreground">{earned}/{achievements.length} earned</p>
        </div>
        <div className="flex items-center gap-1">
          {[...Array(earned)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(40 90% 62%)" }} />
          ))}
          {[...Array(achievements.length - earned)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(252 10% 28%)" }} />
          ))}
        </div>
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-5 gap-2">
        {achievements.map((a, i) => (
          <motion.button
            key={a.id}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03, type: "spring", stiffness: 300, damping: 22 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSelected(a)}
            className="flex flex-col items-center gap-1 p-2 rounded-xl relative"
            style={{
              background: a.isEarned ? a.bg : "hsl(252 10% 16%)",
              border: `1px solid ${a.isEarned ? a.border : "hsl(252 10% 20%)"}`,
              boxShadow: a.isEarned && a.rarity === "rare" ? `0 0 10px ${a.bg}` : "none",
            }}
          >
            <span
              className="text-xl"
              style={{ filter: a.isEarned ? "none" : "grayscale(1) opacity(0.2)" }}
            >
              {a.emoji}
            </span>
            {a.isEarned && a.rarity === "rare" && (
              <div
                className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full"
                style={{ background: a.color, boxShadow: `0 0 4px ${a.color}` }}
              />
            )}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {selected && <BadgeDetail achievement={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}