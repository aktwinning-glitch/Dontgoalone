/**
 * Tension Escalation Engine — Phase 2
 * Drives pre-danger atmospheric signals: flicker, sound distortion,
 * anxious dialogue, and environmental unease BEFORE lethal events.
 * Pure logic — no React, no side effects.
 */

// ── Tension tier thresholds ────────────────────────────────────────────────────
export const TENSION_TIERS = {
  CALM:     { min: 0,  max: 20,  label: "Calm",      flicker: false, whisper: false, pulse: false },
  UNEASY:   { min: 21, max: 45,  label: "Uneasy",    flicker: false, whisper: true,  pulse: false },
  RISING:   { min: 46, max: 65,  label: "Rising",    flicker: true,  whisper: true,  pulse: false },
  DANGER:   { min: 66, max: 80,  label: "Danger",    flicker: true,  whisper: true,  pulse: true  },
  IMMINENT: { min: 81, max: 100, label: "Imminent",  flicker: true,  whisper: true,  pulse: true  },
};

export function getTensionTier(threat, fear) {
  const score = Math.round(threat * 0.6 + fear * 0.4);
  if (score >= 81) return TENSION_TIERS.IMMINENT;
  if (score >= 66) return TENSION_TIERS.DANGER;
  if (score >= 46) return TENSION_TIERS.RISING;
  if (score >= 21) return TENSION_TIERS.UNEASY;
  return TENSION_TIERS.CALM;
}

// ── Warning sign pool — atmospheric text hints ────────────────────────────────
const WARNING_SIGNS = {
  UNEASY: [
    "Something shifts at the edge of your vision.",
    "The house breathes differently now.",
    "A door you didn't touch is slightly ajar.",
    "The temperature dropped. Noticeably.",
    "You can hear your own heartbeat.",
  ],
  RISING: [
    "Footsteps. Somewhere above you. Then nothing.",
    "The light in the hallway flickers once and holds.",
    "One of the windows is fogged from the inside.",
    "You're certain you heard breathing that wasn't yours.",
    "Something dragged across the floor upstairs.",
    "The shadows don't match the light source.",
  ],
  DANGER: [
    "A low sound — not wind, not the house. Something patient.",
    "The lights cut out for a half-second. When they come back, something's moved.",
    "Every instinct you have says: don't make noise.",
    "You stop breathing to listen. You can hear something else doing the same.",
    "A door slams shut somewhere in the dark.",
    "Movement in the window reflection. You spin. Nothing.",
  ],
  IMMINENT: [
    "It's close. You don't know how you know. You know.",
    "Someone in the group says your name in a voice that doesn't sound right.",
    "The lights die completely. Three full seconds of black.",
    "You feel watched from a direction that doesn't make sense.",
    "Run. Part of you is already running. The rest of you hasn't caught up.",
  ],
};

export function getWarningSign(tier) {
  const pool = WARNING_SIGNS[tier.label] || WARNING_SIGNS.UNEASY;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Pre-danger signal: should a warning sign appear this event? ───────────────
// Probability rises with tension; warnings fire more often near lethal events.
export function shouldShowWarning(tier, consecutiveDangerEvents = 0) {
  const base = { CALM: 0, UNEASY: 0.12, RISING: 0.28, DANGER: 0.55, IMMINENT: 0.82 };
  const prob = (base[tier.label] || 0) + consecutiveDangerEvents * 0.08;
  return Math.random() < Math.min(0.9, prob);
}

// ── Flicker intensity for AtmosphereLayer ─────────────────────────────────────
// Returns { flickerRate, flickerOpacity, flickerColor }
export function getFlickerParams(tier, threat) {
  const t = threat / 100;
  return {
    flickerRate:    tier === TENSION_TIERS.IMMINENT ? 0.15 : tier === TENSION_TIERS.DANGER ? 0.25 : 0.4,
    flickerOpacity: 0.02 + t * 0.06,
    flickerColor:   threat > 70 ? "hsl(351 78% 40%)" : "hsl(271 60% 30%)",
  };
}

// ── Entity stalking state ─────────────────────────────────────────────────────
// Tracks killer/entity presence relative to player location
export function computeEntityPresence(threat, playerLocation, killerLocation) {
  const sameZone = playerLocation && killerLocation && playerLocation === killerLocation;
  const baseAware = threat >= 50;
  return {
    isNearby:    threat >= 40,
    isSameZone:  sameZone,
    isAware:     baseAware,
    isStalking:  threat >= 65,
    isImminent:  threat >= 82,
    proximityLabel: sameZone ? "HERE" : threat >= 80 ? "Close" : threat >= 50 ? "Nearby" : threat >= 30 ? "Distant" : "Gone",
  };
}

// ── Noise trail: actions that attract the entity ──────────────────────────────
export const NOISY_ACTION_TAGS = ["run", "fight", "yell", "break", "shoot", "crash"];

export function isNoisyChoice(choiceText = "") {
  const t = choiceText.toLowerCase();
  return NOISY_ACTION_TAGS.some(tag => t.includes(tag));
}

// ── Tension memory: how many consecutive high-threat events ──────────────────
export function updateTensionMemory(memory = { dangerStreak: 0 }, tier) {
  if (tier.label === "DANGER" || tier.label === "IMMINENT") {
    return { ...memory, dangerStreak: (memory.dangerStreak || 0) + 1 };
  }
  // Small reset — tension doesn't fully drain immediately
  return { ...memory, dangerStreak: Math.max(0, (memory.dangerStreak || 0) - 1) };
}