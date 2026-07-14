/**
 * Data Validation & Normalization Engine
 * Ensures data integrity + story ID consistency
 */

/**
 * Normalize story_id: lowercase, no spaces, canonical mapping
 */
export const normalizeStoryId = (id) => {
  if (!id) return id;
  let normalized = String(id).trim().toLowerCase();
  
  // Map legacy IDs to canonical
  const legacyMap = {
    "story_1": "the_rental",
    "story_2": "low_tide",
    "story_3": "mardi_gras_curse",
  };
  
  return legacyMap[normalized] || normalized;
};

/**
 * Validate + sanitize story record
 */
export const validateStoryRecord = (story) => {
  const sanitized = { ...story };
  
  // Normalize story_id
  if (sanitized.story_id) {
    sanitized.story_id = normalizeStoryId(sanitized.story_id);
  }
  
  // Fix ambient_sound_defaults: MUST be string, never null/object
  if (!sanitized.ambient_sound_defaults || typeof sanitized.ambient_sound_defaults !== "string") {
    sanitized.ambient_sound_defaults = "none";
  }
  
  return sanitized;
};

/**
 * Validate + sanitize event record
 */
export const validateEventRecord = (event) => {
  const sanitized = { ...event };
  
  // Normalize story_id
  if (sanitized.story_id) {
    sanitized.story_id = normalizeStoryId(sanitized.story_id);
  }
  
  return sanitized;
};

/**
 * Get canonical story IDs
 */
export const CANONICAL_STORY_IDS = [
  "the_rental",
  "low_tide",
  "mardi_gras_curse",
];

/**
 * Check if story ID is canonical
 */
export const isCanonicalStoryId = (id) => {
  const normalized = normalizeStoryId(id);
  return CANONICAL_STORY_IDS.includes(normalized);
};