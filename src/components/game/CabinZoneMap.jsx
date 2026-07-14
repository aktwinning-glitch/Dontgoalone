import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/lib/GameContext";
import { getMemberStatus, MEMBER_STATUS } from "@/lib/partyEngine";
import CharacterPortrait, { CHARACTER_PRESETS, getExpressionForMember } from "./CharacterPortrait";
import { Skull, HelpCircle } from "lucide-react";

// 6 cabin zones with visual layout positions + per-zone ambient style
const ZONES = [
  { id: "porch",    label: "Porch",       x: "50%", y: "7%",  w: "46%", h: "13%", icon: "🌙", accentHue: 216, accentOp: 0.08 },
  { id: "living",   label: "Living Room", x: "22%", y: "30%", w: "38%", h: "18%", icon: "🪑", accentHue: 271, accentOp: 0.07 },
  { id: "kitchen",  label: "Kitchen",     x: "73%", y: "30%", w: "26%", h: "18%", icon: "💡", accentHue: 38,  accentOp: 0.10 },
  { id: "upstairs", label: "Upstairs",    x: "50%", y: "54%", w: "52%", h: "15%", icon: "🚪", accentHue: 252, accentOp: 0.07 },
  { id: "basement", label: "Basement",    x: "22%", y: "76%", w: "34%", h: "15%", icon: "🕯️", accentHue: 18,  accentOp: 0.12 },
  { id: "woods",    label: "Woods",       x: "75%", y: "76%", w: "26%", h: "15%", icon: "🌲", accentHue: 123, accentOp: 0.10 },
];

// Assign each party member a zone deterministically by index
function assignZone(index) {
  return ZONES[index % ZONES.length].id;
}

function MemberAvatar({ member, presetIndex, assetImage, isActive, onClick, sizeOverride }) {
  const status = getMemberStatus(member);
  const isDead = status === MEMBER_STATUS.DEAD;
  const isMissing = status === MEMBER_STATUS.MISSING;
  const isNervous = status === MEMBER_STATUS.NERVOUS;
  const isInjured = status === MEMBER_STATUS.INJURED;

  const preset = CHARACTER_PRESETS[presetIndex % CHARACTER_PRESETS.length];
  const expression = getExpressionForMember(member);

  const size = sizeOverride ?? (member.isPlayer ? 52 : 40);

  const ringStyle = member.isPlayer
    ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
    : isActive
    ? "ring-2 ring-warning"
    : isDead
    ? "ring-1 ring-destructive/30"
    : isMissing
    ? "ring-1 ring-border/40"
    : isNervous
    ? "ring-1 ring-warning/50"
    : "ring-1 ring-border/50";

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`relative rounded-full overflow-hidden ${ringStyle} shrink-0`}
      style={{
        width: size,
        height: size,
        opacity: isDead ? 0.35 : isMissing ? 0.5 : 1,
        filter: isDead || isMissing ? "grayscale(1)" : "none",
      }}
      animate={
        isDead
          ? {}
          : member.isPlayer
          ? { y: [0, -3, 0] }
          : isNervous
          ? { y: [0, -2, 0] }
          : { y: [0, -1.5, 0] }
      }
      transition={{
        y: {
          duration: member.isPlayer ? 2.8 : 3.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: presetIndex * 0.3,
        }
      }}
    >
      <CharacterPortrait
        {...preset}
        expression={isDead ? "unstable" : isMissing ? "scared" : expression}
        size={size}
        assetImage={assetImage}
      />
      {isDead && (
        <div className="absolute inset-0 flex items-center justify-center bg-foreground/40 rounded-full">
          <Skull className="w-3.5 h-3.5 text-background/70" />
        </div>
      )}
      {isMissing && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-full backdrop-blur-[1px]">
          <HelpCircle className="w-3 h-3 text-muted-foreground" />
        </div>
      )}
      {isNervous && !isDead && (
        <div className="absolute inset-0 rounded-full border border-warning/40 animate-ping" style={{ animationDuration: "2s" }} />
      )}
    </motion.button>
  );
}

function ZoneBox({ zone, members, party, charImageMap, activeMemberId, onMemberTap }) {
  const hasActiveMembers = members.some(m => m.isAlive && !m.isMissing);
  const hasDead = members.some(m => !m.isAlive);
  const hasMissing = members.some(m => m.isMissing);
  const isWoods = zone.id === "woods";

  const zoneGlow = hasDead
    ? `hsl(351 78% 60% / 0.20)`
    : hasMissing
    ? `hsl(40 90% 60% / 0.15)`
    : hasActiveMembers
    ? `hsl(${zone.accentHue} 80% 60% / 0.18)`
    : "transparent";
  const zoneBorder = hasDead
    ? "hsl(351 78% 60% / 0.4)"
    : hasMissing
    ? "hsl(40 90% 62% / 0.35)"
    : hasActiveMembers
    ? `hsl(${zone.accentHue} 80% 65% / 0.3)`
    : "hsl(252 10% 20% / 0.3)";

  return (
    <motion.div
      layout
      className="absolute flex flex-col"
      style={{
        left: zone.x,
        top: zone.y,
        width: zone.w,
        transform: "translateX(-50%)",
      }}
    >
      {/* Zone background glow patch */}
      {hasActiveMembers && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, hsl(${zone.accentHue} 70% 55% / ${zone.accentOp}) 0%, transparent 75%)`,
            transform: "scale(1.4)",
          }}
        />
      )}
      {/* Zone label */}
      <div
        className="self-center rounded-full px-2 py-0.5 mb-1 flex items-center gap-0.5"
        style={{
          background: hasActiveMembers ? "hsl(252 12% 20% / 0.95)" : "hsl(252 12% 13% / 0.7)",
          border: `1px solid ${zoneBorder}`,
          boxShadow: hasActiveMembers ? `0 0 10px ${zoneGlow}` : "none",
        }}
      >
        <span className="text-[7px]">{zone.icon}</span>
        <span
          className="text-[7px] font-bold uppercase tracking-widest"
          style={{ color: hasActiveMembers ? `hsl(${zone.accentHue} 80% 80%)` : "hsl(252 8% 36%)" }}
        >
          {zone.label}
        </span>
      </div>

      {/* Member row — guaranteed no overlap: flex with wrap + fixed avatar size */}
      {members.length > 0 && (
        <div className="flex flex-wrap justify-center items-end gap-1" style={{ maxWidth: "100%" }}>
          {members.map((member, i) => {
            const idx = party.indexOf(member);
            // Slightly smaller avatars when >1 member in zone to fit without overlap
            const avatarSize = members.length > 2 ? 28 : members.length > 1 ? 34 : member.isPlayer ? 52 : 40;
            return (
              <div key={member.id} className="flex flex-col items-center gap-0.5 shrink-0">
                <MemberAvatar
                  member={member}
                  presetIndex={idx}
                  assetImage={charImageMap?.[member.id] || null}
                  isActive={member.id === activeMemberId}
                  onClick={() => onMemberTap?.(member)}
                  sizeOverride={avatarSize}
                />
                <span
                  className="text-[6px] font-semibold text-center leading-none"
                  style={{
                    color: member.isPlayer
                      ? "hsl(351 78% 68%)"
                      : !member.isAlive
                      ? "hsl(252 8% 35%)"
                      : "hsl(252 8% 60%)",
                    maxWidth: avatarSize + 4,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {member.isPlayer ? "YOU" : member.name?.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

export default function CabinZoneMap({ onMemberTap, activeMemberId }) {
  const { party, charImageMap, player } = useGame();

  if (!party || party.length === 0) return null;

  // Cap to 6 members
  const capped = party.slice(0, 6);

  // Use currentLocation if set, else fall back to index-based zone assignment
  const zoneMap = {};
  ZONES.forEach(z => { zoneMap[z.id] = []; });
  capped.forEach((m, i) => {
    const loc = m.currentLocation;
    const zoneId = loc && ZONES.find(z => z.id === loc) ? loc : ZONES[i % ZONES.length].id;
    zoneMap[zoneId].push(m);
  });

  const aliveCount = capped.filter(m => m.isAlive && !m.isMissing).length;

  return (
    <div className="relative w-full" style={{ paddingBottom: "93%" }}>
      <div
        className="absolute inset-0 rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(165deg, hsl(252 15% 12%) 0%, hsl(252 13% 8%) 100%)",
          border: "1.5px solid hsl(252 10% 18%)",
          boxShadow: "inset 0 0 40px hsl(252 14% 5% / 0.6)",
        }}
      >
        {/* Basement darker gradient patch */}
        <div className="absolute bottom-0 left-0 w-1/2 h-1/4 rounded-br-none" style={{ background: "radial-gradient(ellipse at 0% 100%, hsl(18 40% 10% / 0.6) 0%, transparent 70%)" }} />
        {/* Woods fog patch */}
        <div className="absolute bottom-0 right-0 w-1/3 h-1/4" style={{ background: "radial-gradient(ellipse at 100% 100%, hsl(123 40% 12% / 0.5) 0%, transparent 70%)" }} />
        {/* Kitchen light glow */}
        <div className="absolute" style={{ top: "22%", right: "4%", width: "22%", height: "20%", background: "radial-gradient(ellipse at 80% 40%, hsl(38 80% 55% / 0.07) 0%, transparent 70%)" }} />

        {/* Blueprint floor plan lines — slightly more visible */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* outer walls */}
          <rect x="6" y="4" width="88" height="92" fill="none" stroke="hsl(40,30%,85%)" strokeWidth="0.7" rx="1"/>
          {/* porch separator */}
          <line x1="6" y1="20" x2="94" y2="20" stroke="hsl(40,30%,85%)" strokeWidth="0.4" strokeDasharray="2,2"/>
          {/* main floor divider */}
          <line x1="6" y1="46" x2="94" y2="46" stroke="hsl(40,30%,85%)" strokeWidth="0.5"/>
          {/* bottom floor divider */}
          <line x1="6" y1="68" x2="94" y2="68" stroke="hsl(40,30%,85%)" strokeWidth="0.5"/>
          {/* vertical living/kitchen */}
          <line x1="58" y1="20" x2="58" y2="46" stroke="hsl(40,30%,85%)" strokeWidth="0.4"/>
          {/* vertical basement/woods */}
          <line x1="58" y1="68" x2="58" y2="96" stroke="hsl(40,30%,85%)" strokeWidth="0.4"/>
          {/* staircase hint */}
          <line x1="46" y1="46" x2="54" y2="68" stroke="hsl(40,30%,85%)" strokeWidth="0.3" strokeDasharray="1.5,1.5"/>
          {/* door markers */}
          <path d="M27 46 Q30 43 33 46" fill="none" stroke="hsl(40,30%,85%)" strokeWidth="0.4"/>
          <path d="M65 46 Q68 43 71 46" fill="none" stroke="hsl(40,30%,85%)" strokeWidth="0.4"/>
        </svg>

        {/* Stats strip */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-center">
          <div
            className="flex items-center gap-1 rounded-full px-2 py-0.5"
            style={{ background: "hsl(252 12% 18% / 0.9)", border: "1px solid hsl(252 10% 24% / 0.6)" }}
          >
            <span className="text-[8px] font-bold text-muted-foreground">
              {aliveCount}/{capped.length} alive
            </span>
          </div>

        </div>

        {/* Zone boxes */}
        <AnimatePresence>
          {ZONES.map((zone) => (
            <motion.div
              key={zone.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: ZONES.indexOf(zone) * 0.04 }}
            >
              <ZoneBox
                zone={zone}
                members={zoneMap[zone.id]}
                party={capped}
                charImageMap={charImageMap}
                activeMemberId={activeMemberId}
                onMemberTap={onMemberTap}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}