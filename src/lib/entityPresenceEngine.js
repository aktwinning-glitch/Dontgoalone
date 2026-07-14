/**
 * Entity / Killer Presence Engine — Phase 2
 * Tracks stalking patterns, aggression escalation, noise trails,
 * and observed behaviour. Makes the threat feel intelligent and active.
 * Pure logic — no React, no side effects.
 */

// ── Presence state shape ──────────────────────────────────────────────────────
// {
//   threat: 0–100,
//   location: string|null,      // last known entity location
//   lastSeen: number,           // choiceCount when last spotted
//   aggressionLevel: 0–3,
//   noiseTrail: string[],       // zones that made noise recently
//   observedBehaviors: string[],// things player/party have noticed
//   stalkedMemberId: string|null,
// }

export function createEntityState() {
  return {
    threat:            10,
    location:          null,
    lastSeen:          -999,
    aggressionLevel:   0,
    noiseTrail:        [],
    observedBehaviors: [],
    stalkedMemberId:   null,
  };
}

// ── Aggression escalation ─────────────────────────────────────────────────────
// 0 = passive/hiding | 1 = stalking | 2 = active hunting | 3 = attacking
export function getAggressionLevel(threat) {
  if (threat >= 82) return 3;
  if (threat >= 60) return 2;
  if (threat >= 35) return 1;
  return 0;
}

export const AGGRESSION_LABELS = ["Passive", "Stalking", "Hunting", "Attacking"];

// ── Entity location logic ─────────────────────────────────────────────────────
// Entity is drawn to noise zones; prefers isolated members
export function computeEntityLocation(noiseTrail, isolatedMember, currentLocation, availableZones) {
  // If there's recent noise, move toward it
  if (noiseTrail.length > 0) {
    const noisyZone = noiseTrail[noiseTrail.length - 1];
    if (availableZones.includes(noisyZone)) return noisyZone;
  }
  // Move toward isolated member
  if (isolatedMember?.currentLocation && availableZones.includes(isolatedMember.currentLocation)) {
    return isolatedMember.currentLocation;
  }
  // Drift to a random adjacent zone
  if (currentLocation && availableZones.length > 0) {
    return availableZones[Math.floor(Math.random() * availableZones.length)];
  }
  return currentLocation;
}

// ── Observed behavior log ─────────────────────────────────────────────────────
const BEHAVIOR_OBSERVATIONS = {
  passive: [
    "You find a window with condensation on the outside — like something pressed against it.",
    "A chair has moved. You're certain it wasn't there before.",
    "The back door is unlocked. It was definitely locked.",
  ],
  stalking: [
    "Something moved between the trees and the light. Too deliberate to be wind.",
    "You found a trail of marks leading toward the house.",
    "Someone's been in this room recently. You can feel it.",
    "A sound stops the moment you make one. It was listening.",
  ],
  hunting: [
    "Whatever this is, it knows where you are.",
    "You caught a shape in the window for half a second. It was watching the group.",
    "The thing is circling. You can tell by the way the sounds move.",
    "Something knocked. Three times. Then silence.",
  ],
  attacking: [
    "It's inside.",
    "The difference between you and it right now is seconds.",
    "It's not waiting anymore.",
  ],
};

export function getEntityObservation(aggressionLevel) {
  const poolKey = ["passive", "stalking", "hunting", "attacking"][aggressionLevel] || "stalking";
  const pool = BEHAVIOR_OBSERVATIONS[poolKey];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Should entity observation appear? ────────────────────────────────────────
export function shouldShowEntityObservation(aggressionLevel, choicesSinceLastObservation = 0) {
  const baseProb = [0.05, 0.18, 0.38, 0.70][aggressionLevel] || 0.05;
  const urgencyBoost = Math.min(0.25, choicesSinceLastObservation * 0.04);
  return Math.random() < baseProb + urgencyBoost;
}

// ── Noise trail management ────────────────────────────────────────────────────
export function addToNoiseTrail(trail = [], zone, maxLength = 4) {
  const updated = zone ? [...trail, zone] : [...trail];
  return updated.slice(-maxLength);
}

// ── Target selection: who is the entity stalking? ────────────────────────────
// Prefers: isolated members, low trust, low resilience
export function selectStalkedMember(party, killerMemberId) {
  const candidates = party.filter(
    m => m.isAlive && !m.isMissing && !m.isPlayer && m.id !== killerMemberId
  );
  if (!candidates.length) return null;

  // Score each candidate by vulnerability
  const scored = candidates.map(m => ({
    member: m,
    score: (10 - (m.trustWithPlayer ?? 5))     // hostile members more targeted (irony)
      + (10 - (m.resilience ?? 5))             // low resilience
      + (m.currentLocation !== party[0]?.currentLocation ? 5 : 0), // isolated
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.member || null;
}

// ── Threat delta from entity actions ─────────────────────────────────────────
export function getEntityThreatDelta(aggressionLevel, playerMadeNoise, isSameZone) {
  let delta = [0, 2, 4, 8][aggressionLevel] || 0;
  if (playerMadeNoise) delta += 5;
  if (isSameZone) delta += 6;
  return delta;
}