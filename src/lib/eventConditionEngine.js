/**
 * Event Condition Engine
 * Determines which events are valid to play based on runState.
 * Prevents dead ends and ensures narrative coherence.
 */

/**
 * Check if event's conditions match current runState
 */
export const checkEventConditions = (event, runState, party) => {
  if (!event.conditions) return true; // No conditions = always valid
  
  const cond = typeof event.conditions === "string" 
    ? JSON.parse(event.conditions) 
    : event.conditions;
  
  if (!cond) return true;
  
  // Require all specific flags
  if (cond.requiresFlags) {
    for (const flag of cond.requiresFlags) {
      if (!runState.flags[flag]) return false;
    }
  }
  
  // Exclude if any of these flags exist
  if (cond.excludesFlags) {
    for (const flag of cond.excludesFlags) {
      if (runState.flags[flag]) return false;
    }
  }
  
  // Require character alive
  if (cond.requiresCharacterAlive) {
    const dead = runState.deaths.some(d => d.characterId === cond.requiresCharacterAlive);
    if (dead) return false;
  }
  
  // Require character missing (for rescue events)
  if (cond.requiresCharacterMissing) {
    const missing = runState.missing.some(m => m.characterId === cond.requiresCharacterMissing);
    if (!missing) return false;
  }
  
  // Require minimum fear/threat threshold
  if (cond.minFear !== undefined && runState.totalFear < cond.minFear) return false;
  if (cond.maxFear !== undefined && runState.totalFear > cond.maxFear) return false;
  if (cond.minThreat !== undefined && runState.totalThreat < cond.minThreat) return false;
  if (cond.maxThreat !== undefined && runState.totalThreat > cond.maxThreat) return false;
  
  // Require clue found
  if (cond.requiresClue && !runState.discoveredClues.includes(cond.requiresClue)) return false;
  
  // Require item in inventory
  if (cond.requiresItem && !runState.inventory.some(i => i.id === cond.requiresItem)) return false;
  
  // Require specific location
  if (cond.requiresLocation && runState.locations?.player !== cond.requiresLocation) return false;
  
  // Require group split
  if (cond.requiresGroupSplit && runState.groupSplits.length === 0) return false;
  
  // Require at least N alive
  if (cond.minAliveCount !== undefined) {
    const alive = party?.filter(m => m.isAlive && !m.isMissing).length || 0;
    if (alive < cond.minAliveCount) return false;
  }
  
  // Require minimum choices made (for story progression)
  if (cond.minChoiceCount !== undefined && runState.choiceCount < cond.minChoiceCount) return false;
  
  return true;
};

/**
 * Find next valid event after player chooses.
 * Returns: { valid: true, eventId } or { valid: false, fallbackEventId }
 */
export const findNextEvent = (nextEventId, allEvents, runState, party) => {
  if (!nextEventId) return { valid: false, fallbackEventId: null };
  
  // Try exact match
  const nextEvent = allEvents.find(e => e.event_id === nextEventId);
  if (nextEvent && checkEventConditions(nextEvent, runState, party)) {
    return { valid: true, eventId: nextEventId };
  }
  
  // If exact match failed conditions, find fallback in same act
  if (nextEvent) {
    const actNum = parseInt(nextEvent.sort_order / 10);
    const fallback = allEvents.find(e => 
      Math.floor(e.sort_order / 10) === actNum &&
      e.event_id !== nextEventId &&
      checkEventConditions(e, runState, party)
    );
    if (fallback) {
      return { valid: false, fallbackEventId: fallback.event_id };
    }
  }
  
  // Last resort: find ANY valid event ahead
  const validEvent = allEvents.find(e => 
    e.sort_order > (nextEvent?.sort_order || 0) &&
    checkEventConditions(e, runState, party)
  );
  
  return { valid: false, fallbackEventId: validEvent?.event_id || null };
};

/**
 * Validate event chain — ensure no dead ends
 */
export const validateEventChain = (allEvents, storyId) => {
  const errors = [];
  const eventIds = new Set(allEvents.map(e => e.event_id));
  
  allEvents.forEach(event => {
    const choices = event.choices ? JSON.parse(event.choices) : [];
    choices.forEach(choice => {
      if (choice.nextEventId && !eventIds.has(choice.nextEventId)) {
        errors.push(`Event ${event.event_id}: choice references missing event ${choice.nextEventId}`);
      }
    });
  });
  
  return errors;
};