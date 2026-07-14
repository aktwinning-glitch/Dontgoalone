import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Target, Sparkles, X } from "lucide-react";
import { useGame } from "@/lib/GameContext";
import { buildObjectiveState, chooseTraitOffers } from "@/lib/progressionEngine";

const CLUE_FLAGS = ["photo_revealed", "old_secret_revealed", "sender_named", "truth_spoken", "basement_entered"];

function TraitChoiceModal({ offers, onChoose }) {
  return (
    <motion.div className="fixed inset-0 z-[80] flex items-center justify-center p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <motion.div initial={{ y: 24, scale: .96 }} animate={{ y: 0, scale: 1 }} className="relative max-w-lg w-full rounded-3xl border border-fuchsia-400/30 bg-[#101018] p-6 shadow-2xl">
        <div className="text-center mb-5">
          <Sparkles className="w-6 h-6 mx-auto text-fuchsia-300 mb-2" />
          <p className="text-[10px] uppercase tracking-[.28em] text-fuchsia-300">What the night taught you</p>
          <h2 className="font-display text-2xl mt-1">Choose one instinct</h2>
          <p className="text-xs text-muted-foreground mt-2">This trait lasts for the rest of the current run and becomes permanent if you finish the run.</p>
        </div>
        <div className="grid gap-3">
          {offers.map(trait => (
            <button key={trait.id} onClick={() => onChoose(trait)} className="text-left rounded-2xl border border-white/10 bg-white/[.035] p-4 hover:border-cyan-300/50 hover:bg-cyan-300/[.06] transition">
              <div className="flex items-center justify-between gap-3"><strong className="text-base">{trait.name}</strong><span className="text-[9px] uppercase tracking-widest text-cyan-300">{trait.rarity}</span></div>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{trait.description}</p>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ObjectiveDrawer({ objectives, onClose }) {
  return (
    <motion.div initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 30, opacity: 0 }} className="fixed right-3 top-20 z-50 w-[min(330px,calc(100vw-24px))] rounded-2xl border border-cyan-300/25 bg-[#0e0e16]/95 p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><Target className="w-4 h-4 text-cyan-300" /><span className="text-xs uppercase tracking-widest font-bold">Run objectives</span></div><button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button></div>
      <div className="space-y-3">
        {Object.values(objectives).map(objective => (
          <div key={objective.id} className="rounded-xl border border-white/10 p-3 bg-white/[.025]">
            <div className="flex justify-between gap-2"><p className="text-sm font-semibold">{objective.title}</p><span className={objective.completed ? "text-emerald-300 text-xs" : "text-muted-foreground text-xs"}>{objective.completed ? "Complete" : `${objective.progress}/${objective.target}`}</span></div>
            <p className="text-xs text-muted-foreground mt-1">{objective.description}</p>
            <div className="h-1 rounded-full bg-white/10 mt-2 overflow-hidden"><div className="h-full bg-cyan-300" style={{ width: `${Math.min(100, (objective.progress / objective.target) * 100)}%` }} /></div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function ProgressionGameShell({ children }) {
  const { player, party, choiceCount, temporaryTraits, addTemporaryTrait, discoveredClues, discoverClue, objectiveState, updateObjective, activeModifiers, setActiveModifiers } = useGame();
  const [showObjectives, setShowObjectives] = useState(false);
  const [offers, setOffers] = useState([]);
  const [lastOfferAt, setLastOfferAt] = useState(0);
  const calculatedObjectives = useMemo(() => buildObjectiveState(player, party, discoveredClues, objectiveState), [player, party, discoveredClues, objectiveState]);

  useEffect(() => {
    if (activeModifiers?.length) return;
    try {
      const stored = JSON.parse(localStorage.getItem("dont_go_alone_active_challenge") || "null");
      if (stored?.modifiers) setActiveModifiers([stored.id, ...stored.modifiers]);
    } catch {}
  }, [activeModifiers, setActiveModifiers]);

  useEffect(() => {
    CLUE_FLAGS.forEach(flag => {
      if (player?.flags?.[flag]) discoverClue({ id: `${player.storyId || "story"}:${flag}`, title: flag.replaceAll("_", " ") });
    });
  }, [player?.flags]);

  useEffect(() => {
    Object.entries(calculatedObjectives).forEach(([id, value]) => updateObjective(id, value));
  }, [calculatedObjectives.personal_survive?.progress, calculatedObjectives.group_three?.progress, calculatedObjectives.discovery_clues?.progress]);

  useEffect(() => {
    if (!player || choiceCount < 5 || choiceCount % 5 !== 0 || lastOfferAt === choiceCount) return;
    setOffers(chooseTraitOffers(temporaryTraits.map(t => t.id), 3));
    setLastOfferAt(choiceCount);
  }, [choiceCount, player, temporaryTraits, lastOfferAt]);

  return (
    <>
      {children}
      {player && <button onClick={() => setShowObjectives(v => !v)} className="fixed right-3 bottom-4 z-40 rounded-full border border-cyan-300/30 bg-[#101018]/95 px-4 py-2 text-xs font-bold shadow-xl backdrop-blur-xl"><span className="text-cyan-300">Objectives</span>{activeModifiers?.length > 0 && <span className="ml-2 text-fuchsia-300">Challenge</span>}</button>}
      <AnimatePresence>{showObjectives && <ObjectiveDrawer objectives={calculatedObjectives} onClose={() => setShowObjectives(false)} />}</AnimatePresence>
      <AnimatePresence>{offers.length > 0 && <TraitChoiceModal offers={offers} onChoose={trait => { addTemporaryTrait(trait); setOffers([]); }} />}</AnimatePresence>
    </>
  );
}
