import React, { useMemo, useRef, useEffect } from "react";
import CharacterPortrait, { CHARACTER_PRESETS } from "./CharacterPortrait";

/**
 * Renders an SVG-based relationship web between party members.
 * Lines are colored and weighted by trust level.
 */

const TRUST_THRESHOLDS = {
  allied:     { min: 0.7,  label: "Allied",     color: "#4ade80", width: 2.5, dash: "none"    },
  friendly:   { min: 0.4,  label: "Friendly",   color: "#a3e635", width: 1.5, dash: "none"    },
  neutral:    { min: 0.1,  label: "Neutral",    color: "#6b7280", width: 1.0, dash: "4,3"     },
  suspicious: { min: -0.3, label: "Suspicious", color: "#f59e0b", width: 1.5, dash: "3,3"     },
  hostile:    { min: -999, label: "Hostile",    color: "#ef4444", width: 2.0, dash: "2,2"     },
};

function getTrustTier(trustValue) {
  if (trustValue >= 0.7)  return TRUST_THRESHOLDS.allied;
  if (trustValue >= 0.4)  return TRUST_THRESHOLDS.friendly;
  if (trustValue >= 0.1)  return TRUST_THRESHOLDS.neutral;
  if (trustValue >= -0.3) return TRUST_THRESHOLDS.suspicious;
  return TRUST_THRESHOLDS.hostile;
}

// Position nodes in a circle (or inline if few members)
function computePositions(count, cx, cy, r) {
  const positions = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    positions.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    });
  }
  return positions;
}

export default function RelationshipNetwork({ party, charImageMap }) {
  if (!party || party.length === 0) return null;

  const members = party.slice(0, 6);
  const W = 300, H = 300;
  const cx = W / 2, cy = H / 2;
  const r = members.length <= 2 ? 80 : members.length <= 4 ? 95 : 108;
  const NODE_R = 22;

  const positions = computePositions(members.length, cx, cy, r);

  // Build edges between all pairs using trustWithPlayer for player-facing, peer trust estimated
  const edges = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i];
      const b = members[j];
      // Use trustWithPlayer as proxy; peer relationships estimated from loyalty overlap
      const trustA = a.trustWithPlayer ?? 0;
      const trustB = b.trustWithPlayer ?? 0;
      const peerTrust = (trustA + trustB) / 2 + (Math.sin(i * 3.7 + j * 1.9) * 0.15);
      const tier = getTrustTier(peerTrust);
      edges.push({ from: i, to: j, tier, trust: peerTrust });
    }
  }

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs">
        {/* Subtle grid */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(252 10% 18%)" strokeWidth="0.5" strokeDasharray="3,4" />

        {/* Edges */}
        {edges.map((edge, i) => {
          const from = positions[edge.from];
          const to = positions[edge.to];
          const mA = members[edge.from];
          const mB = members[edge.to];
          if (!mA.isAlive || !mB.isAlive) return null;
          const dash = edge.tier.dash === "none" ? undefined : edge.tier.dash;
          return (
            <line
              key={i}
              x1={from.x} y1={from.y}
              x2={to.x}   y2={to.y}
              stroke={edge.tier.color}
              strokeWidth={edge.tier.width}
              strokeDasharray={dash}
              opacity={0.55}
            />
          );
        })}

        {/* Nodes */}
        {members.map((member, i) => {
          const pos = positions[i];
          const preset = CHARACTER_PRESETS[i % CHARACTER_PRESETS.length];
          const assetImage = charImageMap?.[member.id] || null;
          const isPlayer = member.isPlayer;
          const isDead = !member.isAlive;
          const isMissing = member.isMissing && member.isAlive;
          const trustTier = member.isPlayer ? null : getTrustTier(member.trustWithPlayer ?? 0);
          const ringColor = isPlayer ? "#f87171"
            : isDead ? "#374151"
            : isMissing ? "#d97706"
            : trustTier?.color || "#6b7280";

          return (
            <g key={member.id} opacity={isDead ? 0.35 : 1}>
              {/* Glow ring */}
              <circle
                cx={pos.x} cy={pos.y} r={NODE_R + 3}
                fill="none"
                stroke={ringColor}
                strokeWidth={isPlayer ? 2 : 1.5}
                opacity={isDead ? 0.2 : 0.5}
              />
              {/* Avatar circle clip */}
              <clipPath id={`clip-${i}`}>
                <circle cx={pos.x} cy={pos.y} r={NODE_R} />
              </clipPath>
              {assetImage ? (
                <image
                  href={assetImage}
                  x={pos.x - NODE_R} y={pos.y - NODE_R}
                  width={NODE_R * 2} height={NODE_R * 2}
                  clipPath={`url(#clip-${i})`}
                  preserveAspectRatio="xMidYMid slice"
                  style={{ filter: isDead ? "grayscale(1)" : "none" }}
                />
              ) : (
                <foreignObject
                  x={pos.x - NODE_R} y={pos.y - NODE_R}
                  width={NODE_R * 2} height={NODE_R * 2}
                  clipPath={`url(#clip-${i})`}
                >
                  <CharacterPortrait
                    {...preset}
                    expression={isDead ? "unstable" : isMissing ? "scared" : isPlayer ? "neutral" : "neutral"}
                    size={NODE_R * 2}
                  />
                </foreignObject>
              )}
              {/* Name label */}
              <text
                x={pos.x}
                y={pos.y + NODE_R + 11}
                textAnchor="middle"
                fontSize="7"
                fontWeight="600"
                fill={isPlayer ? "#f87171" : isDead ? "#4b5563" : "#9ca3af"}
                fontFamily="DM Sans, sans-serif"
              >
                {isPlayer ? "YOU" : member.name?.split(" ")[0]?.slice(0, 8)}
              </text>
              {/* Status dot */}
              {isMissing && (
                <text x={pos.x + NODE_R - 4} y={pos.y - NODE_R + 6} fontSize="8" textAnchor="middle">❓</text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
        {Object.entries(TRUST_THRESHOLDS).map(([key, t]) => (
          <div key={key} className="flex items-center gap-1">
            <svg width="18" height="6">
              <line
                x1="0" y1="3" x2="18" y2="3"
                stroke={t.color}
                strokeWidth={t.width}
                strokeDasharray={t.dash === "none" ? undefined : t.dash}
              />
            </svg>
            <span className="text-[8px] font-semibold" style={{ color: t.color }}>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}