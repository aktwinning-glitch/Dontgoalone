/**
 * NARRATIVE CONTINUITY ENGINE
 * Enforces memory-based narration + sequential event flow
 * No more scene resets or disconnected events
 */

/**
 * Inject memory-based narration callbacks
 * Each event must reference prior state
 */
export const injectMemoryNarration = (eventText, lastEventId, lastChoiceId, runState = {}) => {
  if (!lastChoiceId || !runState) return eventText;

  const { flags = {}, decisionsMade = [] } = runState;

  // Build callback lines based on what actually happened
  const callbacks = [];

  // Reference last choice outcome
  if (lastChoiceId === "took_key") {
    callbacks.push("The key is still in your hand. Everyone saw you take it.");
  } else if (lastChoiceId === "ignored_key") {
    callbacks.push("No one's mentioned the key since then. But they're watching you.");
  } else if (lastChoiceId === "asked_about_key") {
    callbacks.push("They wouldn't answer. That was the first time they looked scared.");
  }

  if (flags.photo_revealed) {
    callbacks.push("The photo is still in your mind. Their faces when they saw it.");
  } else if (flags.photo_hidden) {
    callbacks.push("The photo remains hidden. You're the only one who knows.");
  }

  if (flags.accused_someone) {
    callbacks.push(`You accused ${flags.accused_someone}. They haven't forgiven you.`);
  }

  if (flags.trusted_unlikely) {
    callbacks.push("That choice surprised everyone. Maybe yourself most of all.");
  }

  if (flags.split_group) {
    callbacks.push("The group is fractured now. That was because of what you did.");
  }

  if (flags.basement_entered && flags.basement_escape) {
    callbacks.push("You made it out of the basement. But something came with you.");
  }

  // Inject callbacks at start of narration
  if (callbacks.length > 0) {
    return callbacks[Math.floor(Math.random() * callbacks.length)] + "\n\n" + eventText;
  }

  return eventText;
};

/**
 * Validate event is continuous with prior event
 * Returns { valid, issues }
 */
export const validateEventContinuity = (event, lastEvent, runState = {}) => {
  const issues = [];

  if (!lastEvent || !event) {
    return { valid: true, issues: [] };
  }

  // Check: event should not completely reset scene context
  const lastSceneKey = lastEvent?.image_key || "unknown";
  const currentSceneKey = event?.image_key || "unknown";

  // If location changed, narration must acknowledge transition
  if (lastSceneKey !== currentSceneKey && !event.text.toLowerCase().includes("you")) {
    issues.push("Event doesn't acknowledge location change from previous scene");
  }

  // Check: if last event was deadly/tense, next should acknowledge
  const lastIsDangerous = lastEvent.text.toLowerCase().includes("dead") || 
                          lastEvent.text.toLowerCase().includes("killed");
  if (lastIsDangerous && event.text.toLowerCase().includes("everything is peaceful")) {
    issues.push("Event ignores dangerous outcome from previous moment");
  }

  return { valid: issues.length === 0, issues };
};

/**
 * Enforce sequential event requirements
 * Each event defines what must have happened before
 */
export const getEventSequenceRequirements = (event) => {
  // Parse requirements from conditions
  if (!event.conditions) return null;

  try {
    const conditions = typeof event.conditions === "string" ? JSON.parse(event.conditions) : event.conditions;
    return {
      requiredFlags: conditions.requiresFlags || [],
      excludedFlags: conditions.excludesFlags || [],
      minChoiceCount: conditions.minChoiceCount || 0,
      maxChoiceCount: conditions.maxChoiceCount || Infinity,
    };
  } catch {
    return null;
  }
};

/**
 * Build event narrative with memory injection
 * Full context-aware event text
 */
export const buildNarrativeWithMemory = (event, lastEventId, lastChoiceId, runState = {}) => {
  if (!event) return "";

  // Get base text
  let text = event.text || "";

  // Inject memory callbacks ONLY if there's prior choice context
  if (lastChoiceId) {
    text = injectMemoryNarration(text, lastEventId, lastChoiceId, runState);
  }

  // Append threat/tension tone modifier based on state
  const { threat = 0, flags = {} } = runState;
  if (threat > 75 && flags.basement_entered) {
    // Heightened tone if high threat + already endangered
    const threatSuffix = "\n\n[The walls feel closer. Something is close.]";
    if (!text.includes(threatSuffix)) {
      text += threatSuffix;
    }
  }

  return text;
};

/**
 * Prevent "scene reset" writing pattern
 * Each event must maintain narrative continuity
 */
export const checkForSceneReset = (eventText) => {
  const resetPatterns = [
    /you (?:enter|find yourself in) (?:another|a new) /i,
    /suddenly everything changes/i,
    /the scene shifts/i,
    /unrelated to/i,
  ];

  const hasReset = resetPatterns.some(p => p.test(eventText));
  return hasReset;
};