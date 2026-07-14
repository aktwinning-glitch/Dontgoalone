import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useGame } from "@/lib/GameContext";
import { ArrowLeft, Zap, Wind, Shield, Brain } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import CharacterPortrait, { CHARACTER_PRESETS } from "@/components/game/CharacterPortrait";
import { buildAssetMap } from "@/lib/assetManager";
import AtmosphereLayer from "@/components/game/AtmosphereLayer";

const STAT_COLORS = {
  strength: "#e8705a",
  speed: "#5ab8e8",
  resilience: "#5ae87a",
  intelligence: "#b05ae8",
};
const CARD_ACCENTS = [
  "#e85a7a", "#7a5ae8", "#5ab8e8", "#5ae87a", "#e8a05a", "#e85ae8",
  "#e8705a", "#5ae8c8", "#c8e85a", "#e85aa0", "#5a78e8", "#e8d05a",
];

function StatDots({ value, color }) {
  const filled = Math.round((value / 10) * 5);
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: i <= filled ? color : "hsl(252 10% 28%)" }}
        />
      ))}
    </div>
  );
}

function CharacterCard({ character, index, onSelect, isSelected, assetImage }) {
  const preset = CHARACTER_PRESETS[index % CHARACTER_PRESETS.length];
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];

  return (
    <motion.button
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 300, damping: 26 }}
      whileTap={{ scale: 0.96, y: 3 }}
      onClick={() => onSelect(character)}
      className="relative flex flex-col items-center"
      style={{
        borderRadius: 24,
        background: isSelected
          ? `linear-gradient(180deg, ${accent}28 0%, hsl(252 14% 17%) 100%)`
          : "linear-gradient(180deg, hsl(252 14% 20%) 0%, hsl(252 13% 15%) 100%)",
        border: `3px solid ${isSelected ? accent : "hsl(252 10% 28%)"}`,
        boxShadow: isSelected
          ? `0 5px 0 ${accent}66, 0 8px 24px ${accent}33`
          : "0 4px 0 hsl(252 13% 10%), 0 6px 16px hsl(252 13% 5% / 0.4)",
        paddingBottom: 10,
      }}
    >
      {/* Portrait area */}
      <div
        className="w-full flex items-center justify-center pt-4 pb-2 relative"
        style={{ background: `${accent}10`, borderRadius: "20px 20px 0 0" }}
      >
        {/* Halo blob */}
        {isSelected && (
          <motion.div
            className="absolute rounded-full"
            style={{ width: 64, height: 64, background: `${accent}25`, filter: "blur(10px)" }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
        {/* Portrait circle ring — cartoon style */}
        <div
          className="rounded-full overflow-hidden relative"
          style={{
            boxShadow: isSelected
              ? `0 0 0 3px ${accent}, 0 0 0 6px ${accent}44, 0 4px 0 ${accent}55`
              : `0 0 0 2.5px hsl(252 10% 30%), 0 3px 0 hsl(252 13% 8%)`,
          }}
        >
          <CharacterPortrait
            {...preset}
            expression={isSelected ? "uneasy" : "neutral"}
            size={66}
            assetImage={assetImage}
          />
        </div>

        {/* Check badge */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
              border: `2px solid ${accent}dd`,
              boxShadow: `0 2px 0 ${accent}66`,
              color: "white",
            }}
          >
            ✓
          </motion.div>
        )}
      </div>

      {/* Name */}
      <p
        className="font-display text-sm tracking-wide leading-tight text-center px-2 mt-2 w-full truncate"
        style={{ color: isSelected ? accent : "hsl(40 30% 88%)" }}
      >
        {character.name}
      </p>

      {/* Stat bar mini row */}
      <div className="flex flex-col gap-1 px-2 mt-2 w-full">
        {[
          { key: "strength", color: STAT_COLORS.strength },
          { key: "resilience", color: STAT_COLORS.resilience },
          { key: "intelligence", color: STAT_COLORS.intelligence },
        ].map(s => (
          <div key={s.key} className="flex items-center gap-1">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{
              background: "hsl(252 10% 24%)",
              border: "1px solid hsl(252 10% 30%)",
            }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, ((character[s.key] || 5) / 10) * 100)}%`,
                  background: s.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Description */}
      {character.description && (
        <p className="text-[7px] text-center leading-tight px-2 mt-1.5 line-clamp-2" style={{ color: "hsl(252 8% 50%)" }}>
          {character.description}
        </p>
      )}
    </motion.button>
  );
}

export default function CharacterSelect() {
  const navigate = useNavigate();
  const { initPlayer, setCharImageMap, clearSession } = useGame();
  const [selected, setSelected] = useState(null);

  // Read storyId from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const storyId = urlParams.get("storyId") || "the_rental";

  const { data: characters, isLoading } = useQuery({
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

  // Sync portrait map into context early so CharacterConfirm + GameScreen have it
  React.useEffect(() => {
    if (assetMap?.charMap && Object.keys(assetMap.charMap).length > 0) {
      setCharImageMap(assetMap.charMap);
    }
  }, [assetMap, setCharImageMap]);

  const handleSelect = (character) => {
    setSelected(character.id);
    // Always clear any stale saved session before starting a fresh run
    clearSession();
    setTimeout(() => {
      const others = characters.filter(c => c.id !== character.id);
      const shuffled = [...others].sort(() => Math.random() - 0.5);
      const partyChars = [character, ...shuffled.slice(0, 5)];
      initPlayer(character, partyChars, storyId);
      navigate("/confirm");
    }, 300);
  };

  const bgImage = sceneAssets.find(a => a.key === "act1Image")?.image_url || null;

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <AtmosphereLayer fear={10} />

      {/* Background image blur */}
      {bgImage && (
        <div
          className="fixed inset-0 opacity-10 pointer-events-none z-0"
          style={{ backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(12px)" }}
        />
      )}

      {/* Header */}
      <div className="px-4 pt-12 pb-3 flex items-center gap-3 relative z-10">
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => navigate("/home")}
          className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0"
          style={{ background: "hsl(252 12% 18%)", borderColor: "hsl(252 10% 24%)" }}
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </motion.button>
        <div>
          <p className="text-[9px] uppercase tracking-[0.3em] font-bold text-muted-foreground">Step 1 of 2</p>
          <h1 className="font-display text-2xl text-foreground leading-none tracking-wide">Pick Your Survivor</h1>
        </div>
      </div>

      {/* Hint banner */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mx-4 mb-3 rounded-2xl px-4 py-2.5 relative z-10"
        style={{
          background: "hsl(252 12% 14%)",
          border: "1px solid hsl(252 10% 22%)",
          boxShadow: "inset 0 1px 0 hsl(252 10% 20%)",
        }}
      >
        <p className="text-[10px] text-muted-foreground leading-relaxed text-center">
          You control <span className="font-bold" style={{ color: "hsl(351 78% 68%)" }}>1 survivor</span>. Five others will be chosen for you.{" "}
          <span className="text-foreground/50">Tap to select.</span>
        </p>
      </motion.div>

      {/* Character grid */}
      <div className="flex-1 px-4 pb-10 overflow-y-auto relative z-10">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44 rounded-3xl" />)}
          </div>
        ) : characters.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <div className="text-4xl">👤</div>
            <p className="text-sm text-muted-foreground">No characters yet. An admin must add them first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {characters.map((char, i) => (
              <CharacterCard
                key={char.id}
                character={char}
                index={i}
                onSelect={handleSelect}
                isSelected={selected === char.id}
                assetImage={assetMap.getCharacterImage(char)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}