# Narrative Memory + Event Continuity System Patch

## Overview

This patch fixes the core narrative disconnection problem: events now persist choices, affect future narrative, and provide genuine story continuity.

## What Changed

### 1. Narrative Memory Engine (`lib/narrativeMemoryEngine.js`)

**New persistent `runState` object tracking:**

```javascript
{
  characterName,
  characterId,
  storyId,
  decisionsMade: [],        // Complete choice history
  flags: {},                // Game state (photo_hidden, noise_made, etc.)
  relationships: {},        // Character trust levels (0-100)
  suspicion: {},           // Character suspicion (0-100)
  injuries: {},            // Character injury levels
  fears: {},               // Character fear levels
  inventory: [],           // Items collected
  locations: {},           // Character locations
  groupSplits: [],         // When group separates
  discoveredClues: [],     // Clues found
  deaths: [],              // Who died and when
  missing: [],             // Who went missing
  lastEventId,
  lastChoiceId,
  eventPath: [],           // Full sequence of events
  totalFear,
  totalThreat,
  nightCount
}
```

**Key functions:**

- `createRunState()` — Initialize per character
- `applyChoiceEffect()` — Update state after choice
- `getMemoryContext()` — Get recent decisions for narration
- `getNarrativeSummary()` — Summarize story arc

### 2. Event Condition Engine (`lib/eventConditionEngine.js`)

**Events now validate against conditions:**

```javascript
{
  requiresFlags: [],        // Must have these flags
  excludesFlags: [],        // Cannot have these flags
  minFear: 0,              // Minimum fear threshold
  maxFear: 100,            // Maximum fear threshold
  minThreat: 0,            // Minimum threat threshold
  maxThreat: 100,          // Maximum threat threshold
  requiresClue: "photo",   // Must have discovered clue
  requiresItem: "key",     // Must have item
  requiresCharacterAlive: "char_id",
  requiresCharacterMissing: "char_id",
  minAliveCount: 2,        // At least N alive
  minChoiceCount: 8,       // Story progression gate
  requiresLocation: "basement"
}
```

**Prevents:**
- Dead-end events
- Events that contradict game state
- Wrong narrative tone at wrong time

### 3. Event Flow Validator (`lib/eventFlowValidator.js`)

**Ensures story continuity:**

- `getStartEvent()` — Find valid story start
- `getValidNextEvents()` — Get all valid continuations
- `validateEventChain()` — Check for broken links
- `resolveNextEvent()` — Find next with automatic fallback

**Fallback chain:**
1. Try exact choice target
2. Same-act event with matching conditions
3. Next act starter
4. Any valid event ahead

**This prevents broken runs.**

### 4. GameContext Integration

Updated `lib/GameContext.jsx`:

- `runState` now persists across all events
- `recordChoice()` updates memory after each decision
- Session save/load includes `runState`
- New session key version (v2) for compatibility

```javascript
// In GameScreen, after choice:
recordChoice(eventId, choiceId, choiceText, effect);
```

### 5. The Rental Package Updated

All events now include `conditions` field:

```javascript
{
  event_id: "rental_a1_e1",
  conditions: null,  // START event — always valid
  choices: [...]
},
{
  event_id: "rental_a2_e1",
  conditions: JSON.stringify({ minChoiceCount: 8 }),  // Gate progression
  choices: [...]
}
```

### 6. Homepage Deduplication

Fixed duplicate story cards by filtering on `story_id`.

## What Gets Fixed

### ✅ Problem: Events feel disconnected
**Fix:** runState tracks all choices. Narration can reference past decisions.

Example:
```javascript
// Instead of: "Something feels wrong"
// Now: "The cabinet you left open earlier is now closed. No one admits to it."
```

### ✅ Problem: Choices don't matter
**Fix:** Each choice sets flags that affect future events.

Example:
```javascript
Choice: "Hide the photograph"
→ Sets flag: photo_hidden = true

Later event: IF photo_hidden = true:
→ Group distrust increases
→ Suspicion shifts to player
```

### ✅ Problem: No story progression
**Fix:** Events can require minimum choice count or past flags.

Example:
```javascript
Event: rental_a2_e1 (group fracturing)
→ Only plays after 8+ choices made
→ Gate ensures proper pacing
```

### ✅ Problem: Dead-end events / broken chains
**Fix:** Event condition system + automatic fallback.

If next event fails conditions:
→ Try same-act fallback
→ Try next-act starter
→ Try any valid event
→ Never break mid-run

### ✅ Problem: Duplicate stories on homepage
**Fix:** Deduplicate by `story_id` in filter.

### ✅ Problem: Wrong narrative tone
**Fix:** Events can require fear/threat ranges.

```javascript
{
  minFear: 70,  // Only play when very scared
  maxThreat: 50 // Only early in night
}
```

## How It Works

### Choice → Memory → Narration → Consequence Flow

```
1. Player makes choice
   ↓
2. recordChoice() updates runState
   ↓
3. Next event loads
   ↓
4. checkEventConditions() validates against runState
   ↓
5. Event narration can reference past decisions
   ↓
6. Effect updates state again
   ↓
7. Loop
```

### Example: "Find the Photo" Choice

```javascript
// Choice in event_1
{
  text: "Search the cabin for clues",
  successEffect: {
    discoverClue: "photograph",  // Adds to discoveredClues
    flagsAdded: { photo_found: true }
  }
}

// Later event_5, conditions:
{
  requiresClue: "photograph",  // Only if photo was found
  text: "The group argues about what the photo means..."
}

// Much later event_8, different path:
{
  excludesFlags: ["photo_found"],  // Only if photo was NEVER found
  text: "You'll never know what secret the cabin was hiding."
}
```

## Integration

### In GameScreen.tsx

After choice is made:

```javascript
const effect = success ? choice.successEffect : choice.failEffect;

// ... existing code updates player/party ...

// NEW: Record to narrative memory
recordChoice(currentEvent.event_id, choice.id, choice.text, effect);
```

### In Event Selection

Before showing event:

```javascript
const isValid = checkEventConditions(event, runState, party);

if (!isValid) {
  const nextEvent = resolveNextEvent(choice, allEvents, runState, party);
  // Fallback automatically selected
}
```

## Story Package Structure

Events now support:

```javascript
{
  event_id: "string",
  story_id: "string",
  text: "narration",
  image_key: "optional",
  night: number,
  sort_order: number,
  choices: [
    {
      text: "choice text",
      statUsed: "strength",
      difficulty: 1-4,
      nextEventId: "target_event",
      successEffect: {
        outcomeText: "what happened",
        fearChange: number,
        threatChange: number,
        flagsAdded: { key: value },
        discoverClue: "clue_id",
        addItem: { id, name },
        characterFear: { charId: delta }
      },
      failEffect: { /* same */ }
    }
  ],
  conditions: JSON.stringify({
    requiresFlags: ["flag_name"],
    minChoiceCount: 8,
    requiresClue: "photo"
  }),
  is_ending: boolean,
  ending_type: "good|mixed|bad",
  ending_text: "ending narration"
}
```

## Data Flow

```
Story Package (JSON)
  ↓
Story entity record (DB)
  ↓
GameEvent records (DB) + conditions
  ↓
Loaded into memory
  ↓
validateEventChain() checks integrity
  ↓
GameScreen loads events
  ↓
checkEventConditions() filters valid events
  ↓
Player chooses
  ↓
recordChoice() updates runState
  ↓
resolveNextEvent() with fallback
  ↓
Loop
```

## Testing Checklist

- [ ] Start game: runState initializes
- [ ] Make choice: recordChoice updates memory
- [ ] Check condition gates work: early events before minChoiceCount fail
- [ ] Verify fallback: if event fails conditions, fallback triggers
- [ ] Test flag logic: setting photo_hidden affects later narrative
- [ ] Check deduplication: only one story card per story_id on homepage
- [ ] Verify narration references: event text mentions past choices
- [ ] Test death consequences: deaths tracked, affect group state

## Future Expansions

With this foundation:

- **Branching narratives** — completely different acts based on early choices
- **Character arcs** — relationships that unlock unique events
- **Clue systems** — discovering clues gates major plot reveals
- **Group tensions** — trust/suspicion lead to betrayals or sacrifices
- **Inventory locks** — items required for specific options
- **Location persistence** — characters remember where they go

## No UI Changes

This is a **pure logic layer** patch. No UI was modified. All existing screens work unchanged.

The narrative memory system is invisible to players — they just experience a story that feels connected.