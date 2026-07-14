/**
 * Consequence Visibility Engine — Phase 2
 * Converts raw stat/flag/trust changes into human-readable
 * consequence cards, status indicators, and dialogue tone shifts.
 * Pure logic — no React.
 */

import { getTrustLabel } from "./trustEngine";
import { getSuspicionLabel } from "./trustEngine";

// ── Consequence card types ────────────────────────────────────────────────────
export const CONSEQUENCE_TYPES = {
  TRUST_CHANGE:    "trust_change",
  FEAR_CHANGE:     "fear_change",
  SUSPICION_SHIFT: "suspicion_shift",
  MORALE_HIT:      "morale_hit",
  INJURY:          "injury",
  RELATIONSHIP:    "relationship",
  ITEM_GAINED:     "item_gained",
  ITEM_LOST:       "item_lost",
  COHESION_CHANGE: "cohesion_change",
};

/**
 * Build a list of visible consequence cards from a choice outcome.
 * @param {object} result - { success, statChanges, fearChange, threatChange, trustEffects, suspicionEffects, cohesionDelta, addItem, removeItem, injuredMemberId, party }
 * @returns {Array} consequence cards
 */
export function buildConsequenceCards(result = {}) {
  const cards = [];
  const { success, fearChange, trustEffects, suspicionEffects, cohesionDelta, addItem, removeItem, injuredMemberId, party = [] } = result;

  // Fear change
  if (fearChange && Math.abs(fearChange) >= 5) {
    cards.push({
      type: CONSEQUENCE_TYPES.FEAR_CHANGE,
      label: fearChange > 0 ? "Fear Rising" : "Fear Easing",
      value: fearChange,
      icon: "🫀",
      color: fearChange > 0 ? "hsl(351 78% 60%)" : "hsl(123 68% 55%)",
      description: fearChange > 0 ? "The group is more frightened." : "Some tension releases.",
    });
  }

  // Trust changes
  if (trustEffects) {
    for (const [memberId, delta] of Object.entries(trustEffects)) {
      if (Math.abs(delta) < 1) continue;
      const member = party.find(m => m.id === memberId);
      if (!member) continue;
      const newTrust = Math.max(0, Math.min(10, (member.trustWithPlayer ?? 5) + delta));
      const trustLabel = getTrustLabel(newTrust);
      cards.push({
        type: CONSEQUENCE_TYPES.TRUST_CHANGE,
        label: delta > 0 ? `${member.name?.split(" ")[0]} trusts you more` : `${member.name?.split(" ")[0]} trusts you less`,
        value: delta,
        icon: delta > 0 ? "🤝" : "💔",
        color: trustLabel.color,
        description: `Now: ${trustLabel.label}`,
        memberId,
      });
    }
  }

  // Suspicion shifts
  if (suspicionEffects) {
    for (const [memberId, delta] of Object.entries(suspicionEffects)) {
      if (Math.abs(delta) < 10) continue;
      const member = party.find(m => m.id === memberId);
      if (!member) continue;
      cards.push({
        type: CONSEQUENCE_TYPES.SUSPICION_SHIFT,
        label: delta > 0 ? `${member.name?.split(" ")[0]} looks guilty` : `${member.name?.split(" ")[0]} cleared slightly`,
        value: delta,
        icon: "🔍",
        color: delta > 0 ? "hsl(40 90% 62%)" : "hsl(123 68% 55%)",
        description: `Suspicion ${delta > 0 ? "increased" : "decreased"}`,
        memberId,
      });
    }
  }

  // Cohesion
  if (cohesionDelta && Math.abs(cohesionDelta) >= 5) {
    cards.push({
      type: CONSEQUENCE_TYPES.COHESION_CHANGE,
      label: cohesionDelta > 0 ? "Group bonds" : "Group fractures",
      value: cohesionDelta,
      icon: cohesionDelta > 0 ? "🛡️" : "⚡",
      color: cohesionDelta > 0 ? "hsl(200 65% 55%)" : "hsl(351 78% 60%)",
      description: cohesionDelta > 0 ? "Morale improving." : "The group is less unified.",
    });
  }

  // Item gained
  if (addItem) {
    cards.push({
      type: CONSEQUENCE_TYPES.ITEM_GAINED,
      label: `Found: ${addItem.name || addItem.id}`,
      icon: "🎒",
      color: "hsl(200 65% 55%)",
      description: addItem.description || "New item added.",
      value: 1,
    });
  }

  // Item lost
  if (removeItem) {
    cards.push({
      type: CONSEQUENCE_TYPES.ITEM_LOST,
      label: `Lost: ${removeItem}`,
      icon: "🗑️",
      color: "hsl(40 90% 62%)",
      description: "Item removed from inventory.",
      value: -1,
    });
  }

  // Injury
  if (injuredMemberId) {
    const member = party.find(m => m.id === injuredMemberId);
    if (member) {
      cards.push({
        type: CONSEQUENCE_TYPES.INJURY,
        label: `${member.name?.split(" ")[0]} is injured`,
        icon: "🩸",
        color: "hsl(351 78% 60%)",
        description: "Their survival is now more at risk.",
        value: -1,
        memberId: injuredMemberId,
      });
    }
  }

  return cards;
}

/**
 * Determine dialogue tone shift based on consequence severity.
 * Used to alter how NPCs speak after major events.
 */
export function getDialogueToneShift(cards = []) {
  const hasDeathCard = cards.some(c => c.type === CONSEQUENCE_TYPES.INJURY && c.value < -5);
  const hasTrustCrash = cards.some(c => c.type === CONSEQUENCE_TYPES.TRUST_CHANGE && c.value <= -3);
  const hasFearSpike = cards.some(c => c.type === CONSEQUENCE_TYPES.FEAR_CHANGE && c.value >= 15);
  const hasCohesionCrash = cards.some(c => c.type === CONSEQUENCE_TYPES.COHESION_CHANGE && c.value <= -15);

  if (hasDeathCard || hasCohesionCrash) return "hostile";
  if (hasTrustCrash || hasFearSpike)   return "suspicious";
  return "neutral";
}

/**
 * Temporary modifier text — shown on the event card briefly after a consequence.
 * e.g. "+NOISE TRAIL", "-COHESION", "ISOLATED"
 */
export function getConsequenceTags(result = {}) {
  const tags = [];
  if (result.noiseMade)          tags.push("NOISE TRAIL");
  if (result.playerAlone)        tags.push("ISOLATED");
  if (result.fearChange > 10)    tags.push("FEAR ↑↑");
  if (result.cohesionDelta < -10) tags.push("COHESION ↓");
  if (result.trustEffects && Object.values(result.trustEffects).some(v => v <= -2)) tags.push("TRUST DAMAGED");
  if (result.injuredMemberId)    tags.push("MEMBER INJURED");
  if (result.addItem)            tags.push("ITEM FOUND");
  return tags;
}