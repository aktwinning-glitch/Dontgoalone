/**
 * Story-aware phase system.
 * Each story defines its own phase timeline.
 * Resolution priority:
 *   1. event.phase_label_override
 *   2. event.phase_id → story phase definitions
 *   3. story phase by choice count (from DB story.phase_definitions or hardcoded STORY_PHASES)
 *   4. generic neutral fallback
 */

// ── Per-story phase definitions ──────────────────────────────────────────────

export const STORY_PHASES = {
  the_rental: [
    { id: "arrival",     label: "Late Afternoon", sublabel: "Arrival",         emoji: "🌇", color: "hsl(38 90% 62%)",  bg: "hsl(38 90% 62% / 0.12)",  border: "hsl(38 90% 62% / 0.3)",  maxChoices: 4 },
    { id: "exploration", label: "Sunset",         sublabel: "Exploration",     emoji: "🌆", color: "hsl(18 78% 60%)",  bg: "hsl(18 78% 60% / 0.12)",  border: "hsl(18 78% 60% / 0.3)",  maxChoices: 10 },
    { id: "escalation",  label: "Night",          sublabel: "Escalation",      emoji: "🌙", color: "hsl(271 87% 68%)", bg: "hsl(271 87% 68% / 0.12)", border: "hsl(271 87% 68% / 0.3)", maxChoices: 18 },
    { id: "survival",    label: "Deep Night",     sublabel: "Survival",        emoji: "🌑", color: "hsl(351 78% 62%)", bg: "hsl(351 78% 62% / 0.12)", border: "hsl(351 78% 62% / 0.3)", maxChoices: 28 },
    { id: "collapse",    label: "Pre-Sunrise",    sublabel: "Final Decisions", emoji: "⚡", color: "hsl(40 90% 62%)",  bg: "hsl(40 90% 62% / 0.12)",  border: "hsl(40 90% 62% / 0.3)",  maxChoices: 38 },
    { id: "resolution",  label: "Sunrise",        sublabel: "Outcome",         emoji: "🌅", color: "hsl(123 68% 58%)", bg: "hsl(123 68% 58% / 0.12)", border: "hsl(123 68% 58% / 0.3)", maxChoices: Infinity },
  ],

  low_tide: [
    { id: "bonfire",       label: "Night",         sublabel: "Bonfire",              emoji: "🔥", color: "hsl(20 90% 60%)",  bg: "hsl(20 90% 60% / 0.12)",  border: "hsl(20 90% 60% / 0.3)",  maxChoices: 4 },
    { id: "discovery",     label: "Late Night",    sublabel: "Shoreline Discovery",  emoji: "🌊", color: "hsl(186 72% 55%)", bg: "hsl(186 72% 55% / 0.12)", border: "hsl(186 72% 55% / 0.3)", maxChoices: 10 },
    { id: "flight",        label: "Night",         sublabel: "Resort Flight",        emoji: "🌙", color: "hsl(271 87% 68%)", bg: "hsl(271 87% 68% / 0.12)", border: "hsl(271 87% 68% / 0.3)", maxChoices: 18 },
    { id: "trap",          label: "After Midnight",sublabel: "Pool Trap",            emoji: "🌑", color: "hsl(351 78% 62%)", bg: "hsl(351 78% 62% / 0.12)", border: "hsl(351 78% 62% / 0.3)", maxChoices: 28 },
    { id: "confrontation", label: "Pre-Dawn",      sublabel: "Surf Confrontation",   emoji: "⚡", color: "hsl(40 90% 62%)",  bg: "hsl(40 90% 62% / 0.12)",  border: "hsl(40 90% 62% / 0.3)",  maxChoices: 38 },
    { id: "outcome",       label: "Dawn",          sublabel: "Outcome",              emoji: "🌅", color: "hsl(186 72% 55%)", bg: "hsl(186 72% 55% / 0.12)", border: "hsl(186 72% 55% / 0.3)", maxChoices: Infinity },
  ],

  mardi_gras_curse: [
    { id: "mark",        label: "Mardi Gras Night", sublabel: "The Mark",           emoji: "🎭", color: "hsl(271 87% 68%)", bg: "hsl(271 87% 68% / 0.12)", border: "hsl(271 87% 68% / 0.3)", maxChoices: 4 },
    { id: "realization", label: "Early Morning",    sublabel: "Realization",        emoji: "🌫️", color: "hsl(40 90% 62%)",  bg: "hsl(40 90% 62% / 0.12)",  border: "hsl(40 90% 62% / 0.3)",  maxChoices: 10 },
    { id: "crossing",    label: "Morning",          sublabel: "River Crossing",     emoji: "🌉", color: "hsl(186 72% 55%)", bg: "hsl(186 72% 55% / 0.12)", border: "hsl(186 72% 55% / 0.3)", maxChoices: 18 },
    { id: "bayou",       label: "Late Morning",     sublabel: "Bayou Shack",        emoji: "🌿", color: "hsl(123 68% 48%)", bg: "hsl(123 68% 48% / 0.12)", border: "hsl(123 68% 48% / 0.3)", maxChoices: 28 },
    { id: "threshold",   label: "Threshold",        sublabel: "Curse Break or Loop",emoji: "🔮", color: "hsl(351 78% 62%)", bg: "hsl(351 78% 62% / 0.12)", border: "hsl(351 78% 62% / 0.3)", maxChoices: Infinity },
  ],

  the_lab: [
    { id: "parking",     label: "After Hours",  sublabel: "Parking Level",       emoji: "🅿️", color: "hsl(186 72% 55%)", bg: "hsl(186 72% 55% / 0.12)", border: "hsl(186 72% 55% / 0.3)", maxChoices: 4 },
    { id: "third_floor", label: "Night",        sublabel: "Third Floor",         emoji: "🌙", color: "hsl(271 87% 68%)", bg: "hsl(271 87% 68% / 0.12)", border: "hsl(271 87% 68% / 0.3)", maxChoices: 10 },
    { id: "maintenance", label: "Late Night",   sublabel: "Maintenance Routes",  emoji: "🔧", color: "hsl(351 78% 62%)", bg: "hsl(351 78% 62% / 0.12)", border: "hsl(351 78% 62% / 0.3)", maxChoices: 18 },
    { id: "generator",   label: "Pre-Dawn",     sublabel: "Generator / Roof",    emoji: "⚡", color: "hsl(40 90% 62%)",  bg: "hsl(40 90% 62% / 0.12)",  border: "hsl(40 90% 62% / 0.3)",  maxChoices: 28 },
    { id: "containment", label: "Morning",      sublabel: "Containment",         emoji: "☣️", color: "hsl(123 68% 48%)", bg: "hsl(123 68% 48% / 0.12)", border: "hsl(123 68% 48% / 0.3)", maxChoices: Infinity },
  ],
};

// Neutral fallback phases — used when story has no config
const FALLBACK_PHASES = [
  { id: "phase_1", label: "Phase 1", sublabel: "Opening",      emoji: "🌙", color: "hsl(271 87% 68%)", bg: "hsl(271 87% 68% / 0.12)", border: "hsl(271 87% 68% / 0.3)", maxChoices: 8 },
  { id: "phase_2", label: "Phase 2", sublabel: "Escalation",   emoji: "🌑", color: "hsl(351 78% 62%)", bg: "hsl(351 78% 62% / 0.12)", border: "hsl(351 78% 62% / 0.3)", maxChoices: 20 },
  { id: "phase_3", label: "Phase 3", sublabel: "Crisis",       emoji: "⚡", color: "hsl(40 90% 62%)",  bg: "hsl(40 90% 62% / 0.12)",  border: "hsl(40 90% 62% / 0.3)",  maxChoices: 35 },
  { id: "final_phase", label: "Final Phase", sublabel: "Outcome", emoji: "🌅", color: "hsl(123 68% 58%)", bg: "hsl(123 68% 58% / 0.12)", border: "hsl(123 68% 58% / 0.3)", maxChoices: Infinity },
];

// ── Legacy alias (The Rental default) — keeps old imports working ────────────
export const PHASES = STORY_PHASES.the_rental;

/**
 * Get phase array for a given storyId.
 * Supports DB-sourced phase_definitions JSON (parsed array).
 */
function getPhasesForStory(storyId, dbPhaseDefinitions) {
  // 1. DB-sourced definitions take priority
  if (dbPhaseDefinitions) {
    const parsed = typeof dbPhaseDefinitions === "string"
      ? (() => { try { return JSON.parse(dbPhaseDefinitions); } catch { return null; } })()
      : dbPhaseDefinitions;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  }
  // 2. Hardcoded per-story
  if (storyId && STORY_PHASES[storyId]) return STORY_PHASES[storyId];
  // 3. Neutral fallback
  return FALLBACK_PHASES;
}

/**
 * Get the current phase by choice count — story-aware.
 * @param {number} choiceCount
 * @param {string} [storyId] — story_id (e.g. "mardi_gras_curse")
 * @param {string|Array} [dbPhaseDefinitions] — optional DB-sourced phase_definitions
 */
export function getCurrentPhase(choiceCount = 0, storyId = null, dbPhaseDefinitions = null) {
  const phases = getPhasesForStory(storyId, dbPhaseDefinitions);
  return phases.find(p => choiceCount <= p.maxChoices) || phases[phases.length - 1];
}

/**
 * Resolve the display phase for a specific event — full priority chain.
 *
 * Priority:
 *   1. event.phase_label_override → use directly as { label, sublabel? }
 *   2. event.phase_id → look up in story phase definitions
 *   3. choice-count based phase for the story
 *   4. neutral fallback
 *
 * @param {object} event — current GameEvent record
 * @param {string} storyId
 * @param {number} choiceCount
 * @param {string|Array} [dbPhaseDefinitions] — from story.phase_definitions DB field
 * @returns {{ id, label, sublabel, emoji, color, bg, border }}
 */
export function resolvePhaseLabel(event, storyId, choiceCount = 0, dbPhaseDefinitions = null) {
  const phases = getPhasesForStory(storyId, dbPhaseDefinitions);

  // 1. Direct override on the event record
  if (event?.phase_label_override) {
    const override = event.phase_label_override;
    // Could be "Label — Sublabel" or just "Label"
    const dash = override.indexOf(" — ");
    const base = phases[0] || FALLBACK_PHASES[0];
    if (dash !== -1) {
      return { ...base, id: "override", label: override.slice(0, dash), sublabel: override.slice(dash + 3) };
    }
    return { ...base, id: "override", label: override, sublabel: "" };
  }

  // 2. event.phase_id → find in phase defs
  if (event?.phase_id) {
    const matched = phases.find(p => p.id === event.phase_id);
    if (matched) return matched;
  }

  // 3. Choice-count based phase
  return getCurrentPhase(choiceCount, storyId, dbPhaseDefinitions);
}

/** Legacy: get phase from event_id act suffix (kept for backward compat) */
export function getPhaseFromEventId(eventId = "", storyId = null) {
  const m = eventId.match(/_a(\d)_/);
  const act = m ? parseInt(m[1]) : 1;
  const phases = getPhasesForStory(storyId, null);
  return phases[Math.min(act - 1, phases.length - 1)];
}