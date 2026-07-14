/**
 * Event Safety Engine
 * Guarantees game never dead-ends due to missing/invalid events
 */

import { checkEventConditions } from './eventConditionEngine';

/**
 * Get next valid event with fallback chain
 * Priority: specified → matching conditions → act fallback → unconditional → first event
 */
export const getNextEventSafely = (nextEventId, allEvents, currentEvent, runState, party) => {
  if (!allEvents || !allEvents.length) return null;

  // 1. Try exact specified event
  if (nextEventId) {
    const exact = allEvents.find(e => e.event_id === nextEventId);
    if (exact && checkEventConditions(exact, runState, party)) {
      return exact;
    }
  }

  // 2. Same act, matching conditions
  const currentAct = Math.floor((currentEvent?.sort_order || 0) / 10);
  const sameActFallback = allEvents.find(e =>
    Math.floor((e.sort_order || 0) / 10) === currentAct &&
    e.event_id !== currentEvent?.event_id &&
    !e.is_ending &&
    checkEventConditions(e, runState, party)
  );
  if (sameActFallback) return sameActFallback;

  // 3. Next act starter
  const nextActStarter = allEvents.find(e =>
    Math.floor((e.sort_order || 0) / 10) === currentAct + 1 &&
    !e.is_ending &&
    checkEventConditions(e, runState, party)
  );
  if (nextActStarter) return nextActStarter;

  // 4. Any unconditional event after current (by sort_order)
  const unconditional = allEvents.find(e =>
    (e.sort_order || 0) > (currentEvent?.sort_order || 0) &&
    !e.is_ending &&
    (!e.conditions || e.conditions === 'null')
  );
  if (unconditional) return unconditional;

  // 5. Any event after current (strict sort_order progression — no looping back)
  const nextByOrder = allEvents.find(e =>
    (e.sort_order || 0) > (currentEvent?.sort_order || 0) && !e.is_ending
  );
  if (nextByOrder) return nextByOrder;

  // 6. No more events — signal end of story
  console.warn("[EventSafety] No further events found. Story complete.");
  return null;
};

/**
 * Validate story has minimum viable event structure
 */
export const validateStoryStructure = (allEvents, storyId) => {
  const storyEvents = allEvents.filter(e => e.story_id === storyId);
  
  const issues = [];
  
  if (!storyEvents.length) {
    issues.push(`No events found for story: ${storyId}`);
    return { valid: false, issues };
  }

  // Check for start event (first by sort_order)
  const sortedByOrder = [...storyEvents].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  if (!sortedByOrder[0]) {
    issues.push('No start event found');
  }

  // Check for event chain continuity
  const eventMap = new Map(storyEvents.map(e => [e.event_id, e]));
  storyEvents.forEach(event => {
    const choices = event.choices ? JSON.parse(event.choices) : [];
    choices.forEach(choice => {
      if (choice.nextEventId && !eventMap.has(choice.nextEventId)) {
        issues.push(`Event ${event.event_id} references missing event: ${choice.nextEventId}`);
      }
    });
  });

  return { valid: issues.length === 0, issues };
};