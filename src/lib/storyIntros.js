/**
 * Story-specific intro configuration.
 * Each story defines its own narration beats, chapter label, atmosphere, asset keys,
 * phase definitions, and map background keys.
 * Internal story_id is the canonical key — display title may differ.
 */

const STORY_INTROS = {
  the_rental: {
    displayTitle: "The Timeshare",
    chapterLabel: "Chapter 1 — The Timeshare",
    fogColor: "hsl(271 87% 65% / 0.12)",
    accentColor: "hsl(351 78% 52%)",
    introImageKey: "introImage",
    fallbackImageKey: "act1Image",
    // Map
    mapBackgroundKey: "rentalMapImage",
    mapFallbackKeys: ["mapImage", "gameMap", "map"],
    // Phases — mirrors phaseSystem.js STORY_PHASES.the_rental for reference
    phaseStructure: "the_rental",
    beats: [
      { id: 1, text: "You haven't been back in three years. Nobody has. The cabin looks exactly the same — which is somehow worse.", tapLabel: "Tap to continue" },
      { id: 2, text: "Someone jokes about the drive. They've been joking since the highway. Nobody's laughing.", tapLabel: "Tap to continue" },
      { id: 3, text: "Your phone died an hour ago. The nearest town is forty minutes back. You remember that now.", tapLabel: "Tap to continue" },
      { id: 4, text: "The front door is unlocked. It was locked when you left. You're certain of it.", tapLabel: "Begin →" },
    ],
  },

  low_tide: {
    displayTitle: "Low Tide",
    chapterLabel: "Chapter 2 — Low Tide",
    fogColor: "hsl(186 72% 50% / 0.10)",
    accentColor: "hsl(186 72% 42%)",
    introImageKey: "lowTideIntroImage",
    fallbackImageKey: "lowTideDockImage",
    // Map
    mapBackgroundKey: "lowTideMapImage",
    mapFallbackKeys: ["lowTideMap", "mapImage", "gameMap", "map"],
    // Phases
    phaseStructure: "low_tide",
    beats: [
      { id: 1, text: "The dock creaks in a way that sounds wrong. Like weight shifting where no one is standing.", tapLabel: "Tap to continue" },
      { id: 2, text: "The water is too still. No ripples. Not even from the wind that's been blowing all night.", tapLabel: "Tap to continue" },
      { id: 3, text: "Someone says they heard movement below the boards. Nobody wants to check. Nobody disagrees.", tapLabel: "Tap to continue" },
      { id: 4, text: "The tide pulled back two hours ago. It hasn't come back in.", tapLabel: "Begin →" },
    ],
  },

  mardi_gras_curse: {
    displayTitle: "Mardi Gras Curse",
    chapterLabel: "Chapter 3 — The Curse",
    fogColor: "hsl(40 90% 58% / 0.10)",
    accentColor: "hsl(271 87% 52%)",
    introImageKey: "mardiGrasIntroImage",
    fallbackImageKey: "mardiGrasStreetImage",
    // Map
    mapBackgroundKey: "mardiGrasMapImage",
    mapFallbackKeys: ["mardiGrasMap", "mardiGrasQuarterMap", "mapImage", "gameMap", "map"],
    // Phases
    phaseStructure: "mardi_gras_curse",
    beats: [
      { id: 1, text: "The parade ended hours ago. The streets should be empty. They're not.", tapLabel: "Tap to continue" },
      { id: 2, text: "Something in the music tonight felt like instruction. Like it was directing people — not entertaining them.", tapLabel: "Tap to continue" },
      { id: 3, text: "The mask you found doesn't have eye holes. Whatever wore it didn't need to see.", tapLabel: "Tap to continue" },
      { id: 4, text: "The drums start again. No one in sight. The beat doesn't stop.", tapLabel: "Begin →" },
    ],
  },

  the_lab: {
    displayTitle: "The Lab",
    chapterLabel: "Chapter 4 — The Lab",
    fogColor: "hsl(123 70% 55% / 0.08)",
    accentColor: "hsl(123 68% 42%)",
    introImageKey: "theLabIntroImage",
    fallbackImageKey: "theLabCorridorImage",
    // Map
    mapBackgroundKey: "theLabMapImage",
    mapFallbackKeys: ["theLabMap", "labFloorMap", "mapImage", "gameMap", "map"],
    // Phases
    phaseStructure: "the_lab",
    beats: [
      { id: 1, text: "The lights have been on for six days straight. Nobody on-site is supposed to need light to see anymore.", tapLabel: "Tap to continue" },
      { id: 2, text: "The logs show 47 access events since lockdown. There are only 6 of you.", tapLabel: "Tap to continue" },
      { id: 3, text: "The ventilation stopped an hour ago. It's not broken. Someone turned it off from inside.", tapLabel: "Tap to continue" },
      { id: 4, text: "Protocol says do not open the containment door under any circumstances. The door is already open.", tapLabel: "Begin →" },
    ],
  },
};

/**
 * Get story-specific intro config.
 * Falls back to the_rental config if storyId is unknown — but does NOT copy phase structure.
 */
export function getStoryIntro(storyId) {
  return STORY_INTROS[storyId] || STORY_INTROS["the_rental"];
}

/**
 * Resolve the map image URL for a story using the asset map (key → url).
 * Tries story-specific keys first, then universal fallbacks.
 * @param {string} storyId
 * @param {object} sceneMap — { [key]: url }
 * @param {string} [overrideKey] — optional DB-configured map_background_key
 */
export function resolveMapImageUrl(storyId, sceneMap, overrideKey) {
  if (!sceneMap) return null;
  // 1. DB override key
  if (overrideKey && sceneMap[overrideKey]) return sceneMap[overrideKey];
  // 2. Story-specific keys
  const intro = STORY_INTROS[storyId];
  if (intro) {
    if (intro.mapBackgroundKey && sceneMap[intro.mapBackgroundKey]) return sceneMap[intro.mapBackgroundKey];
    if (intro.mapFallbackKeys) {
      for (const k of intro.mapFallbackKeys) {
        if (sceneMap[k]) return sceneMap[k];
      }
    }
  }
  // 3. Universal fallbacks
  return sceneMap["mapImage"] || sceneMap["gameMap"] || sceneMap["map"] || null;
}

export default STORY_INTROS;