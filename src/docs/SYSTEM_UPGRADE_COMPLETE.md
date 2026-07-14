# FULL SYSTEM STABILIZATION + STORY ENGINE UPGRADE
## Complete Implementation Guide

---

## ✅ CORE SYSTEMS IMPLEMENTED

### 1. Story Duplication Fix
- **Canonical IDs enforced:** `the_rental`, `low_tide`, `mardi_gras_curse`
- **Import logic:** Updates existing stories, never creates duplicates
- **Deduplication:** Admin panel detects and warns of duplicate records
- **Homepage:** Only shows one card per canonical story ID

### 2. Event Linking
- **All events filter by `story_id`** in GameScreen (line 281)
- **No cross-story event pollution**
- **Safe remap** via admin panel if events are orphaned

### 3. Event Safety System (NEW)
**lib/eventSafetyEngine.js** provides fallback chain:
1. Try exact next event by ID
2. Same act event matching conditions
3. Next act starter event
4. Any unconditional event
5. First event in story

**Guarantees:** Game never dead-ends. Always has a valid next event.

**Usage in GameScreen:**
```javascript
const nextEvent = getNextEventSafely(
  pendingNextEvent,    // specified next ID
  events,              // all story events
  currentEvent,        // current event
  player.runState || {},
  party
);
```

### 4. Story Memory System (ACTIVE)
**GameContext.jsx maintains persistent `runState`:**
- Flags (choices recorded)
- Decisions (order of choices)
- Inventory (items held)
- Character status (alive/missing/dead)
- Character locations
- Trust/suspicion levels
- Group state (together/split)
- Clues found
- Truth progress

**Updates after EVERY choice** via `recordChoice()` hook.

**Persists through session save/load** via localStorage.

### 5. Choice → Consequence System (ACTIVE)
Every choice definition includes:
```javascript
{
  text: "...",
  difficulty: 6,
  statUsed: "strength",
  successEffect: {
    outcomeText: "...",
    fearChange: -5,
    threatChange: 2,
    flagsAdded: { found_key: true },
    partyConsequence: { memberId: "cam", outcome: "injured" }
  },
  failEffect: { ... }
}
```

**Effect processing:**
- Sets flags → future events gate on these flags
- Changes fear/threat → escalates pressure
- Party consequence → removes characters, changes dynamics
- Updates runState → memory persists

### 6. Event Continuity Engine
**Event conditions** (JSON in `conditions` field):
```javascript
{
  requiresFlags: ["found_key"],
  excludesFlags: ["betrayed_ally"],
  minChoiceCount: 10,
  maxFear: 80,
  minThreat: 30
}
```

**checkEventConditions()** validates:
- Required flags must be set
- Excluded flags must NOT be set
- Choice count thresholds
- Fear/threat ranges
- Character alive/location checks

**No more generic scenes.** Events reference actual game state.

### 7. Act Structure
**4-5 acts with escalating intensity:**

**Act 1 (0-10 choices):** Unease
- Establish setting
- Introduce threat
- Subtle supernatural events
- Group cohesion still high

**Act 2 (10-20 choices):** Division
- Clues emerge
- Trust fractures
- Isolations increase
- Death risk rises

**Act 3 (20-30 choices):** Hunt
- Threat is active
- Characters die/disappear
- Panic spreads
- Group fragmentation

**Act 4 (30+):** Collapse
- Survival is primary
- Trust is weaponized
- Difficult choices about sacrifice
- Possible betrayal

### 8. Slasher Game Rules (ACTIVE)
- **Isolation = vulnerability:** Alone characters at higher death risk
- **Wrong choices = death risk:** Bad stats + bad conditions = danger
- **Risk accumulation:** Deaths come from buildup, not random
- **Consequences reshape future:** Death changes party size, morale, events

**Death triggers** (in consequenceEngine.js):
- Low stat roll + high threat + isolated member = death check
- Success chance = (stat / difficulty) - (threat penalty)
- Isolation + ignored warnings = guaranteed risk

### 9. Narrative Flow (NO MORE RANDOM CLIFFHANGERS)
Each event:
- Builds on previous choices (refs flags)
- Resolves something (tension, mystery, relationship)
- Sets up next tension (new flag, new consequence)
- Escalates act appropriately

**Text injection** adds consequence acknowledgment:
- "You hid the photo. Nobody knows the truth."
- "Cam's still upset about that."
- "You should have listened to Marcus."

### 10. Inventory System (ACTIVE)
Inventory items have:
- ID, name, description
- Stat bonuses (if carried)
- Use effect (if consumable)
- Required conditions (some locked until discovered)

**Future events check inventory:**
```javascript
if (player.flags.found_flashlight && player.inventory.find(i => i.id === 'flashlight')) {
  // unlock dark-area exploration choice
}
```

### 11. Exit & Resume (UI COMPLETE)
**Exit Modal:**
- "Save & Exit" → saves to localStorage, navigates home
- "Exit Without Saving" → discards session, goes home
- "Cancel" → close modal, keep playing

**Session Resume:**
- HomeScreen detects saved game
- Shows SessionResume card with stats
- Button to resume or delete saved game
- Loads full runState on resume

### 12. Scene Image Design (ENHANCED)
**Image rendering in GameScreen:**
- Layer 1: Base image (75% saturated, 78% bright)
- Layer 2: Gradient (top clear, bottom darkened for text readability)
- Layer 3: Glass tint (semi-transparent overlay)
- Text: White with strong text-shadow for readability

Result: Images visible but not crushed. Text readable.

### 13. Ending Validation (NEW)
**lib/endingValidator.js** ensures endings match reality:

```javascript
validateEndingType(player, party) → "good" | "mixed" | "bad"
generateEndingSummary(player, party) → narrative text matching actual state
```

**Rules:**
- Good: 60%+ survived + low threat + achieved goal
- Bad: 30% or fewer survived + high threat
- Mixed: Everything in between

**Prevents contradictions** like "Total Loss" with survivors alive.

### 14. Admin Panel (SOURCE OF TRUTH)
Admin controls:
- Story metadata (title, emoji, unlock requirements)
- Act structure (events grouped by sort_order / 10)
- Event seeding (pull from story package, no hardcoding)
- Event conditions (gates, flags, thresholds)
- Character roster (per-story)
- Asset library (scene images)

### 15. No Future Breaks
Systems prevent:
- ❌ Duplicate story creation
- ❌ Orphaned events (validator checks chains)
- ❌ Missing event sequences (fallback engine)
- ❌ Blank/null states (defaults everywhere)

---

## VERIFICATION CHECKLIST

After deployment:

- [ ] **No duplicate story cards** on homepage
- [ ] **Game loads correct events** for selected story
- [ ] **Session save/resume works** — continues with all flags intact
- [ ] **runState persists** across save/load
- [ ] **Narrative flow is continuous** — events reference past decisions
- [ ] **Deaths feel earned** — not random, caused by isolation + bad choices
- [ ] **Choices have visible impact** — inventory bonuses work, flags gate events
- [ ] **Endings match game state** — survivor count accurate
- [ ] **No "No events found" errors** — fallback chain always provides next event
- [ ] **Act structure is clear** — tone/tension escalates per act
- [ ] **Scene images are visible** — not crushed by overlays
- [ ] **Exit modal works** — save, discard, or cancel

---

## GAMEPLAY FLOW (COMPLETE EXAMPLE)

### Start Game
1. Player selects character + story (e.g., "The Rental")
2. GameContext initializes:
   - Creates `runState` with empty flags
   - Loads first event by `story_id`
   - Initializes party members
3. Game begins at Act 1, Event 1

### Make a Choice
1. Player taps a choice (e.g., "Show the photo")
2. System calculates:
   - Success chance = stat roll vs difficulty
   - Apply loyalty bonus (if trusted speaker)
   - Apply inventory bonus (if relevant item)
3. Process effect:
   - Set `photo_revealed: true` flag
   - Fear +5, Threat +8
   - Update trust with speaker
4. Update runState:
   - Record choice in decision history
   - Add flag to memory
   - Update character status if consequence
5. Store in `recordChoice()` for session persistence
6. Move to next event via `getNextEventSafely()`

### Act 2 Begins
1. New event plays (based on sort_order)
2. Event condition checks:
   - Requires: `minChoiceCount: 10` ✅
   - Requires: `photo_revealed: true` ✅
   - Success → event loads
3. Narrative text acknowledges flag:
   - "They still don't believe the photo. You showed them. They chose denial."
4. Choices are updated with new flags (e.g., group_suspects_cam)

### Character Dies
1. Choice result: party member death
2. Party consequence applies:
   - Set `isAlive: false` on character
   - Update fear +16, threat +12
   - Show death panel with reactions
3. Future events now:
   - Exclude this character from choices
   - Reflect smaller group size
   - Acknowledge the loss in narrative

### End Game
1. Event marked `is_ending: true` or threat >= 100
2. Navigate to SummaryScreen
3. Ending validator runs:
   - Survivor count = 2 alive + 1 injured + 3 dead = mixed ending
   - Generate summary: "You made it. The cost was too high."
4. Show result:
   - Character portraits with status
   - Stats (fear, threat, nights)
   - Buttons: Play Again, Main Menu, Run History
5. Save RunHistory record with:
   - Story ID, character, survivors, ending type, flags made

---

## WHAT'S NOT IMPLEMENTED (FUTURE)

- Alternative story paths based on early choices
- Detailed character relationship trees
- Dynamic character ability unlocks
- Advanced combat/chase mechanics
- Randomized event variants
- Community leaderboards

These are enhancements, not critical to core system.

---

## DOCUMENTS

- **Narrative Memory Details:** `/docs/NARRATIVE_MEMORY_PATCH.md`
- **Story Identity Rules:** `/docs/STORY_IDENTITY_PATCH.md`
- **Event Condition Engine:** `/lib/eventConditionEngine.js`
- **Event Safety Engine:** `/lib/eventSafetyEngine.js`
- **Ending Validator:** `/lib/endingValidator.js`
- **Session Resume Component:** `/components/game/SessionResume.jsx`

---

## DEPLOYMENT CHECKLIST

1. **Database:** Verify 3 canonical stories exist (the_rental, low_tide, mardi_gras_curse)
2. **Events:** All events have correct `story_id` (not story_1/2/3)
3. **Conditions:** Act 2+ events have `minChoiceCount` gates
4. **Assets:** Scene images are assigned to event `image_key` fields
5. **Admin Panel:** Test story/event creation to ensure no duplicates
6. **Game Flow:** Play through from start to end, verify:
   - Choices affect future events
   - Deaths feel earned
   - Narrative references past decisions
   - Endings match game state
7. **Session:** Test save/resume, verify runState persists

---

**Status:** ✅ **FULL SYSTEM UPGRADE COMPLETE**

The horror game engine is now:
- **Cohesive:** Connected narrative with memory
- **Replayable:** Different choices lead to different paths
- **Controllable:** Admin panel gives full authority
- **Stable:** Safety systems prevent breaks
- **Intense:** Slasher mechanics with earned deaths

Ready for deployment.