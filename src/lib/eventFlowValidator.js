/**
 * Event Flow Validator
 * Ensures every story has:
 * - Valid START event
 * - No dead-end events
 * - Complete choice chains
 * - Proper fallback paths
 */

import { checkEventConditions } from './eventConditionEngine';

/**
 * Find the START event for a story
 */
export const getStartEvent = (allEvents, storyId) => {
  // Priority: sort_order 1, then earliest non-ending event
  const sorted = allEvents
    .filter(e => !e.is_ending)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  return sorted.length > 0 ? sorted[0] : null;
};

/**
 * Find ALL valid next events from a choice
 */
export const getValidNextEvents = (nextEventId, allEvents, runState, party) => {
  if (!nextEventId) return [];
  
  const nextEvent = allEvents.find(e => e.event_id === nextEventId);
  if (!nextEvent) return [];

  
  if (checkEventConditions(nextEvent, runState, party)) {
    return [nextEvent];
  }
  
  // Fallback: same act events
  const actNum = Math.floor((nextEvent.sort_order || 0) / 10);
  const fallbacks = allEvents.filter(e =>
    Math.floor((e.sort_order || 0) / 10) === actNum &&
    e.event_id !== nextEventId &&
    checkEventConditions(e, runState, party)
  );
  
  return fallbacks.length > 0 ? fallbacks : [];
};

/**
 * Validate entire story event chain
 * Returns: { valid: bool, errors: [], warnings: [] }
 */
export const validateEventChain = (allEvents, storyId) => {
  const errors = [];
  const warnings = [];
  
  const eventMap = new Map(allEvents.map(e => [e.event_id, e]));
  const startEvent = getStartEvent(allEvents, storyId);
  
  // Check: has start event
  if (!startEvent) {
    errors.push(`Story ${storyId}: No valid START event found`);
    return { valid: false, errors, warnings };
  }
  
  // Check: all choice references exist
  allEvents.forEach(event => {
    const choices = event.choices ? JSON.parse(event.choices) : [];
    choices.forEach((choice, idx) => {
      if (choice.nextEventId && !eventMap.has(choice.nextEventId)) {
        errors.push(
          `Event ${event.event_id} choice ${idx}: references missing event "${choice.nextEventId}"`
        );
      }
    });
  });
  
  // Check: no isolated events (have incoming but no outgoing)
  const hasIncoming = new Set();
  allEvents.forEach(event => {
    const choices = event.choices ? JSON.parse(event.choices) : [];
    choices.forEach(choice => {
      if (choice.nextEventId) hasIncoming.add(choice.nextEventId);
    });
  });
  
  allEvents.forEach(event => {
    if (event.sort_order > 1 && !hasIncoming.has(event.event_id) && !event.is_ending) {
      warnings.push(`Event ${event.event_id}: unreachable (no choice points to it)`);
    }
  });
  
  // Check: ending events have is_ending flag
  const endingChoiceRefs = new Set();
  allEvents.forEach(event => {
    const choices = event.choices ? JSON.parse(event.choices) : [];
    choices.forEach(choice => {
      const target = eventMap.get(choice.nextEventId);
      if (target && target.is_ending && !choice.nextEventId.includes('_end')) {
        warnings.push(`Event ${event.event_id}: choice leads to ending without clear label`);
      }
    });
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Get NEXT valid event after a choice
 * Includes fallback logic
 */
export const resolveNextEvent = (choice, allEvents, runState, party) => {
  if (!choice.nextEventId) {
    // No next event specified — find any valid event after current
    return null;
  }
  
  const nextEvent = allEvents.find(e => e.event_id === choice.nextEventId);
  if (!nextEvent) return null;
  
  // Check conditions
  if (checkEventConditions(nextEvent, runState, party)) {
    return nextEvent;
  }
  
  // Fallback 1: Same act event with matching conditions
  const actNum = Math.floor((nextEvent.sort_order || 0) / 10);
  const sameActFallback = allEvents.find(e =>
    Math.floor((e.sort_order || 0) / 10) === actNum &&
    e.event_id !== choice.nextEventId &&
    !e.is_ending &&
    checkEventConditions(e, runState, party)
  );
  
  if (sameActFallback) return sameActFallback;
  
  // Fallback 2: Next act starter
  const nextActStarter = allEvents.find(e =>
    Math.floor((e.sort_order || 0) / 10) === actNum + 1 &&
    !e.is_ending &&
    checkEventConditions(e, runState, party)
  );
  
  if (nextActStarter) return nextActStarter;
  
  // Fallback 3: Any valid event ahead
  const anyValid = allEvents.find(e =>
    (e.sort_order || 0) > (nextEvent.sort_order || 0) &&
    !e.is_ending &&
    checkEventConditions(e, runState, party)
  );
  
  return anyValid || null;
};