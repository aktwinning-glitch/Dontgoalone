// Milestone + Survival system
// Every MILESTONE_INTERVAL choices, evaluate team survival score

export const MILESTONE_INTERVAL = 5; // choices between milestones

/**
 * Calculate team survival score.
 * @param {object} player
 * @param {Array} party
 */
export function calcTeamScore(player, party) {
  const stats = player?.stats || {};
  const statSum = (stats.strength || 0) + (stats.speed || 0) + (stats.resilience || 0)
    + (stats.intelligence || 0) + (stats.charm || 0);

  // Balance bonus: reward spread > single-stat builds
  const vals = [stats.strength, stats.speed, stats.resilience, stats.intelligence, stats.charm].filter(Boolean);
  const avg = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
  const variance = vals.reduce((a, b) => a + Math.abs(b - avg), 0) / (vals.length || 1);
  const balanceBonus = variance < 1.5 ? 10 : 0;

  const fearPenalty = Math.floor((player?.stats?.fear || 0) / 10) * 3;

  const aliveCount = party?.filter(m => m.isAlive && !m.isMissing).length ?? 1;

  return Math.max(0, statSum + balanceBonus - fearPenalty + aliveCount * 2);
}

export const MILESTONE_PASS_THRESHOLD = 28;

/**
 * Determine which member is weakest (most at-risk for removal).
 * Weakest = lowest resilience + highest fear + recent negative events.
 */
export function getWeakestMember(party) {
  const candidates = party?.filter(m => m.isAlive && !m.isMissing && !m.isPlayer) || [];
  if (!candidates.length) return null;

  return candidates.reduce((worst, m) => {
    const score = (m.resilience || 5) - (m.fearLevel || 0) / 10;
    const worstScore = (worst.resilience || 5) - (worst.fearLevel || 0) / 10;
    return score < worstScore ? m : worst;
  });
}

/**
 * Find a Devoted member willing to sacrifice.
 */
export function findDevotedSacrifice(party, getLoyaltyState) {
  return party?.find(m =>
    m.isAlive && !m.isMissing && !m.isPlayer && getLoyaltyState(m.trustWithPlayer) === "Devoted"
  ) || null;
}

/**
 * Check if any Hostile member should trigger betrayal (5% chance per event when hostile).
 */
export function checkBetrayalTrigger(party, getLoyaltyState) {
  const hostile = party?.filter(m =>
    m.isAlive && !m.isMissing && !m.isPlayer && getLoyaltyState(m.trustWithPlayer) === "Hostile"
  ) || [];
  if (!hostile.length) return null;
  if (Math.random() < 0.08) return hostile[Math.floor(Math.random() * hostile.length)];
  return null;
}

export function getMilestoneLabel(choiceCount) {
  const ms = Math.floor(choiceCount / MILESTONE_INTERVAL);
  if (ms === 0) return "Beginning";
  if (ms === 1) return "First Signs";
  if (ms === 2) return "Escalating";
  if (ms === 3) return "Critical";
  return "Final Hour";
}