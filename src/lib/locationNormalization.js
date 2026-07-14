/**
 * Location Normalization Helper
 *
 * Ensures all location strings normalize to exactly 6 valid zones:
 * living, kitchen, porch, upstairs, basement, woods
 *
 * Handles aliases, variations, typos, and invalid values.
 * Used everywhere: GameScreen, partyEngine, consequenceEngine, maps, validation, etc.
 *
 * CRITICAL: Every location stored or read from state must pass through this.
 */

export const VALID_LOCATIONS = new Set([
  "living",
  "kitchen",
  "porch",
  "upstairs",
  "basement",
  "woods",
  "unknown", // fallback only, not a real location
]);

const LOCATION_ALIASES = {
  // Living room / central
  "living room": "living",
  "living_room": "living",
  "hallway": "living",
  "entry": "living",
  "entryway": "living",
  "foyer": "living",
  "main room": "living",
  "front room": "living",
  "lounge": "living",
  "inside": "living",
  "indoor": "living",
  "interior": "living",
  "main": "living",

  // Kitchen
  "kitchens": "kitchen",
  "dining": "kitchen",
  "dining room": "kitchen",
  "dining_room": "kitchen",
  "pantry": "kitchen",
  "counter": "kitchen",

  // Upstairs / bedrooms
  "bedroom": "upstairs",
  "bedrooms": "upstairs",
  "attic": "upstairs",
  "loft": "upstairs",
  "upper floor": "upstairs",
  "upper_floor": "upstairs",
  "second floor": "upstairs",
  "second_floor": "upstairs",
  "upstairs hallway": "upstairs",
  "upstairs_hallway": "upstairs",
  "hallway upstairs": "upstairs",
  "hallway_upstairs": "upstairs",
  "master": "upstairs",
  "master bedroom": "upstairs",
  "master_bedroom": "upstairs",

  // Basement / cellar
  "cellar": "basement",
  "cellars": "basement",
  "basement stairs": "basement",
  "basement_stairs": "basement",
  "stairs": "basement",
  "downstairs": "basement",
  "down": "basement",
  "lower level": "basement",
  "lower_level": "basement",
  "lower floor": "basement",
  "lower_floor": "basement",
  "sub-basement": "basement",
  "sub basement": "basement",

  // Porch / exterior adjacent
  "porch stairs": "porch",
  "porch_stairs": "porch",
  "front porch": "porch",
  "front_porch": "porch",
  "back porch": "porch",
  "back_porch": "porch",
  "deck": "porch",
  "deck area": "porch",
  "deck_area": "porch",
  "entrance": "porch",
  "front entrance": "porch",
  "front_entrance": "porch",
  "doorway": "porch",
  "outside": "woods",
  "outdoor": "woods",
  "driveway": "porch",
  "drive": "porch",
  "garage": "porch",

  // Woods / exterior far
  "forest": "woods",
  "forest edge": "woods",
  "forest_edge": "woods",
  "treeline": "woods",
  "tree line": "woods",
  "tree_line": "woods",
  "trees": "woods",
  "garden": "woods",
  "yard": "woods",
  "property": "woods",
  "grounds": "woods",
  "exterior": "woods",
  "outside area": "woods",
  "outside_area": "woods",
  "shed": "woods",

  // Edge cases and null-like
  "": "living",
  null: "living",
  undefined: "living",
};

/**
 * Normalize a location string to one of the 6 valid zones.
 * @param {string|null|undefined} location - Raw location value
 * @returns {string} - Valid location: living, kitchen, porch, upstairs, basement, woods
 */
export function normalizeLocationKey(location) {
  // Handle null/undefined
  if (!location) return "living";

  // Convert to lowercase and trim
  const normalized = String(location).toLowerCase().trim();

  // Direct match
  if (VALID_LOCATIONS.has(normalized) && normalized !== "unknown") {
    return normalized;
  }

  // Try alias lookup
  if (LOCATION_ALIASES[normalized]) {
    return LOCATION_ALIASES[normalized];
  }

  // Substring match as fallback
  if (normalized.includes("basement") || normalized.includes("cellar")) return "basement";
  if (normalized.includes("kitchen")) return "kitchen";
  if (normalized.includes("upstairs") || normalized.includes("bedroom") || normalized.includes("attic")) return "upstairs";
  if (normalized.includes("porch") || normalized.includes("deck") || normalized.includes("driveway")) return "porch";
  if (normalized.includes("wood") || normalized.includes("forest") || normalized.includes("yard")) return "woods";
  if (normalized.includes("living") || normalized.includes("room")) return "living";

  // Final fallback
  return "living";
}

/**
 * Infer location from an event's image_key or text.
 * Used when event.location is missing.
 * @param {string} imageKey - Event image_key (usually scene asset key)
 * @param {string} text - Event narrative text
 * @returns {string} - Inferred valid location
 */
export function inferLocationFromEvent(imageKey = "", text = "") {
  const combined = `${(imageKey || "").toLowerCase()} ${(text || "").toLowerCase()}`;

  if (combined.includes("basement") || combined.includes("cellar")) return "basement";
  if (combined.includes("kitchen")) return "kitchen";
  if (combined.includes("upstairs") || combined.includes("bedroom") || combined.includes("attic")) return "upstairs";
  if (combined.includes("porch") || combined.includes("deck") || combined.includes("driveway")) return "porch";
  if (combined.includes("wood") || combined.includes("forest") || combined.includes("outside") || combined.includes("exterior")) return "woods";

  return "living";
}

/**
 * Parse and normalize group_spread array.
 * Returns safe array of { memberId, location }.
 * @param {string|array|null} groupSpread - Raw group_spread value
 * @returns {array} - Safe array of position objects
 */
export function parseAndNormalizeGroupSpread(groupSpread) {
  if (!groupSpread) return [];

  try {
    let spread = groupSpread;
    if (typeof spread === "string") {
      spread = JSON.parse(spread);
    }
    if (!Array.isArray(spread)) return [];

    return spread
      .filter(entry => entry && entry.memberId)
      .map(entry => ({
        memberId: entry.memberId,
        location: normalizeLocationKey(entry.location),
      }));
  } catch {
    console.warn("[LocationNormalization] Failed to parse group_spread:", groupSpread);
    return [];
  }
}