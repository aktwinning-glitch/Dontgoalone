/**
 * NeonPartyMap — story-aware character avatars on a neon-grid map.
 * Each story has its own zone labels, positions, and danger levels via mapLayout.
 * Status rings: cyan=alive, violet=player, ruby=injured, neon-pink=missing, dark=dead.
 * Same-group members cluster with a shared group glow link.
 */
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import CharacterPortrait, { CHARACTER_PRESETS, getExpressionForMember } from "./CharacterPortrait";
import { getZonePosition, getZoneLabel } from "@/lib/storyMapLayouts";

// Fallback positions if no layout provided
const FALLBACK_POS = { x: 50, y: 50 };

function jitter(x, y, index, total) {
  // Spread members at same location in a small circle
  if (total <= 1) return { x, y };
  const angle = (index / total) * 2 * Math.PI;
  const r = 5;
  return { x: x + r * Math.cos(angle), y: y + r * Math.sin(angle) };
}

function StatusRing({ member, isActive }) {
  if (!member.isAlive) return { color: "#B3003C", animate: false, opacity: 0.5 };
  if (member.isMissing) return { color: "#FF2DAA", animate: true };
  if (member.isInjured) return { color: "#B3003C", animate: false };
  if (isActive) return { color: "#C400FF", animate: true };
  if (member.isPlayer) return { color: "#C400FF", animate: false };
  return { color: "#00F0FF", animate: false };
}

export default function NeonPartyMap({ party = [], activeMemberId, onMemberTap, charImageMap, mapImageUrl, mapLayout, mapOverlayUrl }) {
  // Group members by location zone — use currentLocation (set by partyEngine) as source of truth
  const membersByZone = useMemo(() => {
    const map = {};
    party.forEach(m => {
      const zone = m.currentLocation || m.location || "living";
      if (!map[zone]) map[zone] = [];
      map[zone].push(m);
    });
    return map;
  }, [party]);

  // Story-aware zone positions from layout
  const zones = mapLayout?.zones || [];

  return (
    <div className="relative w-full" style={{ paddingBottom: "66.6%" }}>
      <div className="absolute inset-0">
        {/* Background: story map image or neon grid fallback */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{
            background: "#050507",
            backgroundImage: mapImageUrl ? "none" : `
              linear-gradient(hsl(185 100% 50% / 0.06) 1px, transparent 1px),
              linear-gradient(90deg, hsl(185 100% 50% / 0.06) 1px, transparent 1px)
            `,
            backgroundSize: "36px 36px",
            border: "1px solid hsl(185 100% 50% / 0.15)",
          }}
        >
          {mapImageUrl && (
            <>
              <img
                src={mapImageUrl}
                alt="map"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: "saturate(0.4) brightness(0.45) contrast(1.15)" }}
              />
              {/* Neon overlay grid on top of map image */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                    linear-gradient(hsl(185 100% 50% / 0.04) 1px, transparent 1px),
                    linear-gradient(90deg, hsl(185 100% 50% / 0.04) 1px, transparent 1px)
                  `,
                  backgroundSize: "36px 36px",
                }}
              />
            </>
          )}
        </div>

        {/* Story-specific zone labels */}
        {zones.map((zone) => (
          <div
            key={zone.id}
            className="absolute pointer-events-none"
            style={{ left: `${zone.x}%`, top: `${zone.y}%`, transform: "translate(-50%, -50%)" }}
          >
            <span
              className="text-[7px] uppercase tracking-widest font-bold opacity-25"
              style={{ color: zone.danger >= 40 ? "#B3003C" : "#00F0FF" }}
            >
              {zone.label}
            </span>
          </div>
        ))}

        {/* Group glow links — draw lines between same-zone living members */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
          {Object.values(membersByZone).map((members, gi) => {
            const alive = members.filter(m => m.isAlive && !m.isMissing);
            if (alive.length < 2) return null;
            const positions = alive.map((m, i) => {
              const base = getZonePosition(mapLayout, m.currentLocation || m.location) || FALLBACK_POS;
              return jitter(base.x, base.y, i, alive.length);
            });
            return positions.slice(0, -1).map((pos, i) => (
              <line
                key={`${gi}-${i}`}
                x1={`${pos.x}%`} y1={`${pos.y}%`}
                x2={`${positions[i + 1].x}%`} y2={`${positions[i + 1].y}%`}
                stroke="#00F0FF"
                strokeWidth="1.5"
                strokeOpacity="0.3"
                strokeDasharray="4 4"
              />
            ));
          })}
        </svg>

        {/* Avatars — only render alive/missing members, not dead */}
        {party.filter(m => m.isAlive || m.isMissing).map((member, idx) => {
          const loc = member.currentLocation || member.location || "living";
          const base = getZonePosition(mapLayout, loc) || FALLBACK_POS;
          const zoneMembers = membersByZone[loc] || [];
          const posIdx = zoneMembers.findIndex(m => m.id === member.id);
          const pos = jitter(base.x, base.y, Math.max(0, posIdx), Math.max(1, zoneMembers.length));
          const ring = StatusRing({ member, isActive: activeMemberId === member.id });
          const assetImg = charImageMap?.[member.id] || null;
          const expression = getExpressionForMember(member);
          const preset = CHARACTER_PRESETS[idx % CHARACTER_PRESETS.length];
          const isActive = activeMemberId === member.id;
          const isDead = !member.isAlive;
          const isMissing = member.isMissing;

          return (
            <motion.button
              key={member.id}
              className="absolute"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: "translate(-50%, -50%)",
                zIndex: isActive ? 20 : 10,
              }}
              onClick={() => onMemberTap?.(member)}
              animate={ring.animate ? { scale: [1, 1.06, 1] } : { scale: 1 }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Group glow */}
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{
                    boxShadow: `0 0 0 6px ${ring.color}55, 0 0 20px ${ring.color}66`,
                    borderRadius: "50%",
                  }}
                />
              )}

              {/* Avatar circle */}
              <div
                className="rounded-full overflow-hidden relative"
                style={{
                  width: member.isPlayer ? 44 : 34,
                  height: member.isPlayer ? 44 : 34,
                  boxShadow: `0 0 0 2.5px ${ring.color}, 0 0 10px ${ring.color}55`,
                  opacity: isDead ? 0.4 : 1,
                  filter: isDead ? "grayscale(0.8) contrast(1.2)" : "none",
                }}
              >
                <CharacterPortrait
                  {...preset}
                  expression={expression}
                  size={member.isPlayer ? 44 : 34}
                  assetImage={assetImg}
                />
                {/* Dead slash overlay */}
                {isDead && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: "#B3003C44" }}
                  >
                    <div style={{ width: "130%", height: 2, background: "#B3003C", transform: "rotate(-40deg)", position: "absolute" }} />
                  </div>
                )}
                {/* Missing ? overlay */}
                {isMissing && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center rounded-full"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    style={{ background: "#FF2DAA33" }}
                  >
                    <span style={{ color: "#FF2DAA", fontSize: 12, fontWeight: 900 }}>?</span>
                  </motion.div>
                )}
              </div>

              {/* Name label */}
              <div className="mt-0.5 text-center" style={{ maxWidth: 48 }}>
                <span
                  className="block text-[6px] font-bold uppercase tracking-wide truncate"
                  style={{ color: ring.color, textShadow: `0 0 6px ${ring.color}` }}
                >
                  {member.name?.split(" ")[0]}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}