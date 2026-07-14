import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Normalize story_id mapping
const normalizeStoryId = (id) => {
  if (!id) return id;
  const legacyMap = { "story_1": "the_rental", "story_2": "low_tide", "story_3": "mardi_gras_curse" };
  return legacyMap[String(id).toLowerCase()] || String(id).toLowerCase();
};

// All 36 events for The Rental (story_1) — 6 acts x 6 events each
const RENTAL_EVENTS = [
  // ── ACT 1 — ARRIVAL ──────────────────────────────────────────────────────
  {
    event_id: "rental_a1_e1", story_id: "story_1", night: 1, sort_order: 10,
    image_key: "driveway",
    text: "You should have turned around at the gate. The house is exactly where memory left it, and that makes it worse.",
    choices: JSON.stringify([
      { text: "Get out and say nothing.", statUsed: "resilience", difficulty: 1, nextEventId: "rental_a1_e2",
        successEffect: { outcomeText: "You step out quietly. No one rushes you. The silence holds.", fearChange: 2, threatChange: 0 },
        failEffect: { outcomeText: "Your legs hesitate. Someone notices. The group watches you.", fearChange: 6, threatChange: 2 } },
      { text: "Ask who still has the key.", statUsed: "charm", difficulty: 2, nextEventId: "rental_a1_e2",
        successEffect: { outcomeText: "The question lands right. Two people exchange a look that says enough.", fearChange: 3, threatChange: 1 },
        failEffect: { outcomeText: "Nobody answers. The silence is louder than the question.", fearChange: 5, threatChange: 3 } },
      { text: "Call out whoever sent the message.", statUsed: "intelligence", difficulty: 3, nextEventId: "rental_a1_e2",
        successEffect: { outcomeText: "The accusation sharpens the air. No one claims it. That's an answer.", fearChange: 4, threatChange: 2 },
        failEffect: { outcomeText: "You come off paranoid before anything's happened. Trust drops.", fearChange: 7, threatChange: 4 } },
    ]),
  },
  {
    event_id: "rental_a1_e2", story_id: "story_1", night: 1, sort_order: 20,
    image_key: "front_steps",
    text: "Nobody admits to sending the text first. That silence lands harder than the drive up.",
    choices: JSON.stringify([
      { text: "Push the quietest person for an answer.", statUsed: "intelligence", difficulty: 2, nextEventId: "rental_a1_e3",
        successEffect: { outcomeText: "The pressure works. They look away — which is close enough to a confession.", fearChange: 3, threatChange: 2, flagsAdded: { pushed_quiet_person: true } },
        failEffect: { outcomeText: "They shut down completely. You've made an enemy without meaning to.", fearChange: 5, threatChange: 3 } },
      { text: "Deflect with a bitter joke.", statUsed: "charm", difficulty: 2, nextEventId: "rental_a1_e3",
        successEffect: { outcomeText: "The tension breaks just enough to move everyone through the door.", fearChange: 2, threatChange: 0 },
        failEffect: { outcomeText: "Nobody laughs. The joke dies where it lands.", fearChange: 4, threatChange: 2 } },
      { text: "Tell everyone to stop this and go inside.", statUsed: "strength", difficulty: 1, nextEventId: "rental_a1_e3",
        successEffect: { outcomeText: "The command is blunt enough to work. The group moves.", fearChange: 1, threatChange: 0 },
        failEffect: { outcomeText: "Two people dig in. The argument doesn't stop; it just relocates.", fearChange: 4, threatChange: 3 } },
    ]),
  },
  {
    event_id: "rental_a1_e3", story_id: "story_1", night: 1, sort_order: 30,
    image_key: "front_door",
    text: "Someone still has the old key. Nobody thinks that should be possible.",
    choices: JSON.stringify([
      { text: "Ask where they got it.", statUsed: "intelligence", difficulty: 2, nextEventId: "rental_a1_e4",
        successEffect: { outcomeText: "They say they kept it by accident. The way they say it doesn't sit right.", fearChange: 4, threatChange: 2, flagsAdded: { key_holder_questioned: true } },
        failEffect: { outcomeText: "The question bounces off. They hold the key and step to the door.", fearChange: 6, threatChange: 3 } },
      { text: "Take the key yourself.", statUsed: "strength", difficulty: 2, nextEventId: "rental_a1_e4",
        successEffect: { outcomeText: "You hold it now. So does the responsibility for whatever that means.", fearChange: 3, threatChange: 1, flagsAdded: { player_has_key: true } },
        failEffect: { outcomeText: "They pull back before you reach it. The group watches. Bad start.", fearChange: 5, threatChange: 3 } },
      { text: "Let them open the door.", statUsed: "resilience", difficulty: 1, nextEventId: "rental_a1_e4",
        successEffect: { outcomeText: "The door swings in. You follow. The smell of the house hasn't changed.", fearChange: 3, threatChange: 1 },
        failEffect: { outcomeText: "The key sticks. The pause is long. Everyone stares at the door like it might answer.", fearChange: 5, threatChange: 2 } },
    ]),
  },
  {
    event_id: "rental_a1_e4", story_id: "story_1", night: 1, sort_order: 40,
    image_key: "entry",
    text: "One of you is acting like this is normal. That may be confidence. It may be something worse.",
    choices: JSON.stringify([
      { text: "Call them out directly.", statUsed: "intelligence", difficulty: 3, nextEventId: "rental_a1_e5",
        successEffect: { outcomeText: "They defend it calmly. Too calmly. You clock that.", fearChange: 4, threatChange: 2, flagsAdded: { calm_person_flagged: true } },
        failEffect: { outcomeText: "The accusation backfires. Now you seem like the unstable one.", fearChange: 6, threatChange: 4 } },
      { text: "Watch them quietly.", statUsed: "intelligence", difficulty: 1, nextEventId: "rental_a1_e5",
        successEffect: { outcomeText: "You learn more watching than talking. They keep checking the back hallway.", fearChange: 2, threatChange: 1, flagsAdded: { watching_calm_person: true } },
        failEffect: { outcomeText: "You miss something while watching. Another detail slips past.", fearChange: 3, threatChange: 2 } },
      { text: "Back them up and move the group along.", statUsed: "charm", difficulty: 2, nextEventId: "rental_a1_e5",
        successEffect: { outcomeText: "The group settles. Temporarily. But you've aligned with someone and the others noticed.", fearChange: 2, threatChange: 0, flagsAdded: { allied_with_calm_person: true } },
        failEffect: { outcomeText: "Nobody follows the redirect. The group splits into small arguments.", fearChange: 4, threatChange: 3 } },
    ]),
  },
  {
    event_id: "rental_a1_e5", story_id: "story_1", night: 1, sort_order: 50,
    image_key: "living_room",
    text: "There's an old photo inside that should not still be here. One face has been scratched through.",
    choices: JSON.stringify([
      { text: "Show everyone immediately.", statUsed: "charm", difficulty: 2, nextEventId: "rental_a1_e6",
        successEffect: { outcomeText: "The group reacts hard. One person goes quiet in a way that separates them from the rest.", fearChange: 8, threatChange: 3, flagsAdded: { photo_revealed: true } },
        failEffect: { outcomeText: "Showing it creates chaos. Someone grabs it and things escalate fast.", fearChange: 10, threatChange: 5 } },
      { text: "Hide it for now.", statUsed: "resilience", difficulty: 2, nextEventId: "rental_a1_e6",
        successEffect: { outcomeText: "You pocket it. The knowledge is yours alone. That's a kind of power.", fearChange: 3, threatChange: 1, flagsAdded: { photo_hidden: true, player_has_photo: true } },
        failEffect: { outcomeText: "Someone sees you pocket it. Now you owe them an explanation.", fearChange: 5, threatChange: 3 } },
      { text: "Ask one person if they remember it.", statUsed: "intelligence", difficulty: 2, nextEventId: "rental_a1_e6",
        successEffect: { outcomeText: "They remember it. The look on their face tells you they wish they didn't.", fearChange: 6, threatChange: 2, flagsAdded: { photo_shared_privately: true } },
        failEffect: { outcomeText: "They deny it. Convincingly. Maybe too convincingly.", fearChange: 7, threatChange: 3 } },
    ]),
  },
  {
    event_id: "rental_a1_e6", story_id: "story_1", night: 1, sort_order: 60,
    image_key: "living_room",
    text: "The room starts dividing into watchers and movers. If you don't take control now, the night will.",
    choices: JSON.stringify([
      { text: "Keep everyone together.", statUsed: "charm", difficulty: 2, nextEventId: "rental_a2_e1",
        successEffect: { outcomeText: "The group holds. It won't last, but you've bought the first hour.", fearChange: 2, threatChange: -2, flagsAdded: { group_together: true } },
        failEffect: { outcomeText: "Two people break off anyway. The group fractures before it starts.", fearChange: 5, threatChange: 4 } },
      { text: "Split into pairs and assign rooms.", statUsed: "intelligence", difficulty: 2, nextEventId: "rental_a2_e1",
        successEffect: { outcomeText: "The plan is clean. Everyone knows where to go. The house feels manageable.", fearChange: 3, threatChange: 1, flagsAdded: { split_by_pairs: true } },
        failEffect: { outcomeText: "One pair disappears down the wrong hallway immediately.", fearChange: 6, threatChange: 5 } },
      { text: "Let people choose for themselves.", statUsed: "resilience", difficulty: 1, nextEventId: "rental_a2_e1",
        successEffect: { outcomeText: "People go where they want. The alliances form quietly, without your input.", fearChange: 4, threatChange: 2 },
        failEffect: { outcomeText: "Without direction, the group scatters. You'll spend the night pulling it back together.", fearChange: 7, threatChange: 5 } },
    ]),
  },

  // ── ACT 2 — EXPLORATION ────────────────────────────────────────────────────
  {
    event_id: "rental_a2_e1", story_id: "story_1", night: 1, sort_order: 70,
    image_key: "hallway",
    text: "The hallway looks longer from inside than it ever did before. Nobody says that out loud first.",
    choices: JSON.stringify([
      { text: "Walk it alone.", statUsed: "resilience", difficulty: 2, nextEventId: "rental_a2_e2",
        successEffect: { outcomeText: "You reach the end. All the doors are closed. One of them smells different.", fearChange: 5, threatChange: 2 },
        failEffect: { outcomeText: "Halfway down you hear something. When you turn, the hallway is empty but shorter.", fearChange: 9, threatChange: 5 } },
      { text: "Bring one person.", statUsed: "charm", difficulty: 1, nextEventId: "rental_a2_e2",
        successEffect: { outcomeText: "Two of you cover it fast. Trust up slightly for not being alone.", fearChange: 3, threatChange: 1 },
        failEffect: { outcomeText: "The person you brought goes quiet midway and won't say why.", fearChange: 6, threatChange: 3 } },
      { text: "Send two others ahead.", statUsed: "intelligence", difficulty: 2, nextEventId: "rental_a2_e2",
        successEffect: { outcomeText: "They report back clean. You note which one walked in front.", fearChange: 2, threatChange: 0, flagsAdded: { sent_others_first: true } },
        failEffect: { outcomeText: "They come back with different stories about what they saw.", fearChange: 6, threatChange: 4 } },
    ]),
  },
  {
    event_id: "rental_a2_e2", story_id: "story_1", night: 1, sort_order: 80,
    image_key: "bedroom",
    text: "One bed is disturbed like someone stood up from it minutes ago. The sheet is cold.",
    choices: JSON.stringify([
      { text: "Search the room carefully.", statUsed: "intelligence", difficulty: 2, nextEventId: "rental_a2_e3",
        successEffect: { outcomeText: "Under the mattress: a note in handwriting that belongs to the trip three years ago.", fearChange: 7, threatChange: 3, flagsAdded: { found_old_note: true } },
        failEffect: { outcomeText: "Nothing visible. But when you leave, you're not sure the room was empty.", fearChange: 8, threatChange: 4 } },
      { text: "Check under the bed.", statUsed: "resilience", difficulty: 2, nextEventId: "rental_a2_e3",
        successEffect: { outcomeText: "Empty but dusty — except for a print that's fresh.", fearChange: 6, threatChange: 3 },
        failEffect: { outcomeText: "Your hand hits something. It moves before you see it clearly.", fearChange: 10, threatChange: 6 } },
      { text: "Leave immediately.", statUsed: "speed", difficulty: 1, nextEventId: "rental_a2_e3",
        successEffect: { outcomeText: "Smart. Some things don't reward looking at.", fearChange: 3, threatChange: 2 },
        failEffect: { outcomeText: "You back into someone standing right behind you in the doorway.", fearChange: 8, threatChange: 4 } },
    ]),
  },
  {
    event_id: "rental_a2_e3", story_id: "story_1", night: 1, sort_order: 90,
    image_key: "kitchen",
    text: "The kitchen light is on. Nobody remembers turning it on.",
    choices: JSON.stringify([
      { text: "Inspect the counter.", statUsed: "intelligence", difficulty: 2, nextEventId: "rental_a2_e4",
        successEffect: { outcomeText: "A glass. Recent use. One of yours, probably — but you can't confirm that.", fearChange: 5, threatChange: 2 },
        failEffect: { outcomeText: "You knock something. The sound carries through the whole house.", fearChange: 6, threatChange: 5, flagsAdded: { noise_made: 1 } },
      },
      { text: "Shut the light off.", statUsed: "speed", difficulty: 1, nextEventId: "rental_a2_e4",
        successEffect: { outcomeText: "Darkness is better than a lit room with no explanation.", fearChange: 2, threatChange: -1 },
        failEffect: { outcomeText: "The switch sticks. The light buzzes. You don't get it off.", fearChange: 5, threatChange: 3 } },
      { text: "Ask who was here last.", statUsed: "charm", difficulty: 2, nextEventId: "rental_a2_e4",
        successEffect: { outcomeText: "One person raises their hand halfway — then stops. That half-raise matters.", fearChange: 4, threatChange: 2, flagsAdded: { kitchen_person_flagged: true } },
        failEffect: { outcomeText: "Nobody claims it. Now the light means something nobody can name.", fearChange: 6, threatChange: 3 } },
    ]),
  },
  {
    event_id: "rental_a2_e4", story_id: "story_1", night: 1, sort_order: 100,
    image_key: "hallway",
    text: "Someone insists they were only gone a second. No one else agrees.",
    choices: JSON.stringify([
      { text: "Press them for a straight answer.", statUsed: "intelligence", difficulty: 3, nextEventId: "rental_a2_e5",
        successEffect: { outcomeText: "The account doesn't hold up and they know it. They stop talking.", fearChange: 5, threatChange: 2, flagsAdded: { timeline_questioned: true } },
        failEffect: { outcomeText: "They get angry. The argument pulls in two others and the night gets hotter.", fearChange: 7, threatChange: 5 } },
      { text: "Cover for them anyway.", statUsed: "charm", difficulty: 2, nextEventId: "rental_a2_e5",
        successEffect: { outcomeText: "The group lets it go. They owe you something now — whether they know it or not.", fearChange: 3, threatChange: 1, flagsAdded: { covered_missing_person: true } },
        failEffect: { outcomeText: "Your cover story has a hole. Somebody catches it immediately.", fearChange: 5, threatChange: 3 } },
      { text: "Flag them as a problem quietly.", statUsed: "resilience", difficulty: 1, nextEventId: "rental_a2_e5",
        successEffect: { outcomeText: "You don't say it out loud. But you remember. The night is long.", fearChange: 2, threatChange: 1, flagsAdded: { mental_flag_set: true } },
        failEffect: { outcomeText: "Your expression says it anyway. They notice the look.", fearChange: 4, threatChange: 2 } },
    ]),
  },
  {
    event_id: "rental_a2_e5", story_id: "story_1", night: 1, sort_order: 110,
    image_key: "basement_door",
    text: "There is a dark line under the basement door like the room beneath it is lit wrong.",
    choices: JSON.stringify([
      { text: "Open it now.", statUsed: "strength", difficulty: 3, nextEventId: "rental_a2_e6",
        successEffect: { outcomeText: "Stairs. Light source unclear. Someone else's smell.", fearChange: 9, threatChange: 5, flagsAdded: { basement_opened_early: true } },
        failEffect: { outcomeText: "The door holds. It shouldn't. Something is against it from inside.", fearChange: 12, threatChange: 7 } },
      { text: "Wait until everyone is present.", statUsed: "intelligence", difficulty: 1, nextEventId: "rental_a2_e6",
        successEffect: { outcomeText: "Smart call. You hold the door and the group comes to you.", fearChange: 4, threatChange: 1 },
        failEffect: { outcomeText: "By the time everyone's together, the light under the door is gone.", fearChange: 6, threatChange: 3 } },
      { text: "Block it and move on.", statUsed: "resilience", difficulty: 2, nextEventId: "rental_a2_e6",
        successEffect: { outcomeText: "A chair under the handle. That buys time, not safety.", fearChange: 3, threatChange: 0, flagsAdded: { basement_blocked: true } },
        failEffect: { outcomeText: "You can't find anything heavy enough. The door sits there, waiting.", fearChange: 5, threatChange: 2 } },
    ]),
  },
  {
    event_id: "rental_a2_e6", story_id: "story_1", night: 1, sort_order: 120,
    image_key: "lake_side",
    text: "The window gives you back the room, but not the group standing in it.",
    choices: JSON.stringify([
      { text: "Look again. Carefully.", statUsed: "intelligence", difficulty: 2, nextEventId: "rental_a3_e1",
        successEffect: { outcomeText: "You count. The reflection has one fewer person than the room does.", fearChange: 10, threatChange: 4, flagsAdded: { reflection_seen: true } },
        failEffect: { outcomeText: "It was a trick of the glass. Probably. You can't be certain anymore.", fearChange: 7, threatChange: 3 } },
      { text: "Turn everyone away from it.", statUsed: "charm", difficulty: 2, nextEventId: "rental_a3_e1",
        successEffect: { outcomeText: "Done. The group moves to the center of the room. The window sits behind all of you.", fearChange: 4, threatChange: 1 },
        failEffect: { outcomeText: "Two people argue about why. The window becomes the room's main character.", fearChange: 7, threatChange: 4 } },
      { text: "Pretend you saw nothing.", statUsed: "resilience", difficulty: 1, nextEventId: "rental_a3_e1",
        successEffect: { outcomeText: "You file it away. The night still has too many hours to waste on questions.", fearChange: 5, threatChange: 2 },
        failEffect: { outcomeText: "Your face betrays you. Someone wants to know what you saw.", fearChange: 7, threatChange: 3 } },
    ]),
  },

  // ── ACT 3 — ESCALATION ────────────────────────────────────────────────────
  {
    event_id: "rental_a3_e1", story_id: "story_1", night: 1, sort_order: 130,
    image_key: "lake_front",
    text: "The lake is still enough to feel staged. One reflection stands closer than the person making it.",
    choices: JSON.stringify([
      { text: "Step to the shore line.", statUsed: "resilience", difficulty: 2, nextEventId: "rental_a3_e2",
        successEffect: { outcomeText: "Nothing follows. The water is dark and flat and you realize how exposed you are out here.", fearChange: 6, threatChange: 3 },
        failEffect: { outcomeText: "Your foot slips on the bank. Someone grabs your arm and the moment stretches too long.", fearChange: 9, threatChange: 5 } },
      { text: "Pull someone back from the edge.", statUsed: "strength", difficulty: 2, nextEventId: "rental_a3_e2",
        successEffect: { outcomeText: "They're grateful. Quietly. Like they didn't realize they'd walked that close.", fearChange: 5, threatChange: 1 },
        failEffect: { outcomeText: "They shrug you off. You're both looking at the water now.", fearChange: 7, threatChange: 3 } },
      { text: "Ask who was last at the lake.", statUsed: "intelligence", difficulty: 2, nextEventId: "rental_a3_e2",
        successEffect: { outcomeText: "Three years ago, a name comes up. Nobody disputes it. Nobody elaborates.", fearChange: 7, threatChange: 2, flagsAdded: { lake_history_surfaced: true } },
        failEffect: { outcomeText: "Old guilt floods the silence. The question does more damage than the answer.", fearChange: 8, threatChange: 4 } },
    ]),
  },
  {
    event_id: "rental_a3_e2", story_id: "story_1", night: 1, sort_order: 140,
    image_key: "entry",
    text: "The door locks from the inside without a hand on it. That ends the idea of leaving cleanly.",
    choices: JSON.stringify([
      { text: "Force it open.", statUsed: "strength", difficulty: 3, nextEventId: "rental_a3_e3",
        successEffect: { outcomeText: "It gives. You're outside for three seconds. You go back in. You don't know why.", fearChange: 8, threatChange: 3, flagsAdded: { door_forced: true } },
        failEffect: { outcomeText: "It doesn't move. Whoever built this door built it to hold.", fearChange: 12, threatChange: 6 } },
      { text: "Find another exit.", statUsed: "intelligence", difficulty: 2, nextEventId: "rental_a3_e3",
        successEffect: { outcomeText: "The back window isn't locked. You mark the route in your mind.", fearChange: 5, threatChange: 1, flagsAdded: { alternate_exit_known: true } },
        failEffect: { outcomeText: "Every ground floor exit is sealed. You stop counting and start thinking differently.", fearChange: 9, threatChange: 5 } },
      { text: "Keep panic down first.", statUsed: "charm", difficulty: 2, nextEventId: "rental_a3_e3",
        successEffect: { outcomeText: "The group holds. Barely. You buy a minute of calm in an uncalm room.", fearChange: 4, threatChange: 0 },
        failEffect: { outcomeText: "Someone screams. The calm you were building collapses all at once.", fearChange: 10, threatChange: 6 } },
    ]),
  },
  {
    event_id: "rental_a3_e3", story_id: "story_1", night: 1, sort_order: 150,
    image_key: "living_room",
    text: "Two people finally describe the old night, and their versions do not match.",
    choices: JSON.stringify([
      { text: "Choose one version to believe.", statUsed: "intelligence", difficulty: 3, nextEventId: "rental_a3_e4",
        successEffect: { outcomeText: "You pick the one with more detail. The other person goes cold and stays that way.", fearChange: 6, threatChange: 2, flagsAdded: { chose_version: true } },
        failEffect: { outcomeText: "You pick wrong. The contradiction surfaces two sentences later.", fearChange: 8, threatChange: 5 } },
      { text: "Refuse to take sides.", statUsed: "resilience", difficulty: 2, nextEventId: "rental_a3_e4",
        successEffect: { outcomeText: "You stay neutral. Nobody's satisfied. Nobody's turned on you either.", fearChange: 4, threatChange: 2 },
        failEffect: { outcomeText: "Your silence reads as confirmation. Both stories now assume your support.", fearChange: 6, threatChange: 4 } },
      { text: "Accuse both of protecting a lie.", statUsed: "strength", difficulty: 3, nextEventId: "rental_a3_e4",
        successEffect: { outcomeText: "The room stops. Then one of them nods. Just once. Like they've been waiting for it.", fearChange: 7, threatChange: 3, flagsAdded: { old_lie_surfaced: true } },
        failEffect: { outcomeText: "Both turn on you. The group splits along the fault line you just drew.", fearChange: 10, threatChange: 6 } },
    ]),
  },
  {
    event_id: "rental_a3_e4", story_id: "story_1", night: 1, sort_order: 160,
    image_key: "hallway",
    text: "A message appears on the wall where it was empty before. It uses a phrase only one of you should know.",
    choices: JSON.stringify([
      { text: "Ask who wrote it — out loud.", statUsed: "strength", difficulty: 2, nextEventId: "rental_a3_e5",
        successEffect: { outcomeText: "The silence answers. Someone's eyes go somewhere they can't take back.", fearChange: 8, threatChange: 4, flagsAdded: { wall_confronted: true } },
        failEffect: { outcomeText: "Everyone denies it in unison. That uniformity is wrong.", fearChange: 10, threatChange: 5 } },
      { text: "Erase it before more people see.", statUsed: "speed", difficulty: 2, nextEventId: "rental_a3_e5",
        successEffect: { outcomeText: "Gone before two of them turn around. What you saw stays yours.", fearChange: 6, threatChange: 2, flagsAdded: { message_erased: true } },
        failEffect: { outcomeText: "You're not fast enough. Three people have already read it.", fearChange: 8, threatChange: 5 } },
      { text: "Make everyone read it aloud.", statUsed: "intelligence", difficulty: 3, nextEventId: "rental_a3_e5",
        successEffect: { outcomeText: "The reading breaks something open. One person won't finish the sentence.", fearChange: 9, threatChange: 3, flagsAdded: { wall_read_aloud: true } },
        failEffect: { outcomeText: "The exercise backfires. The phrase means something different to different people and it shows.", fearChange: 11, threatChange: 6 } },
    ]),
  },
  {
    event_id: "rental_a3_e5", story_id: "story_1", night: 1, sort_order: 170,
    image_key: "hallway",
    text: "For the first time tonight, someone does not answer when called. That silence changes the group immediately.",
    choices: JSON.stringify([
      { text: "Search immediately.", statUsed: "speed", difficulty: 2, nextEventId: "rental_a3_e6",
        successEffect: { outcomeText: "You find them. They're in the corner of the bathroom. They say they're fine. They are not fine.", fearChange: 8, threatChange: 3, flagsAdded: { first_disappear_resolved: true } },
        failEffect: { outcomeText: "You search the wrong floor first. Four minutes lost and the group is fracturing.", fearChange: 11, threatChange: 7 } },
      { text: "Lock down the current room.", statUsed: "resilience", difficulty: 2, nextEventId: "rental_a3_e6",
        successEffect: { outcomeText: "You keep the group together while two others go looking. Slower, but safer.", fearChange: 6, threatChange: 2 },
        failEffect: { outcomeText: "The lockdown breeds panic. Three people try to leave at once.", fearChange: 10, threatChange: 6 } },
      { text: "Blame the last person seen with them.", statUsed: "intelligence", difficulty: 3, nextEventId: "rental_a3_e6",
        successEffect: { outcomeText: "The accusation lands. Their reaction gives you something. Not proof. But something.", fearChange: 7, threatChange: 4, flagsAdded: { blame_used: true } },
        failEffect: { outcomeText: "Wrong person. The misaccusation costs you trust and time.", fearChange: 10, threatChange: 6 } },
    ]),
  },
  {
    event_id: "rental_a3_e6", story_id: "story_1", night: 1, sort_order: 180,
    image_key: "kitchen",
    text: "Whatever this night started as, it's over. Nobody jokes now unless they want to sound scared.",
    choices: JSON.stringify([
      { text: "Organize a formal search plan.", statUsed: "intelligence", difficulty: 2, nextEventId: "rental_a4_e1",
        successEffect: { outcomeText: "The plan is real and it holds. The group moves like it means something.", fearChange: 4, threatChange: -1 },
        failEffect: { outcomeText: "The plan collapses at step two. The house isn't cooperating.", fearChange: 7, threatChange: 4 } },
      { text: "Protect whoever seems weakest.", statUsed: "charm", difficulty: 2, nextEventId: "rental_a4_e1",
        successEffect: { outcomeText: "They stick to you. The protection costs you speed. It may save you something else.", fearChange: 3, threatChange: 1 },
        failEffect: { outcomeText: "The most vulnerable person doesn't want protecting. They pull away.", fearChange: 6, threatChange: 3 } },
      { text: "Confront the most suspicious person now.", statUsed: "strength", difficulty: 3, nextEventId: "rental_a4_e1",
        successEffect: { outcomeText: "The confrontation is clean and it shakes something loose in the group dynamic.", fearChange: 6, threatChange: 2, flagsAdded: { suspect_confronted: true } },
        failEffect: { outcomeText: "The confrontation is a disaster. You've split the group in half at the worst possible time.", fearChange: 10, threatChange: 7 } },
    ]),
  },

  // ── ACT 4 — SURVIVAL ──────────────────────────────────────────────────────
  {
    event_id: "rental_a4_e1", story_id: "story_1", night: 1, sort_order: 190,
    image_key: "hallway",
    text: "No one should move alone anymore. That rule comes too late to feel safe.",
    choices: JSON.stringify([
      { text: "Pair people by strength.", statUsed: "intelligence", difficulty: 2, nextEventId: "rental_a4_e2",
        successEffect: { outcomeText: "The pairs are balanced. Each team has something to contribute.", fearChange: 3, threatChange: -1, flagsAdded: { strategic_pairs: true } },
        failEffect: { outcomeText: "Your strongest pair disagrees on direction and separates within minutes.", fearChange: 6, threatChange: 4 } },
      { text: "Stay with your closest ally.", statUsed: "charm", difficulty: 1, nextEventId: "rental_a4_e2",
        successEffect: { outcomeText: "You're together. That person trusts you. For now that's worth something.", fearChange: 2, threatChange: 1, flagsAdded: { ally_pair: true } },
        failEffect: { outcomeText: "Your ally gets pulled into another argument. You're alone for the first ten minutes.", fearChange: 5, threatChange: 3 } },
      { text: "Stay with whoever knows the house best.", statUsed: "resilience", difficulty: 2, nextEventId: "rental_a4_e2",
        successEffect: { outcomeText: "They remember things about this house you'd forgotten. Some of those things are useful.", fearChange: 3, threatChange: 0, flagsAdded: { house_knowledge_used: true } },
        failEffect: { outcomeText: "Their knowledge turns out to be three years out of date.", fearChange: 5, threatChange: 3 } },
    ]),
  },
  {
    event_id: "rental_a4_e2", story_id: "story_1", night: 1, sort_order: 200,
    image_key: "basement_door",
    text: "The basement door is open. Nobody admits opening it.",
    choices: JSON.stringify([
      { text: "Go down first.", statUsed: "resilience", difficulty: 3, nextEventId: "rental_a4_e3",
        successEffect: { outcomeText: "The basement is lit by one bare bulb. You see footprints that aren't yours. Fresh ones.", fearChange: 10, threatChange: 4, flagsAdded: { basement_entered: true } },
        failEffect: { outcomeText: "You make it two steps before something at the bottom makes you stop.", fearChange: 14, threatChange: 7 } },
      { text: "Make a group plan before anyone moves.", statUsed: "intelligence", difficulty: 2, nextEventId: "rental_a4_e3",
        successEffect: { outcomeText: "Three go down together. Better odds. Still terrible odds, but better.", fearChange: 7, threatChange: 2 },
        failEffect: { outcomeText: "The argument about who goes first takes too long. The door swings further open by itself.", fearChange: 10, threatChange: 5 } },
      { text: "Refuse and search upstairs instead.", statUsed: "speed", difficulty: 2, nextEventId: "rental_a4_e3",
        successEffect: { outcomeText: "You find something upstairs that shifts the entire night's logic. The basement can wait.", fearChange: 6, threatChange: 2, flagsAdded: { upstairs_searched: true } },
        failEffect: { outcomeText: "Upstairs is empty. You wasted time and now the basement choice is gone.", fearChange: 8, threatChange: 4 } },
    ]),
  },
  {
    event_id: "rental_a4_e3", story_id: "story_1", night: 1, sort_order: 210,
    image_key: "bedroom",
    text: "Someone starts to crack. Whether you calm them or shame them will matter later.",
    choices: JSON.stringify([
      { text: "Calm them down slowly.", statUsed: "charm", difficulty: 2, nextEventId: "rental_a4_e4",
        successEffect: { outcomeText: "They stabilize. The trust between you deepens quietly. They'll remember this.", fearChange: 3, threatChange: -1 },
        failEffect: { outcomeText: "The attempt backfires. They spiral harder.", fearChange: 9, threatChange: 4 } },
      { text: "Shake them back into focus.", statUsed: "strength", difficulty: 2, nextEventId: "rental_a4_e4",
        successEffect: { outcomeText: "It works. Cold and sharp, but it works. They're functional again.", fearChange: 5, threatChange: 1 },
        failEffect: { outcomeText: "The sharpness tips them over. They lash out and the group fragments.", fearChange: 10, threatChange: 6 } },
      { text: "Leave them for now, keep moving.", statUsed: "resilience", difficulty: 2, nextEventId: "rental_a4_e4",
        successEffect: { outcomeText: "Hard call. Correct call. You come back for them later.", fearChange: 4, threatChange: 2, flagsAdded: { left_someone_behind: true } },
        failEffect: { outcomeText: "You don't come back in time. When you do, they're gone.", fearChange: 11, threatChange: 7 } },
    ]),
  },
  {
    event_id: "rental_a4_e4", story_id: "story_1", night: 1, sort_order: 220,
    image_key: "basement_door",
    text: "Something from the old night was hidden here on purpose. Someone in the group knew where to look without being told.",
    choices: JSON.stringify([
      { text: "Demand an explanation immediately.", statUsed: "strength", difficulty: 3, nextEventId: "rental_a4_e5",
        successEffect: { outcomeText: "The truth comes out. Part of it. The part they decided to trade for their safety.", fearChange: 8, threatChange: 3, flagsAdded: { old_secret_revealed: true } },
        failEffect: { outcomeText: "They shut down. The explanation dies with the demand.", fearChange: 10, threatChange: 5 } },
      { text: "Pocket it and say nothing.", statUsed: "intelligence", difficulty: 2, nextEventId: "rental_a4_e5",
        successEffect: { outcomeText: "You take it quietly. The person who knew where it was watches you do it.", fearChange: 5, threatChange: 2, flagsAdded: { object_pocketed: true } },
        failEffect: { outcomeText: "The act of pocketing it makes you look like the one with something to hide.", fearChange: 7, threatChange: 4 } },
      { text: "Destroy it in front of everyone.", statUsed: "resilience", difficulty: 3, nextEventId: "rental_a4_e5",
        successEffect: { outcomeText: "It's gone. The person who hid it looks relieved. That's suspicious.", fearChange: 6, threatChange: 2, flagsAdded: { object_destroyed: true } },
        failEffect: { outcomeText: "You can't destroy it cleanly. The object just changes form.", fearChange: 8, threatChange: 5 } },
    ]),
  },
  {
    event_id: "rental_a4_e5", story_id: "story_1", night: 1, sort_order: 230,
    image_key: "living_room",
    text: "The group is no longer unified. Survival now depends on who still trusts you.",
    choices: JSON.stringify([
      { text: "Give a direct order.", statUsed: "strength", difficulty: 2, nextEventId: "rental_a4_e6",
        successEffect: { outcomeText: "Some follow. Not all. The ones who follow are the ones who matter.", fearChange: 4, threatChange: 1 },
        failEffect: { outcomeText: "The order is ignored. Your authority just expired.", fearChange: 7, threatChange: 5 } },
      { text: "Appeal honestly for trust.", statUsed: "charm", difficulty: 3, nextEventId: "rental_a4_e6",
        successEffect: { outcomeText: "Honesty is rare enough here that it lands. Two people you'd nearly written off step back in.", fearChange: 3, threatChange: -1 },
        failEffect: { outcomeText: "The appeal sounds desperate. In this group, that costs you.", fearChange: 7, threatChange: 4 } },
      { text: "Expose what you know about someone else.", statUsed: "intelligence", difficulty: 3, nextEventId: "rental_a4_e6",
        successEffect: { outcomeText: "The redirect works. For now. You've made an enemy you might need later.", fearChange: 5, threatChange: 3, flagsAdded: { exposed_ally: true } },
        failEffect: { outcomeText: "The exposure is partial and unconvincing. You've made an enemy and gained nothing.", fearChange: 9, threatChange: 6 } },
    ]),
  },
  {
    event_id: "rental_a4_e6", story_id: "story_1", night: 1, sort_order: 240,
    image_key: "forest_pathway",
    text: "What's been circling the group stops circling. It picks someone.",
    choices: JSON.stringify([
      { text: "Save them.", statUsed: "speed", difficulty: 3, nextEventId: "rental_a5_e1",
        successEffect: { outcomeText: "You reach them in time. You both know what that cost and neither of you says it.", fearChange: 10, threatChange: 5 },
        failEffect: { outcomeText: "Not fast enough. You'll carry that.", fearChange: 15, threatChange: 8 } },
      { text: "Save yourself.", statUsed: "resilience", difficulty: 1, nextEventId: "rental_a5_e1",
        successEffect: { outcomeText: "Clean survival. The group will judge you for it. You'll judge yourself.", fearChange: 8, threatChange: 3, flagsAdded: { chose_self: true } },
        failEffect: { outcomeText: "Even the safe choice goes wrong. The night isn't finished with you.", fearChange: 12, threatChange: 6 } },
      { text: "Use someone else as bait.", statUsed: "intelligence", difficulty: 4, nextEventId: "rental_a5_e1",
        successEffect: { outcomeText: "It works. Two people are alive because of a calculation they'll never forgive.", fearChange: 9, threatChange: 2, flagsAdded: { used_bait: true } },
        failEffect: { outcomeText: "The plan fails and takes two people with it.", fearChange: 15, threatChange: 10 } },
    ]),
  },

  // ── ACT 5 — FINAL CHOICE ──────────────────────────────────────────────────
  {
    event_id: "rental_a5_e1", story_id: "story_1", night: 1, sort_order: 250,
    image_key: "basement_door",
    text: "By now you know one thing for certain: the message did not come from nowhere.",
    choices: JSON.stringify([
      { text: "Name who you think sent it.", statUsed: "intelligence", difficulty: 3, nextEventId: "rental_a5_e2",
        successEffect: { outcomeText: "You're right. The name lands like a sentence. The group shifts entirely.", fearChange: 6, threatChange: 2, flagsAdded: { sender_named: true } },
        failEffect: { outcomeText: "Wrong. The misidentification spreads through the remaining trust like rot.", fearChange: 9, threatChange: 6 } },
      { text: "Keep the accusation private for now.", statUsed: "resilience", difficulty: 2, nextEventId: "rental_a5_e2",
        successEffect: { outcomeText: "You hold it. The knowledge is leverage. Not yet played.", fearChange: 4, threatChange: 1, flagsAdded: { accusation_held: true } },
        failEffect: { outcomeText: "You hold it too long. The moment for it closes.", fearChange: 6, threatChange: 3 } },
      { text: "Wait for proof before speaking.", statUsed: "intelligence", difficulty: 2, nextEventId: "rental_a5_e2",
        successEffect: { outcomeText: "The patience pays off. The proof comes to you rather than the other way.", fearChange: 3, threatChange: 0 },
        failEffect: { outcomeText: "The proof you waited for never arrives. The night moves on without you.", fearChange: 6, threatChange: 4 } },
    ]),
  },
  {
    event_id: "rental_a5_e2", story_id: "story_1", night: 1, sort_order: 260,
    image_key: "basement_door",
    text: "The version of the past everyone has protected begins to crack open.",
    choices: JSON.stringify([
      { text: "Say what really happened that night.", statUsed: "resilience", difficulty: 3, nextEventId: "rental_a5_e3",
        successEffect: { outcomeText: "The truth is smaller and worse than the stories. It always is.", fearChange: 7, threatChange: 2, flagsAdded: { truth_spoken: true } },
        failEffect: { outcomeText: "The truth is not well received. Some people would rather carry the lie.", fearChange: 10, threatChange: 5 } },
      { text: "Let someone else confess first.", statUsed: "charm", difficulty: 2, nextEventId: "rental_a5_e3",
        successEffect: { outcomeText: "One person breaks. What comes out is close to the truth, not all of it.", fearChange: 6, threatChange: 2 },
        failEffect: { outcomeText: "Nobody confesses. The silence becomes the story.", fearChange: 8, threatChange: 4 } },
      { text: "Protect the original lie for now.", statUsed: "intelligence", difficulty: 2, nextEventId: "rental_a5_e3",
        successEffect: { outcomeText: "The lie holds the group together for twenty more minutes. That might be enough.", fearChange: 4, threatChange: 1, flagsAdded: { lie_protected: true } },
        failEffect: { outcomeText: "The lie collapses from two sides at once. Nobody trusts the version now.", fearChange: 9, threatChange: 5 } },
    ]),
  },
  {
    event_id: "rental_a5_e3", story_id: "story_1", night: 1, sort_order: 270,
    image_key: "hallway",
    text: "If the threat is human tonight, pressure will expose it. If it's not, pressure will break the group faster.",
    choices: JSON.stringify([
      { text: "Trap the most suspicious person.", statUsed: "intelligence", difficulty: 4, nextEventId: "rental_a5_e4",
        successEffect: { outcomeText: "The trap works. What they do when cornered tells you everything.", fearChange: 7, threatChange: 2, flagsAdded: { suspect_trapped: true } },
        failEffect: { outcomeText: "They see through it. Now they're watching you instead.", fearChange: 11, threatChange: 7 } },
      { text: "Keep everyone moving and out of corners.", statUsed: "speed", difficulty: 2, nextEventId: "rental_a5_e4",
        successEffect: { outcomeText: "Motion is protection. You keep the group fluid and alive.", fearChange: 5, threatChange: 1 },
        failEffect: { outcomeText: "Motion without direction scatters the group. You lose two people in the same minute.", fearChange: 10, threatChange: 6 } },
      { text: "Isolate with one person you still trust.", statUsed: "charm", difficulty: 2, nextEventId: "rental_a5_e4",
        successEffect: { outcomeText: "Alone with someone honest, the night becomes manageable. For a moment.", fearChange: 4, threatChange: -1, flagsAdded: { isolated_with_ally: true } },
        failEffect: { outcomeText: "Your trust was misplaced. The isolation was engineered.", fearChange: 12, threatChange: 7 } },
    ]),
  },
  {
    event_id: "rental_a5_e4", story_id: "story_1", night: 1, sort_order: 280,
    image_key: "entry",
    text: "An exit exists, but not for everyone. You know that now.",
    choices: JSON.stringify([
      { text: "Choose yourself.", statUsed: "speed", difficulty: 2, nextEventId: "rental_a5_e5",
        successEffect: { outcomeText: "You're through. What you left behind is already becoming the version you'll tell later.", fearChange: 8, threatChange: 0, flagsAdded: { chose_self_final: true } },
        failEffect: { outcomeText: "The exit closes before you reach it. You chose yourself and lost.", fearChange: 12, threatChange: 8 } },
      { text: "Choose the group over yourself.", statUsed: "resilience", difficulty: 3, nextEventId: "rental_a5_e5",
        successEffect: { outcomeText: "You get most of them through. Not all. That's the math of this night.", fearChange: 6, threatChange: -2, flagsAdded: { chose_group: true } },
        failEffect: { outcomeText: "The sacrifice doesn't work. The group doesn't make it and neither do you.", fearChange: 14, threatChange: 8 } },
      { text: "Choose one specific person.", statUsed: "charm", difficulty: 2, nextEventId: "rental_a5_e5",
        successEffect: { outcomeText: "You and one other get out. The choice will haunt specific moments for years.", fearChange: 7, threatChange: 1, flagsAdded: { chose_one: true } },
        failEffect: { outcomeText: "They didn't want to be chosen. The refusal costs both of you.", fearChange: 11, threatChange: 6 } },
    ]),
  },
  {
    event_id: "rental_a5_e5", story_id: "story_1", night: 1, sort_order: 290,
    image_key: "lake_front",
    text: "The night narrows to one decision and one truth you can no longer dodge.",
    choices: JSON.stringify([
      { text: "Face it directly.", statUsed: "resilience", difficulty: 3, nextEventId: "rental_a5_e6",
        successEffect: { outcomeText: "You look at it straight and it doesn't get smaller. You just get harder.", fearChange: 5, threatChange: -2, flagsAdded: { faced_truth: true } },
        failEffect: { outcomeText: "The direct approach breaks something in you that the night needed intact.", fearChange: 12, threatChange: 5 } },
      { text: "Run for the vehicle.", statUsed: "speed", difficulty: 3, nextEventId: "rental_a5_e6",
        successEffect: { outcomeText: "You reach the car. It starts. The house gets smaller in the mirror.", fearChange: 7, threatChange: 3, flagsAdded: { ran_for_car: true } },
        failEffect: { outcomeText: "The keys are gone. You knew that already. Some part of you did.", fearChange: 13, threatChange: 7 } },
      { text: "Offer yourself so someone else gets out.", statUsed: "strength", difficulty: 4, nextEventId: "rental_a5_e6",
        successEffect: { outcomeText: "The sacrifice holds. You stay. They go. The night takes what it came for.", fearChange: 10, threatChange: 0, flagsAdded: { self_sacrifice: true } },
        failEffect: { outcomeText: "The sacrifice isn't accepted. The night keeps everyone.", fearChange: 15, threatChange: 10 } },
    ]),
  },
  {
    event_id: "rental_a5_e6", story_id: "story_1", night: 1, sort_order: 300,
    image_key: "forest_pathway",
    text: "Someone will not see sunrise because of what happens next.",
    choices: JSON.stringify([
      { text: "Hold your ground.", statUsed: "resilience", difficulty: 3, nextEventId: "rental_a6_e1",
        successEffect: { outcomeText: "You hold. The night respects that, if nothing else.", fearChange: 5, threatChange: -3, flagsAdded: { held_ground: true } },
        failEffect: { outcomeText: "Holding costs you something you needed. But you held.", fearChange: 10, threatChange: 4 } },
      { text: "Betray the person nearest you.", statUsed: "intelligence", difficulty: 3, nextEventId: "rental_a6_e1",
        successEffect: { outcomeText: "It works. You survive with that.", fearChange: 8, threatChange: -1, flagsAdded: { betrayed_ally: true } },
        failEffect: { outcomeText: "They knew. The betrayal turns back on you.", fearChange: 13, threatChange: 8 } },
      { text: "Trust someone you probably shouldn't.", statUsed: "charm", difficulty: 4, nextEventId: "rental_a6_e1",
        successEffect: { outcomeText: "The bet pays off. Against all reason, they were worth trusting.", fearChange: 6, threatChange: -2, flagsAdded: { trusted_unlikely: true } },
        failEffect: { outcomeText: "You knew better and did it anyway. The night knew you would.", fearChange: 14, threatChange: 9 } },
    ]),
  },

  // ── ACT 6 — OUTCOME ──────────────────────────────────────────────────────
  {
    event_id: "rental_a6_e1", story_id: "story_1", night: 1, sort_order: 310,
    image_key: "driveway",
    is_ending: true, ending_type: "mixed",
    text: "Morning does not make the house look normal. It only proves who made it out.",
    ending_text: "The sun comes up on whatever you've done and whoever remains. The rental will be rented again. Someone else will come back to this.",
    choices: JSON.stringify([
      { text: "Walk away without looking back.", statUsed: "resilience", difficulty: 1,
        successEffect: { outcomeText: "You walk. The house stays behind you. That's the best you can do.", fearChange: -5, threatChange: -10 },
        failEffect: { outcomeText: "You look back once. You'll spend years not understanding why.", fearChange: 2, threatChange: 0 } },
    ]),
  },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const force = body.force === true;
    const storyId = normalizeStoryId(body.storyId || 'the_rental');

    // Normalize all events to the target story_id
    const normalizedEvents = RENTAL_EVENTS.map(e => ({
      ...e,
      story_id: storyId,
    }));

    // Check existing events using normalized ID
    const existing = await base44.asServiceRole.entities.GameEvent.filter({ story_id: storyId });

    if (existing.length > 0 && !force) {
      return Response.json({
        status: 'skipped',
        message: `${existing.length} events already exist for story_1. Pass force:true to re-seed.`,
        count: existing.length,
      });
    }

    // Delete existing if forcing
    if (force && existing.length > 0) {
      for (const ev of existing) {
        await base44.asServiceRole.entities.GameEvent.delete(ev.id);
      }
    }

    // Create all events
    const results = [];
    for (const ev of normalizedEvents) {
      const created = await base44.asServiceRole.entities.GameEvent.create(ev);
      results.push(created.event_id);
    }

    return Response.json({
      status: 'success',
      message: `Seeded ${results.length} events for ${storyId}.`,
      events: results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});