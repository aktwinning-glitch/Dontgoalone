// Trust / Suspicion / Cohesion engine
// Operates on party arrays and score maps — no React, no side effects

// ── Trust ─────────────────────────────────────────────────────────────────────
// Per-character, 0–10. Already stored on party member as trustWithPlayer.
// These helpers compute derived labels and modifiers.

export const TRUST_LABELS = {
  hostile: { label: "Hostile", min: 0, max: 1, color: "hsl(351 78% 60%)" },
  distant: { label: "Distant", min: 2, max: 3, color: "hsl(40 90% 55%)" },
  neutral: { label: "Neutral", min: 4, max: 6, color: "hsl(252 8% 55%)" },
  loyal:   { label: "Loyal",   min: 7, max: 8, color: "hsl(200 65% 55%)" },
  devoted: { label: "Devoted", min: 9, max: 10, color: "hsl(123 68% 55%)" },
};

export function getTrustLabel(trust) {
  if (trust <= 1) return TRUST_LABELS.hostile;
  if (trust <= 3) return TRUST_LABELS.distant;
  if (trust <= 6) return TRUST_LABELS.neutral;
  if (trust <= 8) return TRUST_LABELS.loyal;
  return TRUST_LABELS.devoted;
}

export function getTrustBonus(trust) {
  if (trust <= 1) return -2;
  if (trust <= 3) return -1;
  if (trust <= 6) return 0;
  if (trust <= 8) return 1;
  return 2;
}

// ── Suspicion ─────────────────────────────────────────────────────────────────
// Per-character map: { [characterId]: number (0–100) }

export function initSuspicionScores(partyIds) {
  const scores = {};
  partyIds.forEach(id => { scores[id] = 10; });
  return scores;
}

export function applySuspicionDelta(scores, characterId, delta) {
  const current = scores[characterId] ?? 0;
  return { ...scores, [characterId]: Math.max(0, Math.min(100, current + delta)) };
}

export function getSuspicionLabel(score) {
  if (score <= 15) return { label: "Clear", color: "hsl(123 68% 55%)" };
  if (score <= 35) return { label: "Uncertain", color: "hsl(200 65% 55%)" };
  if (score <= 60) return { label: "Suspicious", color: "hsl(40 90% 62%)" };
  if (score <= 80) return { label: "Likely", color: "hsl(18 75% 60%)" };
  return { label: "Guilty", color: "hsl(351 78% 60%)" };
}

export function getMostSuspicious(suspicionScores, party) {
  let topId = null;
  let topScore = -1;
  for (const [id, score] of Object.entries(suspicionScores)) {
    const member = party.find(m => m.id === id);
    if (!member || !member.isAlive || member.isPlayer) continue;
    if (score > topScore) { topScore = score; topId = id; }
  }
  return topId;
}

// ── Cohesion ──────────────────────────────────────────────────────────────────
// Group-level score 0–100. Affects panic events, group outcomes, trust decays.

export function getCohesionLabel(score) {
  if (score >= 75) return { label: "Unified", color: "hsl(123 68% 55%)" };
  if (score >= 50) return { label: "Holding", color: "hsl(200 65% 55%)" };
  if (score >= 30) return { label: "Fraying", color: "hsl(40 90% 62%)" };
  if (score >= 10) return { label: "Breaking", color: "hsl(18 75% 60%)" };
  return { label: "Collapsed", color: "hsl(351 78% 60%)" };
}

export function applyCohesionDelta(current, delta) {
  return Math.max(0, Math.min(100, current + delta));
}

// Higher cohesion reduces chance of bad panic outcomes
export function getCohesionPanicReduction(cohesion) {
  if (cohesion >= 75) return 15;
  if (cohesion >= 50) return 8;
  if (cohesion >= 30) return 3;
  return 0;
}

// ── Killer selection ──────────────────────────────────────────────────────────
// Replayable: selected from the active non-player party each run.
// The killer character's behavior / dialogue should feel plausible regardless of who is chosen.

export function selectKiller(party) {
  const candidates = party.filter(m => !m.isPlayer && m.isAlive);
  if (!candidates.length) return null;
  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx].id;
}

// Get suspicion cues for a character (used in killer logic and dialogue selection)
export function getKillerProfile(member, isKiller) {
  return {
    id: member.id,
    isKiller,
    // These suspicion cues exist for ALL characters — some are true, some are misleads
    surfaceText: member.archetypeLabel || "Unknown",
    edgeHint: isKiller ? "surface_calm_edge" : "innocent_suspicious",
  };
}

// ── Effects helper ─────────────────────────────────────────────────────────────
// Apply trust/suspicion/cohesion changes from a choice effect object
// effectPayload shape: { trust: {memberId: delta}, suspicion: {memberId: delta}, cohesion: delta }
export function applyTrustEffects(party, suspicionScores, cohesion, effectPayload = {}) {
  let newParty = [...party];
  let newSuspicion = { ...suspicionScores };
  let newCohesion = cohesion;

  if (effectPayload.trust) {
    for (const [memberId, delta] of Object.entries(effectPayload.trust)) {
      newParty = newParty.map(m => {
        if (m.id !== memberId) return m;
        return { ...m, trustWithPlayer: Math.max(0, Math.min(10, m.trustWithPlayer + delta)) };
      });
    }
  }

  if (effectPayload.suspicion) {
    for (const [memberId, delta] of Object.entries(effectPayload.suspicion)) {
      newSuspicion = applySuspicionDelta(newSuspicion, memberId, delta);
    }
  }

  if (effectPayload.cohesion !== undefined) {
    newCohesion = applyCohesionDelta(newCohesion, effectPayload.cohesion);
  }

  return { party: newParty, suspicionScores: newSuspicion, cohesionScore: newCohesion };
}