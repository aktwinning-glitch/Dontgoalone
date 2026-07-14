import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useGame } from "@/lib/GameContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  rollSuccess,
  calculateSuccessChance,
  shouldPanicReplace,
  shouldAutoSelect,
  checkConditions,
  passiveThreatUpdate,
  getPanicChoice,
  getEventTonePrefix,
  getThreatLevel,
  clampStat,
} from "@/lib/gameEngine";
import { normalizeStoryId, validateEventRecord } from "@/lib/dataValidation";
import {
  checkDeathTrigger,
  injectItemChoices,
  validateEventNavigation,
  getFearTier,
  getThreatTier,
  computeMemberVulnerability,
  getDangerLevel,
  computeEndingType,
  ENDING_TYPE_CONFIG,
} from "@/lib/consequenceEngine";
import { recalculateIsolation, isGroupedTogether } from "@/lib/partyEngine";
import { normalizeLocationKey, inferLocationFromEvent, parseAndNormalizeGroupSpread } from "@/lib/locationNormalization";
import { getStoryMapLayout } from "@/lib/storyMapLayouts";
import {
  getDialogueLine,
  pickSpeaker,
  getContextualCategory,
  getCharacterRole,
  getLoyaltyState,
  getLoyaltyStatBonus,
  getDeathReactionLine,
} from "@/lib/dialogueEngine";
import { resolvePhaseLabel, getCurrentPhase } from "@/lib/phaseSystem";
import {
  MILESTONE_INTERVAL,
  calcTeamScore,
  MILESTONE_PASS_THRESHOLD,
  getWeakestMember,
  findDevotedSacrifice,
  checkBetrayalTrigger,
} from "@/lib/milestoneEngine";
import CharacterPortrait, { CHARACTER_PRESETS, getExpressionForMember } from "@/components/game/CharacterPortrait";
import CabinZoneMap from "@/components/game/CabinZoneMap";
import FocusedMemberBanner from "@/components/game/FocusedMemberBanner";
import ChoiceButton from "@/components/game/ChoiceButton";
import ResultPanel from "@/components/game/ResultPanel";
import AtmosphereLayer from "@/components/game/AtmosphereLayer";
import FearShader from "@/components/game/FearShader";
import AudioManagerWidget, { useAudioManager } from "@/components/game/AudioManager";
import InventoryPanel from "@/components/game/InventoryPanel";
import { getInventoryStatBonus } from "@/lib/itemsConfig";
import TypewriterText from "@/components/game/TypewriterText";
import FearBar from "@/components/game/FearBar";
import MilestoneTracker from "@/components/game/MilestoneTracker";
import MicroReaction from "@/components/game/MicroReaction";
import CharacterModal from "@/components/game/CharacterModal";
import MilestoneOutcomePanel from "@/components/game/MilestoneOutcomePanel";
import GroupStatsModal from "@/components/game/GroupStatsModal";
import DeathPanel from "@/components/game/DeathPanel";
import ActBreakNarration from "@/components/game/ActBreakNarration";
import KillPauseOverlay from "@/components/game/KillPauseOverlay";
import { buildAssetMap, SCENE_KEYS } from "@/lib/assetManager";
import { getFearStage } from "@/components/game/FearBar";
import { getNextEventSafely } from "@/lib/eventSafetyEngine";
import { resolveMapImageUrl } from "@/lib/storyIntros";
import { buildNarrativeWithMemory, injectMemoryNarration, checkForSceneReset } from "@/lib/narrativeContinuityEngine";
import { Moon, ChevronDown, Users, BarChart2, BookOpen, X, Home } from "lucide-react";
import NeonMapBackground from "@/components/game/NeonMapBackground";
import NeonPartyMap from "@/components/game/NeonPartyMap";
import { computeEnvEffects, ENV_EFFECT_DEFS } from "@/lib/envEffects";

const buildPanicChoice = () => {
  const base = getPanicChoice();
  return {
    ...base,
    successEffect: {
      outcomeText: "You make it through the panic. Barely. Your legs won't stop shaking.",
      fearChange: 8,
      threatChange: 3,
      flagsAdded: { noise_made: 1, panic_spread: true },
    },
    failEffect: {
      outcomeText: "You give yourself away. Something in the dark adjusts its heading.",
      fearChange: 18,
      threatChange: 18,
      flagsAdded: { noise_made: 1, panic_spread: true },
    },
    _isPanic: true,
  };
};

// Neon gothic top bar
function TopBar({ player, choiceCount }) {
  if (!player) return null;
  const threatInfo = getThreatLevel(player.threat);
  const threatPct = Math.min(100, player.threat);
  const THREAT_NEON = ["#0FAF6A", "#A8FF3F", "#FF2DAA", "#B3003C"];
  const neonColor = THREAT_NEON[threatInfo.level] || "#00F0FF";
  const envEffects = computeEnvEffects(player);
  const fearPct = Math.min(100, player.stats.fear);
  const fearNeon = fearPct > 70 ? "#B3003C" : fearPct > 40 ? "#FF2DAA" : "#00F0FF";

  return (
    <div className="space-y-1.5">
      {envEffects.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {envEffects.map(key => {
            const def = ENV_EFFECT_DEFS[key];
            return (
              <div key={key} title={def.desc} className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: def.bg, border: `1px solid ${def.border}` }}>
                <span className="text-[9px]">{def.icon}</span>
                <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: def.color }}>{def.label}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex items-center gap-3">
        {/* Fear bar — ruby→neon red */}
        <div className="flex-1 space-y-0.5">
          <div className="flex justify-between">
            <span className="text-[8px] uppercase tracking-widest font-black" style={{ color: fearNeon }}>Fear</span>
            <span className="text-[8px] font-black" style={{ color: fearNeon }}>{Math.round(fearPct)}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#0F0F15" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, #B3003C, ${fearNeon})` }}
              animate={{ width: `${fearPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {/* Neon divider */}
        <div className="w-px h-6 shrink-0" style={{ background: "#00F0FF22" }} />

        {/* Threat bar — gold→neon */}
        <div className="flex-1 space-y-0.5">
          <div className="flex justify-between">
            <span className="text-[8px] uppercase tracking-widest font-black" style={{ color: neonColor }}>Threat</span>
            <span className="text-[8px] font-black" style={{ color: neonColor }}>{threatInfo.label}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#0F0F15" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, #8B6914, ${neonColor})` }}
              animate={{ width: `${threatPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      </div>
      <MilestoneTracker choiceCount={choiceCount} night={player.night} />
    </div>
  );
}

// Neon player portrait strip
function PlayerStrip({ player, partyMember, assetImage, onClick }) {
  const expression = partyMember ? getExpressionForMember(partyMember)
    : player?.stats?.fear > 70 ? "scared"
    : player?.stats?.fear > 40 ? "uneasy"
    : "neutral";
  const preset = CHARACTER_PRESETS[0];
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onClick}
        className="shrink-0 rounded-full overflow-hidden animate-float focus:outline-none"
        style={{ boxShadow: "0 0 0 2.5px #C400FF, 0 0 18px #C400FF66" }}
      >
        <CharacterPortrait {...preset} expression={expression} size={52} assetImage={assetImage} />
      </button>
      <div>
        <p className="font-display text-base font-bold tracking-wide leading-tight" style={{ color: "#E8E6D9" }}>
          {player?.characterName}
        </p>
        <p className="text-[9px] italic" style={{ color: "#A3A3B2" }}>Tap to view stats</p>
      </div>
    </div>
  );
}

// Milestone event overlay
function MilestoneEvent({ event, onDismiss }) {
  if (!event) return null;
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-40 flex items-center justify-center p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0" style={{ background: "hsl(252 13% 6% / 0.85)" }} />
        <motion.div
          initial={{ scale: 0.85, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="relative max-w-xs w-full rounded-2xl p-6 text-center space-y-4"
          style={{
            background: "hsl(252 12% 13%)",
            border: `1.5px solid ${event.pass ? "hsl(123 68% 55% / 0.5)" : "hsl(351 78% 60% / 0.5)"}`,
            boxShadow: event.pass
              ? "0 0 40px hsl(123 68% 55% / 0.2)"
              : "0 0 40px hsl(351 78% 60% / 0.2)",
          }}
        >
          <div className="text-4xl">{event.pass ? "⚡" : "💀"}</div>
          <h2
            className="font-display text-2xl tracking-wide"
            style={{ color: event.pass ? "hsl(123 68% 65%)" : "hsl(351 78% 68%)" }}
          >
            {event.pass ? "Milestone Passed" : "Someone Falls"}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed italic">{event.message}</p>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onDismiss}
            className="w-full h-11 rounded-xl text-sm font-semibold text-foreground mt-2"
            style={{
              background: "hsl(252 12% 22%)",
              border: "1px solid hsl(252 10% 30%)",
            }}
          >
            Keep Moving →
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function GameScreen() {
  const navigate = useNavigate();
  const {
    player, updatePlayer, setCurrentEvent, setGamePhase,
    party, setParty, focusedMemberId, setFocusedMemberId,
    setPartyConsequence, setPartyHiddenRisk, setPartyMemberState,
    choiceCount, incrementChoiceCount,
    setCharImageMap,
    saveSession, loadSession, clearSession,
    movePartyMember,
  } = useGame();

  const [result, setResult] = useState(null);
  const [pendingNextEvent, setPendingNextEvent] = useState(null);
  const [choosing, setChoosing] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [narrationDone, setNarrationDone] = useState(false);
  const [microReaction, setMicroReaction] = useState(null);
  const [milestoneEvent, setMilestoneEvent] = useState(null);
  const [modalMember, setModalMember] = useState(null);
  const [showGroupStats, setShowGroupStats] = useState(false);
  const [focusedCharacterName, setFocusedCharacterName] = useState(null);
  const [showInventory, setShowInventory] = useState(false);
  const [deathPanel, setDeathPanel] = useState(null); // { member }
  const [actBreak, setActBreak] = useState(null); // { choiceCount }
  const [killPauseActive, setKillPauseActive] = useState(false);
  const lastActPhaseRef = useRef(null);

  // On mount: if player is null, try to recover session before redirecting
  const sessionRecoveryAttempted = React.useRef(false);
  useEffect(() => {
    if (!player && !sessionRecoveryAttempted.current) {
      sessionRecoveryAttempted.current = true;
      const recovered = loadSession();
      if (!recovered) {
        // Give React one tick to let context settle before navigating
        const timer = setTimeout(() => navigate("/home"), 150);
        return () => clearTimeout(timer);
      }
    }
  }, [player]);

  // Reset typewriter state on new event
  useEffect(() => {
    setNarrationDone(false);
  }, [player?.currentEventId]);

  // Check for act phase transitions
  useEffect(() => {
    if (!player) return;
    const phase = getCurrentPhase(choiceCount);
    if (lastActPhaseRef.current && lastActPhaseRef.current !== phase.id) {
      // Phase changed — show act break narration
      const breakPhases = ["exploration", "escalation", "survival", "collapse"];
      if (breakPhases.includes(phase.id)) {
        setActBreak({ choiceCount });
      }
    }
    lastActPhaseRef.current = phase.id;
  }, [choiceCount]);

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["events", player?.storyId],
    queryFn: async () => base44.entities.GameEvent.list("sort_order"),
    select: (data) => {
      console.log("[EVENT_SOURCE]", "imported_only");
      const storyId = player?.storyId;
      if (!storyId) return [];
      const normalizedStoryId = normalizeStoryId(storyId);
      let filtered = data
        .filter(e => e.story_id ? normalizeStoryId(e.story_id) === normalizedStoryId : false)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

      // Branch filtering — when postBasementBranchSelected is set, only show matching events
      const selectedBranch = player?.runState?.postBasementBranchSelected;
      if (selectedBranch) {
        const branchFlagMap = {
          kitchen: "branch_kitchen",
          upstairs_bedroom: "branch_upstairs",
          woods: "branch_woods",
          dock: "branch_dock",
        };
        const targetFlag = branchFlagMap[selectedBranch];
        filtered = filtered.filter(e => {
          // Always allow events with no branch requirement (general/regroup events)
          const conds = e.conditions;
          if (!conds || conds === "null" || conds === "{}") return true;
          let parsed = null;
          try { parsed = typeof conds === "string" ? JSON.parse(conds) : conds; } catch { return true; }
          const requiredFlags = parsed.requiredFlags || [];
          if (requiredFlags.length === 0) return true;
          // Show event if it requires our selected branch flag
          return requiredFlags.includes(targetFlag);
        });
        console.log("[BRANCH_FILTER]", selectedBranch, "→", filtered.length, "events matching");
      }

      return filtered;
    },
    initialData: [],
    enabled: !!player?.storyId,
  });

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

  const { data: stories = [] } = useQuery({
    queryKey: ["stories"],
    queryFn: () => base44.entities.Story.list("sort_order"),
    initialData: [],
  });

  const assetMap = useMemo(() => buildAssetMap(sceneAssets, characters), [sceneAssets, characters]);

  // Sync character image map into context so party components can access it
  useEffect(() => {
    if (assetMap?.charMap) setCharImageMap(assetMap.charMap);
  }, [assetMap, setCharImageMap]);

  const sceneMap = useMemo(() => {
    const map = {};
    sceneAssets.forEach(a => { map[a.key] = a.image_url; });
    return map;
  }, [sceneAssets]);

  // Strict event resolution — imported events only, ordered by sort_order
  // If currentEventId is null (fresh run) or not found, always start at first imported event
  const currentEvent = useMemo(() => {
    if (!events.length) return null;

    // events are already sorted by sort_order (done in select above)
    // 1. If we have a currentEventId, try exact match first
    if (player?.currentEventId) {
      const exact = events.find(e => e.event_id === player.currentEventId);
      if (exact) return exact;
      // currentEventId not found in imported events — fall through to first event
      console.warn("[GameScreen] currentEventId not found in imported events:", player.currentEventId, "→ resetting to first imported event");
    }

    // 2. Always start at first imported event (sort_order asc)
    return events[0] || null;
  }, [player?.currentEventId, events]);

  // Derive scene key AFTER currentEvent is initialized
  const currentSceneKey = useMemo(() => {
    if (!currentEvent?.image_key) return null;
    const k = currentEvent.image_key.toLowerCase();
    if (k.includes("woods") || k.includes("forest")) return "woods";
    if (k.includes("basement") || k.includes("cellar")) return "basement";
    if (k.includes("kitchen")) return "kitchen";
    if (k.includes("upstairs") || k.includes("bedroom") || k.includes("attic")) return "upstairs";
    if (k.includes("porch") || k.includes("exterior")) return "porch";
    return "living";
  }, [currentEvent?.image_key]);

  useAudioManager(player, currentSceneKey);

  const tonedEventText = useMemo(() => {
    if (!player || !currentEvent) return currentEvent?.text || "";
    
    // Build narrative with memory injection — continuous flow
    let text = buildNarrativeWithMemory(
      currentEvent,
      player.eventHistory?.[player.eventHistory.length - 2] || null, // last event
      player.lastChoiceId || null,
      player.runState || {}
    );
    
    // Add threat tone only if not already injected
    const tone = getEventTonePrefix(player.threat, player.stats.fear);
    if (tone === "imminent" && !text.includes("very close")) text += "\n\n[Something is very close. You can feel it.]";
    if (tone === "hunting" && !text.includes("knows where")) text += "\n\n[It knows where you are.]";
    
    return text;
  }, [player, currentEvent]);

  const choices = useMemo(() => {
    if (!currentEvent?.choices) return [];
    const raw = currentEvent.choices;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!player) return parsed;
    let finalChoices = [...parsed];
    // Inject item-unlocked choices (before panic replacement)
    finalChoices = injectItemChoices(finalChoices, player);
    // Panic replacement at high fear
    if (shouldPanicReplace(player.stats.fear) && finalChoices.length > 1) {
      finalChoices[finalChoices.length - 1] = buildPanicChoice();
    }
    return finalChoices;
  }, [currentEvent, player]);

  const sceneImage = currentEvent?.image_key ? sceneMap[currentEvent.image_key] : null;

  // Current story record for map layouts, backgrounds, and overlays
  const currentStory = useMemo(() => {
    return stories.find(s => normalizeStoryId(s.story_id) === normalizeStoryId(player?.storyId)) || null;
  }, [stories, player?.storyId]);

  // Story-specific map layout (zone labels, positions, danger levels)
  const mapLayout = useMemo(() => {
    return getStoryMapLayout(player?.storyId, currentStory);
  }, [player?.storyId, currentStory]);

  // Map background image — story-aware, uses DB-configured key with fallback chain
  const mapImageUrl = useMemo(() => {
    return resolveMapImageUrl(player?.storyId, sceneMap, currentStory?.map_background_key || null);
  }, [player?.storyId, sceneMap, currentStory?.map_background_key]);

  // Map overlay image (optional)
  const mapOverlayUrl = useMemo(() => {
    const key = currentStory?.map_overlay_key;
    return key ? sceneMap[key] || null : null;
  }, [currentStory?.map_overlay_key, sceneMap]);

  // Apply group_spread + infer/normalize event location — ATOMIC BATCH
  useEffect(() => {
    if (!currentEvent) return;
    setParty(prev => {
      if (!prev?.length) return prev;

      const eventLocation = normalizeLocationKey(
        currentEvent.location || inferLocationFromEvent(currentEvent.image_key, currentEvent.text)
      );

      const spread = parseAndNormalizeGroupSpread(currentEvent.group_spread);
      const spreadMap = new Map(spread.map(s => [s.memberId, s.location]));

      const moved = prev.map(m => {
        if (!m.isAlive || m.isMissing) return m;
        const nextLoc = spreadMap.get(m.id) || eventLocation;
        return { ...m, currentLocation: normalizeLocationKey(nextLoc) };
      });
      return recalculateIsolation(moved);
    });
  }, [currentEvent?.event_id]);

  // Detect kill pause events
  useEffect(() => {
    if (currentEvent?.killPause && !result) {
      setKillPauseActive(true);
    } else {
      setKillPauseActive(false);
    }
  }, [currentEvent?.event_id, result]);

  useEffect(() => {
    if (player && !result && !choosing && choices.length > 0 && shouldAutoSelect(player.stats.fear)) {
      const worstChoice = choices[choices.length - 1];
      setTimeout(() => handleChoice(worstChoice), 800);
    }
  }, [player?.currentEventId]);

  const playerPartyMember = useMemo(() => party?.find(m => m.isPlayer), [party]);
  const focusedMember = useMemo(() => {
    if (!focusedMemberId || !party) return null;
    return party.find(m => m.id === focusedMemberId) || null;
  }, [focusedMemberId, party]);

  const handleMemberTap = useCallback((member) => {
    // Open modal for non-player members
    if (!member.isPlayer) {
      const idx = party.findIndex(m => m.id === member.id);
      setModalMember({ member, presetIndex: idx });
      setShowMap(false);
    }
    setFocusedMemberId(prev => prev === member.id ? null : member.id);
  }, [party, setFocusedMemberId]);

  // Check milestone after choice — NO AUTOMATIC DEATHS
  const checkMilestone = useCallback((newChoiceCount, currentParty, currentPlayer) => {
    if (newChoiceCount % MILESTONE_INTERVAL !== 0) return;
    const score = calcTeamScore(currentPlayer, currentParty);
    const pass = score >= MILESTONE_PASS_THRESHOLD;
    const fearStage = getFearStage(currentPlayer?.stats?.fear || 0);

    if (pass) {
      setMilestoneEvent({
        pass: true,
        message: "You're holding together... for now.",
        fearLabel: fearStage.label,
      });
    } else {
      // Milestone failure: fear/injury/risk increase — NOT automatic death
      updatePlayer({ fearChange: 10, threatChange: 8 });
      const weakest = getWeakestMember(currentParty);
      if (weakest) {
        setPartyMemberState(weakest.id, { fearDelta: 15 });
        setPartyHiddenRisk(weakest.id, { targetedByThreat: true });
        setMilestoneEvent({
          pass: false,
          message: `${weakest.name} is showing signs of strain. The group is cracking.`,
          fearLabel: fearStage.label,
        });
      } else {
        setMilestoneEvent({
          pass: false,
          message: "Something's wrong. The weight of it is settling on everyone.",
          fearLabel: fearStage.label,
        });
      }
    }
  }, [updatePlayer, setPartyMemberState, setPartyHiddenRisk]);

  // Rotate focused character for each choice (gives "taking turns" feel)
  const focusedPartyMember = useMemo(() => {
    if (!party || party.length <= 1) return null;
    const others = party.filter(m => m.isAlive && !m.isMissing && !m.isPlayer);
    if (!others.length) return null;
    return others[choiceCount % others.length];
  }, [party, choiceCount]);

  // Expressive rotating prompts
  const PROMPT_TEMPLATES = [
    (name) => `${name} hesitates. Then looks directly at you.`,
    (name) => `${name}'s breathing goes shallow. They need you to decide.`,
    (name) => `${name} grabs your arm. "What do we do?"`,
    (name) => `${name} can't move. This falls to you.`,
    (name) => `${name} whispers your name. Time is running out.`,
    (name) => `${name} freezes. Every second matters.`,
  ];
  const SOLO_PROMPTS = [
    "Something shifts in the dark. Choose.",
    "The silence isn't empty. Decide now.",
    "Your hands are shaking. What do you do?",
    "There's no right answer here.",
    "Whatever you pick — you'll carry it.",
  ];

  const choicePrompt = focusedPartyMember
    ? PROMPT_TEMPLATES[choiceCount % PROMPT_TEMPLATES.length](focusedPartyMember.name?.split(" ")[0])
    : SOLO_PROMPTS[choiceCount % SOLO_PROMPTS.length];

  const handleChoice = (choice) => {
    if (!player || choosing) return;
    setChoosing(true);
    setMicroReaction(null);
    setFocusedCharacterName(focusedPartyMember?.name?.split(" ")[0] || null);

    // Loyalty modifier
    const speaker = pickSpeaker(party);
    const loyaltyBonus = speaker ? getLoyaltyStatBonus(getLoyaltyState(speaker.trustWithPlayer)) : 0;

    // Inventory bonus applies to relevant stat
    const invBonus = getInventoryStatBonus(player.inventory || [], choice.statUsed);
    const statValue = (player.stats[choice.statUsed] || 5) + loyaltyBonus + invBonus;
    const chance = calculateSuccessChance(statValue, choice.difficulty, player.stats.fear, player.threat);
    const success = rollSuccess(chance);

    const effect = success ? choice.successEffect : choice.failEffect;
    const parsed = typeof effect === "string" ? JSON.parse(effect) : (effect || {});

    const effects = {};
    if (parsed.statChanges) effects.statChanges = parsed.statChanges;
    if (parsed.fearChange !== undefined) effects.fearChange = parsed.fearChange;
    if (parsed.threatChange !== undefined) effects.threatChange = parsed.threatChange;
    if (parsed.flagsAdded || choice.flagsAdded)
      effects.flagsAdded = { ...(parsed.flagsAdded || {}), ...(choice.flagsAdded || {}) };
    if (parsed.flagIncrements) effects.flagIncrements = parsed.flagIncrements;
    if (parsed.addItem) effects.addItem = parsed.addItem;
    if (parsed.removeItem) effects.removeItem = parsed.removeItem;
    if (parsed.partyRisk) effects.partyRisk = parsed.partyRisk;

    updatePlayer(effects);
    
    // Store choice ID for memory callbacks on next event
    updatePlayer({ lastChoiceId: choice.id || choice.text?.slice(0, 20) });

    // ── Scripted consequences: apply async for UI reactions (party state built locally below) ──
    if (parsed.partyConsequence) {
      const { memberId, outcome, statusText } = parsed.partyConsequence;
      if (outcome === "dead") {
        updatePlayer({ fearChange: 16, threatChange: 12 });
        const deadM = party.find(m => m.id === memberId);
        if (deadM) setTimeout(() => setDeathPanel({ member: { ...deadM, currentStatusText: statusText || deadM.currentStatusText } }), 400);
      }
      if (outcome === "missing") updatePlayer({ fearChange: 10, threatChange: 8 });
      if (outcome === "injured") updatePlayer({ fearChange: 6, threatChange: 4 });
    }

    // Betrayal check (on current party, not nextParty — wants the old state)
    const betrayer = checkBetrayalTrigger(party, getLoyaltyState);
    if (betrayer) {
      updatePlayer({ fearChange: 8, threatChange: 5 });
    }

    if (parsed.focusMemberId) setFocusedMemberId(parsed.focusMemberId);

    const passiveDelta = passiveThreatUpdate(
      { ...player, flags: { ...player.flags, ...(effects.flagsAdded || {}) } },
      success, choice
    );
    if (passiveDelta !== 0) updatePlayer({ threatChange: passiveDelta });

    // Build consequence tags for story feedback
    const consequenceTags = [];
    if (effects.flagsAdded?.noise_made) consequenceTags.push("Something heard that");
    if (parsed.partyConsequence?.outcome === "missing") consequenceTags.push("Someone's separated");
    if (parsed.partyConsequence?.outcome === "dead") consequenceTags.push("The group is smaller now");
    if (success && speaker) consequenceTags.push(`${speaker.name?.split(" ")[0]} trusts you more`);
    if (!success && speaker) consequenceTags.push(`${speaker.name?.split(" ")[0]} noticed that`);
    if (effects.flagsAdded?.betrayed_ally) consequenceTags.push("Trust broken");
    if (parsed.addItem) consequenceTags.push("Item found");

    // ── Story path lock: trigger after basement event ──────────────────────
    const isBasementEvent = currentEvent?.event_id?.toLowerCase().includes("basement") ||
      (player.flags.basement_completed && !player.flags.story_path);
    if (isBasementEvent && !player.flags.story_path) {
      // Determine story_path from Act 1 choices
      let storyPath = "haunting"; // default
      const noiseCount = player.flags.noise_made || 0;
      const alone = player.flags.alone_count || 0;
      const trust = player.flags.group_trust || 0;
      if (noiseCount >= 2) storyPath = "external_killer";
      else if (alone >= 2) storyPath = "cam_is_killer";
      else if (trust >= 2) storyPath = "chris_is_killer";
      else storyPath = "haunting";
      updatePlayer({ flagsAdded: { story_path: storyPath, basement_completed: true } });
      console.log("[STORY_PATH_SELECTED]", storyPath);
      console.log("[BASEMENT_COMPLETED]", true);
    }

    // ── Post-basement branch selection ─────────────────────────────────────
    // When a choice sets branch flags, lock the run to that branch
    const branchFlags = ["branch_kitchen", "branch_upstairs", "branch_woods", "branch_dock"];
    const chosenBranch = branchFlags.find(f => effects.flagsAdded?.[f]);
    if (chosenBranch) {
      const branchMap = {
        branch_kitchen: "kitchen",
        branch_upstairs: "upstairs_bedroom",
        branch_woods: "woods",
        branch_dock: "dock",
      };
      const runStateUpdate = { postBasementBranchSelected: branchMap[chosenBranch] };
      updatePlayer({ runState: { ...player.runState, ...runStateUpdate } });
      console.log("[BRANCH_SELECTED]", branchMap[chosenBranch]);
    }

    setResult({
      success,
      outcomeText: parsed.outcomeText || null,
      statChanges: parsed.statChanges,
      fearChange: parsed.fearChange,
      threatChange: (parsed.threatChange || 0) + passiveDelta,
      consequenceTags,
    });

    // Role-aware micro reaction — 45% chance
    if (speaker && Math.random() < 0.45) {
      const category = getContextualCategory(player.stats.fear, player.threat, success);
      const role = getCharacterRole(speaker);
      const line = getDialogueLine(category, role);
      const speakerImage = assetMap?.getCharacterImageById?.(speaker.id) || null;
      const speakerPreset = party.findIndex(m => m.id === speaker.id);
      setMicroReaction({ speakerName: speaker.name?.split(" ")[0], line, speakerImage, presetIndex: speakerPreset });
      setTimeout(() => setMicroReaction(null), 4500);
    }

    // ── STRICT DEATH PIPELINE: Build local nextParty, apply all effects, then evaluate ─
    // Build the next party state BEFORE evaluating passive death
    let nextParty = [...party];

    // 1. Apply party consequence (scripted death/missing/injury + location move)
    if (parsed.partyConsequence) {
      const pc = parsed.partyConsequence;
      nextParty = nextParty.map(m => {
        if (m.id !== pc.memberId) return m;
        const updated = { ...m, hiddenFlags: { ...m.hiddenFlags } };
        if (pc.outcome === "dead") updated.isAlive = false;
        else if (pc.outcome === "missing") { updated.isMissing = true; updated.hiddenFlags.separatedFromGroup = true; }
        else if (pc.outcome === "injured") updated.isInjured = true;
        if (pc.location) updated.currentLocation = normalizeLocationKey(pc.location);
        return updated;
      });
    }

    // 2. Apply party fear changes
    if (parsed.partyFear) {
      nextParty = nextParty.map(m => {
        const delta = parsed.partyFear[m.id];
        if (!delta) return m;
        return { ...m, fearLevel: Math.max(0, Math.min(100, (m.fearLevel || 0) + delta)) };
      });
    }

    // 3. Apply party trust changes (from loyalty)
    if (speaker) {
      const trustDelta = success ? 0.5 : -0.5;
      nextParty = nextParty.map(m =>
        m.id === speaker.id
          ? { ...m, trustWithPlayer: Math.max(0, Math.min(10, (m.trustWithPlayer || 5) + trustDelta)) }
          : m
      );
    }

    // 4. Apply party risk flags
    if (parsed.partyRisk) {
      nextParty = nextParty.map(m => {
        const riskFlags = parsed.partyRisk[m.id];
        if (!riskFlags) return m;
        return { ...m, hiddenFlags: { ...m.hiddenFlags, ...riskFlags } };
      });
    }

    // 5. Normalize locations + recalculate isolation
    nextParty = nextParty.map(m => ({
      ...m,
      currentLocation: normalizeLocationKey(m.currentLocation || "living"),
    }));
    nextParty = recalculateIsolation(nextParty);

    // 6. Commit party state
    setParty(nextParty);

    // 7. NOW check passive death using the fully updated state
    const grouped = isGroupedTogether(nextParty);
    const dangerAllowed = choice?.dangerAllowed || parsed.dangerAllowed;
    const newChoiceCount = choiceCount + 1;
    const deathTrigger = checkDeathTrigger({
      party: nextParty,
      player,
      choiceSuccess: success,
      currentDeathCount: (player.deathCount || 0),
      currentEvent,
      choice,
      dangerAllowed,
      choiceCount: newChoiceCount,
      isGrouped: grouped,
    });

    if (deathTrigger) {
      setTimeout(() => {
        setPartyConsequence(deathTrigger.memberId, "dead", deathTrigger.deathText);
        updatePlayer({ fearChange: 16, threatChange: 12, incrementDeathCount: true });
        const deadM = nextParty.find(m => m.id === deathTrigger.memberId);
        if (deadM) {
          setTimeout(() => setDeathPanel({ member: { ...deadM, currentStatusText: deathTrigger.deathText } }), 250);
        }
        // Show death reaction from a survivor
        const survivors = nextParty.filter(m => m.isAlive && !m.isMissing && !m.isPlayer && m.id !== deathTrigger.memberId);
        if (survivors.length > 0) {
          const reactor = survivors[Math.floor(Math.random() * survivors.length)];
          const role = getCharacterRole(reactor);
          const reactionLine = getDeathReactionLine(role, deathTrigger.memberName);
          const reactorImage = assetMap?.getCharacterImageById?.(reactor.id) || null;
          const reactorIdx = nextParty.findIndex(m => m.id === reactor.id);
          setTimeout(() => {
            setMicroReaction({ speakerName: reactor.name?.split(" ")[0], line: reactionLine, speakerImage: reactorImage, presetIndex: reactorIdx });
            setTimeout(() => setMicroReaction(null), 5000);
          }, 900);
        }
        // Recalculate isolation after death
        setTimeout(() => {
          setParty(prev => recalculateIsolation(prev));
        }, 350);
      }, 600);
    }

    // ── Relationship memory update ──────────────────────────────────────────
    if (speaker) {
      updatePlayer({
        updateRelationship: {
          memberId: speaker.id,
          trustDelta: success ? 0.3 : -0.3,
          moment: success
            ? `Helped during: ${currentEvent?.event_id}`
            : `Failed during: ${currentEvent?.event_id}`,
        },
      });
    }

    const nextId = parsed.nextEventId || choice.nextEventId;
    setPendingNextEvent(nextId);

    // Milestone check
    const newCount = choiceCount + 1;
    incrementChoiceCount();
    // Defer milestone check to after party state settles
    setTimeout(() => checkMilestone(newCount, party, player), 200);
  };

  const handleUseItem = (itemDef) => {
    if (itemDef.use_effect) updatePlayer({ flagsAdded: itemDef.use_effect.flagsAdded });
    updatePlayer({ removeItem: itemDef.id });
  };

  const handleKillPauseResume = () => {
    setKillPauseActive(false);
  };

  const handleContinue = () => {
  if (!currentEvent || !player) return;
  setFocusedMemberId(null);

  // Check ending conditions
  if (currentEvent.is_ending || player.threat >= 100) {
    setGamePhase("summary");
    navigate("/summary");
    return;
  }

  // ── Safe event navigation with fallback chain ──────────────────────────
  const nextEvent = getNextEventSafely(pendingNextEvent, events, currentEvent, player.runState || {}, party);
  if (nextEvent) {
    // Validate continuity (warn on console if scene resets)
    if (checkForSceneReset(nextEvent.text)) {
      console.warn(`[Narrative] Event ${nextEvent.event_id} may have scene reset pattern`);
    }
    setCurrentEvent(nextEvent.event_id);
  } else {
    // Truly no events left — end run gracefully
    console.warn("[EventSafety] No more events. Ending run.");
    setGamePhase("summary");
    navigate("/summary");
    return;
  }

    setResult(null);
    setPendingNextEvent(null);
    setChoosing(false);
    setNarrationDone(false);
  };

  // Loading / recovery state — do not redirect, do not flash errors
  if (!player || (eventsLoading && events.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-secondary border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">{!player ? "Restoring run…" : "Loading story…"}</p>
        </div>
      </div>
    );
  }

  // Only show missing-events error AFTER loading has finished
  if (!currentEvent && !eventsLoading && events.length === 0) {
    console.error("[FATAL] No imported events for story:", player?.storyId);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-xs">
          <div className="text-4xl">⛔</div>
          <p className="font-display text-lg text-foreground">No imported events found.</p>
          <p className="text-xs text-muted-foreground">Story ID: <code className="font-mono bg-secondary px-1 rounded">{player.storyId}</code></p>
          <p className="text-xs text-muted-foreground">The story requires imported event data. Please check the Admin Panel.</p>
          <button onClick={() => navigate("/admin")} className="w-full h-11 rounded-xl text-sm font-bold text-white" style={{ background: "hsl(351 78% 60%)" }}>Go to Admin Panel</button>
          <button onClick={() => navigate("/home")} className="w-full h-10 rounded-xl text-sm font-semibold text-muted-foreground" style={{ background: "hsl(252 12% 18%)", border: "1px solid hsl(252 10% 24%)" }}>Return Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto relative" style={{ background: "#050507" }}>
      {/* Gothic neon map base layer */}
      <NeonMapBackground mapImageUrl={mapImageUrl} fear={player.stats.fear} />
      <AtmosphereLayer fear={player.stats.fear} />
      <FearShader fear={player.stats.fear} />

      {/* Sticky top bar — gothic neon */}
      <div
        className="sticky top-0 z-10 backdrop-blur-md px-4 pt-4 pb-3 space-y-3 relative"
        style={{ background: "rgba(5,5,7,0.92)", borderBottom: "1px solid #00F0FF22" }}
      >
        <PlayerStrip
          player={player}
          partyMember={playerPartyMember}
          assetImage={assetMap.getCharacterImageById(player?.characterId)}
          onClick={() => setModalMember({ member: playerPartyMember || { ...player, isPlayer: true, name: player.characterName }, presetIndex: 0 })}
        />
        <TopBar player={player} choiceCount={choiceCount} />

        {/* Controls row */}
        <div className="flex gap-2">
          {/* Back to home */}
          <button
            onClick={() => setShowExitModal(true)}
            className="px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 font-semibold"
            style={{ background: "#0F0F15", border: "1px solid #00F0FF22", color: "#A3A3B2" }}
          >
            <Home className="w-3 h-3" />
          </button>
          {party && party.length > 1 && (() => {
            const aliveMembers = party.filter(m => m.isAlive && !m.isMissing && !m.isPlayer);
            const criticalMember = aliveMembers.find(m => computeMemberVulnerability(m, player) >= 65);
            const atRiskMember = !criticalMember && aliveMembers.find(m => computeMemberVulnerability(m, player) >= 40);
            const dangerMember = criticalMember || atRiskMember;
            const dangerInfo = dangerMember ? getDangerLevel(dangerMember, player) : null;
            return (
              <button
                onClick={() => setShowMap(v => !v)}
                className="flex-1 flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors"
                style={{
                  background: criticalMember ? "#B3003C18" : "#0F0F15",
                  border: criticalMember ? "1px solid #B3003C66" : "1px solid #00F0FF22",
                  color: "#A3A3B2",
                }}
              >
                <span className="flex items-center gap-1.5 font-semibold">
                  <Users className="w-3 h-3" />
                  {party.filter(m => m.isAlive && !m.isMissing).length}/{party.length} alive
                  {dangerInfo && (
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full" style={{ background: dangerInfo.bg, color: dangerInfo.color }}>
                      {dangerInfo.icon} {dangerMember.name?.split(" ")[0]} {dangerInfo.label}
                    </span>
                  )}
                </span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            );
          })()}
          <button
            onClick={() => setShowGroupStats(true)}
            className="px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 font-semibold"
            style={{ background: "#0F0F15", border: "1px solid #00F0FF22", color: "#A3A3B2" }}
          >
            <BarChart2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => navigate("/journal")}
            className="px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 font-semibold"
            style={{ background: "#0F0F15", border: "1px solid #00F0FF22", color: "#A3A3B2" }}
          >
            <BookOpen className="w-3 h-3" />
          </button>
          <button
            onClick={() => setShowInventory(true)}
            className="px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 font-semibold relative"
            style={{ background: "#0F0F15", border: "1px solid #00F0FF22", color: "#A3A3B2" }}
          >
            🎒
            {(player.inventory || []).length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center" style={{ background: "hsl(271 87% 55%)", color: "white" }}>
                {(player.inventory || []).length}
              </span>
            )}
          </button>
          <AudioManagerWidget />
        </div>
      </div>

      {/* Party map — neon gothic fullscreen overlay */}
      <AnimatePresence>
        {showMap && party && party.length > 1 && (
          <motion.div
            key="partymap-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: "rgba(5,5,7,0.97)" }}
          >
            <div className="flex items-center justify-between px-4 py-4 shrink-0" style={{ borderBottom: "1px solid #00F0FF22" }}>
              <p className="font-display text-xl tracking-wide" style={{ color: "#00F0FF", textShadow: "0 0 20px #00F0FF88" }}>GROUP MAP</p>
              <button
                onClick={() => setShowMap(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "#0F0F15", border: "1px solid #00F0FF33" }}
              >
                <X className="w-4 h-4" style={{ color: "#00F0FF" }} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <NeonPartyMap
                party={party}
                activeMemberId={focusedMemberId}
                onMemberTap={handleMemberTap}
                charImageMap={assetMap?.charMap}
                mapImageUrl={mapImageUrl}
                mapLayout={mapLayout}
                mapOverlayUrl={mapOverlayUrl}
              />
              {focusedMember && !focusedMember.isPlayer && (
                <div className="mt-4">
                  <FocusedMemberBanner member={focusedMember} />
                </div>
              )}

              {/* Missing / Gone status lists */}
              {party.filter(m => m.isMissing).length > 0 && (
                <div className="mt-3 p-3 rounded-xl" style={{ background: "#FF2DAA08", border: "1px solid #FF2DAA22" }}>
                  <p className="text-[8px] uppercase tracking-widest font-bold mb-1.5" style={{ color: "#FF2DAA" }}>Missing</p>
                  {party.filter(m => m.isMissing).map(m => (
                    <div key={m.id} className="flex items-center gap-2 text-[10px]" style={{ color: "#A3A3B2" }}>
                      <span style={{ color: "#FF2DAA" }}>? {m.name}</span>
                      <span className="text-[8px] opacity-60">{m.currentLocation || "unknown"}</span>
                    </div>
                  ))}
                </div>
              )}
              {party.filter(m => !m.isAlive).length > 0 && (
                <div className="mt-3 p-3 rounded-xl" style={{ background: "#B3003C08", border: "1px solid #B3003C22" }}>
                  <p className="text-[8px] uppercase tracking-widest font-bold mb-1.5" style={{ color: "#B3003C" }}>Gone</p>
                  {party.filter(m => !m.isAlive).map(m => (
                    <div key={m.id} className="text-[10px]" style={{ color: "#B3003C88" }}>
                      ✕ {m.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 px-4 pt-4 pb-8 space-y-3 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentEvent.event_id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            {/* Scene image — atmospheric background layer, not a card */}

            {/* Gothic neon narration card */}
            <motion.div
              key={currentEvent.event_id + "_card"}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28 }}
              className="rounded-2xl overflow-hidden relative"
              style={{
                background: "linear-gradient(180deg, #0F0F1A 0%, #050507 100%)",
                border: "1.5px solid #00F0FF44",
                boxShadow: "0 0 0 0px #00F0FF, 0 0 40px #00F0FF18, inset 0 1px 0 #00F0FF22",
              }}
            >
              {/* Neon top glow line */}
              <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #00F0FF, transparent)" }} />

              {/* Scene image */}
              {sceneImage && (
                <div className="w-full" style={{ height: 160, position: "relative" }}>
                  <img src={sceneImage} alt="" className="w-full h-full object-cover" style={{ filter: "saturate(0.55) brightness(0.72) contrast(1.1)" }} />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 45%, rgba(5,5,7,0.88) 100%)" }} />
                </div>
              )}

              {/* Phase pill — event-driven, story-aware */}
              <div className="px-4 pt-3 pb-1">
                {(() => { const ph = resolvePhaseLabel(currentEvent, player?.storyId, choiceCount); return (
                  <div className="inline-flex items-center rounded-full px-3 py-1" style={{ background: "#0F0F1A", border: `1px solid ${ph.border || "#A020F044"}`, boxShadow: `0 0 10px ${ph.bg || "#A020F033"}` }}>
                    <p className="text-[9px] uppercase tracking-widest font-black" style={{ color: ph.color || "#A020F0", textShadow: `0 0 8px ${ph.color || "#A020F088"}88` }}>
                      {ph.emoji} {ph.label}{ph.sublabel ? ` — ${ph.sublabel}` : ""}
                    </p>
                  </div>
                ); })()}
              </div>

              <div className="px-5 pb-5 pt-2">
                <p className="font-body text-base leading-relaxed" style={{ color: "#E8E6D9", position: "relative", zIndex: 1 }}>
                  <TypewriterText
                    text={tonedEventText.split("\n\n")[0]}
                    speed={22}
                    onComplete={() => setNarrationDone(true)}
                    showCursor={!narrationDone}
                  />
                </p>
                {narrationDone && tonedEventText.split("\n\n").length > 1 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-sm font-body mt-3 pt-3 border-t"
                    style={{ color: "#FF2DAA", borderColor: "#00F0FF18" }}
                  >
                    {tonedEventText.split("\n\n").slice(1).join(" ")}
                  </motion.p>
                )}
                {!narrationDone && (
                  <p className="text-[8px] mt-2 uppercase tracking-widest" style={{ color: "#A3A3B244" }}>tap to skip</p>
                )}
              </div>
            </motion.div>

            {/* Micro reaction */}
            {microReaction && (
              <div className="relative z-20" style={{ marginTop: 12, minHeight: 48 }}>
                <MicroReaction
                  speakerName={microReaction.speakerName}
                  line={microReaction.line}
                  visible={!!microReaction}
                  speakerImage={microReaction.speakerImage}
                  presetIndex={microReaction.presetIndex}
                />
              </div>
            )}

            {/* Choices or result */}
            {!result ? (
              <AnimatePresence>
                {narrationDone && (
                  <motion.div
                    key="choices"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-2.5"
                  >
                    <p className="text-[9px] uppercase tracking-widest font-bold px-1" style={{ color: "#A3A3B2" }}>
                      {choicePrompt}
                    </p>
                    {choices.map((choice, i) => (
                      <ChoiceButton
                        key={i}
                        choice={choice}
                        player={player}
                        index={i}
                        onSelect={handleChoice}
                        disabled={choosing}
                        isPanic={choice._isPanic}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (
              <ResultPanel result={result} onContinue={handleContinue} choiceCount={choiceCount} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Exit confirmation modal */}
      <AnimatePresence>
        {showExitModal && (
          <motion.div
            key="exit-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4"
            style={{ background: "rgba(5,5,7,0.85)", backdropFilter: "blur(6px)" }}
            onClick={() => setShowExitModal(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl p-5 space-y-3"
              style={{
                background: "#0F0F15",
                border: "1.5px solid #00F0FF33",
                boxShadow: "0 0 40px #00F0FF18, inset 0 1px 0 #00F0FF22",
                paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)",
              }}
            >
              <div className="text-center pb-1">
                <div className="text-3xl mb-2">🚪</div>
                <p className="font-display text-lg tracking-wide" style={{ color: "#E8E6D9" }}>Leave the run?</p>
                <p className="text-[10px] mt-1" style={{ color: "#A3A3B2" }}>Your run is still in progress. What do you want to do?</p>
              </div>
              <button
                onClick={() => { saveSession(); clearSession(); setTimeout(() => navigate("/home"), 50); }}
                className="w-full py-3.5 rounded-2xl text-sm font-bold"
                style={{ background: "linear-gradient(135deg, #C400FF, #8800CC)", color: "white", boxShadow: "0 0 20px #C400FF55" }}
              >
                💾 Save &amp; Exit
              </button>
              <button
                onClick={() => { clearSession(); navigate("/home"); }}
                className="w-full py-3 rounded-2xl text-sm font-semibold text-muted-foreground"
                style={{ background: "#0F0F1A", border: "1px solid #00F0FF22", color: "#A3A3B2" }}
              >
                Exit Without Saving
              </button>
              <button
                onClick={() => setShowExitModal(false)}
                className="w-full py-2.5 rounded-2xl text-xs font-bold text-muted-foreground/60"
              >
                Cancel — Keep Playing
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Death panel */}
      {deathPanel && (
        <DeathPanel
          deadMember={deathPanel.member}
          party={party}
          charImageMap={assetMap?.charMap}
          onDismiss={() => setDeathPanel(null)}
        />
      )}

      {/* Inventory panel */}
      <AnimatePresence>
        {showInventory && (
          <InventoryPanel
            inventory={player.inventory || []}
            onUseItem={handleUseItem}
            onClose={() => setShowInventory(false)}
          />
        )}
      </AnimatePresence>

      {/* Character modal */}
      {modalMember && (
        <CharacterModal
          member={modalMember.member}
          presetIndex={modalMember.presetIndex}
          assetImage={assetMap.getCharacterImageById(modalMember.member?.id)}
          onClose={() => setModalMember(null)}
        />
      )}

      {/* Group stats modal */}
      {showGroupStats && (
        <GroupStatsModal
          player={player}
          party={party}
          onClose={() => setShowGroupStats(false)}
        />
      )}

      {/* Milestone outcome panel */}
      {milestoneEvent && (
        <MilestoneOutcomePanel
          event={milestoneEvent}
          party={party}
          onDismiss={() => setMilestoneEvent(null)}
        />
      )}

      {/* Act break narration */}
      {actBreak && (
        <ActBreakNarration
          choiceCount={actBreak.choiceCount}
          player={player}
          party={party}
          onComplete={() => setActBreak(null)}
        />
      )}

      {/* Kill pause overlay */}
      <KillPauseOverlay isActive={killPauseActive} onResume={handleKillPauseResume} />
    </div>
  );
}