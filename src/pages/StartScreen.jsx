import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import CharacterPortrait, { CHARACTER_PRESETS } from "@/components/game/CharacterPortrait";
import AtmosphereLayer from "@/components/game/AtmosphereLayer";

const FLOAT_DELAYS = [0, 0.8, 1.6, 0.4, 1.2];

// Tap-through intro sequence
const INTRO_SLIDES = [
  "You weren't supposed to come back here.",
  "Years ago, something happened in this place.",
  "No one talks about it.",
  "But none of you ever forgot.",
  "The message came at the same time.",
  "No name. No explanation.",
  "Just a location... and a date.",
  "No one said yes.",
  "But no one stayed away.",
  "Now you're here.",
  "And something remembers.",
];

function IntroSequence({ onComplete, introImage }) {
  const [slide, setSlide] = useState(0);

  const advance = () => {
    if (slide < INTRO_SLIDES.length - 1) setSlide(s => s + 1);
    else onComplete();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8 cursor-pointer"
      style={{ background: "hsl(252 13% 6%)" }}
      onClick={advance}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Background image */}
      {introImage && (
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: `url(${introImage})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
      )}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 20%, hsl(252 13% 6% / 0.9) 80%)" }} />

      {/* Slide text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={slide}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 text-center text-xl font-display tracking-wide text-foreground max-w-xs leading-relaxed"
          style={{ textShadow: "0 0 40px hsl(271 87% 65% / 0.4)" }}
        >
          {INTRO_SLIDES[slide]}
        </motion.p>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="absolute bottom-12 flex gap-1.5 z-10">
        {INTRO_SLIDES.map((_, i) => (
          <div
            key={i}
            className="h-1 rounded-full transition-all duration-300"
            style={{
              width: i === slide ? 20 : 6,
              background: i === slide ? "hsl(351 78% 60%)" : "hsl(252 10% 30%)",
            }}
          />
        ))}
      </div>

      <p className="absolute bottom-6 text-[9px] text-muted-foreground z-10 uppercase tracking-widest">
        Tap to continue
      </p>
    </motion.div>
  );
}

export default function StartScreen() {
  const navigate = useNavigate();
  const [acknowledged, setAcknowledged] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

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
  const introImage = sceneAssets.find(a => a.key === "introImage")?.image_url || null;
  // Build quick char image lookup for the cluster portraits
  const charImageMap = React.useMemo(() => {
    const m = {};
    characters.forEach(c => { if (c.portrait_url) m[c.id] = c.portrait_url; });
    return m;
  }, [characters]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background overflow-hidden relative">
      <AtmosphereLayer fear={20} />

      <AnimatePresence>
        {showIntro && (
          <IntroSequence
            introImage={introImage}
            onComplete={() => navigate("/home")}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="max-w-sm w-full flex flex-col items-center gap-8 relative z-10"
      >
        {/* Character cluster */}
        <motion.div
          className="relative w-52 h-40"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          {CHARACTER_PRESETS.slice(0, 5).map((preset, i) => {
            const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
            const r = 56;
            const cx = 104 + r * Math.cos(angle);
            const cy = 72 + r * Math.sin(angle);
            const char = characters[i];
            const assetImage = char ? charImageMap[char.id] : null;
            return (
              <motion.div
                key={i}
                className="absolute"
                style={{ left: cx - 23, top: cy - 23 }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: i === 2 ? 0.4 : 0.85, y: [0, -5, 0] }}
                transition={{
                  scale: { delay: 0.5 + i * 0.12, type: "spring", stiffness: 260, damping: 20 },
                  opacity: { delay: 0.5 + i * 0.12 },
                  y: { delay: FLOAT_DELAYS[i], duration: 3.5 + i * 0.4, repeat: Infinity, ease: "easeInOut" },
                }}
              >
                <div className="w-11 h-11 rounded-full overflow-hidden" style={{ boxShadow: "0 0 0 2px hsl(252 10% 28%), 0 4px 12px hsl(252 13% 6% / 0.6)" }}>
                  <CharacterPortrait {...preset} expression={i === 2 ? "scared" : i === 4 ? "uneasy" : "neutral"} size={44} assetImage={assetImage} />
                </div>
              </motion.div>
            );
          })}
          {/* Center hero */}
          <motion.div
            className="absolute"
            style={{ left: 104 - 32, top: 72 - 32 }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, y: [0, -7, 0] }}
            transition={{
              scale: { delay: 1.0, type: "spring", stiffness: 300, damping: 22 },
              opacity: { delay: 1.0 },
              y: { delay: 0.3, duration: 4, repeat: Infinity, ease: "easeInOut" },
            }}
          >
            <div className="w-[64px] h-[64px] rounded-full overflow-hidden animate-glow-coral" style={{ boxShadow: "0 0 0 3px hsl(351 78% 60%), 0 0 20px hsl(351 78% 60% / 0.5)" }}>
              <CharacterPortrait {...CHARACTER_PRESETS[0]} expression="neutral" size={64} assetImage={characters[0] ? charImageMap[characters[0].id] : null} />
            </div>
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.div
          className="text-center space-y-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground font-semibold">
            A Horror Survival Game
          </p>
          <h1 className="font-display text-6xl text-foreground leading-none tracking-wide" style={{ textShadow: "0 0 40px hsl(351 78% 60% / 0.3)" }}>
            Don't Go Alone
          </h1>
          <p className="text-sm italic text-muted-foreground mt-1 font-body">
            Something brought you here. Something is waiting.
          </p>
        </motion.div>

        {/* CTA */}
        <AnimatePresence mode="wait">
          {!acknowledged ? (
            <motion.div
              key="warning"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ delay: 0.9, duration: 0.25 }}
              className="w-full space-y-4"
            >
              <div className="border rounded-2xl p-4 space-y-2 text-center" style={{ background: "hsl(252 12% 15%)", borderColor: "hsl(252 10% 26%)", boxShadow: "inset 0 1px 0 hsl(252 10% 28%)" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">⚠ Content Warning</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Psychological horror · Suspense · Simulated threat · Characters may disappear or die.
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setAcknowledged(true)}
                className="w-full h-14 rounded-2xl text-base font-semibold text-white animate-glow-coral transition-all"
                style={{ background: "linear-gradient(135deg, hsl(351 78% 58%), hsl(351 78% 48%))", boxShadow: "0 4px 20px hsl(351 78% 55% / 0.4)" }}
              >
                I Understand — Continue
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="enter"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="w-full space-y-3"
            >
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowIntro(true)}
                className="w-full h-14 rounded-2xl text-base font-semibold text-white animate-glow-coral"
                style={{ background: "linear-gradient(135deg, hsl(351 78% 58%), hsl(351 78% 48%))", boxShadow: "0 4px 24px hsl(351 78% 55% / 0.5)" }}
              >
                Begin the Night →
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate("/home")}
                className="w-full h-10 rounded-2xl text-sm text-muted-foreground"
                style={{ background: "hsl(252 12% 17%)", border: "1px solid hsl(252 10% 22%)" }}
              >
                Skip intro
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}