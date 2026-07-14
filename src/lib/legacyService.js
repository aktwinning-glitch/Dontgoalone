import { base44 } from "@/api/base44Client";

const parseJson = (value, fallback) => {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return fallback; }
};

export function normalizeLegacyProfile(record = {}) {
  return {
    ...record,
    legacy_currency: Number(record.legacy_currency || 0),
    completed_runs: Number(record.completed_runs || 0),
    best_survivor_count: Number(record.best_survivor_count || 0),
    unlocked_trait_ids: parseJson(record.unlocked_trait_ids, []),
    discovered_clue_ids: parseJson(record.discovered_clue_ids, []),
    unlocked_ending_ids: parseJson(record.unlocked_ending_ids, []),
    survivor_records: parseJson(record.survivor_records, []),
    headquarters_upgrades: parseJson(record.headquarters_upgrades, {}),
    challenge_unlocks: parseJson(record.challenge_unlocks, []),
  };
}

export async function getLegacyProfile() {
  const user = await base44.auth.me();
  const email = user?.email || "local-player";
  const matches = await base44.entities.LegacyProfile.filter({ user_email: email });
  if (matches?.[0]) return normalizeLegacyProfile(matches[0]);
  const created = await base44.entities.LegacyProfile.create({ user_email: email });
  return normalizeLegacyProfile(created);
}

const mergeUnique = (a = [], b = []) => Array.from(new Set([...(a || []), ...(b || [])]));

function mergeSurvivors(existing = [], incoming = []) {
  const map = new Map(existing.map(item => [item.characterId || item.characterName, { ...item }]));
  incoming.forEach(item => {
    const key = item.characterId || item.characterName;
    const previous = map.get(key) || {};
    map.set(key, {
      ...previous,
      ...item,
      runsSurvived: Number(previous.runsSurvived || 0) + Number(item.runsSurvived || 1),
    });
  });
  return Array.from(map.values());
}

export async function applyLegacyRun(profile, result, selectedTraitIds = []) {
  const normalized = normalizeLegacyProfile(profile);
  const survivors = mergeSurvivors(normalized.survivor_records, result.survivorRecords);
  const next = {
    legacy_currency: normalized.legacy_currency + Number(result.legacyEarned || 0),
    completed_runs: normalized.completed_runs + 1,
    best_survivor_count: Math.max(normalized.best_survivor_count, result.survivorRecords.length),
    unlocked_trait_ids: JSON.stringify(mergeUnique(normalized.unlocked_trait_ids, selectedTraitIds)),
    discovered_clue_ids: JSON.stringify(mergeUnique(normalized.discovered_clue_ids, result.clueIds)),
    unlocked_ending_ids: JSON.stringify(mergeUnique(normalized.unlocked_ending_ids, [result.endingId])),
    survivor_records: JSON.stringify(survivors),
    challenge_unlocks: JSON.stringify(normalized.challenge_unlocks),
    headquarters_upgrades: JSON.stringify(normalized.headquarters_upgrades),
  };
  const updated = await base44.entities.LegacyProfile.update(normalized.id, next);
  return normalizeLegacyProfile(updated);
}
