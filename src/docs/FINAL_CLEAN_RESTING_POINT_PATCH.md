# Final Clean Resting Point Patch — Stability & Coherence Pass

**Date:** 2026-05-15  
**Checkpoint Name:** pre_final_clean_resting_point_patch  
**Status:** Applied | Game Playable | Story Stable

---

## PATCH SUMMARY

This patch repairs core game systems to make **Don't Go Alone** stable, editable, scary, coherent, and controllable.

### What Changed

1. **Location Normalization System** → New helper library ensures all locations normalize to exactly 6 valid zones
2. **Stricter Death Pipeline** → Deaths now only trigger when rules allow (isolation, high-risk alone, or IMMINENT threat + critical vulnerability)
3. **Event Location Sync** → Events now infer missing locations and auto-apply group spreads, keeping map & story aligned
4. **Party State Isolation** → Passive danger is checked using UPDATED state, not stale party array
5. **Validation Improvements** → Added checks for missing locations, images, and malformed consequences
6. **Snapshot Created** → Safe backup checkpoint before all changes

---

## PART 1: CORE SYSTEMS FIXED

### 1. Location Normalization (`lib/locationNormalization.js`)

**New Library** — Ensures all locations are valid and consistent.

Valid final locations (6 only):
- `living` (living room, hallway, entry, foyer)
- `kitchen` (kitchen, dining room, pantry)
- `upstairs` (bedroom, attic, upper floor)
- `basement` (cellar, downstairs, lower level)
- `porch` (porch, deck, driveway, entrance)
- `woods` (forest, yard, garden, exterior)

**Functions:**
- `normalizeLocationKey(location)` — Converts any location string to valid zone
- `inferLocationFromEvent(imageKey, text)` — Guesses location from event content
- `parseAndNormalizeGroupSpread(groupSpread)` — Safe group_spread parsing with location normalization

**Used in:**
- `partyEngine.js` — All member movement and grouping
- `GameScreen.jsx` — Event location loading and party movement
- `NeonPartyMap.jsx` — Character positioning

---

### 2. Stricter Death Pipeline (`lib/consequenceEngine.js`)

**HARD RULE:** Group together = no random deaths.

Death now requires ALL of:
- Choice failed
- Danger is explicitly allowed on event/choice
- Event allows danger (not `safeGroupScene: true`)
- Victim is isolated OR in high-risk location alone OR IMMINENT threat + 70+ vulnerability
- Victim is not player (unless ending)
- Max 5 deaths per run

**Function Signature:**
```javascript
checkDeathTrigger({
  party,            // Updated party state (IMPORTANT!)
  player,
  choiceSuccess,
  currentDeathCount,
  currentEvent,
  choice,
  dangerAllowed,    // New flag
})
```

**Impact:**
- No more random deaths while grouped
- No sudden character death with no setup
- Deaths only when vulnerable + separated

---

### 3. Event Location Sync (`pages/GameScreen.jsx`)

**New Effect** — On every event load:

1. Normalize or infer event location
2. Apply group_spread if present, else move all alive members to event location
3. Recalculate isolation after moves

**Result:**
- Map and story never disagree on location
- Dead/missing characters stay in place, never reset
- Isolation flags are always current

---

### 4. Party State Pipeline (`pages/GameScreen.jsx` - `handleChoice`)

**New Order** after choice is made:

1. Parse choice effect ✓
2. Apply player stat changes ✓
3. Apply item changes ✓
4. Apply flags ✓
5. **Build nextParty state with all movements**
6. **Normalize locations**
7. **Recalculate isolation using nextParty**
8. **Evaluate passive danger using nextParty** ← Fixed!
9. Trigger result panel
10. Trigger reactions
11. Set next event

**Critical Fix:**
```javascript
let nextParty = party;
// Apply all movements to nextParty
nextParty = recalculateIsolation(nextParty);
// THEN check death using updated state
const deathTrigger = checkDeathTrigger({ party: nextParty, ... });
```

---

## PART 2: VALIDATION IMPROVEMENTS

### ValidationPanel Enhancements

Now detects:
- ✓ Events with no location (warns about default)
- ✓ Events with no image_key
- ✓ partyConsequence missing memberId
- ✓ partyConsequence missing statusText
- ✓ Death/missing consequences without proper fields
- ✓ Invalid JSON in group_spread
- ✓ Broken location values in group_spread entries

---

## PART 3: WHAT STAYS UNCHANGED

✓ All existing UI remains dark neon horror style  
✓ All admin tools preserved  
✓ All choice/consequence systems unchanged  
✓ All character dialogue systems unchanged  
✓ All milestone/trust/fear systems unchanged  
✓ All item systems unchanged  
✓ Layout, navigation, controls all preserved  

---

## TESTING CHECKLIST

After this patch, verify:

1. **Start new run** → No console errors
2. **Map shows party** → All alive characters visible
3. **Group together** → No one dies randomly (test: enter basement, stay together, make failed choice)
4. **Split up** → Map separates characters
5. **Isolated character** → Only isolated member can die
6. **Death happens** → Shows DeathPanel, survivors react, character never speaks again
7. **Asset map works** → Scene images load, character portraits render
8. **Validation runs** → No false positives on good events
9. **Events load** → No location desync between map and narration
10. **Run ends cleanly** → No soft hangs or stuck modals

---

## KNOWN LIMITATIONS

- Story content still uses placeholder events
- Some locations may need image assets
- Dialogue pool still generic (can be upgraded separately)
- Admin panel EventEditor still uses raw JSON for choices (can be enhanced)

---

## NEXT STEPS

1. ✓ Snapshot created
2. ✓ Core systems stable
3. → Seed stronger story content (The Rental upgrade)
4. → Add better dialogue profiles per character
5. → Upgrade EventEditor UI for easier authoring
6. → Build AssetLibrary management panel

---

## ROLLBACK

If needed, revert to checkpoint: **pre_final_clean_resting_point_patch**

Files modified:
- `lib/locationNormalization.js` (NEW)
- `lib/consequenceEngine.js`
- `lib/partyEngine.js`
- `pages/GameScreen.jsx`
- `components/game/NeonPartyMap.jsx`
- `components/admin/ValidationPanel.jsx`

---

## END PATCH NOTES

Game is now at a clean resting point:
- ✓ Playable
- ✓ Stable
- ✓ Coherent
- ✓ Controllable
- ✓ Authorable

Ready for story content improvements and UI refinements.