// Story Package Schema - Defines the structure for complete story packages
// Supports metadata, acts, events, choices, branching, items, clues, deaths, endings

export const STORY_PACKAGE_SCHEMA = {
  type: "object",
  required: ["story_id", "title", "acts", "events"],
  properties: {
    // ── Metadata ────────────────────────────────────────────────────
    story_id: { type: "string", description: "Unique story identifier (e.g., 'the_rental')" },
    title: { type: "string", minLength: 1 },
    chapter_label: { type: "string" },
    subtitle: { type: "string" },
    description: { type: "string" },
    emoji: { type: "string" },
    status: { type: "string", enum: ["active", "locked", "draft", "coming_soon"] },
    visible_on_homepage: { type: "boolean" },
    accent_color: { type: "string" },
    cover_image_url: { type: "string" },
    survivor_count: { type: "integer", minimum: 1 },
    sort_order: { type: "integer" },
    unlock_requirement: { type: "string" },

    // ── Acts Structure ──────────────────────────────────────────────
    acts: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["id", "label", "event_range", "description"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          emoji: { type: "string" },
          event_range: {
            type: "object",
            required: ["start", "end"],
            properties: {
              start: { type: "integer" },
              end: { type: "integer" },
            },
          },
          description: { type: "string" },
        },
      },
    },

    // ── Events ──────────────────────────────────────────────────────
    events: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["event_id", "text"],
        properties: {
          event_id: { type: "string" },
          night: { type: "integer", minimum: 1 },
          text: { type: "string" },
          image_key: { type: "string" },
          is_ending: { type: "boolean" },
          ending_type: { type: "string", enum: ["good", "mixed", "bad", ""] },
          ending_text: { type: "string" },
          sort_order: { type: "integer" },

          // ── Conditions for event visibility ─────────────────────
          conditions: {
            type: "object",
            properties: {
              flags: { type: "object" },
              excludedFlags: { type: "array", items: { type: "string" } },
              minThreat: { type: "integer" },
              maxThreat: { type: "integer" },
              minFear: { type: "integer" },
              maxFear: { type: "integer" },
            },
          },

          // ── Choices ─────────────────────────────────────────────
          choices: {
            type: "array",
            items: {
              type: "object",
              required: ["text", "statUsed", "difficulty"],
              properties: {
                text: { type: "string" },
                subtext: { type: "string" },
                statUsed: {
                  type: "string",
                  enum: [
                    "strength",
                    "speed",
                    "resilience",
                    "intelligence",
                    "charm",
                    "influence",
                  ],
                },
                difficulty: { type: "integer", minimum: 1, maximum: 4 },
                nextEventId: { type: "string" },
                requiredItems: { type: "array", items: { type: "string" } },
                flagsAdded: { type: "object" },
                flagIncrements: { type: "object" },

                // ── Success/Failure Effects ─────────────────────
                successEffect: {
                  type: "object",
                  properties: {
                    outcomeText: { type: "string" },
                    fearChange: { type: "integer" },
                    threatChange: { type: "integer" },
                    statChanges: { type: "object" },
                    flagsAdded: { type: "object" },
                    addItem: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                      },
                    },
                  },
                },
                failEffect: {
                  type: "object",
                  properties: {
                    outcomeText: { type: "string" },
                    fearChange: { type: "integer" },
                    threatChange: { type: "integer" },
                    statChanges: { type: "object" },
                    flagsAdded: { type: "object" },
                  },
                },

                // ── Consequences ────────────────────────────────
                partyConsequence: {
                  type: "object",
                  properties: {
                    memberId: { type: "string" },
                    outcome: { type: "string", enum: ["dead", "injured", "missing"] },
                    statusText: { type: "string" },
                    location: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Items ───────────────────────────────────────────────────────
    items: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "name"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          flavor: { type: "string" },
          stat_bonus: { type: "object" },
          use_effect: {
            type: "object",
            properties: {
              flagsAdded: { type: "object" },
            },
          },
        },
      },
    },

    // ── Scenes ──────────────────────────────────────────────────────
    scenes: {
      type: "array",
      items: {
        type: "object",
        required: ["key", "image_url"],
        properties: {
          key: { type: "string" },
          image_url: { type: "string" },
          description: { type: "string" },
        },
      },
    },

    // ── Audio Defaults ──────────────────────────────────────────────
    ambient_sound_defaults: {
      type: "object",
      properties: {
        base_layer: { type: "string" },
        tension_layer: { type: "string" },
        threat_layer: { type: "string" },
      },
    },
  },
};

// Validate a story package against the schema
export function validateStoryPackage(pkg) {
  const errors = [];

  // Required top-level fields
  if (!pkg.story_id) errors.push("Missing required field: story_id");
  if (!pkg.title) errors.push("Missing required field: title");
  if (!pkg.acts || !Array.isArray(pkg.acts) || pkg.acts.length === 0)
    errors.push("Missing or empty required field: acts");
  if (!pkg.events || !Array.isArray(pkg.events) || pkg.events.length === 0)
    errors.push("Missing or empty required field: events");

  // Validate acts
  if (pkg.acts && Array.isArray(pkg.acts)) {
    pkg.acts.forEach((act, i) => {
      if (!act.id) errors.push(`Act ${i}: Missing id`);
      if (!act.label) errors.push(`Act ${i}: Missing label`);
      if (!act.event_range || !act.event_range.start || !act.event_range.end)
        errors.push(`Act ${i}: Missing or invalid event_range`);
      if (!act.description) errors.push(`Act ${i}: Missing description`);
    });
  }

  // Validate events
  if (pkg.events && Array.isArray(pkg.events)) {
    pkg.events.forEach((evt, i) => {
      if (!evt.event_id) errors.push(`Event ${i}: Missing event_id`);
      if (!evt.text) errors.push(`Event ${i}: Missing text`);

      // Validate choices
      if (evt.choices && Array.isArray(evt.choices)) {
        evt.choices.forEach((choice, ci) => {
          if (!choice.text) errors.push(`Event ${i}, Choice ${ci}: Missing text`);
          if (!choice.statUsed) errors.push(`Event ${i}, Choice ${ci}: Missing statUsed`);
          if (choice.difficulty === undefined || choice.difficulty < 1 || choice.difficulty > 4)
            errors.push(`Event ${i}, Choice ${ci}: Invalid difficulty`);
        });
      }
    });
  }

  // Validate items (optional but must be well-formed if present)
  if (pkg.items && Array.isArray(pkg.items)) {
    pkg.items.forEach((item, i) => {
      if (!item.id) errors.push(`Item ${i}: Missing id`);
      if (!item.name) errors.push(`Item ${i}: Missing name`);
    });
  }

  // Validate scenes (optional)
  if (pkg.scenes && Array.isArray(pkg.scenes)) {
    pkg.scenes.forEach((scene, i) => {
      if (!scene.key) errors.push(`Scene ${i}: Missing key`);
      if (!scene.image_url) errors.push(`Scene ${i}: Missing image_url`);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}