// Party member engine — with currentLocation support for map system
import { normalizeLocationKey } from "./locationNormalization.js";

export const MEMBER_STATUS = {
  NORMAL:  "normal",
  NERVOUS: "nervous",
  INJURED: "injured",
  MISSING: "missing",
  DEAD:    "dead",
};

// Valid locations matching the cabin map zones
export const LOCATIONS = ["porch", "living", "kitchen", "upstairs", "basement", "woods"];

// Location risk levels — used by lethality system
export const LOCATION_RISK = {
  living:   0,   // safest, group usually here
  kitchen:  10,
  porch:    20,  // exposed
  upstairs: 25,  // alone, hard to escape
  basement: 40,  // no exit, dark
  woods:    55,  // outside, isolated, worst
};

/** Group all alive+present members by location */
export function groupMembersByLocation(party) {
  const groups = {};
  for (const m of party) {
    if (!m.isAlive || m.isMissing) continue;
    const loc = normalizeLocationKey(m.currentLocation || "living");
    if (!groups[loc]) groups[loc] = [];
    groups[loc].push(m);
  }
  return groups;
}

/**
 * After a group split or move, re-evaluate isolation flags.
 * A member is "separatedFromGroup" if they are the only alive person in a high-risk location.
 */
export function recalculateIsolation(party) {
  const groups = groupMembersByLocation(party);
  return party.map(m => {
    if (!m.isAlive || m.isMissing) return m;
    const loc = normalizeLocationKey(m.currentLocation || "living");
    const groupmates = (groups[loc] || []).filter(g => g.id !== m.id);
    const locationRisk = LOCATION_RISK[loc] || 0;
    const isIsolated = groupmates.length === 0 && locationRisk >= 20;
    return {
      ...m,
      hiddenFlags: {
        ...m.hiddenFlags,
        separatedFromGroup: isIsolated,
      },
    };
  });
}

export const DEFAULT_HIDDEN_FLAGS = {
  separatedFromGroup: false,
  panicking:          false,
  targetedByThreat:   false,
  injuredEarlier:     false,
  distrustsPlayer:    false,
  touchedObject:      false,
};

/**
 * Build a party member from a Character entity.
 * Assigns a starting location based on index so the map is populated from frame 1.
 */
export function createPartyMember(character, isPlayer = false, index = 0) {
  return {
    id: character.id,
    name: character.name,
    portraitKey: character.portrait_url || null,
    roleTag: character.description || null,
    isPlayer,
    isAlive: true,
    isMissing: false,
    isInjured: false,
    trustWithPlayer: 5,
    fearLevel: 10,
    currentStatusText: "",
    currentLocation: isPlayer ? "living" : LOCATIONS[index % LOCATIONS.length],
    hiddenFlags: { ...DEFAULT_HIDDEN_FLAGS },
  };
}

export function getMemberStatus(member) {
  if (!member.isAlive) return MEMBER_STATUS.DEAD;
  if (member.isMissing) return MEMBER_STATUS.MISSING;
  if (member.isInjured) return MEMBER_STATUS.INJURED;
  if (member.fearLevel > 60 || member.hiddenFlags.panicking) return MEMBER_STATUS.NERVOUS;
  return MEMBER_STATUS.NORMAL;
}

/**
 * Apply a party consequence to a member by id.
 * outcome: "safe" | "injured" | "missing" | "dead"
 * Also updates currentLocation accordingly.
 */
export function applyPartyConsequence(party, memberId, outcome, statusText = "") {
  return party.map(m => {
    if (m.id !== memberId) return m;
    const updated = { ...m, hiddenFlags: { ...m.hiddenFlags } };
    if (outcome === "safe") {
      updated.isAlive = true;
      updated.isMissing = false;
      updated.isInjured = false;
      updated.currentStatusText = statusText || "Made it out safe.";
    } else if (outcome === "injured") {
      updated.isInjured = true;
      updated.hiddenFlags.injuredEarlier = true;
      updated.fearLevel = Math.min(100, updated.fearLevel + 20);
      updated.currentStatusText = statusText || "Hurt. Badly.";
    } else if (outcome === "missing") {
      updated.isMissing = true;
      updated.hiddenFlags.separatedFromGroup = true;
      updated.currentLocation = "woods"; // missing members drift outside
      updated.currentStatusText = statusText || "Disappeared. No one knows where.";
    } else if (outcome === "dead") {
      updated.isAlive = false;
      updated.isMissing = false;
      updated.currentStatusText = statusText || "Gone.";
    }
    return updated;
  });
}

export function applyHiddenRisk(party, memberId, riskFlags = {}) {
  return party.map(m => {
    if (m.id !== memberId) return m;
    return { ...m, hiddenFlags: { ...m.hiddenFlags, ...riskFlags } };
  });
}

export function updateMemberState(party, memberId, changes = {}) {
  return party.map(m => {
    if (m.id !== memberId) return m;
    const updated = { ...m };
    if (changes.fearDelta !== undefined) {
      updated.fearLevel = Math.max(0, Math.min(100, m.fearLevel + changes.fearDelta));
    }
    if (changes.trustDelta !== undefined) {
      updated.trustWithPlayer = Math.max(0, Math.min(10, m.trustWithPlayer + changes.trustDelta));
    }
    if (changes.statusText !== undefined) {
      updated.currentStatusText = changes.statusText;
    }
    if (changes.location !== undefined) {
      // Normalize location before storing
      updated.currentLocation = normalizeLocationKey(changes.location);
    }
    return updated;
  });
}

/**
 * Move a member to a new location.
 * Dead or missing members are never moved unless force: true.
 * Exposed for use in event resolution.
 */
export function moveMember(party, memberId, location, { force = false } = {}) {
  const normalized = normalizeLocationKey(location);
  return party.map(m => {
    if (m.id !== memberId) return m;
    // Never move dead/missing unless forced
    if (!force && (!m.isAlive || m.isMissing)) return m;
    return { ...m, currentLocation: normalized };
  });
}

export function getPartyFearModifier(party) {
  const dead = party.filter(m => !m.isAlive).length;
  const missing = party.filter(m => m.isMissing).length;
  return dead * 8 + missing * 4;
}

export function getActivePartyCount(party) {
  return party.filter(m => m.isAlive && !m.isMissing).length;
}

/**
 * Returns true if all alive non-missing members share the same location.
 * Used by death trigger to enforce "group together = no random deaths" rule.
 */
export function isGroupedTogether(party) {
  const active = party.filter(m => m.isAlive && !m.isMissing);
  if (active.length <= 1) return true;
  const loc = normalizeLocationKey(active[0].currentLocation || "living");
  return active.every(m => normalizeLocationKey(m.currentLocation || "living") === loc);
}

/**
 * Returns only alive, present characters — safe to use for dialogue and map rendering.
 */
export function getAliveParty(party) {
  return party.filter(m => m.isAlive && !m.isMissing);
}

/**
 * Filter a speaker pool to exclude dead/missing characters.
 * Hard rule: dead characters must never appear in dialogue.
 */
export function filterSpeakerPool(party) {
  return party.filter(m => m.isAlive && !m.isMissing && !m.isPlayer);
}