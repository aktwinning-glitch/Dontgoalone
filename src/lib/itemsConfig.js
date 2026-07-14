/**
 * Full item pool — 13 items available across runs.
 * Items are granted via choice effects: { addItem: "item_id" }
 * and consumed via removeItem.
 */
export const ITEMS = {
  rusted_key: {
    id: "rusted_key",
    name: "Rusted Key",
    emoji: "🗝️",
    description: "Opens something that shouldn't still be locked.",
    stat_bonus: { intelligence: 1 },
    usable: false,
    flavor: "The teeth are worn smooth. Someone used this recently.",
  },
  old_polaroid: {
    id: "old_polaroid",
    name: "Old Polaroid",
    emoji: "📷",
    description: "A face scratched out. The rest of the group is smiling.",
    stat_bonus: { intelligence: 2 },
    usable: true,
    use_effect: { flagsAdded: { photo_revealed: true } },
    use_label: "Show the group",
    flavor: "Three years ago. Six people. Someone didn't want to be remembered.",
  },
  dying_phone: {
    id: "dying_phone",
    name: "Phone (1%)",
    emoji: "📱",
    description: "One message left in it before it dies.",
    stat_bonus: { intelligence: 1, charm: 1 },
    usable: true,
    use_effect: { flagsAdded: { sender_named: true } },
    use_label: "Check who sent the message",
    flavor: "The screen keeps flickering. The signal's wrong for this area.",
  },
  bloody_hoodie: {
    id: "bloody_hoodie",
    name: "Blood-stained Hoodie",
    emoji: "🩸",
    description: "Found folded in a drawer. Not yours. Probably not anyone's you know.",
    stat_bonus: { strength: 1 },
    usable: true,
    use_effect: { flagsAdded: { evidence_found: true } },
    use_label: "Show it as evidence",
    flavor: "Still damp.",
  },
  torn_map: {
    id: "torn_map",
    name: "Torn Map Fragment",
    emoji: "🗺️",
    description: "Half a map of the property. Includes a structure not on any listing.",
    stat_bonus: { speed: 1, intelligence: 1 },
    usable: false,
    flavor: "Something's circled twice in red pen. The ink ran.",
  },
  broken_flashlight: {
    id: "broken_flashlight",
    name: "Broken Flashlight",
    emoji: "🔦",
    description: "Flickers at the wrong moments. Still better than nothing.",
    stat_bonus: { resilience: 1 },
    usable: false,
    flavor: "Battery is dying. Of course it is.",
  },
  locket: {
    id: "locket",
    name: "Locket",
    emoji: "🔮",
    description: "Snaps open if you press the hinge. There's something folded inside.",
    stat_bonus: { charm: 2 },
    usable: true,
    use_effect: { flagsAdded: { old_secret_revealed: true } },
    use_label: "Open it",
    flavor: "Whoever left this didn't mean to.",
  },
  matchbook: {
    id: "matchbook",
    name: "Matchbook",
    emoji: "🔥",
    description: "Four matches left. Fire is useful. Fire is also loud.",
    stat_bonus: { strength: 1, resilience: 1 },
    usable: true,
    use_effect: { flagsAdded: { fire_used: true } },
    use_label: "Light it",
    flavor: "From the bar on the way here. Someone's number on the inside cover.",
  },
  crossed_notebook: {
    id: "crossed_notebook",
    name: "Notebook",
    emoji: "📓",
    description: "Names written inside. Most of them crossed out.",
    stat_bonus: { intelligence: 2, charm: 1 },
    usable: true,
    use_effect: { flagsAdded: { notebook_read: true, suspect_trapped: true } },
    use_label: "Read it aloud",
    flavor: "The handwriting gets worse toward the end.",
  },
  kitchen_knife: {
    id: "kitchen_knife",
    name: "Kitchen Knife",
    emoji: "🔪",
    description: "Useful. Makes everyone nervous when you hold it.",
    stat_bonus: { strength: 2 },
    usable: false,
    flavor: "Clean. Recently cleaned.",
  },
  basement_card: {
    id: "basement_card",
    name: "Basement Access Card",
    emoji: "🎴",
    description: "Grants access to the lower level. Why does this cabin need an access card?",
    stat_bonus: { intelligence: 1, speed: 1 },
    usable: false,
    flavor: "Laminated. Official-looking. Wrong.",
  },
  voice_recorder: {
    id: "voice_recorder",
    name: "Voice Recorder",
    emoji: "🎙️",
    description: "Already has recordings on it. You didn't make them.",
    stat_bonus: { intelligence: 3 },
    usable: true,
    use_effect: { flagsAdded: { recording_played: true, old_secret_revealed: true } },
    use_label: "Play the recording",
    flavor: "The date on it is three years ago. The last voice is familiar.",
  },
  charm_bracelet: {
    id: "charm_bracelet",
    name: "Charm Bracelet",
    emoji: "✨",
    description: "Belonged to someone. Wearing it makes people soften toward you.",
    stat_bonus: { charm: 2, influence: 2 },
    usable: false,
    flavor: "Someone left this here on purpose or didn't survive to take it back.",
  },
};

export function getItem(id) {
  return ITEMS[id] || null;
}

export function getInventoryStatBonus(inventory = [], statName) {
  let total = 0;
  for (const item of inventory) {
    const def = getItem(item.id || item);
    if (def?.stat_bonus?.[statName]) total += def.stat_bonus[statName];
  }
  return total;
}