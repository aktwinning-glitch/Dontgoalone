// Core game mechanics engine
import { checkItemRequirements } from "./itemRequirements";

// ── Threat passive escalation ────────────────────────────────────────────────
// Called after every choice. Tuned for a slasher experience:
// threat ALWAYS escalates over time, player can only slow it — never stop it.
export function passiveThreatUpdate(player, choiceSuccess, choice) {
  let delta = 0;

  // Base: threat always ticks up — the night gets worse
  delta += 1;

  // Fear bleeds heavily into threat
  if (player.stats.fear > 80) delta += 4;
  else if (player.stats.fear > 60) delta += 2;
  else if (player.stats.fear > 40) delta += 1;

  // Noise is lethal — aggressor homes in
  const noise = player.flags.noise_made;
  if (noise >= 2) delta += 6;
  else if (noise === true || noise >= 1) delta += 4;

  // Alone escalation — solo play is extremely dangerous
  const alone = player.flags.alone_count || 0;
  if (alone >= 3) delta += 7;
  else if (alone >= 2) delta += 4;
  else if (alone >= 1) delta += 2;

  // Panic spreads threat
  if (player.flags.panic_spread) delta += 3;

  // Object bound worsens everything
  if (player.flags.object_bound) delta += 3;

  // Group trust only slightly helps — safety is an illusion
  const trust = player.flags.group_trust || 0;
  if (trust >= 2) delta -= 2;
  else if (trust >= 1) delta -= 1;

  // Success slows it; failure accelerates it
  if (!choiceSuccess) delta += 3;
  else delta -= 1;

  // Threat can only go down via explicit effects, not passive — min delta 0
  return Math.max(0, delta);
}

// ── Threat-based difficulty modifier ─────────────────────────────────────────
export function getThreatDifficultyBonus(threat) {
  if (threat >= 81) return 1;   // +1 difficulty at imminent
  if (threat >= 51) return 0.5; // slight push at hunting
  return 0;
}

export function calculateFearPenalty(fear) {
  if (fear <= 20) return 0;
  if (fear <= 50) return 5;
  if (fear <= 80) return 10;
  return 20;
}

export function calculateSuccessChance(statValue, difficulty, fear, threat = 0) {
  const fearPenalty = calculateFearPenalty(fear);
  const threatBonus = getThreatDifficultyBonus(threat);
  const effectiveDifficulty = difficulty + threatBonus;
  const raw = 50 + (statValue * 5) - (effectiveDifficulty * 10) - fearPenalty;
  return Math.max(10, Math.min(90, raw));
}

export function rollSuccess(successChance) {
  return Math.random() * 100 < successChance;
}

export function getThreatLevel(threat) {
  if (threat <= 20) return { label: "Distant", level: 0 };
  if (threat <= 50) return { label: "Nearby", level: 1 };
  if (threat <= 80) return { label: "Hunting", level: 2 };
  return { label: "Imminent", level: 3 };
}

export function clampStat(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function applyEffects(player, effects) {
  if (!effects) return { ...player };
  const updated = {
    ...player,
    stats: { ...player.stats },
    flags: { ...player.flags },
    inventory: [...(player.inventory || [])],
  };

  if (effects.statChanges) {
    for (const [stat, delta] of Object.entries(effects.statChanges)) {
      if (stat === "fear") {
        updated.stats.fear = clampStat((updated.stats.fear || 0) + delta);
      } else if (updated.stats[stat] !== undefined) {
        updated.stats[stat] = clampStat(updated.stats[stat] + delta, 1, 20);
      }
    }
  }

  if (effects.fearChange !== undefined) {
    updated.stats.fear = clampStat(updated.stats.fear + effects.fearChange);
  }

  if (effects.threatChange !== undefined) {
    updated.threat = clampStat(updated.threat + effects.threatChange);
  }

  // Flag system: supports booleans AND counters
  if (effects.flagsAdded) {
    for (const [key, value] of Object.entries(effects.flagsAdded)) {
      if (typeof value === "number" && typeof updated.flags[key] === "number") {
        // Counter: increment
        updated.flags[key] = updated.flags[key] + value;
      } else {
        updated.flags[key] = value;
      }
    }
  }

  // Counter increments (explicit)
  if (effects.flagIncrements) {
    for (const [key, delta] of Object.entries(effects.flagIncrements)) {
      updated.flags[key] = (updated.flags[key] || 0) + delta;
    }
  }

  // Inventory items — max 3 cap
  if (effects.addItem) {
    const inv = updated.inventory;
    const alreadyHas = inv.find(i => i.id === effects.addItem.id);
    if (!alreadyHas && inv.length < 3) {
      updated.inventory.push(effects.addItem);
    } else if (!alreadyHas && inv.length >= 3) {
      // Inventory full — silently skip (game narration handles messaging)
      console.warn(`[Inventory] Full (3/3). Could not add item: ${effects.addItem.id}`);
    }
  }
  if (effects.removeItem) {
    updated.inventory = updated.inventory.filter(i => i.id !== effects.removeItem);
  }

  // Party risk flags — stored on player flags with prefix "party_risk_<memberId>_<flag>"
  // These are resolved by the party system externally; we store them as named flags here
  if (effects.partyRisk) {
    for (const [memberId, riskFlags] of Object.entries(effects.partyRisk)) {
      for (const [flag, value] of Object.entries(riskFlags)) {
        updated.flags[`party_risk_${memberId}_${flag}`] = value;
      }
    }
  }

  // Relationship memory updates
  if (effects.updateRelationship) {
    const { memberId, trustDelta, moment, betrayed } = effects.updateRelationship;
    const existing = updated.relationships[memberId] || { trust: 5, sharedMoments: [], betrayed: false };
    updated.relationships = {
      ...updated.relationships,
      [memberId]: {
        trust: Math.max(0, Math.min(10, existing.trust + (trustDelta || 0))),
        sharedMoments: moment
          ? [...existing.sharedMoments, moment].slice(-5)
          : existing.sharedMoments,
        betrayed: betrayed !== undefined ? betrayed : existing.betrayed,
      },
    };
  }

  // Track death count
  if (effects.incrementDeathCount) {
    updated.deathCount = (updated.deathCount || 0) + 1;
  }

  return updated;
}

export function shouldPanicReplace(fear) {
  return fear > 70;
}

export function shouldAutoSelect(fear) {
  return fear > 85 && Math.random() < 0.1;
}

export function checkConditions(conditions, player) {
  if (!conditions) return true;

  // Required flags (exact match or truthy)
  if (conditions.flags || conditions.requiredFlags) {
    const flagCheck = conditions.flags || conditions.requiredFlags;
    for (const [key, value] of Object.entries(flagCheck)) {
      if (value === true && !player.flags[key]) return false;
      if (value === false && player.flags[key]) return false;
      if (typeof value === "number" && (player.flags[key] || 0) < value) return false;
    }
  }

  // Excluded flags (must NOT be set)
  if (conditions.excludedFlags) {
    for (const key of conditions.excludedFlags) {
      if (player.flags[key]) return false;
    }
  }

  // Inventory checks
  if (conditions.hasItem) {
    const inv = player.inventory || [];
    if (!inv.find(i => i.id === conditions.hasItem)) return false;
  }

  if (conditions.minThreat !== undefined && player.threat < conditions.minThreat) return false;
  if (conditions.maxThreat !== undefined && player.threat > conditions.maxThreat) return false;
  if (conditions.minFear !== undefined && player.stats.fear < conditions.minFear) return false;
  if (conditions.maxFear !== undefined && player.stats.fear > conditions.maxFear) return false;

  if (conditions.minStat) {
    for (const [stat, min] of Object.entries(conditions.minStat)) {
      if ((player.stats[stat] || 0) < min) return false;
    }
  }

  return true;
}

// ── Tone modifier: returns a prefix based on threat/fear for event text ───────
export function getEventTonePrefix(threat, fear) {
  if (threat >= 81 || fear >= 85) return "imminent";
  if (threat >= 51 || fear >= 70) return "hunting";
  if (threat >= 21 || fear >= 40) return "nearby";
  return "distant";
}

// ── Panic choices pool ────────────────────────────────────────────────────────
export const PANIC_CHOICES = [
  { text: "Run without thinking.", statUsed: "speed", difficulty: 3 },
  { text: "Hide. Immediately. No plan.", statUsed: "resilience", difficulty: 3 },
  { text: "Push past someone to get away.", statUsed: "strength", difficulty: 2 },
];

export function getPanicChoice() {
  return PANIC_CHOICES[Math.floor(Math.random() * PANIC_CHOICES.length)];
}

// ── Item-based choice filtering ────────────────────────────────────────────────
// Injects item-gated choices and filters choices by item requirements
export function injectItemChoices(choices = [], player) {
  if (!player || !choices.length) return choices;
  // Choices with requiredItems get their availability checked in ChoiceButton
  // This function can be extended later to inject entirely new choices based on inventory
  return choices;
}

export function createInitialPlayer(character, runVariant = null) {
  return {
    characterId: character.id,
    characterName: character.name,
    portraitUrl: character.portrait_url,
    // storyId is always overridden by initPlayer(character, party, storyId) in GameContext
    // Default here must NOT be a legacy ID — use null so GameScreen picks first imported event
    storyId: null,
    stats: {
      strength: character.strength || 5,
      speed: character.speed || 5,
      resilience: character.resilience || 5,
      intelligence: character.intelligence || 5,
      fear: character.fear || 5,
      charm: character.charm || 5,
      influence: character.influence || 5,
    },
    threat: 10,
    flags: {
      alone_count: 0,
      group_trust: 0,
      noise_made: 0,
      panic_spread: false,
      object_taken: false,
      object_used: false,
      object_bound: false,
    },
    relationships: {},
    inventory: [],
    // currentEventId: null → GameScreen will pick the first imported event by sort_order
    // Never hardcode an event_id here — imported packages may use any naming convention
    currentEventId: null,
    night: 1,
    nightsSurvived: 0,
    choicesMade: 0,
    deathCount: 0,
    eventHistory: [],
    runVariant: runVariant || null,
  };
}