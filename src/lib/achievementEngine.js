/**
 * Achievement engine — evaluates across all RunHistory records.
 * Each achievement has an `earned` predicate that receives the full runs array.
 */

export const ACHIEVEMENTS = [
  {
    id: "survivor",
    name: "Survivor",
    emoji: "🌅",
    description: "Complete a run with a good or mixed ending.",
    rarity: "common",
    color: "hsl(123 68% 55%)",
    bg: "hsl(123 68% 55% / 0.12)",
    border: "hsl(123 68% 55% / 0.3)",
    earned: (runs) => runs.some(r => r.ending_type === "good" || r.ending_type === "mixed"),
  },
  {
    id: "true_detective",
    name: "True Detective",
    emoji: "🔍",
    description: "Name the killer correctly in a run (sender_named flag set).",
    rarity: "uncommon",
    color: "hsl(200 65% 60%)",
    bg: "hsl(200 65% 60% / 0.12)",
    border: "hsl(200 65% 60% / 0.3)",
    earned: (runs) => runs.some(r => _hasFlag(r, "sender_named")),
  },
  {
    id: "sacrificial_lamb",
    name: "Sacrificial Lamb",
    emoji: "🕯️",
    description: "Offer yourself so others can escape.",
    rarity: "uncommon",
    color: "hsl(271 87% 68%)",
    bg: "hsl(271 87% 68% / 0.12)",
    border: "hsl(271 87% 68% / 0.3)",
    earned: (runs) => runs.some(r => _hasFlag(r, "self_sacrifice")),
  },
  {
    id: "traitor",
    name: "Traitor",
    emoji: "🗡️",
    description: "Betray an ally during a run.",
    rarity: "uncommon",
    color: "hsl(351 78% 60%)",
    bg: "hsl(351 78% 60% / 0.12)",
    border: "hsl(351 78% 60% / 0.3)",
    earned: (runs) => runs.some(r => _hasFlag(r, "betrayed_ally")),
  },
  {
    id: "truth_teller",
    name: "Truth Teller",
    emoji: "📣",
    description: "Speak the truth even when it hurts.",
    rarity: "common",
    color: "hsl(40 90% 62%)",
    bg: "hsl(40 90% 62% / 0.12)",
    border: "hsl(40 90% 62% / 0.3)",
    earned: (runs) => runs.some(r => _hasFlag(r, "truth_spoken")),
  },
  {
    id: "no_one_left",
    name: "No One Left",
    emoji: "💀",
    description: "Finish a run where the entire party was lost.",
    rarity: "rare",
    color: "hsl(18 75% 60%)",
    bg: "hsl(18 75% 60% / 0.12)",
    border: "hsl(18 75% 60% / 0.3)",
    earned: (runs) => runs.some(r => r.survivors_count === 0 && r.total_party > 0),
  },
  {
    id: "paranoid",
    name: "Paranoid",
    emoji: "👁️",
    description: "Trap the suspect in any run.",
    rarity: "uncommon",
    color: "hsl(271 87% 65%)",
    bg: "hsl(271 87% 65% / 0.12)",
    border: "hsl(271 87% 65% / 0.3)",
    earned: (runs) => runs.some(r => _hasFlag(r, "suspect_trapped")),
  },
  {
    id: "descent",
    name: "Into the Dark",
    emoji: "🕳️",
    description: "Enter the basement during a run.",
    rarity: "common",
    color: "hsl(252 8% 55%)",
    bg: "hsl(252 10% 18%)",
    border: "hsl(252 10% 28%)",
    earned: (runs) => runs.some(r => _hasFlag(r, "basement_entered")),
  },
  {
    id: "all_saved",
    name: "Perfect Night",
    emoji: "⭐",
    description: "Save every party member in a single run.",
    rarity: "rare",
    color: "hsl(40 90% 62%)",
    bg: "hsl(40 90% 62% / 0.15)",
    border: "hsl(40 90% 62% / 0.4)",
    earned: (runs) => runs.some(r => r.survivors_count > 0 && r.survivors_count === r.total_party),
  },
  {
    id: "veteran",
    name: "Veteran",
    emoji: "🎖️",
    description: "Complete 5 or more runs.",
    rarity: "rare",
    color: "hsl(38 95% 58%)",
    bg: "hsl(38 95% 58% / 0.12)",
    border: "hsl(38 95% 58% / 0.3)",
    earned: (runs) => runs.length >= 5,
  },
];

const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2 };

function _hasFlag(run, flag) {
  try {
    const flags = JSON.parse(run.major_flags || "[]");
    return flags.includes(flag);
  } catch { return false; }
}

/**
 * Evaluate all achievements against a list of RunHistory records.
 * Returns array of { ...achievement, isEarned: bool }
 */
export function evaluateAchievements(runs = []) {
  return ACHIEVEMENTS
    .map(a => ({ ...a, isEarned: a.earned(runs) }))
    .sort((a, b) => {
      // Earned first, then by rarity desc
      if (a.isEarned !== b.isEarned) return a.isEarned ? -1 : 1;
      return RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
    });
}