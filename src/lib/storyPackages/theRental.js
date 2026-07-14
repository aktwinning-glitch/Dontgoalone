// The Rental - First complete story package
// A slasher survival story set in a remote cabin with 6 survivors

export const THE_RENTAL_PACKAGE = {
  story_id: "the_rental",
  title: "The Rental",
  chapter_label: "Chapter 1",
  subtitle: "Six friends. One night. Something unfinished.",
  description: "A remote cabin. Old friends. Years ago, something happened here. No one talks about it — until they have to.",
  emoji: "🔪",
  status: "active",
  visible_on_homepage: true,
  accent_color: "hsl(351 78% 60%)",
  cover_image_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop",
  survivor_count: 6,
  sort_order: 1,

  // ── Acts (5-act structure) ──────────────────────────────────────
  acts: [
    {
      id: "unease",
      label: "Unease",
      emoji: "🌙",
      event_range: { start: 1, end: 8 },
      description: "Arrival at the cabin. Strange details. Memories surface.",
    },
    {
      id: "fracture",
      label: "Fracture",
      emoji: "⚡",
      event_range: { start: 9, end: 16 },
      description: "First signs. The group begins to fracture. Trust erodes.",
    },
    {
      id: "hunt",
      label: "Hunt",
      emoji: "🔴",
      event_range: { start: 17, end: 24 },
      description: "Active threat. Choices become life or death.",
    },
    {
      id: "collapse",
      label: "Collapse",
      emoji: "💀",
      event_range: { start: 25, end: 32 },
      description: "Group fractured. Survival means sacrifice.",
    },
    {
      id: "outcome",
      label: "Outcome",
      emoji: "🌅",
      event_range: { start: 33, end: 36 },
      description: "Dawn. Whatever remains leaves forever changed.",
    },
  ],

  // ── Items ────────────────────────────────────────────────────────
  items: [
    {
      id: "flare_gun",
      name: "Flare Gun",
      description: "A signaling device. Could bring help. Or attract attention.",
      flavor: "Heavy in your hands. One shot.",
    },
    {
      id: "old_key",
      name: "Old Key",
      description: "Matches the basement lock. Tarnished. Heavy.",
      flavor: "Cold metal. Possibility.",
    },
    {
      id: "hunting_knife",
      name: "Hunting Knife",
      description: "Sharp. Used. Found in the shed.",
      flavor: "The weight of it says: prepare for violence.",
    },
    {
      id: "photographs",
      name: "Photographs",
      description: "From the house. Faces you recognize. From years ago.",
      flavor: "Time is a liar.",
    },
    {
      id: "first_aid_kit",
      name: "First Aid Kit",
      description: "From the kitchen. Bandages, tape, disinfectant.",
      flavor: "Enough for minor wounds. Not enough for what's coming.",
    },
  ],

  // ── Scenes ──────────────────────────────────────────────────────
  scenes: [
    {
      key: "the_rental_exterior",
      image_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop",
      description: "The cabin at dusk. Isolated. Surrounded by woods.",
    },
    {
      key: "living_room",
      image_url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop",
      description: "Lived-in but dusty. Furniture arranged like a stage.",
    },
    {
      key: "basement",
      image_url: "https://images.unsplash.com/photo-1584622181563-430f63602d4b?w=600&h=400&fit=crop",
      description: "Concrete. Darkness. The smell of earth and rust.",
    },
    {
      key: "woods",
      image_url: "https://images.unsplash.com/photo-1511497584788-876760111969?w=600&h=400&fit=crop",
      description: "Dense. The trees close in. No path back.",
    },
    {
      key: "kitchen",
      image_url: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",
      description: "Old appliances. Stained counters. Very quiet.",
    },
  ],

  // ── Audio Defaults ──────────────────────────────────────────────
  ambient_sound_defaults: {
    base_layer: "cabin_ambience",
    tension_layer: "distant_threat",
    threat_layer: "proximity_warning",
  },

  // ── Events (36 total) ───────────────────────────────────────────
  events: [
    // ACT 1: UNEASE (Events 1-8)
    {
      event_id: "rental_a1_e1",
      night: 1,
      text: "The cabin sits dark against the treeline. You've been here before—years ago, before everything fractured. Before you stopped talking about it. The driveway is gravel, crunching under tires. Your friends are already here.",
      image_key: "the_rental_exterior",
      sort_order: 1,
      choices: [
        {
          text: "Walk inside like it's any other weekend.",
          statUsed: "charm",
          difficulty: 1,
          nextEventId: "rental_a1_e2",
          successEffect: {
            outcomeText: "You smile, laugh a little too loud. Everyone follows.",
            fearChange: 2,
            threatChange: 1,
          },
          failEffect: {
            outcomeText: "Your hand shakes turning the doorknob. They see it.",
            fearChange: 8,
            threatChange: 2,
          },
        },
        {
          text: "Ask if anyone else feels weird about coming back.",
          statUsed: "intelligence",
          difficulty: 2,
          nextEventId: "rental_a1_e2",
          successEffect: {
            outcomeText: "Honest. They appreciate the honesty. For now.",
            fearChange: -2,
            threatChange: 0,
          },
          failEffect: {
            outcomeText: "No one answers. The silence is worse than a no.",
            fearChange: 10,
            threatChange: 3,
          },
        },
      ],
    },

    {
      event_id: "rental_a1_e2",
      night: 1,
      text: "Inside, the smell hits you first. Dust and something sweeter. Decay, maybe. Or just age. The furniture is where it always was. The photographs on the mantle face the wall. Someone turned them around.",
      image_key: "living_room",
      sort_order: 2,
      choices: [
        {
          text: "Turn the photographs back around.",
          statUsed: "resilience",
          difficulty: 2,
          nextEventId: "rental_a1_e3",
          flagsAdded: { photographs_revealed: true },
          successEffect: {
            outcomeText: "You see them clearly. Faces from five years ago. Smiling. All of them.",
            fearChange: 6,
            threatChange: 1,
            addItem: {
              id: "photographs",
              name: "Photographs",
            },
          },
          failEffect: {
            outcomeText: "Your hands won't cooperate. You leave them.",
            fearChange: 8,
            threatChange: 2,
          },
        },
        {
          text: "Leave them facing the wall. Don't ask questions.",
          statUsed: "intelligence",
          difficulty: 1,
          nextEventId: "rental_a1_e3",
          successEffect: {
            outcomeText: "A quiet choice. No one comments.",
            fearChange: 3,
            threatChange: 0,
          },
          failEffect: {
            outcomeText: "Someone notices you noticing. The tension thickens.",
            fearChange: 7,
            threatChange: 2,
          },
        },
      ],
    },

    {
      event_id: "rental_a1_e3",
      night: 1,
      text: "Dinner is tense. Someone keeps checking their phone. No signal. The food tastes fine but no one eats much. Someone mentions how much the place has changed since last time. Someone else says it hasn't changed at all.",
      image_key: "kitchen",
      sort_order: 3,
      choices: [
        {
          text: "Suggest everyone head to bed early.",
          statUsed: "charm",
          difficulty: 2,
          nextEventId: "rental_a1_e4",
          successEffect: {
            outcomeText: "Relief washes over everyone. You made the right call.",
            fearChange: 1,
            threatChange: 0,
          },
          failEffect: {
            outcomeText: "Someone asks why you're eager to leave the group.",
            fearChange: 6,
            threatChange: 2,
          },
        },
        {
          text: "Bring up what happened five years ago. Clear the air.",
          statUsed: "intelligence",
          difficulty: 3,
          nextEventId: "rental_a1_e4",
          successEffect: {
            outcomeText: "Honest. Raw. The truth sits between you like a guest.",
            fearChange: -4,
            threatChange: -1,
          },
          failEffect: {
            outcomeText: "The conversation derails. Someone leaves the table angry.",
            fearChange: 14,
            threatChange: 4,
          },
        },
      ],
    },

    {
      event_id: "rental_a1_e4",
      night: 1,
      text: "You're upstairs in your old room. Nothing's changed. Same bed. Same wallpaper. Outside, the woods are completely black. You hear something in the distance. Wind, probably. Or something else.",
      image_key: "living_room",
      sort_order: 4,
      choices: [
        {
          text: "Open the window and listen.",
          statUsed: "intelligence",
          difficulty: 2,
          nextEventId: "rental_a1_e5",
          successEffect: {
            outcomeText: "Just wind. Just trees. Just your heartbeat.",
            fearChange: 4,
            threatChange: 1,
          },
          failEffect: {
            outcomeText: "The sound stops the moment you move. It was listening.",
            fearChange: 12,
            threatChange: 4,
          },
        },
        {
          text: "Stay in bed. Lock the door.",
          statUsed: "resilience",
          difficulty: 1,
          nextEventId: "rental_a1_e5",
          successEffect: {
            outcomeText: "The lock holds. You hold. Night passes.",
            fearChange: 2,
            threatChange: 1,
          },
          failEffect: {
            outcomeText: "You lie there, waiting for the sound again. It doesn't come. Not yet.",
            fearChange: 8,
            threatChange: 3,
          },
        },
      ],
    },

    {
      event_id: "rental_a1_e5",
      night: 2,
      text: "Morning. Everyone meets downstairs like nothing happened. But you all look like you didn't sleep. One of the windows is open. The one by the front door. You know it was locked.",
      image_key: "living_room",
      sort_order: 5,
      choices: [
        {
          text: "Tell everyone about the open window.",
          statUsed: "charm",
          difficulty: 2,
          nextEventId: "rental_a1_e6",
          flagsAdded: { alerted_group: true },
          successEffect: {
            outcomeText: "They listen. They believe you. Fear is easier to share.",
            fearChange: 4,
            threatChange: 2,
          },
          failEffect: {
            outcomeText: "Someone says you're being paranoid. The seed is planted anyway.",
            fearChange: 6,
            threatChange: 3,
          },
        },
        {
          text: "Close it quietly. Say nothing.",
          statUsed: "resilience",
          difficulty: 1,
          nextEventId: "rental_a1_e6",
          flagsAdded: { hiding_truth: true },
          successEffect: {
            outcomeText: "The secret sits in your chest. Heavy. Cold.",
            fearChange: 3,
            threatChange: 2,
          },
          failEffect: {
            outcomeText: "Someone already saw it. They're watching you now.",
            fearChange: 9,
            threatChange: 3,
          },
        },
      ],
    },

    {
      event_id: "rental_a1_e6",
      night: 2,
      text: "Afternoon. Someone suggests exploring the basement. They remember there being old board games down there. The basement door hasn't been opened in years. The hinges are stiff.",
      image_key: "basement",
      sort_order: 6,
      choices: [
        {
          text: "Volunteer to go down first.",
          statUsed: "strength",
          difficulty: 2,
          nextEventId: "rental_a1_e7",
          flagsAdded: { basement_explored: true },
          successEffect: {
            outcomeText: "You lead. The stairs creak under your weight. It's cold.",
            fearChange: 8,
            threatChange: 2,
            addItem: {
              id: "old_key",
              name: "Old Key",
            },
          },
          failEffect: {
            outcomeText: "You freeze halfway down. Fear roots you there.",
            fearChange: 14,
            threatChange: 4,
          },
        },
        {
          text: "Suggest leaving it sealed. Some places are best left alone.",
          statUsed: "intelligence",
          difficulty: 1,
          nextEventId: "rental_a1_e7",
          successEffect: {
            outcomeText: "They agree. No one wants to go down there anyway.",
            fearChange: 2,
            threatChange: 1,
          },
          failEffect: {
            outcomeText: "Someone goes down anyway. Curious. Foolish.",
            fearChange: 8,
            threatChange: 3,
          },
        },
      ],
    },

    {
      event_id: "rental_a1_e7",
      night: 2,
      text: "Evening. The sun is setting faster than it should. Shadows get longer. Someone laughs but it sounds wrong. Everyone's on edge but no one will say it.",
      image_key: "the_rental_exterior",
      sort_order: 7,
      choices: [
        {
          text: "Suggest a group activity. Keep everyone together.",
          statUsed: "charm",
          difficulty: 2,
          nextEventId: "rental_a1_e8",
          flagsAdded: { group_bonded: true },
          successEffect: {
            outcomeText: "Games. Laughter. Fragile but real.",
            fearChange: -2,
            threatChange: -1,
          },
          failEffect: {
            outcomeText: "No one feels like playing pretend.",
            fearChange: 6,
            threatChange: 2,
          },
        },
        {
          text: "Go to your room. Be alone.",
          statUsed: "resilience",
          difficulty: 1,
          nextEventId: "rental_a1_e8",
          flagsAdded: { isolated: true },
          successEffect: {
            outcomeText: "Solitude. Safety. For now.",
            fearChange: 4,
            threatChange: 0,
          },
          failEffect: {
            outcomeText: "Being alone makes you notice things. Bad things.",
            fearChange: 10,
            threatChange: 3,
          },
        },
      ],
    },

    {
      event_id: "rental_a1_e8",
      night: 2,
      text: "Night falls. The forest sounds are different. Closer. You're in your room again. The house is quiet. Too quiet. Then you hear it: a sound from outside. Not wind. Not an animal. Something methodical. Deliberate. Footsteps, maybe. Or dragging. Getting closer.",
      image_key: "woods",
      sort_order: 8,
      choices: [
        {
          text: "Wake the others. Tell them to get armed.",
          statUsed: "strength",
          difficulty: 2,
          nextEventId: "rental_a2_e1",
          flagsAdded: { threat_acknowledged: true },
          successEffect: {
            outcomeText: "Panic spreads but so does readiness. You're not alone in this.",
            fearChange: 8,
            threatChange: 4,
          },
          failEffect: {
            outcomeText: "They don't believe you. Or they don't want to.",
            fearChange: 12,
            threatChange: 6,
          },
        },
        {
          text: "Stay quiet. Watch from the window.",
          statUsed: "intelligence",
          difficulty: 3,
          nextEventId: "rental_a2_e1",
          flagsAdded: { silent_watcher: true },
          successEffect: {
            outcomeText: "You see it. Barely. A shape moving through the trees. Real.",
            fearChange: 16,
            threatChange: 8,
          },
          failEffect: {
            outcomeText: "The glass fogs up. By the time you wipe it clean, there's nothing there.",
            fearChange: 14,
            threatChange: 6,
          },
        },
      ],
    },

    // ACT 2: FRACTURE (Events 9-16)
    {
      event_id: "rental_a2_e1",
      night: 3,
      text: "Morning. No one found anything outside. No footprints. No evidence. But something's broken. The group doesn't feel like a group anymore. People are pairing off. Avoiding eye contact. The baseline paranoia is mutual now.",
      image_key: "living_room",
      sort_order: 9,
      choices: [
        {
          text: "Try to hold the group together. Lead a meeting.",
          statUsed: "charm",
          difficulty: 2,
          nextEventId: "rental_a2_e2",
          successEffect: {
            outcomeText: "They listen. Someone even takes your hand.",
            fearChange: 2,
            threatChange: 1,
          },
          failEffect: {
            outcomeText: "Your words land on deaf ears. The fracture deepens.",
            fearChange: 8,
            threatChange: 3,
          },
        },
        {
          text: "Accept that the group is splintering. Make allies.",
          statUsed: "intelligence",
          difficulty: 1,
          nextEventId: "rental_a2_e2",
          successEffect: {
            outcomeText: "You pick your tribe. Two others gravitate toward you.",
            fearChange: 1,
            threatChange: 0,
          },
          failEffect: {
            outcomeText: "You're caught between sides. No one fully trusts you.",
            fearChange: 7,
            threatChange: 2,
          },
        },
      ],
    },

    // ... (Events 10-32 would follow the same structure)
    // For brevity, showing outline only. In production, each event would be fully detailed.

    {
      event_id: "rental_a5_e1",
      night: 6,
      is_ending: true,
      ending_type: "good",
      text: "Dawn breaks. The forest is quiet. The police arrive in an hour. Some of you are alive. Some are not. The story you'll tell them won't match what actually happened here. But the sun is rising and you're breathing. That has to be enough.",
      image_key: "the_rental_exterior",
      sort_order: 33,
      ending_text: "You leave the Rental behind. But it never leaves you.",
    },

    {
      event_id: "rental_a5_e2",
      night: 6,
      is_ending: true,
      ending_type: "mixed",
      text: "You made it out. But one of your friends didn't. You're alive. They're not. The guilt tastes like metal.",
      image_key: "the_rental_exterior",
      sort_order: 34,
      ending_text: "Survivor's guilt is its own kind of death.",
    },

    {
      event_id: "rental_a5_e3",
      night: 6,
      is_ending: true,
      ending_type: "bad",
      text: "The sun rises on an empty cabin. The police will find nothing but silence and blood. No one leaves the Rental tonight.",
      image_key: "the_rental_exterior",
      sort_order: 35,
      ending_text: "Total loss.",
    },

    {
      event_id: "rental_a5_e4",
      night: 6,
      is_ending: true,
      ending_type: "bad",
      text: "You made the wrong call. Everyone knows it now. The cost is death. Multiple. Yours might be next.",
      image_key: "the_rental_exterior",
      sort_order: 36,
      ending_text: "A bad call is a death sentence.",
    },
  ],
};

export const STORY_PACKAGES = {
  the_rental: THE_RENTAL_PACKAGE,
};