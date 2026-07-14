/**
 * Social Tension Engine — Phase 2
 * Models fear-driven argument escalation, trust fracture, accusations,
 * refusals, and panic decisions as fear and threat rise.
 * Pure logic — no React.
 */

import { getCharacterRole } from "./dialogueEngine";

// ── Escalation stages ─────────────────────────────────────────────────────────
export const SOCIAL_STAGES = {
  STABLE:    { min: 0,  label: "Stable",    color: "hsl(123 68% 55%)" },
  STRAINED:  { min: 30, label: "Strained",  color: "hsl(40 90% 62%)"  },
  FRACTURING:{ min: 55, label: "Fracturing",color: "hsl(18 75% 60%)"  },
  COLLAPSED: { min: 78, label: "Collapsed", color: "hsl(351 78% 60%)" },
};

export function getSocialStage(cohesionScore) {
  // cohesion 0–100 (100 = best). Stage worsens as cohesion drops.
  const inverted = 100 - cohesionScore;
  if (inverted >= 78) return SOCIAL_STAGES.COLLAPSED;
  if (inverted >= 55) return SOCIAL_STAGES.FRACTURING;
  if (inverted >= 30) return SOCIAL_STAGES.STRAINED;
  return SOCIAL_STAGES.STABLE;
}

// ── Argument lines per stage ──────────────────────────────────────────────────
const ARGUMENT_LINES = {
  STRAINED: [
    "This wouldn't have happened if we'd stayed together.",
    "I'm not saying blame — I'm just saying whose idea was it?",
    "Everyone needs to stop and think for one second.",
    "We're making this worse by arguing.",
  ],
  FRACTURING: [
    "Someone in this group isn't telling the full story.",
    "Every bad decision tonight — who made it? Who was there?",
    "I'm not dying because someone has secrets.",
    "Trust is a luxury right now. We don't have it.",
    "Two choices: we work together or we split up and die alone.",
  ],
  COLLAPSED: [
    "I don't believe a word you say anymore.",
    "You left them. You LEFT THEM. Don't stand there.",
    "We are done listening to each other. Done.",
    "If I make it out, it's alone. That's how this ends.",
    "Someone here isn't who they said they were. I know it.",
  ],
};

export function getArgumentLine(stage) {
  const pool = ARGUMENT_LINES[stage.label] || ARGUMENT_LINES.STRAINED;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Accusation system ─────────────────────────────────────────────────────────
// Generates an accusation targeting the most suspicious member
export function generateAccusation(accuserMember, targetMember, suspicionScore) {
  if (!accuserMember || !targetMember) return null;
  if (suspicionScore < 45) return null; // suspicion too low to go public

  const role = getCharacterRole(accuserMember);
  const targetName = targetMember.name?.split(" ")[0] || "them";

  const accusations = {
    Smart: [
      `"${targetName} has gone off alone three times. The math on that is bad."`,
      `"I need ${targetName} to explain the timeline. Specifically the part that doesn't add up."`,
      `"I'm not accusing anyone. I'm pointing at the data. The data points at ${targetName}."`,
    ],
    Chaotic: [
      `"${targetName}! Something's wrong with ${targetName}, right? It's not just me?"`,
      `"Wait wait wait — ${targetName}, where were you when it happened? SPECIFICALLY."`,
      `"I love ${targetName} but something about their energy tonight is deeply off."`,
    ],
    Skeptic: [
      `"${targetName} doesn't add up. That's a fact, not a feeling."`,
      `"I'm done pretending ${targetName}'s behavior is normal."`,
      `"${targetName}: account for your time. Right now."`,
    ],
    Nervous: [
      `"I don't trust ${targetName}. I know I sound paranoid. I don't care."`,
      `"Something about ${targetName} tonight — I can't explain it. I just don't trust them."`,
      `"${targetName} keeps going quiet whenever we talk about what's happening."`,
    ],
  };

  const pool = accusations[role] || accusations.Nervous;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Refusal to cooperate ──────────────────────────────────────────────────────
// When trust is hostile, characters may refuse player requests
export function willRefuseRequest(member, cohesion) {
  const trust = member.trustWithPlayer ?? 5;
  if (trust <= 1 && cohesion < 30) return Math.random() < 0.7;
  if (trust <= 2 && cohesion < 20) return Math.random() < 0.4;
  return false;
}

export function getRefusalLine(member) {
  const role = getCharacterRole(member);
  const name = member.name?.split(" ")[0] || "them";
  const lines = {
    Smart:   [`"No. Figure it out yourself."`, `"I'm done taking direction from you."`, `"My answer is no. Don't ask again."`],
    Chaotic: [`"Ha. No."`, `"You want ME to do that? After tonight? PASS."`, `"Do it yourself. I'm done."`],
    Skeptic: [`"That's a terrible idea and I won't be part of it."`, `"No."`, `"Absolutely not."`],
    Nervous: [`"I can't. I'm sorry — I can't do that."`, `"Please don't ask me to do this."`, `"I said no. Don't push me."`],
  };
  const pool = lines[role] || lines.Nervous;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Panic decision ─────────────────────────────────────────────────────────────
// High fear + collapsed cohesion → member may act unilaterally
export function checkPanicDecision(member, fear, cohesion) {
  if (!member.isAlive || member.isMissing || member.isPlayer) return null;
  const memberFear = member.fearLevel || 0;
  const combinedRisk = fear * 0.5 + memberFear * 0.5;
  if (cohesion > 40 || combinedRisk < 65) return null;
  if (Math.random() > 0.18) return null;

  const role = getCharacterRole(member);
  const panicActions = {
    Smart:   { action: "splits_off", text: `${member.name?.split(" ")[0]} moves to verify their own escape route — alone.` },
    Chaotic: { action: "makes_noise", text: `${member.name?.split(" ")[0]} does something impulsive that draws attention.` },
    Skeptic: { action: "demands_vote", text: `${member.name?.split(" ")[0]} refuses to move until the group votes on direction.` },
    Nervous: { action: "freezes", text: `${member.name?.split(" ")[0]} freezes and won't respond to instructions.` },
  };
  return panicActions[role] || panicActions.Nervous;
}

// ── Morale decay from deaths ──────────────────────────────────────────────────
export function getMoraleHitFromDeath(deathCount, victimTrust) {
  const base = 15;
  const trustBonus = victimTrust >= 7 ? 10 : victimTrust <= 2 ? -5 : 0;
  return -(base + trustBonus + deathCount * 5);
}