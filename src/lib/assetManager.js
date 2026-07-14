/**
 * Asset Manager — single source of truth for all uploaded images.
 * Pass sceneAssets (array from SceneAsset entity) and characters (array from Character entity).
 *
 * Usage:
 *   const assets = buildAssetMap(sceneAssets, characters);
 *   assets.getCharacterImage(character) // returns image_url or null
 *   assets.getSceneImage("introImage")  // returns image_url or null
 */

export function buildAssetMap(sceneAssets = [], characters = []) {
  // Scene image map keyed by asset key
  const sceneMap = {};
  sceneAssets.forEach(a => {
    if (a.key && a.image_url) sceneMap[a.key] = a.image_url;
  });

  // Character image map keyed by character id, also by name-slug for convenience
  const charMap = {};
  characters.forEach(c => {
    if (c.portrait_url) {
      charMap[c.id] = c.portrait_url;
      if (c.name) charMap[slugify(c.name)] = c.portrait_url;
    }
  });

  return {
    getSceneImage: (key) => (key ? sceneMap[key] || null : null),
    getCharacterImage: (character) => {
      if (!character) return null;
      return charMap[character.id] || charMap[slugify(character.name)] || null;
    },
    getCharacterImageById: (id) => charMap[id] || null,
    sceneMap,
    charMap,
  };
}

function slugify(str = "") {
  return str.toLowerCase().replace(/\s+/g, "_");
}

// Shared scene image keys used across the game
export const SCENE_KEYS = {
  intro:   "introImage",
  home:    "homeHeaderImage",
  act1:    "act1Image",
  act2:    "act2Image",
  act3:    "act3Image",
  act4:    "act4Image",
  ending:  "endingImage",
  gameOver:"gameOverImage",
};