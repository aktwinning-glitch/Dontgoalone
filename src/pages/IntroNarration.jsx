import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/lib/GameContext";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { buildAssetMap } from "@/lib/assetManager";
import CharacterPortrait, { CHARACTER_PRESETS } from "@/components/game/CharacterPortrait";
import { getStoryIntro } from "@/lib/storyIntros";
import { useQuery as useQ2 } from "@tanstack/react-query";

const PARTY_ACCENTS = ["#e85a7a", "#7a5ae8", "#5ab8e8", "#5ae87a", "#e8a05a"];

const BEAT_DURATION = 3200; // ms per beat auto-advance

export default function IntroNarration() {
  const navigate = useNavigate();
  const { player, party, charImageMap } = useGame();
  const [beatIndex, setBeatIndex] = useState(0);
  const [done, setDone] = useState(false);

  // Load story record from DB to check for admin-defined intro beats
  const { data: storyRecord } = useQ2({
    queryKey: ["story", player?.storyId],
    queryFn: async () => {
      if (!player?.storyId) return null;
      const all = await base44.entities.Story.filter({ story_id: player.storyId });
      return all?.[0] || null;
    },
    enabled: !!player?.storyId,
  });

  // Story-specific intro config — prefer DB record fields, fall back to hardcoded storyIntros.js
  const fallbackIntro = getStoryIntro(player?.storyId);
  const dbBeats = (() => {
    try { return storyRecord?.intro_beats ? JSON.parse(storyRecord.intro_beats) : null; } catch { return null; }
  })();
  const storyIntro = {
    ...fallbackIntro,
    // Override with DB values if present
    chapterLabel: storyRecord?.chapter_label || fallbackIntro.chapterLabel,
    fogColor: storyRecord?.intro_fog_color || fallbackIntro.fogColor,
    introImageKey: storyRecord?.intro_image_key || fallbackIntro.introImageKey,
    fallbackImageKey: storyRecord?.intro_fallback_image_key || fallbackIntro.fallbackImageKey,
  };
  const BEATS = (dbBeats && dbBeats.length > 0) ? dbBeats : fallbackIntro.beats;

  useEffect(() => {
    if (!player) navigate("/select");
  }, [player, navigate]);

  const { data: sceneAssets } = useQuery({
    queryKey: ["sceneAssets"],
    queryFn: () => base44.entities.SceneAsset.list(),
    initialData: [],
  });

  const { data: characters } = useQuery({
    queryKey: ["characters"],
    queryFn: () => base44.entities.Character.list("sort_order"),
    initialData: [],
  });

  const assetMap = buildAssetMap(sceneAssets, characters);
  const bgImage = assetMap.getSceneImage(storyIntro.introImageKey) || assetMap.getSceneImage(storyIntro.fallbackImageKey);

  const companions = (party || []).filter(m => !m.isPlayer);
  const playerImage = charImageMap?.[player?.characterId] || null;

  // Auto-advance beats
  useEffect(() => {
    if (done) return;
    const timer = setTimeout(() => {
      if (beatIndex < BEATS.length - 1) {
        setBeatIndex(i => i + 1);
      } else {
        setDone(true);
        setTimeout(() => navigate("/game"), 600);
      }
    }, BEAT_DURATION);
    return () => clearTimeout(timer);
  }, [beatIndex, done, navigate]);

  // Still allow tap to skip manually
  const handleTap = () => {
    if (beatIndex < BEATS.length - 1) {
      setBeatIndex(i => i + 1);
    } else {
      setDone(true);
      setTimeout(() => navigate("/game"), 600);
    }
  };

  const currentBeat = BEATS[beatIndex];

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      onClick={handleTap}
      style={{ cursor: "pointer", background: "hsl(252 13% 7%)" }}
    >
      {/* Background scene image */}
      {bgImage && (
        <div
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(3px) brightness(0.28)",
          }}
        />
      )}

      {/* Vignette */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, hsl(252 13% 5% / 0.85) 100%)",
        }}
      />

      {/* Fog overlay */}
      <motion.div
        className="fixed inset-0 z-0 pointer-events-none"
        animate={{ opacity: [0.06, 0.12, 0.06] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            `linear-gradient(180deg, ${storyIntro.fogColor} 0%, transparent 60%)`,
        }}
      />

      {/* Chapter badge — cartoon ribbon style */}
      <div className="relative z-10 px-5 pt-12 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2"
        >
          {/* Cartoon ribbon badge with stars */}
          <div className="relative flex items-center">
            {/* Left notch */}
            <div className="w-3 h-8 relative shrink-0" style={{ marginRight: -2 }}>
              <div className="absolute inset-0" style={{ background: "hsl(351 78% 38%)", clipPath: "polygon(100% 0, 100% 100%, 0 50%)" }} />
              <div className="absolute inset-y-0.5 inset-x-0" style={{ background: "hsl(351 78% 48%)", clipPath: "polygon(100% 0, 100% 100%, 0 50%)" }} />
            </div>
            <div
              className="px-5 py-1.5 relative z-10"
              style={{
                background: "linear-gradient(180deg, hsl(351 78% 52%) 0%, hsl(351 78% 42%) 100%)",
                border: "2px solid hsl(351 78% 62%)",
                boxShadow: "0 3px 0 hsl(351 78% 28%), 0 6px 20px hsl(351 78% 45% / 0.4)",
              }}
            >
              <span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: "hsl(40 95% 90%)", textShadow: "0 1px 0 hsl(351 78% 28%)" }}>
                ✦ {storyIntro.chapterLabel} ✦
              </span>
            </div>
            {/* Right notch */}
            <div className="w-3 h-8 relative shrink-0" style={{ marginLeft: -2 }}>
              <div className="absolute inset-0" style={{ background: "hsl(351 78% 38%)", clipPath: "polygon(0 0, 0 100%, 100% 50%)" }} />
              <div className="absolute inset-y-0.5 inset-x-0" style={{ background: "hsl(351 78% 48%)", clipPath: "polygon(0 0, 0 100%, 100% 50%)" }} />
            </div>
          </div>
          {/* Beat dots */}
          <div className="flex gap-1 ml-auto">
            {BEATS.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === beatIndex ? 14 : 5,
                  height: 5,
                  background: i <= beatIndex ? "hsl(351 78% 62%)" : "hsl(252 10% 28%)",
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Narration beat */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={beatIndex}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center space-y-6 max-w-sm"
          >
            {/* Parchment narration card — screenshot style */}
            <motion.div
              className="w-full rounded-3xl relative"
              style={{
                background: "linear-gradient(180deg, hsl(252 14% 20%) 0%, hsl(252 13% 16%) 100%)",
                border: "2.5px solid hsl(252 10% 30%)",
                boxShadow: "0 6px 0 hsl(252 13% 8%), 0 12px 40px hsl(252 13% 5% / 0.7)",
              }}
            >
              {/* Top accent line */}
              <div className="absolute inset-x-4 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(271 87% 65% / 0.5), transparent)" }} />
              {/* Decorative corner curls */}
              <div className="absolute top-3 left-3 text-xl select-none opacity-30" style={{ color: "hsl(271 87% 65%)" }}>❝</div>
              <div className="px-8 pt-8 pb-6">
                <p
                  className="font-body text-base leading-relaxed"
                  style={{ color: "hsl(40 30% 88%)", textShadow: "0 1px 8px hsl(252 13% 5% / 0.6)" }}
                >
                  {currentBeat.text}
                </p>
              </div>
            </motion.div>

            {/* Tap label pill */}
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mx-auto px-6 py-2 rounded-full"
              style={{
                background: beatIndex === BEATS.length - 1 ? "hsl(351 78% 45%)" : "hsl(252 12% 22%)",
                border: `2px solid ${beatIndex === BEATS.length - 1 ? "hsl(351 78% 62%)" : "hsl(252 10% 30%)"}`,
                boxShadow: beatIndex === BEATS.length - 1 ? "0 4px 0 hsl(351 78% 28%), 0 8px 24px hsl(351 78% 45% / 0.4)" : "0 3px 0 hsl(252 13% 10%)",
              }}
            >
              <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: beatIndex === BEATS.length - 1 ? "hsl(40 95% 92%)" : "hsl(252 8% 55%)" }}>
                {currentBeat.tapLabel}
              </span>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Party strip at bottom */}
      <div className="relative z-10 px-5 pb-10">
        <div
          className="rounded-3xl p-4"
          style={{
            background: "hsl(252 13% 11% / 0.85)",
            border: "1.5px solid hsl(252 10% 22%)",
            backdropFilter: "blur(8px)",
          }}
        >
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3 text-center">
            Tonight's group
          </p>
          <div className="flex items-end justify-center gap-3">
            {/* Player — larger */}
            <div className="flex flex-col items-center gap-1">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="rounded-full overflow-hidden"
                style={{
                  boxShadow:
                    "0 0 0 3px hsl(351 78% 60%), 0 0 20px hsl(351 78% 60% / 0.5)",
                }}
              >
                <CharacterPortrait
                  {...CHARACTER_PRESETS[0]}
                  expression="uneasy"
                  size={64}
                  assetImage={playerImage}
                />
              </motion.div>
              <span
                className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  background: "hsl(351 78% 60% / 0.2)",
                  color: "hsl(351 78% 72%)",
                  border: "1px solid hsl(351 78% 60% / 0.4)",
                }}
              >
                YOU
              </span>
            </div>

            {/* Companions */}
            {companions.slice(0, 5).map((m, i) => {
              const accent = PARTY_ACCENTS[i % PARTY_ACCENTS.length];
              const img = charImageMap?.[m.id] || null;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.06, type: "spring", stiffness: 300, damping: 22 }}
                  className="flex flex-col items-center gap-1"
                >
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 3.2 + i * 0.3, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
                    className="rounded-full overflow-hidden"
                    style={{ boxShadow: `0 0 0 2px ${accent}, 0 0 10px ${accent}50` }}
                  >
                    <CharacterPortrait
                      {...CHARACTER_PRESETS[(i + 1) % CHARACTER_PRESETS.length]}
                      expression="neutral"
                      size={44}
                      assetImage={img}
                    />
                  </motion.div>
                  <span
                    className="text-[7px] font-semibold text-muted-foreground text-center truncate"
                    style={{ maxWidth: 44 }}
                  >
                    {m.name?.split(" ")[0]}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Transition overlay */}
      <AnimatePresence>
        {done && (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ background: "hsl(252 13% 5%)" }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}