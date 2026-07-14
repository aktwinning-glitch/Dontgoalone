export const LEGACY_REWARD_RULES = Object.freeze({
  baseRun: 50,
  survivor: 25,
  cleanEscape: 150,
  mixedEscape: 75,
  clue: 20,
  objective: 40,
  firstEnding: 100,
  challenge: 100,
});

export const STARTER_TRAITS = Object.freeze([
  { id: "quiet_steps", name: "Quiet Steps", description: "Noise consequences are reduced when moving or searching.", rarity: "common" },
  { id: "protective_instinct", name: "Protective Instinct", description: "Gain an advantage when defending another survivor.", rarity: "common" },
  { id: "read_the_room", name: "Read the Room", description: "Relationship and suspicion changes become easier to detect.", rarity: "uncommon" },
  { id: "steady_hands", name: "Steady Hands", description: "Fear has less impact on precise or medical actions.", rarity: "uncommon" },
  { id: "sharp_memory", name: "Sharp Memory", description: "Clue and callback events are easier to recognize.", rarity: "uncommon" },
  { id: "group_leader", name: "Group Leader", description: "Cohesion losses are softened while at least three people remain together.", rarity: "rare" },
  { id: "cold_blooded", name: "Cold-Blooded", description: "High fear no longer automatically replaces your final choice.", rarity: "rare" },
  { id: "improviser", name: "Improviser", description: "Found items provide a larger stat bonus during risky actions.", rarity: "rare" },
]);

export const DEFAULT_OBJECTIVES = Object.freeze([
  { id: "personal_survive", type: "personal", title: "Make It Out", description: "Keep your chosen survivor alive until the ending." },
  { id: "group_three", type: "group", title: "No One Gets Left Behind", description: "Finish with at least three survivors." },
  { id: "discovery_clues", type: "discovery", title: "Piece It Together", description: "Discover at least two clues during the run." },
]);

export const CHALLENGES = Object.freeze([
  { id: "no_one_left", title: "No One Gets Left Behind", description: "Escape with every party member alive and present.", reward: 150, modifiers: ["protect_everyone"] },
  { id: "lights_out", title: "Lights Out", description: "Fear rises faster and item advantages are reduced.", reward: 125, modifiers: ["lights_out", "fear_plus"] },
  { id: "nobody_trusted", title: "Nobody Can Be Trusted", description: "Suspicion and relationship damage are amplified.", reward: 125, modifiers: ["hidden_suspicion", "trust_fragile"] },
  { id: "quiet_night", title: "Quiet Night", description: "Three noisy decisions fail the challenge.", reward: 140, modifiers: ["noise_limit_3"] },
  { id: "one_hour", title: "One Hour Until Dawn", description: "Reach an ending in twenty choices or fewer.", reward: 160, modifiers: ["turn_limit_20"] },
]);

export function calculateLegacyReward({ endingType, survivors = 0, discoveredClues = [], completedObjectives = 0, isNewEnding = false, challengeCompleted = false } = {}) {
  let total = LEGACY_REWARD_RULES.baseRun;
  total += Math.max(0, survivors) * LEGACY_REWARD_RULES.survivor;
  total += Math.max(0, discoveredClues.length) * LEGACY_REWARD_RULES.clue;
  total += Math.max(0, completedObjectives) * LEGACY_REWARD_RULES.objective;
  if (endingType === "good") total += LEGACY_REWARD_RULES.cleanEscape;
  else if (endingType === "mixed") total += LEGACY_REWARD_RULES.mixedEscape;
  if (isNewEnding) total += LEGACY_REWARD_RULES.firstEnding;
  if (challengeCompleted) total += LEGACY_REWARD_RULES.challenge;
  return total;
}

export function buildObjectiveState(player, party = [], discoveredClues = [], existing = {}) {
  const playerMember = party.find(member => member.isPlayer);
  const survivors = party.filter(member => member.isAlive && !member.isMissing).length;
  return DEFAULT_OBJECTIVES.reduce((acc, objective) => {
    let progress = 0;
    let target = 1;
    let completed = false;
    if (objective.id === "personal_survive") {
      progress = playerMember?.isAlive && !playerMember?.isMissing ? 1 : 0;
      completed = progress === 1;
    } else if (objective.id === "group_three") {
      progress = survivors;
      target = Math.min(3, Math.max(1, party.length));
      completed = progress >= target;
    } else if (objective.id === "discovery_clues") {
      progress = discoveredClues.length;
      target = 2;
      completed = progress >= target;
    }
    acc[objective.id] = { ...objective, ...(existing[objective.id] || {}), progress, target, completed };
    return acc;
  }, {});
}

export function evaluateChallenge(activeModifiers = [], { player, party = [], elapsedTurns = 0 } = {}) {
  if (!activeModifiers?.length) return { active: false, completed: false, failed: false };
  const survivors = party.filter(member => member.isAlive && !member.isMissing).length;
  const noise = Number(player?.flags?.noise_made || 0);
  let failed = false;
  if (activeModifiers.includes("protect_everyone") && survivors < party.length) failed = true;
  if (activeModifiers.includes("noise_limit_3") && noise >= 3) failed = true;
  if (activeModifiers.includes("turn_limit_20") && elapsedTurns > 20) failed = true;
  return { active: true, failed, completed: !failed };
}

export function buildRunLegacyResult({ player, party = [], endingType = "mixed", discoveredClues = [], objectiveState = {}, existingEndingIds = [], activeModifiers = [], elapsedTurns = 0 } = {}) {
  const survivors = party.filter(member => member.isAlive && !member.isMissing);
  const completedObjectives = Object.values(objectiveState).filter(objective => objective?.completed).length;
  const endingId = `${player?.storyId || "unknown"}:${endingType}`;
  const isNewEnding = !existingEndingIds.includes(endingId);
  const challenge = evaluateChallenge(activeModifiers, { player, party, elapsedTurns });
  return {
    legacyEarned: calculateLegacyReward({ endingType, survivors: survivors.length, discoveredClues, completedObjectives, isNewEnding, challengeCompleted: challenge.active && challenge.completed }),
    endingId,
    isNewEnding,
    challenge,
    survivorRecords: survivors.map(member => ({ characterId: member.id, characterName: member.name, status: member.isInjured ? "injured" : "survived", storyId: player?.storyId || "unknown", runsSurvived: 1 })),
    clueIds: discoveredClues.map(clue => clue.id),
    completedObjectives,
  };
}

export function chooseTraitOffers(unlockedTraitIds = [], count = 3, random = Math.random) {
  const available = STARTER_TRAITS.filter(trait => !unlockedTraitIds.includes(trait.id));
  const pool = available.length >= count ? available : STARTER_TRAITS;
  return [...pool].sort(() => random() - 0.5).slice(0, Math.min(count, pool.length));
}

export function seededShuffle(items = [], seed = "default") {
  let value = Array.from(String(seed)).reduce((sum, char) => sum + char.charCodeAt(0), 0) || 1;
  const random = () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
  return [...items].sort(() => random() - 0.5);
}

export function buildConsequenceExplanation({ success, fearChange = 0, threatChange = 0, consequenceTags = [], statChanges = {} } = {}) {
  const changes = [];
  Object.entries(statChanges || {}).forEach(([key, value]) => changes.push(`${key} ${value > 0 ? "+" : ""}${value}`));
  if (fearChange) changes.push(`Fear ${fearChange > 0 ? "+" : ""}${fearChange}`);
  if (threatChange) changes.push(`Threat ${threatChange > 0 ? "+" : ""}${threatChange}`);
  return {
    heading: success ? "The choice worked" : "The choice went wrong",
    why: success ? "Your approach held under pressure." : "The risk, fear, or current threat level worked against you.",
    changes,
    consequences: consequenceTags || [],
  };
}
