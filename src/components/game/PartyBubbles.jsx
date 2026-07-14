import React from "react";
import { motion } from "framer-motion";
import { getMemberStatus, MEMBER_STATUS } from "@/lib/partyEngine";
import CharacterPortrait, { CHARACTER_PRESETS, getExpressionForMember } from "./CharacterPortrait";
import { Skull, AlertTriangle, HelpCircle } from "lucide-react";

function StatusOverlay({ status }) {
  if (status === MEMBER_STATUS.DEAD) {
    return (
      <div className="absolute inset-0 rounded-full bg-foreground/70 flex items-center justify-center">
        <Skull className="w-3.5 h-3.5 text-background/70" />
      </div>
    );
  }
  if (status === MEMBER_STATUS.MISSING) {
    return (
      <div className="absolute inset-0 rounded-full bg-muted-foreground/50 backdrop-blur-[2px] flex items-center justify-center">
        <span className="text-[9px] font-black text-background/80 tracking-widest">?</span>
      </div>
    );
  }
  return null;
}

function StatusBadge({ status }) {
  if (status === MEMBER_STATUS.INJURED) {
    return (
      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-warning border-2 border-background flex items-center justify-center">
        <AlertTriangle className="w-2 h-2 text-background" />
      </div>
    );
  }
  if (status === MEMBER_STATUS.NERVOUS) {
    return (
      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-chart-4/80 border-2 border-background animate-pulse" />
    );
  }
  return null;
}

function MemberBubble({ member, isActive, onClick, presetIndex, assetImage }) {
  const status = getMemberStatus(member);
  const isDead = status === MEMBER_STATUS.DEAD;
  const isMissing = status === MEMBER_STATUS.MISSING;
  const preset = CHARACTER_PRESETS[presetIndex % CHARACTER_PRESETS.length];
  const expression = getExpressionForMember(member);

  const ringClass = member.isPlayer
    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
    : isActive
    ? "ring-2 ring-warning ring-offset-1 ring-offset-background"
    : "ring-1 ring-border/70";

  return (
    <motion.button
      layout
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: isDead ? 0.4 : isMissing ? 0.55 : 1 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className={`relative shrink-0 rounded-full overflow-hidden ${ringClass} transition-all duration-300`}
      style={{ width: 44, height: 44 }}
      title={member.name}
    >
      <CharacterPortrait
        {...preset}
        expression={isDead ? "unstable" : isMissing ? "scared" : expression}
        size={44}
        assetImage={assetImage}
        className={`${isDead ? "grayscale" : ""} ${isMissing ? "grayscale brightness-50" : ""}`}
      />

      <StatusOverlay status={status} />
      <StatusBadge status={status} />

      {member.isPlayer && (
        <div className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 rounded-full bg-primary border-2 border-background" />
      )}
    </motion.button>
  );
}

export default function PartyBubbles({ party, activeMemberId, onMemberTap, charImageMap = {} }) {
  if (!party || party.length === 0) return null;

  const sorted = [...party].sort((a, b) => {
    if (a.isPlayer) return -1;
    if (b.isPlayer) return 1;
    return 0;
  });

  return (
    <div className="flex items-center gap-2 px-1 py-1.5 overflow-x-auto">
      {sorted.map((member, i) => (
        <MemberBubble
          key={member.id}
          member={member}
          presetIndex={party.indexOf(member)}
          isActive={member.id === activeMemberId && !member.isPlayer}
          onClick={() => onMemberTap?.(member)}
          assetImage={charImageMap?.[member.id] || null}
        />
      ))}
    </div>
  );
}