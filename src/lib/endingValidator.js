/**
 * Ending Validator
 * Ensures ending matches actual game state (survivors, deaths, story choices)
 */

export const validateEndingType = (player, party) => {
  if (!player || !party) return "bad";

  const alive = party.filter(m => m.isAlive && !m.isMissing).length;
  const dead = party.filter(m => !m.isAlive || m.isMissing).length;
  const total = party.length;

  // Determine ending type based on survivor ratio + threat level
  const survivalRate = total > 0 ? alive / total : 0;
  const threatLevel = player.threat || 0;

  // Good: majority survived + low threat + achieved goals
  if (survivalRate >= 0.6 && threatLevel <= 60 && (player.flags?.truth_revealed || player.flags?.escaped)) {
    return "good";
  }

  // Bad: majority dead + high threat + killer won
  if (survivalRate <= 0.3 && threatLevel >= 80) {
    return "bad";
  }

  // Mixed: somewhere in between
  return "mixed";
};

/**
 * Generate ending text based on actual game state
 */
export const generateEndingSummary = (player, party) => {
  if (!player || !party) return "The run ended.";

  const alive = party.filter(m => m.isAlive && !m.isMissing);
  const dead = party.filter(m => !m.isAlive || m.isMissing);
  const total = party.length;

  const endingType = validateEndingType(player, party);

  // Good ending narrative
  if (endingType === "good") {
    return `${alive.length} of ${total} survived. You made it out. Some prices can't be repaid, but you're alive.`;
  }

  // Bad ending narrative
  if (endingType === "bad") {
    if (alive.length === 0) {
      return "You didn't make it. None of you did.";
    }
    return `Only ${alive.length} made it out. The cost was too high.`;
  }

  // Mixed ending narrative
  return `${alive.length} survived. The victory tastes hollow knowing who didn't make it.`;
};

/**
 * Ensure ending card displays correct data
 */
export const validateEndingData = (endingEvent, player, party) => {
  if (!endingEvent) return null;

  const alive = party.filter(m => m.isAlive && !m.isMissing).length;
  const dead = party.filter(m => !m.isAlive || m.isMissing).length;
  const total = party.length;
  const endingType = validateEndingType(player, party);

  return {
    ...endingEvent,
    ending_type: endingType,
    survivorCount: alive,
    deadCount: dead,
    totalParty: total,
    ending_text: generateEndingSummary(player, party),
  };
};