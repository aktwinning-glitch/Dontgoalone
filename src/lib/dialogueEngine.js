// Character-driven dialogue engine — role-aware, personality-specific

// ── Role definitions ──────────────────────────────────────────────────────────
export const ROLES = {
  Smart:   "Smart",
  Chaotic: "Chaotic",
  Skeptic: "Skeptic",
  Nervous: "Nervous",
};

// Per-role voice lines by situation
const ROLE_LINES = {
  Smart: {
    fear:       ["That's… not where we left that.", "The pattern's wrong. We've been assuming the wrong thing.", "If I'm right — and I am — we have maybe eight minutes.", "Something changed between then and now. Figure out what."],
    dismissive: ["Everything has an explanation. Most of them are bad.", "I'm calm. Panic is a choice.", "Note what's missing, not what's there.", "You don't remember that either? Cool. Love that."],
    suspicious: ["That's not what you said before.", "Two stories. One person. Interesting.", "You've gone off alone twice now. I'm keeping count.", "The timing's too clean to be accidental."],
    defensive:  ["I'm methodical, not guilty.", "Accuse me again and you're on your own.", "You're filling in facts with fear."],
    rational:   ["One of us watches the door. One checks the room. Simple.", "Think before you open that.", "Not splitting up isn't a suggestion."],
    hurt:       ["You had the information. You chose not to share it.", "I trusted your read. That's on me.", "Noted."],
    brave:      ["I'll check it. Someone has to think clearly down there.", "Thirty seconds. Cover the exit.", "If I'm not back, don't wait."],
  },
  Chaotic: {
    fear:       ["Cool. Love that the house remembers us.", "Okay I'm vibrating. Is anyone else vibrating?", "So either we're wrong… or something else isn't.", "I've made worse decisions. This morning."],
    dismissive: ["If something wanted us dead we'd know.", "Maybe it's a raccoon. Very committed raccoon.", "The vibes are bad but like, survivable bad.", "I'm not scared. I'm excited. Those feel the same now."],
    suspicious: ["Wait. Hold on. No. WAIT.", "That tracks. Suspiciously well, actually.", "You just gave yourself away and you don't know it.", "I'm not saying you did it. I'm just saying you look like you did it."],
    defensive:  ["I'm chaotic, not homicidal. There's a gap there.", "Yes I went outside. It's called breathing.", "Everyone's looking at me. Which I usually love."],
    rational:   ["Real talk: nobody goes alone. That's the rule.", "We stick together. I've seen how the other version ends.", "Door stays locked. I'm fun but I'm serious about this."],
    hurt:       ["You left. I noticed. So did whatever's out there.", "Cool. Cool cool cool. We're not talking about this later.", "Wow. Okay. Fine."],
    brave:      ["I'll go. Someone dramatic should. That's me.", "If I die down there, that's terrible. Also a little funny.", "Someone has to. Might as well be the one who's already scared."],
  },
  Skeptic: {
    fear:       ["There's a normal explanation for this.", "Old houses settle. That's what that was.", "I'm not scared. I'm annoyed.", "We're spiraling. Stop."],
    dismissive: ["Rational. Explainable. Moving on.", "Stop catastrophizing. It doesn't help.", "If somebody says 'it's probably nothing,' I'm leaving.", "This is stress talking. Not evidence."],
    suspicious: ["Okay but wait — where were you actually?", "That explanation doesn't hold.", "You keep doing that and I keep noticing it.", "Prove it."],
    defensive:  ["I don't owe you a timeline of my evening.", "You sound paranoid. That's the concerning part.", "Skepticism isn't guilt."],
    rational:   ["What are the actual facts? Just those.", "Assumptions are how people die in exactly this situation.", "We need information. Not feelings."],
    hurt:       ["I said this would happen.", "You chose to believe something else. Live with that.", "I'm done arguing. Let's just get out."],
    brave:      ["Someone with a clear head goes first. That's me.", "I'll check. Without the dramatics.", "Stand back."],
  },
  Nervous: {
    fear:       ["No. No, something's wrong.", "I've felt this before. I was right that time too.", "Something moved. I know what I saw.", "Can we please just leave?"],
    dismissive: ["I'm trying. I'm really trying.", "Maybe it's fine. Maybe.", "…I don't believe that."],
    suspicious: ["I don't trust them. I know how that sounds.", "Did you see their face when we said that?", "They're lying. I don't know how I know, but I know.", "Why do they keep going quiet?"],
    defensive:  ["I'm nervous, not guilty. There's a difference.", "Everyone keeps looking at me like I did something.", "I just want us to be okay."],
    rational:   ["We go together. All of us. Please.", "I need someone with me. I can't do this part alone.", "We should tell everyone. Right now."],
    hurt:       ["I said I was scared and no one listened.", "You left me alone in there.", "I told you. I told everyone."],
    brave:      ["I'm terrified. I'm still going.", "Don't tell me to stay behind.", "I need to do something. Let me do something."],
  },
};

// Fallback lines when role is unknown
const FALLBACK_LINES = {
  fear:       ["Something's wrong.", "Did you hear that?", "I don't like this."],
  dismissive: ["Relax. It's fine.", "You're overthinking it."],
  suspicious: ["Wait… who did that?", "Where were you just now?"],
  defensive:  ["Why are you looking at me?", "I didn't do anything."],
  rational:   ["We need to stay together.", "Think about this."],
  hurt:       ["I trusted you.", "You left me behind."],
  brave:      ["I'll go first.", "Someone has to."],
};

/**
 * Get a role-appropriate dialogue line.
 * @param {string} category - fear | dismissive | suspicious | defensive | rational | hurt | brave
 * @param {string|null} role - Smart | Chaotic | Skeptic | Nervous | null
 */
export function getDialogueLine(category, role = null) {
  const rolePool = role ? ROLE_LINES[role]?.[category] : null;
  const pool = rolePool || FALLBACK_LINES[category] || FALLBACK_LINES.fear;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Pick a random speaker from the party (not the player).
 * Hard rule: dead and missing characters are never selected.
 */
export function pickSpeaker(party) {
  const candidates = party?.filter(m => m.isAlive && !m.isMissing && !m.isPlayer) || [];
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Get a death reaction line from a surviving character.
 * Used when another member has just died.
 */
export function getDeathReactionLine(survivorRole, deadName) {
  const firstName = deadName?.split(" ")[0] || "them";
  const reactions = {
    Smart:   [`"${firstName} was right beside me."`, `"We need to account for this. Now."`, `"That changes everything. Keep moving."`],
    Chaotic: [`"Wait—where's ${firstName}?"`, `"No. No no no. ${firstName}—"`, `"Did anyone else just—okay. Okay."`],
    Skeptic: [`"${firstName} is gone. We deal with that later."`, `"Don't stop. There's nothing we can do."`, `"…${firstName}."`],
    Nervous: [`"I knew it. I said something was wrong."`, `"…${firstName} was right behind me."`, `"We have to go. We have to go right now."`],
  };
  const pool = reactions[survivorRole] || [`"…${firstName}?"`, `"Where did they go?"`, `"Something took them."`];
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Determine dialogue category from game state.
 */
export function getContextualCategory(fear, threat, success) {
  if (!success && fear > 70) return "fear";
  if (!success && fear > 40) return "hurt";
  if (success && threat < 30) return "dismissive";
  if (success && threat > 60) return "brave";
  if (fear > 50 && Math.random() < 0.4) return "suspicious";
  if (Math.random() < 0.3) return "rational";
  return Math.random() < 0.5 ? "fear" : "dismissive";
}

/**
 * Derive the primary role for a character from their description or traits.
 * Falls back to Nervous.
 */
export function getCharacterRole(member) {
  const desc = (member?.roleTag || member?.description || "").toLowerCase();
  if (desc.includes("smart") || desc.includes("observant") || desc.includes("intel")) return ROLES.Smart;
  if (desc.includes("chaotic") || desc.includes("impulsive") || desc.includes("wild")) return ROLES.Chaotic;
  if (desc.includes("skeptic") || desc.includes("rational") || desc.includes("deny")) return ROLES.Skeptic;
  if (desc.includes("nervous") || desc.includes("anxious") || desc.includes("fear")) return ROLES.Nervous;
  // Distribute deterministically by name hash so it's stable per character
  const hash = (member?.name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return [ROLES.Smart, ROLES.Chaotic, ROLES.Skeptic, ROLES.Nervous][hash % 4];
}

// ── Loyalty / trust ───────────────────────────────────────────────────────────
export const LOYALTY_STATES = ["Hostile", "Distant", "Neutral", "Loyal", "Devoted"];
export const LOYALTY_COLORS = {
  Hostile:  "hsl(351 78% 60%)",
  Distant:  "hsl(40 30% 50%)",
  Neutral:  "hsl(252 8% 55%)",
  Loyal:    "hsl(200 65% 55%)",
  Devoted:  "hsl(123 68% 55%)",
};

export function getLoyaltyState(trustWithPlayer) {
  if (trustWithPlayer <= 1) return "Hostile";
  if (trustWithPlayer <= 3) return "Distant";
  if (trustWithPlayer <= 6) return "Neutral";
  if (trustWithPlayer <= 8) return "Loyal";
  return "Devoted";
}

export function getLoyaltyStatBonus(loyaltyState) {
  const map = { Hostile: -2, Distant: -1, Neutral: 0, Loyal: 1, Devoted: 2 };
  return map[loyaltyState] || 0;
}