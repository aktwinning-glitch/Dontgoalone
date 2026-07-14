/**
 * Event Safety Engine
 * Guarantees game never dead-ends due to missing/invalid events.
 * In challenge runs, eligible fallback events are selected from a seeded pool.
 */

import { checkEventConditions } from './eventConditionEngine';
import { seededShuffle } from './progressionEngine';

function activeChallenge() {
  try { return JSON.parse(localStorage.getItem('dont_go_alone_active_challenge') || 'null'); }
  catch { return null; }
}

function pickEligible(events, seed) {
  if (!events.length) return null;
  const challenge = activeChallenge();
  if (!challenge) return events[0];
  return seededShuffle(events, `${challenge.id}:${seed}`)[0] || events[0];
}

export const getNextEventSafely = (nextEventId, allEvents, currentEvent, runState, party) => {
  if (!allEvents || !allEvents.length) return null;

  if (nextEventId) {
    const exact = allEvents.find(event => event.event_id === nextEventId);
    if (exact && checkEventConditions(exact, runState, party)) return exact;
  }

  const currentAct = Math.floor((currentEvent?.sort_order || 0) / 10);
  const sameActPool = allEvents.filter(event =>
    Math.floor((event.sort_order || 0) / 10) === currentAct &&
    event.event_id !== currentEvent?.event_id &&
    !event.is_ending &&
    checkEventConditions(event, runState, party)
  );
  const sameActFallback = pickEligible(sameActPool, currentEvent?.event_id || currentAct);
  if (sameActFallback) return sameActFallback;

  const nextActPool = allEvents.filter(event =>
    Math.floor((event.sort_order || 0) / 10) === currentAct + 1 &&
    !event.is_ending &&
    checkEventConditions(event, runState, party)
  );
  const nextActStarter = pickEligible(nextActPool, `next:${currentEvent?.event_id || currentAct}`);
  if (nextActStarter) return nextActStarter;

  const unconditionalPool = allEvents.filter(event =>
    (event.sort_order || 0) > (currentEvent?.sort_order || 0) &&
    !event.is_ending &&
    (!event.conditions || event.conditions === 'null')
  );
  const unconditional = pickEligible(unconditionalPool, `open:${currentEvent?.event_id || currentAct}`);
  if (unconditional) return unconditional;

  const nextByOrder = allEvents.find(event => (event.sort_order || 0) > (currentEvent?.sort_order || 0) && !event.is_ending);
  if (nextByOrder) return nextByOrder;

  console.warn('[EventSafety] No further events found. Story complete.');
  return null;
};

export const validateStoryStructure = (allEvents, storyId) => {
  const storyEvents = allEvents.filter(event => event.story_id === storyId);
  const issues = [];
  if (!storyEvents.length) {
    issues.push(`No events found for story: ${storyId}`);
    return { valid: false, issues };
  }
  const sortedByOrder = [...storyEvents].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  if (!sortedByOrder[0]) issues.push('No start event found');
  const eventMap = new Map(storyEvents.map(event => [event.event_id, event]));
  storyEvents.forEach(event => {
    const choices = event.choices ? JSON.parse(event.choices) : [];
    choices.forEach(choice => {
      if (choice.nextEventId && !eventMap.has(choice.nextEventId)) issues.push(`Event ${event.event_id} references missing event: ${choice.nextEventId}`);
    });
  });
  return { valid: issues.length === 0, issues };
};
