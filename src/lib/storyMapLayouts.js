/**
 * Story Map Layout System
 *
 * Each story gets its own zone labels, positions, and danger levels while maintaining
 * the same 6 internal zone IDs: living, kitchen, porch, upstairs, basement, woods.
 *
 * Maps must feel story-specific — the Rental cabin vs Low Tide boardwalk vs French Quarter.
 */

const LAYOUTS = {
  cabin: {
    id: "cabin",
    label: "The Cabin",
    zones: [
      { id: "living",   label: "Living Room",   x: 38, y: 52, danger: 0,   icon: "🛋️" },
      { id: "kitchen",  label: "Kitchen",       x: 62, y: 35, danger: 10,  icon: "🍳" },
      { id: "porch",    label: "Porch",         x: 18, y: 48, danger: 20,  icon: "🚪" },
      { id: "upstairs", label: "Upstairs",      x: 66, y: 18, danger: 25,  icon: "🛏️" },
      { id: "basement", label: "Basement",      x: 28, y: 72, danger: 40,  icon: "⬇️" },
      { id: "woods",    label: "Woods",         x: 14, y: 25, danger: 55,  icon: "🌲" },
    ],
  },

  beach: {
    id: "beach",
    label: "Low Tide — Boardwalk",
    zones: [
      { id: "living",   label: "Dock House",    x: 40, y: 50, danger: 0,   icon: "🏠" },
      { id: "kitchen",  label: "Bait Room",     x: 62, y: 38, danger: 10,  icon: "🐟" },
      { id: "porch",    label: "Boardwalk",     x: 80, y: 55, danger: 20,  icon: "🪵" },
      { id: "upstairs", label: "Lighthouse",    x: 22, y: 14, danger: 25,  icon: "🔦" },
      { id: "basement", label: "Under Dock",    x: 35, y: 74, danger: 40,  icon: "🌊" },
      { id: "woods",    label: "Shoreline",     x: 65, y: 22, danger: 55,  icon: "🏖️" },
    ],
  },

  french_quarter: {
    id: "french_quarter",
    label: "Mardi Gras Curse — French Quarter",
    zones: [
      { id: "living",   label: "Courtyard",     x: 42, y: 50, danger: 0,   icon: "🌿" },
      { id: "kitchen",  label: "Back Bar",      x: 60, y: 40, danger: 10,  icon: "🍸" },
      { id: "porch",    label: "Balcony",       x: 68, y: 28, danger: 20,  icon: "🎭" },
      { id: "upstairs", label: "Guest Rooms",   x: 76, y: 15, danger: 25,  icon: "🛎️" },
      { id: "basement", label: "Service Hall",  x: 26, y: 68, danger: 40,  icon: "🕯️" },
      { id: "woods",    label: "Alley",         x: 14, y: 30, danger: 55,  icon: "🌙" },
    ],
  },

  lab: {
    id: "lab",
    label: "The Lab — Research Facility",
    zones: [
      { id: "living",   label: "Main Lab",      x: 44, y: 48, danger: 0,   icon: "🧪" },
      { id: "kitchen",  label: "Med Bay",       x: 68, y: 36, danger: 10,  icon: "💊" },
      { id: "porch",    label: "Airlock",       x: 14, y: 50, danger: 20,  icon: "🔒" },
      { id: "upstairs", label: "Control Room",  x: 70, y: 16, danger: 25,  icon: "🖥️" },
      { id: "basement", label: "Containment",   x: 32, y: 72, danger: 40,  icon: "⚠️" },
      { id: "woods",    label: "Service Tunnel", x: 18, y: 24, danger: 55,  icon: "🔦" },
    ],
  },
};

/**
 * Get story map layout from Story record's node_layout_preset + custom map_node_layout.
 * Falls back to cabin layout if nothing is set.
 */
export function getStoryMapLayout(storyId, storyRecord) {
  const preset = storyRecord?.node_layout_preset || null;
  const customJson = storyRecord?.map_node_layout || null;

  // Custom layout takes priority
  if (customJson) {
    try {
      const custom = typeof customJson === "string" ? JSON.parse(customJson) : customJson;
      if (Array.isArray(custom) && custom.length >= 6) {
        const zoneMap = {};
        custom.forEach(z => { zoneMap[z.id] = z; });
        // Validate all 6 required zone ids exist
        const requiredIds = ["living", "kitchen", "porch", "upstairs", "basement", "woods"];
        const allPresent = requiredIds.every(id => zoneMap[id]);
        if (allPresent) {
          return {
            id: "custom",
            label: storyRecord?.title || "Custom Layout",
            zones: custom,
          };
        }
      }
    } catch { /* fall through to preset */ }
  }

  // Preset lookup
  if (preset && LAYOUTS[preset]) return LAYOUTS[preset];

  // Default to cabin
  return LAYOUTS.cabin;
}

/**
 * Get zone position for a member — story-aware.
 */
export function getZonePosition(layout, location) {
  if (!layout?.zones) return { x: 50, y: 50 };
  const zone = layout.zones.find(z => z.id === location);
  return zone ? { x: zone.x, y: zone.y } : { x: 50, y: 50 };
}

/**
 * Get zone display label for a given internal zone id.
 */
export function getZoneLabel(layout, location) {
  if (!layout?.zones) return location;
  const zone = layout.zones.find(z => z.id === location);
  return zone ? zone.label : location;
}

/**
 * Get the default layout preset id by story_id.
 */
export function getDefaultLayoutPreset(storyId) {
  const mapping = {
    the_rental: "cabin",
    low_tide: "beach",
    mardi_gras_curse: "french_quarter",
    the_lab: "lab",
  };
  return mapping[storyId] || "cabin";
}

/**
 * All available layout presets for admin selection.
 */
export function getAvailableLayoutPresets() {
  return Object.entries(LAYOUTS).map(([id, layout]) => ({
    id,
    label: layout.label,
    zoneCount: layout.zones.length,
  }));
}

export default LAYOUTS;