import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/lib/GameContext";
import { getMemberStatus, MEMBER_STATUS } from "@/lib/partyEngine";
import CharacterPortrait, { CHARACTER_PRESETS, getExpressionForMember } from "./CharacterPortrait";
import { Skull, HelpCircle, AlertTriangle, Moon } from "lucide-react";

// Cluster positions for 6 members — loose irregular layout, works on mobile
const POSITIONS = [
  { x: "50%", y: "30%"  }, // player (center-ish top)
  { x: "20%", y: "20%"  },
  { x: "80%", y: "22%"  },
  { x: "15%", y: "62%"  },
  { x: "82%", y: "60%"  },
  { x: "50%", y: "72%"  },
];

function StatusIcon({ status }) {
  if (status === MEMBER_STATUS.DEAD)
    return <Skull className="w-3 h-3 text-foreground/60" />;
  if (status === MEMBER_STATUS.MISSING)
    return <HelpCircle className="w-3 h-3 text-muted-foreground" />;
  if (status === MEMBER_STATUS.INJURED)
    return <AlertTriangle className="w-3 h-3 text-warning" />;
  return null;
}

function MemberNode({ member, index, isActive, onClick, presetIndex, assetImage }) {
  const status = getMemberStatus(member);
  const isDead = status === MEMBER_STATUS.DEAD;
  const isMissing = status === MEMBER_STATUS.MISSING;
  const isNervous = status === MEMBER_STATUS.NERVOUS;
  const isInjured = status === MEMBER_STATUS.INJURED;

  const preset = CHARACTER_PRESETS[presetIndex % CHARACTER_PRESETS.length];
  const expression = getExpressionForMember(member);

  const pos = POSITIONS[index] || POSITIONS[0];

  const ringClass = member.isPlayer
    ? "ring-4 ring-primary ring-offset-2 ring-offset-background"
    : isActive
    ? "ring-3 ring-warning ring-offset-1 ring-offset-background"
    : isNervous
    ? "ring-2 ring-chart-4/60"
    : isInjured
    ? "ring-2 ring-warning/70"
    : "ring-2 ring-border/60";

  return (
    <motion.div
      key={member.id}
      className="absolute"
      style={{ left: pos.x, top: pos.y, transform: "translate(-50%,-50%)" }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: isDead ? 0.7 : 1,
        opacity: isDead ? 0.4 : isMissing ? 0.55 : 1,
      }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 300, damping: 22 }}
    >
      <motion.button
        whileTap={{ scale: 0.91 }}
        onClick={onClick}
        className={`relative rounded-full overflow-hidden ${ringClass} transition-all duration-300 ${
          isActive ? "shadow-lg shadow-warning/30" : ""
        } ${member.isPlayer ? "shadow-md shadow-primary/30" : ""}`}
        style={{ width: member.isPlayer ? 68 : 56, height: member.isPlayer ? 68 : 56 }}
      >
        <CharacterPortrait
          {...preset}
          expression={isDead ? "unstable" : isMissing ? "scared" : expression}
          size={member.isPlayer ? 68 : 56}
          assetImage={assetImage}
          className={`${isDead ? "grayscale" : ""} ${isMissing ? "grayscale brightness-75" : ""}`}
        />

        {/* Dead overlay */}
        {isDead && (
          <div className="absolute inset-0 rounded-full bg-foreground/50 flex items-center justify-center">
            <Skull className="w-5 h-5 text-background/70" />
          </div>
        )}
        {/* Missing overlay */}
        {isMissing && (
          <div className="absolute inset-0 rounded-full bg-muted/60 backdrop-blur-[1px] flex items-center justify-center">
            <span className="text-[10px] font-black text-muted-foreground tracking-widest">?</span>
          </div>
        )}
        {/* Nervous pulse ring */}
        {isNervous && !isDead && (
          <div className="absolute inset-0 rounded-full border-2 border-chart-4/50 animate-ping" />
        )}
      </motion.button>

      {/* Name label */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap"
        style={{ top: "100%" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.07 + 0.2 }}
      >
        <div className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border text-center
          ${member.isPlayer
            ? "bg-primary text-primary-foreground border-primary"
            : isDead
            ? "bg-muted text-muted-foreground/60 border-border/40 line-through"
            : isMissing
            ? "bg-muted text-muted-foreground border-border/40 italic"
            : isActive
            ? "bg-warning/20 text-warning-foreground border-warning/50"
            : "bg-card text-foreground/70 border-border/50"
          }`}
        >
          {member.isPlayer ? "YOU" : member.name?.split(" ")[0] ?? "?"}
        </div>
        {/* Status badge */}
        {(isInjured || isNervous) && !isDead && !isMissing && (
          <div className="flex justify-center mt-0.5">
            <StatusIcon status={status} />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function PartyMapScreen({ onMemberTap, activeMemberId }) {
  const { party, player, charImageMap } = useGame();

  if (!party || party.length === 0) return null;

  // Sort: player first, then others
  const sorted = [...party].sort((a, b) => {
    if (a.isPlayer) return -1;
    if (b.isPlayer) return 1;
    return 0;
  });

  const aliveCount = party.filter(m => m.isAlive && !m.isMissing).length;
  const nightLabel = player ? `Night ${player.night}` : "";

  return (
    <div className="relative w-full" style={{ paddingBottom: "90%" }}>
      {/* Subtle horror atmosphere background */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden bg-gradient-to-b from-muted/60 to-accent/30 border border-border">
        {/* Forest silhouette hint */}
        <div className="absolute bottom-0 left-0 right-0 h-16 opacity-10">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute bottom-0 bg-foreground"
              style={{
                left: `${i * 9}%`,
                width: "4%",
                height: `${40 + Math.sin(i * 1.7) * 20}%`,
                clipPath: "polygon(30% 100%, 70% 100%, 50% 0%)",
              }}
            />
          ))}
        </div>

        {/* Night indicator */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-background/70 backdrop-blur-sm rounded-full px-2.5 py-1 border border-border/50">
          <Moon className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground">{nightLabel}</span>
        </div>

        {/* Survivor count */}
        <div className="absolute top-3 left-3 bg-background/70 backdrop-blur-sm rounded-full px-2.5 py-1 border border-border/50">
          <span className="text-[10px] font-semibold text-muted-foreground">
            {aliveCount}/{party.length} alive
          </span>
        </div>

        {/* Character nodes */}
        <AnimatePresence>
          {sorted.map((member, i) => (
            <MemberNode
              key={member.id}
              member={member}
              index={i}
              presetIndex={party.indexOf(member)}
              isActive={member.id === activeMemberId && !member.isPlayer}
              onClick={() => onMemberTap?.(member)}
              assetImage={charImageMap?.[member.id] || null}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}