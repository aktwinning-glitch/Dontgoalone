import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/lib/GameContext";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { buildAssetMap } from "@/lib/assetManager";
import CharacterPortrait, { CHARACTER_PRESETS } from "@/components/game/CharacterPortrait";
import AtmosphereLayer from "@/components/game/AtmosphereLayer";
import { ArrowLeft, Zap, Wind, Shield, Brain, Sparkles, Users } from "lucide-react";

const STAT_CONFIG = [
  { key: "strength",     label: "Strength",     icon: Zap,      color: "#e8705a" },
  { key: "speed",        label: "Speed",         icon: Wind,     color: "#5ab8e8" },
  { key: "resilience",   label: "Resilience",    icon: Shield,   color: "#5ae87a" },
  { key: "intelligence", label: "Intelligence",  icon: Brain,    color: "#b05ae8" },
  { key: "charm",        label: "Charm",         icon: Sparkles, color: "#e8d05a" },
];

function StatBar({ stat, value }) {
  const Icon = stat.icon;
  const pct = Math.min(100, (value / 10) * 100);
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: `linear-gradient(135deg, ${stat.color}44, ${stat.color}22)`,
          border: `2px solid ${stat.color}66`,
          boxShadow: `0 2px 0 ${stat.color}33`,
        }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
      </div>
      <span className="text-[11px] font-bold w-20 shrink-0" style={{ color: "hsl(40 25% 75%)" }}>{stat.label}</span>
      {/* Cartoon bar with thick outline + fill */}
      <div className="flex-1 h-3 rounded-full overflow-hidden" style={{
        background: "hsl(252 10% 16%)",
        border: "1.5px solid hsl(252 10% 26%)",
        boxShadow: "inset 0 2px 4px hsl(252 13% 5% / 0.5)",
      }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${stat.color}bb, ${stat.color})` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.1 }}
        />
      </div>
      <span className="text-xs font-black w-5 text-right" style={{ color: stat.color }}>{value}</span>
    </div>
  );
}

function CompanionBubble({ member, index, assetImage }) {
  const preset = CHARACTER_PRESETS[(index + 1) % CHARACTER_PRESETS.length];
  const ACCENTS = ["#e85a7a","#7a5ae8","#5ab8e8","#5ae87a","#e8a05a"];
  const accent = ACCENTS[index % ACCENTS.length];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.07, type: "spring", stiffness: 300, damping: 22 }}
      className="flex flex-col items-center gap-1"
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3 + index * 0.4, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }}
        className="rounded-full overflow-hidden"
        style={{ boxShadow: `0 0 0 2.5px ${accent}, 0 0 12px ${accent}50` }}
      >
        <CharacterPortrait {...preset} expression="neutral" size={48} assetImage={assetImage} />
      </motion.div>
      <span className="text-[8px] font-bold text-muted-foreground truncate text-center" style={{ maxWidth: 52 }}>
        {member.name?.split(" ")[0]}
      </span>
      {member.roleTag && (
        <span
          className="text-[6px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
          style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}
        >
          {member.roleTag}
        </span>
      )}
    </motion.div>
  );
}

export default function CharacterConfirm() {
  const navigate = useNavigate();
  const { player, party } = useGame();

  const { data: characters } = useQuery({
    queryKey: ["characters"],
    queryFn: () => base44.entities.Character.list("sort_order"),
    initialData: [],
  });
  const { data: sceneAssets } = useQuery({
    queryKey: ["sceneAssets"],
    queryFn: () => base44.entities.SceneAsset.list(),
    initialData: [],
  });

  const assetMap = useMemo(() => buildAssetMap(sceneAssets, characters), [sceneAssets, characters]);

  // Guard after all hooks
  if (!player) {
    navigate("/select");
    return null;
  }

  const companions = party?.filter(m => !m.isPlayer) || [];
  const assetImage = assetMap.getCharacterImageById(player?.characterId) || null;
  const preset = CHARACTER_PRESETS[0];

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <AtmosphereLayer fear={15} />

      {/* Violet atmosphere */}
      <div
        className="fixed inset-x-0 top-0 h-72 pointer-events-none z-0"
        style={{ background: "linear-gradient(180deg, hsl(271 87% 65% / 0.10) 0%, transparent 100%)" }}
      />

      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center gap-3 relative z-10">
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => navigate("/select")}
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "hsl(252 12% 18%)", border: "1px solid hsl(252 10% 24%)" }}
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </motion.button>
        <div>
          <p className="text-[9px] uppercase tracking-[0.3em] font-bold text-muted-foreground">Step 2 of 2</p>
          <h1 className="font-display text-2xl text-foreground leading-none tracking-wide">Your Party</h1>
        </div>
      </div>

      <div className="flex-1 px-4 pb-10 space-y-4 overflow-y-auto relative z-10">

        {/* Hero card — comic panel style */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, type: "spring", stiffness: 260, damping: 22 }}
          className="rounded-3xl overflow-hidden relative"
          style={{
            background: "linear-gradient(180deg, hsl(252 14% 19%) 0%, hsl(252 13% 14%) 100%)",
            border: "3px solid hsl(252 10% 28%)",
            boxShadow: "0 6px 0 hsl(252 13% 7%), 0 12px 40px hsl(252 13% 5% / 0.6)",
          }}
        >
          {/* Binder rings top — cartoon detail */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-10 z-20">
            {[0,1].map(i => (
              <div key={i} className="w-6 h-6 rounded-full" style={{ background: "hsl(252 10% 30%)", border: "3px solid hsl(252 10% 20%)", boxShadow: "0 2px 4px hsl(252 13% 5% / 0.5)" }} />
            ))}
          </div>
          {/* Coral tab strip */}
          <div className="flex">
            <div className="px-5 py-2 rounded-tl-none rounded-tr-none" style={{
              background: "linear-gradient(90deg, hsl(351 78% 50%), hsl(351 78% 42%))",
              border: "2px solid hsl(351 78% 38%)",
              borderBottom: "none",
              borderRadius: "0 0 12px 0",
              boxShadow: "2px 0 0 hsl(351 78% 30%)",
            }}>
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: "hsl(40 95% 92%)", textShadow: "0 1px 0 hsl(351 78% 28%)" }}>{player.characterName}</span>
            </div>
          </div>

          <div className="p-5 pt-3">
            <div className="flex items-start gap-4">
              {/* Portrait — cartoon circle ring */}
              <div className="shrink-0 relative">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                  className="rounded-full overflow-hidden"
                  style={{
                    boxShadow: "0 0 0 4px hsl(351 78% 52%), 0 0 0 7px hsl(351 78% 28%), 0 6px 20px hsl(351 78% 45% / 0.5)",
                  }}
                >
                  <CharacterPortrait {...preset} expression="neutral" size={88} assetImage={assetImage} />
                </motion.div>
                {/* Level badge — cartoon circle */}
                <div
                  className="absolute -top-1 -left-1 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black"
                  style={{
                    background: "linear-gradient(135deg, hsl(40 90% 55%), hsl(38 95% 45%))",
                    border: "2.5px solid hsl(38 95% 35%)",
                    boxShadow: "0 3px 0 hsl(38 95% 25%), 0 4px 12px hsl(38 95% 45% / 0.5)",
                    color: "hsl(40 95% 95%)",
                  }}
                >
                  1
                </div>
              </div>

              <div className="flex-1 min-w-0 pt-1">
                <h2 className="font-display text-2xl text-foreground tracking-wide leading-none mb-0.5">
                  {player.characterName}
                </h2>
                <p className="text-[10px] italic mb-3" style={{ color: "hsl(252 8% 52%)" }}>
                  {party?.find(m => m.isPlayer)?.roleTag || "Survivor · Your character"}
                </p>

                <div className="space-y-1.5">
                  {STAT_CONFIG.map(stat => (
                    <StatBar key={stat.key} stat={stat} value={player.stats[stat.key] || 5} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Companions section */}
        {companions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-3xl overflow-hidden"
            style={{
              background: "hsl(252 12% 14%)",
              border: "1.5px solid hsl(252 10% 22%)",
              boxShadow: "inset 0 1px 0 hsl(252 10% 20%)",
            }}
          >
            {/* Header strip */}
            <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b" style={{ borderColor: "hsl(252 10% 20%)" }}>
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex-1">
                Coming with you tonight
              </p>
              <span className="text-[9px] font-bold rounded-full px-2 py-0.5" style={{ background: "hsl(252 12% 20%)", color: "hsl(40 30% 70%)" }}>
                {companions.length} others
              </span>
            </div>

            <div className="p-4">
              <div className="flex justify-around flex-wrap gap-3">
                {companions.map((m, i) => (
                  <CompanionBubble
                    key={m.id}
                    member={m}
                    index={i}
                    assetImage={assetMap.getCharacterImageById(m.id) || null}
                  />
                ))}
              </div>

              <p className="text-[9px] text-muted-foreground/50 text-center mt-4 italic leading-relaxed">
                Only 6 of you total. You can't control them — only try to keep them alive.
              </p>
            </div>
          </motion.div>
        )}



        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
          whileTap={{ scale: 0.97, y: 3 }}
          onClick={() => navigate("/intro")}
          className="w-full h-14 rounded-full text-base font-black"
          style={{
            background: "linear-gradient(180deg, hsl(351 78% 58%) 0%, hsl(351 78% 46%) 100%)",
            border: "2.5px solid hsl(351 78% 38%)",
            boxShadow: "0 6px 0 hsl(351 78% 28%), 0 10px 30px hsl(351 78% 45% / 0.5)",
            color: "hsl(40 95% 95%)",
            textShadow: "0 1px 0 hsl(351 78% 28%)",
          }}
        >
          Enter the Rental →
        </motion.button>
      </div>
    </div>
  );
}