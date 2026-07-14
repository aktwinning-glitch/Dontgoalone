/**
 * Environmental Effects System
 * Persistent atmospheric conditions derived from player choices/flags.
 * Displayed as status icons in the HUD.
 */

export const ENV_EFFECT_DEFS = {
  stormy: {
    icon: "⛈️",
    label: "Stormy",
    desc: "Movement hindered. Speed checks harder.",
    color: "hsl(216 70% 65%)",
    border: "hsl(216 70% 50% / 0.4)",
    bg: "hsl(216 70% 50% / 0.12)",
  },
  foggy: {
    icon: "🌫️",
    label: "Foggy",
    desc: "Clues obscured. Intelligence reduced.",
    color: "hsl(240 12% 68%)",
    border: "hsl(240 12% 55% / 0.4)",
    bg: "hsl(240 12% 55% / 0.10)",
  },
  haunted: {
    icon: "👁️",
    label: "Haunted",
    desc: "Something watches. Threat rises passively.",
    color: "hsl(271 87% 75%)",
    border: "hsl(271 87% 65% / 0.4)",
    bg: "hsl(271 87% 65% / 0.12)",
  },
  panicked: {
    icon: "💀",
    label: "Panicked",
    desc: "Fear spreads faster through the group.",
    color: "hsl(351 78% 68%)",
    border: "hsl(351 78% 60% / 0.4)",
    bg: "hsl(351 78% 60% / 0.12)",
  },
  isolated: {
    icon: "❄️",
    label: "Isolated",
    desc: "No help coming. You're on your own.",
    color: "hsl(186 72% 62%)",
    border: "hsl(186 72% 50% / 0.4)",
    bg: "hsl(186 72% 50% / 0.10)",
  },
  cursed: {
    icon: "🩸",
    label: "Cursed",
    desc: "Every failure costs more than it should.",
    color: "hsl(351 80% 55%)",
    border: "hsl(351 80% 45% / 0.4)",
    bg: "hsl(351 80% 45% / 0.12)",
  },
};

/**
 * Derive active environmental effects purely from player state + flags.
 * No extra storage needed — recomputed on every render.
 */
export function computeEnvEffects(player) {
  if (!player) return [];
  const flags = player.flags || {};
  const active = [];

  // Haunted: made noise 3+ times or betrayed
  if ((flags.noise_made || 0) >= 3 || flags.betrayed_ally) active.push("haunted");

  // Panicked: panic has spread through group
  if (flags.panic_spread) active.push("panicked");

  // Foggy: explicit flag or very high fear at night 2+
  if (flags.fog_present) active.push("foggy");
  else if (player.night >= 2 && (player.stats?.fear || 0) >= 75 && !active.includes("panicked")) active.push("foggy");

  // Stormy: explicit flag or high threat + night 2+
  if (flags.storm_active) active.push("stormy");
  else if (player.night >= 2 && (player.threat || 0) >= 60 && flags.noise_made >= 2) active.push("stormy");

  // Isolated: betrayed + low party count
  if (flags.betrayed_ally && (player.choicesMade || 0) > 8) active.push("isolated");

  // Cursed: multiple failures stacked
  if ((flags.noise_made || 0) >= 4 && (player.threat || 0) >= 70) active.push("cursed");

  return [...new Set(active)].slice(0, 4); // cap at 4 icons
}