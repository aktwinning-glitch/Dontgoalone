/**
 * Consequence Engine
 * Handles: fear/threat tiers, automatic death triggers,
 * item-unlocked choice injection, run replayability seeding,
 * and psychological death flavour text.
 */

// ── Fear tiers ────────────────────────────────────────────────────────────────
export const FEAR_TIER = {
  CALM:     { id: "calm",     min: 0,  max: 30, label: "Calm",     dialogueMod: "dismissive" },
  TENSE:    { id: "tense",    min: 31, max: 60, label: "Tense",    dialogueMod: "rational"   },
  PANIC:    { id: "panic",    min: 61, max: 80, label: "Panicking", dialogueMod: "fear"       },
  BREAKING: { id: "breaking", min: 81, max: 100, label: "Breaking", dialogueMod: "fear"      },
};

export function getFearTier(fear) {
  if (fear <= 30) return FEAR_TIER.CALM;
  if (fear <= 60) return FEAR_TIER.TENSE;
  if (fear <= 80) return FEAR_TIER.PANIC;
  return FEAR_TIER.BREAKING;
}

// ── Threat tiers ──────────────────────────────────────────────────────────────
export const THREAT_TIER = {
  DISTANT:  { id: "distant",  min: 0,  max: 20, label: "Distant",  deathRisk: 0    },
  NEARBY:   { id: "nearby",   min: 21, max: 50, label: "Nearby",   deathRisk: 0.06 },
  HUNTING:  { id: "hunting",  min: 51, max: 80, label: "Hunting",  deathRisk: 0.22 },
  IMMINENT: { id: "imminent", min: 81, max: 100, label: "Imminent", deathRisk: 0.42 },
};

// ── High-risk locations ───────────────────────────────────────────────────────
export const HIGH_RISK_LOCATIONS = new Set(["woods", "basement"]);
export const MODERATE_RISK_LOCATIONS = new Set(["porch", "upstairs"]);

// ── Member vulnerability score (0–100) ───────────────────────────────────────
/**
 * Higher = more likely to die next.
 * Factors: isolation, fear, trust, injury, location, targeting.
 */
export function computeMemberVulnerability(member, player) {
  if (!member || !member.isAlive || member.isMissing) return 0;
  let score = 0;

  // Isolation is the #1 killer
  if (member.hiddenFlags?.separatedFromGroup) score += 35;
  if (HIGH_RISK_LOCATIONS.has(member.currentLocation)) score += 20;
  else if (MODERATE_RISK_LOCATIONS.has(member.currentLocation)) score += 10;

  // Fear state
  if (member.fearLevel > 80) score += 20;
  else if (member.fearLevel > 60) score += 12;
  else if (member.fearLevel > 40) score += 5;

  // Trust — low trust means player won't help them
  if (member.trustWithPlayer < 3) score += 15;
  else if (member.trustWithPlayer < 5) score += 7;

  // Already injured doubles danger
  if (member.isInjured) score += 18;

  // Explicitly targeted by threat
  if (member.hiddenFlags?.targetedByThreat) score += 20;

  // Panicking
  if (member.hiddenFlags?.panicking) score += 10;

  // Player's threat level pushes everyone's risk
  if (player?.threat >= 80) score += 10;
  else if (player?.threat >= 50) score += 5;

  return Math.min(100, score);
}

/** Returns a danger label + color for UI display */
export function getDangerLevel(member, player) {
  const v = computeMemberVulnerability(member, player);
  if (v >= 65) return { label: "Critical", color: "hsl(351 78% 62%)", bg: "hsl(351 78% 62% / 0.15)", icon: "💀" };
  if (v >= 40) return { label: "At Risk",  color: "hsl(18 75% 62%)",  bg: "hsl(18 75% 62% / 0.12)",  icon: "⚠️" };
  if (v >= 20) return { label: "Watched",  color: "hsl(40 90% 62%)",  bg: "hsl(40 90% 62% / 0.10)",  icon: "👁" };
  return { label: "Safe", color: "hsl(123 68% 55%)", bg: "hsl(123 68% 55% / 0.08)", icon: "" };
}

export function getThreatTier(threat) {
  if (threat <= 20) return THREAT_TIER.DISTANT;
  if (threat <= 50) return THREAT_TIER.NEARBY;
  if (threat <= 80) return THREAT_TIER.HUNTING;
  return THREAT_TIER.IMMINENT;
}

// ── Psychological death texts ─────────────────────────────────────────────────
// Non-gory, vivid, psychological — per trigger scenario
const DEATH_TEXTS = {
  isolation: [
    "{name} went to check — just for a second. The door stayed open. They didn't come back.",
    "{name} said they'd be right behind you. They weren't.",
    "You called for {name}. The house answered instead.",
    "{name} laughed it off — until the sound behind them answered back.",
    "One moment {name} was there. Then the porch light went out.",
  ],
  high_threat: [
    "{name} saw something in the window. Whatever it was, it saw them first.",
    "The footsteps went quiet right when {name} stopped moving.",
    "{name} didn't scream. That's the part you can't get past.",
    "Whatever followed you here — it found {name} first.",
    "{name} was holding the door. They let go.",
  ],
  bad_choice: [
    "{name} trusted the wrong person. It cost them everything.",
    "The decision made sense at the time. {name} paid for it.",
    "You made the call. {name} is the reason you have to live with it.",
    "{name} took the risk so you wouldn't have to.",
    "Wrong room. Wrong moment. Wrong night. {name} learned all three at once.",
  ],
  fear_collapse: [
    "{name}'s fear became a door. Something walked through it.",
    "The panic took {name} somewhere you couldn't follow.",
    "{name} froze when the lights went out. They were still frozen when you found the courage to look.",
    "Fear does something to people. You watched it happen to {name}.",
    "{name} stopped running. That's when you heard it stop running too.",
  ],
};

export function getDeathText(scenario, memberName) {
  const pool = DEATH_TEXTS[scenario] || DEATH_TEXTS.isolation;
  const raw = pool[Math.floor(Math.random() * pool.length)];
  return raw.replace(/\{name\}/g, memberName?.split(" ")[0] || "them");
}

// ── Death trigger check ───────────────────────────────────────────────────────
/**
 * After a choice, check if any party member should die.
 *
 * HARD RULES:
 * 1. Group together → death probability = 0% (ABSOLUTE — no exceptions)
 * 2. Death only fires when ALL of:
 *    a. Member is isolated/separated OR explicitly targeted
 *    b. Choice failed
 *    c. Danger is explicitly allowed (choice.dangerAllowed or event.death_allowed)
 *    d. Current act allows death
 *    e. Victim vulnerability >= 40
 * 3. Being alone in high-risk location alone is NOT enough — they must be isolated from group
 * 4. Successful choices never trigger passive deaths
 * 5. Max 5 deaths per run
 *
 * Called AFTER state updates, using the new nextParty state.
 */
export function checkDeathTrigger({
  party = [],
  player,
  choiceSuccess,
  currentDeathCount = 0,
  currentEvent,
  choice,
  dangerAllowed = false,
  choiceCount = 0,
  isGrouped = false,
}) {
  if (!party || party.length === 0) return null;
  if (currentDeathCount >= 5) return null;

  // Successful choices never trigger passive deaths
  if (choiceSuccess) return null;

  // ── RULE 0 (ABSOLUTE): Group together = zero passive death ────────────
  if (isGrouped || isGroupedTogetherFn(party)) return null;

  // Danger must be explicitly allowed
  if (!dangerAllowed && !choice?.dangerAllowed && !currentEvent?.death_allowed) return null;

  // Act pacing: Act 1-2 do not allow passive deaths
  const act = getActFromChoiceCountSimple(choiceCount);
  if (act < 3 && !currentEvent?.death_allowed) return null;

  const threatTier = getThreatTier(player.threat);
  const fearTier = getFearTier(player.stats.fear);

  const candidates = party.filter(m => m.isAlive && !m.isMissing && !m.isPlayer);
  if (!candidates.length) return null;

  const scored = candidates.map(m => ({
    member: m,
    vulnerability: computeMemberVulnerability(m, player),
  })).sort((a, b) => b.vulnerability - a.vulnerability);

  const victim = scored[0].member;
  const topVulnerability = scored[0].vulnerability;

  // ── RULE 1: Must be isolated OR explicitly targeted ────────────────────
  const isIsolated = victim.hiddenFlags?.separatedFromGroup === true;
  const isTargeted = victim.hiddenFlags?.targetedByThreat === true;

  if (!isIsolated && !isTargeted) return null;

  // ── RULE 2: Minimum vulnerability threshold ────────────────────────────
  if (topVulnerability < 40) return null;

  // ── RULE 3: Calculate death chance ─────────────────────────────────────
  let deathChance = threatTier.deathRisk;

  if (fearTier.id === "breaking") deathChance += 0.12;
  else if (fearTier.id === "panic") deathChance += 0.06;

  if (isIsolated) deathChance += 0.15;
  if (isTargeted) deathChance += 0.12;
  if (victim.isInjured) deathChance += 0.10;

  const highRiskLoc = HIGH_RISK_LOCATIONS.has(victim.currentLocation);
  if (highRiskLoc && isIsolated) deathChance += 0.10; // only matters when alone

  const vulnerabilityBonus = (topVulnerability / 100) * 0.25;
  const finalChance = Math.min(0.65, deathChance + vulnerabilityBonus);

  if (Math.random() > finalChance) return null;

  // Determine death scenario
  let scenario = "bad_choice";
  if (isIsolated) scenario = "isolation";
  else if (threatTier.id === "imminent") scenario = "high_threat";
  else if (fearTier.id === "breaking") scenario = "fear_collapse";

  return {
    memberId: victim.id,
    memberName: victim.name,
    deathText: getDeathText(scenario, victim.name),
    scenario,
    vulnerability: topVulnerability,
  };
}

// Internal grouping check (inline to avoid circular import)
function isGroupedTogetherFn(party) {
  const active = party.filter(m => m.isAlive && !m.isMissing);
  if (active.length <= 1) return true;
  const loc = active[0].currentLocation || "living";
  return active.every(m => (m.currentLocation || "living") === loc);
}

function getActFromChoiceCountSimple(count) {
  if (count <= 12) return 1;
  if (count <= 22) return 2;
  if (count <= 34) return 3;
  if (count <= 48) return 4;
  return 5;
}

// ── Ending type computation ───────────────────────────────────────────────────
/**
 * Determines the narrative ending type based on run outcome.
 * Returns: "group_survival" | "partial_survival" | "solo_survival" | "total_loss"
 */
export function computeEndingType(party, player, isGoodEnding) {
  if (!party || party.length === 0) return isGoodEnding ? "solo_survival" : "total_loss";

  const total = party.length;
  const aliveCount = party.filter(m => m.isAlive && !m.isMissing).length;
  const playerAlive = party.find(m => m.isPlayer)?.isAlive ?? true;

  if (!playerAlive && aliveCount === 0) return "total_loss";
  if (!playerAlive) return "total_loss"; // player death = total loss
  if (aliveCount >= total * 0.75) return "group_survival";
  if (aliveCount >= 2) return "partial_survival";
  if (aliveCount === 1 && playerAlive) return "solo_survival";
  return "total_loss";
}

export const ENDING_TYPE_CONFIG = {
  group_survival: {
    label: "Group Survived",
    emoji: "🌅",
    color: "hsl(123 68% 60%)",
    rarity: "RARE",
    narration: "Everyone made it. Against every odd. Don't ask how — just run.",
  },
  partial_survival: {
    label: "Some Survived",
    emoji: "🌫️",
    color: "hsl(40 90% 62%)",
    rarity: "COMMON",
    narration: "Not everyone got out. You'll carry that. But you're alive to carry it.",
  },
  solo_survival: {
    label: "Alone",
    emoji: "🕯️",
    color: "hsl(271 87% 68%)",
    rarity: "UNCOMMON",
    narration: "You got out. No one else did. The silence at the end is the worst part.",
  },
  total_loss: {
    label: "Total Loss",
    emoji: "💀",
    color: "hsl(351 78% 62%)",
    rarity: "BRUTAL",
    narration: "Some nights, no one gets out. This was one of those nights.",
  },
};

// ── Item-unlocked choice injection ───────────────────────────────────────────
/**
 * Given a parsed choices array and the player's inventory + flags,
 * inject additional item-gated choices where relevant.
 * Returns the augmented choices array.
 */
const ITEM_CHOICES = {
  rusted_key: {
    text: "Use the rusted key — there's a lock here that might matter.",
    statUsed: "intelligence",
    difficulty: 1,
    requiresFlag: null,
    successEffect: {
      outcomeText: "The lock gives. Behind it: something that reframes everything you thought you understood.",
      flagsAdded: { key_used: true, secret_room_opened: true },
      fearChange: 5,
      threatChange: -5,
    },
    failEffect: {
      outcomeText: "Wrong lock. The key snaps. Whatever's behind that door stays there.",
      flagsAdded: { key_used: true },
      fearChange: 4,
    },
  },
  torn_map: {
    text: "Check the map fragment — there's a structure marked here.",
    statUsed: "intelligence",
    difficulty: 1,
    requiresFlag: null,
    successEffect: {
      outcomeText: "The secondary structure is real. And something is coming from that direction.",
      flagsAdded: { map_used: true, secondary_structure_known: true },
      threatChange: -8,
    },
    failEffect: {
      outcomeText: "The scale's off. You've wasted precious seconds.",
      flagsAdded: { map_used: true },
      fearChange: 3,
    },
  },
  matchbook: {
    text: "Light a match — buy yourself a few seconds of visibility.",
    statUsed: "resilience",
    difficulty: 1,
    requiresFlag: null,
    successEffect: {
      outcomeText: "The flame holds long enough. You see what's there. You wish you hadn't.",
      flagsAdded: { fire_used: true },
      fearChange: 6,
      threatChange: 3,
    },
    failEffect: {
      outcomeText: "Match dies immediately. Now whatever's here knows you're afraid of the dark.",
      fearChange: 10,
      flagsAdded: { fire_used: true, noise_made: 1 },
    },
  },
  kitchen_knife: {
    text: "Hold your ground with the knife — make it know you're not easy.",
    statUsed: "strength",
    difficulty: 2,
    requiresFlag: null,
    successEffect: {
      outcomeText: "Something retreats. It's not afraid of you — it's calculating. That's almost worse.",
      flagsAdded: { held_ground: true },
      threatChange: -10,
      fearChange: -5,
    },
    failEffect: {
      outcomeText: "The knife doesn't matter. Whatever this is, it's not impressed.",
      fearChange: 12,
      threatChange: 5,
    },
  },
  basement_card: {
    text: "Use the access card — the lower level might have answers.",
    statUsed: "intelligence",
    difficulty: 2,
    requiresFlag: null,
    successEffect: {
      outcomeText: "The card works. The basement holds something that confirms your worst theory.",
      flagsAdded: { basement_entered: true, old_secret_revealed: true },
      fearChange: 8,
      threatChange: -5,
    },
    failEffect: {
      outcomeText: "The reader beeps wrong. Someone changed the code. That means someone is still here.",
      fearChange: 10,
      threatChange: 8,
      flagsAdded: { basement_entered: false },
    },
  },
};

export function injectItemChoices(choices, player) {
  const inventory = player?.inventory || [];
  const flags = player?.flags || {};
  const injected = [...choices];

  for (const item of inventory) {
    const itemId = item.id || item;
    const itemChoice = ITEM_CHOICES[itemId];
    if (!itemChoice) continue;
    // Don't inject if already used
    if (flags[itemId + "_used"] || flags.key_used && itemId === "rusted_key") continue;
    // Don't inject if already at 4 choices
    if (injected.length >= 4) break;
    injected.push({
      ...itemChoice,
      _isItemChoice: true,
      _itemId: itemId,
    });
  }

  return injected;
}

// ── Run variant / replayability seed ─────────────────────────────────────────
/**
 * Generate a run variant that makes each playthrough feel different.
 * Randomizes: killer motivation, clue order shuffle, opening event variant.
 */
export function generateRunVariant(party = []) {
  const seed = Math.floor(Math.random() * 10000);

  // Seeded pseudo-random using seed
  const seeded = (n) => ((seed * 9301 + 49297) % 233280) / 233280 * n;

  // Killer motivation flavour
  const killerMotivations = ["revenge", "protection", "obsession", "accident", "ritual"];
  const motivation = killerMotivations[Math.floor(seeded(killerMotivations.length))];

  // Clue slots — 3 out of 5 clue items are randomly available this run
  const cluePool = ["rusted_key", "torn_map", "voice_recorder", "crossed_notebook", "old_polaroid"];
  const shuffled = [...cluePool].sort(() => seeded(1) - 0.5);
  const activeClues = shuffled.slice(0, 3);

  // Event path variant: small offset in which events appear first
  const pathVariant = Math.floor(seeded(3)); // 0, 1, or 2

  return {
    seed,
    killerMotivation: motivation,
    activeClues,
    pathVariant,
  };
}

// ── Event navigation validation ───────────────────────────────────────────────
/**
 * Validate a target event ID before advancing.
 * Returns { valid: bool, fallbackId: string|null, reason: string }
 */
export function validateEventNavigation(events, targetId, currentEvent) {
  if (!targetId) {
    const currentIdx = events.findIndex(e => e.event_id === currentEvent?.event_id);
    const next = events[currentIdx + 1];
    if (next) return { valid: true, fallbackId: next.event_id, reason: "sequential" };
    return { valid: false, fallbackId: null, reason: "end_of_events" };
  }

  const found = events.find(e => e.event_id === targetId);
  if (found) return { valid: true, fallbackId: targetId, reason: "direct" };

  // Fallback: next sequential
  console.warn(`[EventEngine] Target event "${targetId}" not found — falling back to sequential.`);
  const currentIdx = events.findIndex(e => e.event_id === currentEvent?.event_id);
  const next = events[currentIdx + 1];
  if (next) return { valid: true, fallbackId: next.event_id, reason: "fallback_sequential" };

  // Last resort: any event with no conditions
  const unconditional = events.find(e => !e.conditions || e.conditions === "null");
  if (unconditional) return { valid: true, fallbackId: unconditional.event_id, reason: "fallback_unconditional" };

  console.error(`[EventEngine] No valid next event found from "${currentEvent?.event_id}". Run will end.`);
  return { valid: false, fallbackId: null, reason: "no_events_left" };
}