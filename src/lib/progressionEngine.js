export const LEGACY_REWARD_RULES = Object.freeze({
  baseRun: 50,
  survivor: 25,
  cleanEscape: 150,
  mixedEscape: 75,
  clue: 20,
  objective: 40,
  firstEnding: 100,
});

export const STARTER_TRAITS = Object.freeze([
  {
    id: "quiet_steps",
    name: "Quiet Steps",
    description: "Noise consequences are reduced when moving or searching.",
    rarity: "common",
  },
  {
    id: "protective_instinct",
    name: "Protective Instinct",
    description: "Gain an advantage when defending another survivor.",
    rarity: "common",
  },
  {
    id: "read_the_room",
    name: "Read the Room",
    description: "Relationship and suspicion changes become easier to detect.",
    rarity: "uncommon",
  },
  {
    id: "steady_hands",
    name: "Steady Hands",
    description: "Fear has less impact on precise or medical actions.",
    rarity: "uncommon",
  },
]);

export function calculateLegacyReward({
  endingType,
  survivors = 0,
  discoveredClues = [],
  completedObjectives = 0,
  isNewEnding = false,
} = {}) {
  let total = LEGACY_REWARD_RULES.baseRun;
  total += Math.max(0, survivors) * LEGACY_REWARD_RULES.survivor;
  total += Math.max(0, discoveredClues.length) * LEGACY_REWARD_RULES.clue;
  total += Math.max(0, completedObjectives) * LEGACY_REWARD_RULES.objective;

  if (endingType === "good") total += LEGACY_REWARD_RULES.cleanEscape;
  else if (endingType === "mixed") total += LEGACY_REWARD_RULES.mixedEscape;

  if (isNewEnding) total += LEGACY_REWARD_RULES.firstEnding;
  return total;
}

export function buildRunLegacyResult({
  player,
  party = [],
  endingType = "mixed",
  discoveredClues = [],
  objectiveState = {},
  existingEndingIds = [],
} = {}) {
  const survivors = party.filter(member => member.isAlive && !member.isMissing);
  const completedObjectives = Object.values(objectiveState).filter(objective => objective?.completed).length;
  const endingId = `${player?.storyId || "unknown"}:${endingType}`;
  const isNewEnding = !existingEndingIds.includes(endingId);

  return {
    legacyEarned: calculateLegacyReward({
      endingType,
      survivors: survivors.length,
      discoveredClues,
      completedObjectives,
      isNewEnding,
    }),
    endingId,
    isNewEnding,
    survivorRecords: survivors.map(member => ({
      characterId: member.id,
      characterName: member.name,
      status: member.isInjured ? "injured" : "survived",
    })),
    clueIds: discoveredClues.map(clue => clue.id),
    completedObjectives,
  };
}

export function chooseTraitOffers(unlockedTraitIds = [], count = 3, random = Math.random) {
  const available = STARTER_TRAITS.filter(trait => !unlockedTraitIds.includes(trait.id));
  const pool = available.length >= count ? available : STARTER_TRAITS;
  return [...pool]
    .sort(() => random() - 0.5)
    .slice(0, Math.min(count, pool.length));
}
