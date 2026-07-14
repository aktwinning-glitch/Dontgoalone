/**
 * Character Reaction Engine — Phase 2
 * Generates personality-specific emotional reactions to:
 * fear spikes, deaths, isolation, betrayal, discoveries, injuries.
 * Uses role system from dialogueEngine for voice consistency.
 * Pure logic — no React.
 */

import { getCharacterRole } from "./dialogueEngine";

// ── Reaction types ────────────────────────────────────────────────────────────
export const REACTION_TYPES = {
  DEATH:      "death",
  FEAR_SPIKE: "fear_spike",
  ISOLATION:  "isolation",
  BETRAYAL:   "betrayal",
  DISCOVERY:  "discovery",
  INJURY:     "injury",
  SURVIVAL:   "survival",
};

// ── Reaction tone per role per type ──────────────────────────────────────────
const REACTIONS = {
  Smart: {
    death:      ["silence", "recalibrate"],
    fear_spike: ["control", "assess"],
    isolation:  ["methodical", "dark"],
    betrayal:   ["cold", "calculating"],
    discovery:  ["connects_dots", "grim_satisfaction"],
    injury:     ["clinical", "pushes_through"],
    survival:   ["quiet_relief", "already_planning"],
  },
  Chaotic: {
    death:      ["loud_grief", "manic_deflection"],
    fear_spike: ["spiral", "dark_humor"],
    isolation:  ["panic", "bravado"],
    betrayal:   ["explosive", "hurt"],
    discovery:  ["overwhelmed", "excited_scared"],
    injury:     ["dramatic", "laughs_it_off"],
    survival:   ["euphoric", "immediately_regrets"],
  },
  Skeptic: {
    death:      ["denial", "controlled_grief"],
    fear_spike: ["dismissive", "shaken"],
    isolation:  ["stoic", "calculating_isolation"],
    betrayal:   ["vindicated", "cold"],
    discovery:  ["already_suspected", "needs_more"],
    injury:     ["minimizes", "keeps_moving"],
    survival:   ["relieved_but_quiet", "critical_debrief"],
  },
  Nervous: {
    death:      ["breakdown", "shutdown"],
    fear_spike: ["begs_to_leave", "dissociates"],
    isolation:  ["terrified", "overloads"],
    betrayal:   ["devastated", "self_blames"],
    discovery:  ["vindicated_fear", "worse_now"],
    injury:     ["focuses_on_pain", "needs_reassurance"],
    survival:   ["crying", "cant_believe_it"],
  },
};

// ── Reaction dialogue lines ───────────────────────────────────────────────────
const REACTION_LINES = {
  // Deaths
  silence:             ["…", "…I can't.", "Say something. Somebody say something."],
  recalibrate:         ["We account for this and we keep moving. That's the only option.", "Grief later. Right now we survive."],
  loud_grief:          ["No. No, no, NO—", "Wait — where are they? WHERE ARE THEY?", "That's — they're — oh god."],
  manic_deflection:    ["Okay. Okay I'm — I'm fine. We're fine. Right? Yeah. Moving.", "Don't — don't look at me right now."],
  denial:              ["They're not gone. They CAN'T be gone.", "That didn't happen. That is not what happened."],
  controlled_grief:    ["…Noted. We don't stop.", "Gone. Move. We grieve when we're safe."],
  breakdown:           ["I can't do this. I can't — I TOLD you this would happen—", "I'm shaking. I can't stop shaking."],
  shutdown:            ["…", "…I have nothing.", "Don't talk to me right now. Please."],

  // Fear spikes
  control:             ["Everyone breathe. That's an order.", "Fear is information. Don't let it be the driver."],
  assess:              ["What changed? Something changed. Figure out what."],
  spiral:              ["Okay THAT was — okay that is — okay we have a problem—", "I'm vibrating. Someone tell me what to do."],
  dark_humor:          ["Cool. Cool cool cool. So we're all gonna die. Cool.", "I've had worse weeks. I'm lying. I haven't."],
  dismissive:          ["You're catastrophizing. Stop.", "It's fine. It's probably fine. Don't spiral."],
  shaken:              ["…Okay. That one got me. Give me a second."],
  begs_to_leave:       ["We have to go. We have to leave RIGHT NOW.", "Please. Please can we just go?"],
  dissociates:         ["I'm here. I'm — yeah. Here. I'm here.", "Everything sounds far away right now."],

  // Isolation
  methodical:          ["Separated. Okay. Meet point is the exit. Get there.", "Alone isn't fatal. Stupid is fatal."],
  dark:                ["If something finds me out here, I was right about everything."],
  panic:               ["I'm alone. I'm completely alone. I'm alone—", "Someone come get me. I can't — please."],
  bravado:             ["Fine. Solo run. I've always worked better alone anyway."],
  stoic:               ["Separated. Fine. I've handled worse."],
  calculating_isolation: ["Alone means no liabilities. Might actually be faster."],
  terrified:           ["I can hear something moving. I can hear it. I'm alone and I can hear it."],
  overloads:           ["Too much — there's too much — I need to — I can't —"],

  // Betrayal
  cold:                ["Understood. I won't forget this.", "That's the last time you'll fool me."],
  calculating:         ["Interesting. File that away."],
  explosive:           ["YOU — what did you DO?!", "After everything — AFTER EVERYTHING—"],
  hurt:                ["I trusted you. I actually trusted you.", "Oh. Oh that's — okay. Wow."],
  vindicated:          ["Called it. I called it from the start.", "I was right. I hate that I was right."],
  devastated:          ["I thought — I thought we were—", "How could you do that."],
  self_blames:         ["I should have known. I always know too late."],

  // Discoveries
  connects_dots:       ["That explains the timing. And the access. And the—", "Everything before this just clicked."],
  grim_satisfaction:   ["There it is. Horrible. But there it is."],
  overwhelmed:         ["I can't — there's too much information — what does that MEAN—"],
  excited_scared:      ["Oh that's — that's terrible and also we need to go NOW."],
  already_suspected:   ["I had a theory. Now I have a fact. Neither is good."],
  needs_more:          ["That's a piece, not the picture. What else?"],
  vindicated_fear:     ["I was scared for a reason. I was scared for THIS reason."],
  worse_now:           ["Knowing doesn't help. Knowing makes it worse."],

  // Injuries
  clinical:            ["Manageable. Doesn't affect function. Moving on."],
  pushes_through:      ["It's fine. Keep going. Don't slow down for me."],
  dramatic:            ["I'M INJURED — someone — okay okay it's not — it's bad though—"],
  laughs_it_off:       ["Ha. Great. Add it to the list.", "Yep. That's going to be a problem later."],
  minimizes:           ["It's nothing. Ignore it.", "Surface. I'm fine."],
  keeps_moving:        ["Don't wait for me. Go."],
  focuses_on_pain:     ["It hurts. It really, really hurts."],
  needs_reassurance:   ["Is it bad? Tell me it's not bad. Is it bad?"],

  // Survival
  quiet_relief:        ["Okay. Okay we made it. We actually made it."],
  already_planning:    ["Exit route confirmed. Next problem."],
  euphoric:            ["WE'RE ALIVE! We're — WE DID IT—", "HA! Not today! NOT TODAY!"],
  immediately_regrets: ["…Oh god that was terrifying. That was the most terrifying — oh god."],
  relieved_but_quiet:  ["…Good. Good.", "…Okay."],
  critical_debrief:    ["We survived. Now we figure out how that happened and never need it again."],
  crying:              ["I'm okay — I'm — [crying] — I'm okay—", "We made it. We actually made it. [sobbing]"],
  cant_believe_it:     ["I didn't think we were going to make it. I really didn't."],
};

/**
 * Get a reaction line for a member given the event type.
 * @param {object} member - party member
 * @param {string} reactionType - REACTION_TYPES value
 * @returns {string|null}
 */
export function getReactionLine(member, reactionType) {
  const role = getCharacterRole(member);
  const toneList = REACTIONS[role]?.[reactionType] || REACTIONS.Nervous[reactionType] || [];
  if (!toneList.length) return null;
  const tone = toneList[Math.floor(Math.random() * toneList.length)];
  const pool = REACTION_LINES[tone] || [];
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Pick 1–2 reacting members excluding the player and dead/missing.
 */
export function pickReactingMembers(party, count = 1) {
  const candidates = party.filter(m => m.isAlive && !m.isMissing && !m.isPlayer);
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Determine reaction type from game event context.
 */
export function classifyReaction({ deathOccurred, fearDelta, isolated, betrayal, discovery, injured, survived }) {
  if (deathOccurred) return REACTION_TYPES.DEATH;
  if (betrayal)      return REACTION_TYPES.BETRAYAL;
  if (discovery)     return REACTION_TYPES.DISCOVERY;
  if (isolated)      return REACTION_TYPES.ISOLATION;
  if (injured)       return REACTION_TYPES.INJURY;
  if (survived)      return REACTION_TYPES.SURVIVAL;
  if (fearDelta >= 15) return REACTION_TYPES.FEAR_SPIKE;
  return null;
}