/**
 * useImmersionLayer — Phase 2 Integration Hook
 *
 * Wires tensionEngine, socialTensionEngine, reactionEngine,
 * entityPresenceEngine, and consequenceVisibility together.
 * Drop this into GameScreen — it reads game state and returns
 * all immersion signals needed by the Phase 2 UI components.
 *
 * Usage:
 *   const immersion = useImmersionLayer({ player, party, currentEvent, choiceResult, cohesionScore, suspicionScores, killerMemberId });
 *
 * Returns:
 *   { tensionTier, warningText, showWarning, entityPresence, entityObservation,
 *     socialStage, argumentLine, accusation, panicDecision, consequenceCards, reactionEvents }
 */

import { useState, useEffect, useRef } from "react";
import { getTensionTier, getWarningSign, shouldShowWarning, updateTensionMemory, computeEntityPresence } from "./tensionEngine";
import { getSocialStage, getArgumentLine, generateAccusation, checkPanicDecision, getMoraleHitFromDeath } from "./socialTensionEngine";
import { getReactionLine, pickReactingMembers, classifyReaction, REACTION_TYPES } from "./reactionEngine";
import { getAggressionLevel, getEntityObservation, shouldShowEntityObservation, selectStalkedMember, createEntityState, addToNoiseTrail } from "./entityPresenceEngine";
import { buildConsequenceCards, getConsequenceTags } from "./consequenceVisibility";

export function useImmersionLayer({
  player,
  party = [],
  currentEvent,
  choiceResult,
  cohesionScore = 60,
  suspicionScores = {},
  killerMemberId = null,
}) {
  const [tensionMemory, setTensionMemory] = useState({ dangerStreak: 0 });
  const [entityState, setEntityState] = useState(createEntityState());
  const [warningText, setWarningText] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [entityObservation, setEntityObservation] = useState(null);
  const [argumentLine, setArgumentLine] = useState(null);
  const [accusation, setAccusation] = useState(null);
  const [panicDecision, setPanicDecision] = useState(null);
  const [consequenceCards, setConsequenceCards] = useState([]);
  const [showConsequences, setShowConsequences] = useState(false);
  const [reactionEvents, setReactionEvents] = useState([]);
  const choicesSinceObservation = useRef(0);

  const threat = player?.threat ?? 0;
  const fear   = player?.stats?.fear ?? 0;

  // ── Recompute on every new event ─────────────────────────────────────────────
  useEffect(() => {
    if (!currentEvent) return;

    const tier = getTensionTier(threat, fear);

    // Tension memory update
    const newMemory = updateTensionMemory(tensionMemory, tier);
    setTensionMemory(newMemory);

    // Environmental warning sign
    if (shouldShowWarning(tier, newMemory.dangerStreak)) {
      setWarningText(getWarningSign(tier));
      setShowWarning(true);
      const t = setTimeout(() => setShowWarning(false), 4200);
      return () => clearTimeout(t);
    } else {
      setShowWarning(false);
    }
  }, [currentEvent?.event_id]);

  // ── Entity presence after each event ─────────────────────────────────────────
  useEffect(() => {
    if (!currentEvent) return;

    const aggressionLevel = getAggressionLevel(threat);
    const stalkedMember = selectStalkedMember(party, killerMemberId);
    const noiseTrail = addToNoiseTrail(entityState.noiseTrail, currentEvent.location);
    const playerLocation = currentEvent.location;
    const entityLocation = noiseTrail[noiseTrail.length - 1] || null;

    const newEntity = {
      ...entityState,
      threat,
      aggressionLevel,
      location: entityLocation,
      noiseTrail,
      stalkedMemberId: stalkedMember?.id || null,
    };
    setEntityState(newEntity);

    choicesSinceObservation.current += 1;
    if (shouldShowEntityObservation(aggressionLevel, choicesSinceObservation.current)) {
      setEntityObservation(getEntityObservation(aggressionLevel));
      choicesSinceObservation.current = 0;
    }
  }, [currentEvent?.event_id, threat]);

  // ── Social tension after each event ──────────────────────────────────────────
  useEffect(() => {
    if (!party.length) return;

    const stage = getSocialStage(cohesionScore);
    if (stage.label !== "STABLE" && Math.random() < 0.35) {
      setArgumentLine(getArgumentLine(stage));
    } else {
      setArgumentLine(null);
    }

    // Accusation — only at high suspicion
    const mostSuspicious = Object.entries(suspicionScores)
      .filter(([id]) => !party.find(m => m.id === id)?.isPlayer)
      .sort(([, a], [, b]) => b - a)[0];

    if (mostSuspicious && mostSuspicious[1] >= 55 && fear > 45) {
      const accuser = pickReactingMembers(party, 1)[0];
      const target = party.find(m => m.id === mostSuspicious[0]);
      if (accuser && target) {
        const acc = generateAccusation(accuser, target, mostSuspicious[1]);
        setAccusation(acc ? { text: acc, accuser, target } : null);
      }
    } else {
      setAccusation(null);
    }

    // Panic decisions
    const panics = party
      .map(m => checkPanicDecision(m, fear, cohesionScore))
      .filter(Boolean);
    setPanicDecision(panics[0] || null);
  }, [currentEvent?.event_id, cohesionScore, fear]);

  // ── Process choice result → consequence cards + reactions ────────────────────
  useEffect(() => {
    if (!choiceResult) return;

    // Build consequence cards
    const cards = buildConsequenceCards({ ...choiceResult, party });
    setConsequenceCards(cards);
    setShowConsequences(true);
    const t = setTimeout(() => setShowConsequences(false), 4500);

    // Build reaction events
    const reactionType = classifyReaction({
      deathOccurred: choiceResult.partyMemberDied,
      fearDelta: choiceResult.fearChange || 0,
      isolated: choiceResult.playerAlone,
      betrayal: choiceResult.betrayalRevealed,
      discovery: choiceResult.discoveryMade,
      injured: !!choiceResult.injuredMemberId,
      survived: choiceResult.success && threat >= 60,
    });

    if (reactionType) {
      const reactors = pickReactingMembers(party, reactionType === REACTION_TYPES.DEATH ? 2 : 1);
      const reactions = reactors.map(member => ({
        member,
        line: getReactionLine(member, reactionType),
        reactionType,
        portraitUrl: member.portraitUrl || null,
      })).filter(r => r.line);
      setReactionEvents(reactions);
    } else {
      setReactionEvents([]);
    }

    return () => clearTimeout(t);
  }, [choiceResult]);

  // ── Derived values ────────────────────────────────────────────────────────────
  const tensionTier = getTensionTier(threat, fear);
  const socialStage = getSocialStage(cohesionScore);
  const entityPresence = computeEntityPresence(threat, currentEvent?.location, entityState.location);

  return {
    // Tension
    tensionTier,
    warningText,
    showWarning,
    // Entity
    entityPresence,
    entityObservation,
    // Social
    socialStage,
    argumentLine,
    accusation,
    panicDecision,
    // Consequences
    consequenceCards,
    showConsequences,
    // Reactions
    reactionEvents,
  };
}