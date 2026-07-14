/**
 * Narrative Memory Engine
 * Persistent runState that tracks ALL narrative decisions and consequences.
 * Every event reads and updates this state — nothing happens in isolation.
 */

export const createRunState = (characterName, characterId, storyId) => ({
  characterName,
  characterId,
  storyId,
  
  // Decision tracking
  decisionsMade: [],      // { eventId, choiceId, text, outcome }
  choiceCount: 0,
  
  // Persistent state
  flags: {},              // key-value arbitrary state
  relationships: {},      // characterId: trustLevel (0-100)
  suspicion: {},          // characterId: suspicionLevel (0-100)
  injuries: {},           // characterId: injuryLevel (0-100)
  fears: {},              // characterId: fearLevel (0-100)
  
  // Inventory & locations
  inventory: [],          // item objects
  locations: {},          // characterId: locationKey
  groupSplits: [],        // { eventId, separatedMembers: [], reason }
  
  // Discoveries
  discoveredClues: [],    // clueId[]
  hiddenRisks: {},        // characterId: riskFlags[]
  
  // Deaths & consequences
  deaths: [],             // { characterId, characterName, eventId, reason }
  missing: [],            // { characterId, characterName, eventId }
  
  // Tracking
  lastEventId: null,
  lastChoiceId: null,
  eventPath: [],          // eventId sequence for debugging
  
  // Running metrics
  totalFear: 0,
  totalThreat: 0,
  nightCount: 1,
});

/**
 * Update runState after a choice is made.
 * Caller passes effect object from choice.successEffect or choice.failEffect.
 */
export const applyChoiceEffect = (runState, eventId, choiceId, choiceText, effect) => {
  runState.lastEventId = eventId;
  runState.lastChoiceId = choiceId;
  runState.choiceCount += 1;
  runState.eventPath.push(eventId);
  
  // Record the decision
  runState.decisionsMade.push({
    eventId,
    choiceId,
    text: choiceText,
    outcome: effect.outcomeText,
    timestamp: Date.now(),
  });
  
  // Apply flags
  if (effect.flagsAdded) {
    Object.assign(runState.flags, effect.flagsAdded);
  }
  if (effect.flagIncrements) {
    Object.entries(effect.flagIncrements).forEach(([key, delta]) => {
      runState.flags[key] = (runState.flags[key] || 0) + delta;
    });
  }
  
  // Apply relationship changes
  if (effect.relationshipDelta) {
    Object.entries(effect.relationshipDelta).forEach(([charId, delta]) => {
      runState.relationships[charId] = Math.max(0, Math.min(100, (runState.relationships[charId] || 50) + delta));
    });
  }
  
  // Apply suspicion changes
  if (effect.suspicionDelta) {
    Object.entries(effect.suspicionDelta).forEach(([charId, delta]) => {
      runState.suspicion[charId] = Math.max(0, Math.min(100, (runState.suspicion[charId] || 30) + delta));
    });
  }
  
  // Apply fear/injury to characters
  if (effect.characterFear) {
    Object.entries(effect.characterFear).forEach(([charId, delta]) => {
      runState.fears[charId] = Math.max(0, Math.min(100, (runState.fears[charId] || 40) + delta));
    });
  }
  if (effect.characterInjury) {
    Object.entries(effect.characterInjury).forEach(([charId, delta]) => {
      runState.injuries[charId] = Math.max(0, Math.min(100, (runState.injuries[charId] || 0) + delta));
    });
  }
  
  // Add inventory
  if (effect.addItem) {
    runState.inventory.push(effect.addItem);
  }
  if (effect.removeItem) {
    runState.inventory = runState.inventory.filter(i => i.id !== effect.removeItem);
  }
  
  // Discover clues
  if (effect.discoverClue) {
    runState.discoveredClues.push(effect.discoverClue);
  }
  
  // Handle deaths
  if (effect.death) {
    runState.deaths.push({
      characterId: effect.death.characterId,
      characterName: effect.death.characterName,
      eventId,
      reason: effect.death.reason,
    });
  }
  
  // Handle missing persons
  if (effect.missing) {
    runState.missing.push({
      characterId: effect.missing.characterId,
      characterName: effect.missing.characterName,
      eventId,
    });
  }
  
  // Update metrics
  if (effect.fearChange !== undefined) runState.totalFear = Math.max(0, runState.totalFear + effect.fearChange);
  if (effect.threatChange !== undefined) runState.totalThreat = Math.max(0, runState.totalThreat + effect.threatChange);
};

/**
 * Get context string for narration — what has happened so far?
 */
export const getMemoryContext = (runState, party) => {
  const context = {
    recentDecisions: runState.decisionsMade.slice(-3),
    activeFlags: Object.keys(runState.flags).filter(k => runState.flags[k]),
    presentMembers: party?.filter(m => m.isAlive && !m.isMissing).map(m => m.name) || [],
    missingMembers: runState.missing.map(m => m.characterName),
    deadMembers: runState.deaths.map(m => m.characterName),
    discoveredClues: runState.discoveredClues,
    playerInventory: runState.inventory.map(i => i.name),
    totalChoicesMade: runState.choiceCount,
  };
  return context;
};

/**
 * Get summary of player's narrative arc so far
 */
export const getNarrativeSummary = (runState) => {
  const summary = [];
  
  if (runState.decisionsMade.length === 0) {
    return "Your story is just beginning.";
  }
  
  // Moral arc
  if (runState.flags.betrayed_ally) summary.push("You have betrayed someone's trust.");
  if (runState.flags.photo_hidden) summary.push("You kept the photos hidden.");
  if (runState.flags.photo_shared) summary.push("You revealed the photos to the group.");
  if (runState.flags.noise_made) summary.push("You've made noise that could attract attention.");
  if (runState.flags.silence_kept) summary.push("You've kept quiet when it mattered.");
  
  // Group status
  if (runState.deaths.length > 0) {
    summary.push(`${runState.deaths.length} of your group didn't survive.`);
  }
  if (runState.missing.length > 0) {
    summary.push(`${runState.missing.length} members are missing.`);
  }
  
  // Relationships
  const trustLevels = Object.entries(runState.relationships).filter(([, v]) => v < 40);
  if (trustLevels.length > 0) {
    summary.push("Some in your group no longer trust you.");
  }
  
  return summary.length > 0 ? summary.join(" ") : "You're holding together, but barely.";
};