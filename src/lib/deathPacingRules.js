/**
 * Death Pacing Rules
 *
 * Story-first death pipeline: setup → separation → warning → consequence → reaction → state sync
 *
 * Hard rules:
 * - Group together = no passive death
 * - Act 1: no deaths
 * - Act 2: missing/injury only
 * - Act 3: first possible death
 * - Act 4: highest danger
 * - Act 5: endings
 */

const ACT_DEATH_RULES = {
  1: { maxOutcome: "injury", label: "Act 1 — Arrival", deathAllowed: false },
  2: { maxOutcome: "missing", label: "Act 2 — Settling In", deathAllowed: false },
  3: { maxOutcome: "death", label: "Act 3 — First Signs", deathAllowed: true },
  4: { maxOutcome: "death", label: "Act 4 — Escalation", deathAllowed: true },
  5: { maxOutcome: "death", label: "Act 5 — Endgame", deathAllowed: true },
};

/**
 * Determine current act from choiceCount.
 * Approximate mapping — events can override.
 */
export function getActFromChoiceCount(choiceCount) {
  if (choiceCount <= 12) return 1;    // Arrival / setup
  if (choiceCount <= 22) return 2;    // Settling in
  if (choiceCount <= 34) return 3;    // First danger
  if (choiceCount <= 48) return 4;    // Escalation
  return 5;                           // Endgame
}

/**
 * Get death pacing rules for current act.
 */
export function getActDeathRules(choiceCount) {
  const act = getActFromChoiceCount(choiceCount);
  return ACT_DEATH_RULES[act] || ACT_DEATH_RULES[5];
}

/**
 * Check if passive death is allowed in current context.
 * Death requires ALL of:
 * - current act allows death
 * - event or choice explicitly allows death/danger
 * - member is isolated or explicitly targeted
 * - group is NOT together
 */
export function isPassiveDeathAllowed({
  choiceCount,
  currentEvent,
  choice,
  party,
  isGroupedTogether,
}) {
  // Act check
  const actRules = getActDeathRules(choiceCount);
  if (!actRules.deathAllowed) return false;

  // Event/choice must allow death
  const eventAllows = currentEvent?.death_allowed === true;
  const choiceAllows = choice?.dangerAllowed === true;

  if (!eventAllows && !choiceAllows) return false;

  // Group must be split for ANY death to occur
  if (isGroupedTogether) return false;

  return true;
}

/**
 * Determine maximum allowed outcome severity for current context.
 * Returns: "safe" | "injury" | "missing" | "death"
 */
export function getMaxOutcomeSeverity({
  choiceCount,
  currentEvent,
  choice,
}) {
  // If event or choice explicitly allows death, use that
  if (currentEvent?.max_outcome_severity && currentEvent.max_outcome_severity !== "safe") {
    return currentEvent.max_outcome_severity;
  }

  const actRules = getActDeathRules(choiceCount);
  if (currentEvent?.death_allowed || choice?.dangerAllowed) {
    return actRules.maxOutcome;
  }

  // Cap at act-appropriate outcome
  return actRules.maxOutcome === "death" ? "missing" : actRules.maxOutcome;
}

export default ACT_DEATH_RULES;