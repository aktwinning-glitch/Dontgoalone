import React from "react";

// Modular SVG character portrait system
// All characters share the same proportions, eye style, line weight.
// Skin tones, hair styles, hair colors, and outfits are composited as layers.

const SKIN_TONES = {
  light: "#F5D6B8",
  medium: "#D4956A",
  tan: "#C07A47",
  dark: "#8B5A2B",
  deep: "#5C3317",
};

const HAIR_COLORS = {
  black: "#1a1a1a",
  brown: "#5C3317",
  blonde: "#E8C97A",
  red: "#C0392B",
  grey: "#8E8E8E",
  white: "#ECECEC",
};

const OUTFIT_COLORS = {
  red: "#C0392B",
  blue: "#2980B9",
  green: "#27AE60",
  yellow: "#F39C12",
  purple: "#8E44AD",
  grey: "#7F8C8D",
  pink: "#E91E8C",
  teal: "#16A085",
};

// Expression configs: eye shape, mouth shape offset
const EXPRESSIONS = {
  neutral: { eyeOpen: 3.5, browOffset: 0, mouthType: "neutral", pupilY: 0 },
  uneasy: { eyeOpen: 3, browOffset: -1.5, mouthType: "slight_frown", pupilY: 1 },
  scared: { eyeOpen: 5, browOffset: 2, mouthType: "open", pupilY: -1 },
  unstable: { eyeOpen: 2, browOffset: -3, mouthType: "grim", pupilY: 2 },
};

// Hair style paths (relative to head center 50,40)
function HairLayer({ style, color }) {
  const fill = HAIR_COLORS[color] || HAIR_COLORS.black;
  switch (style) {
    case "short_neat":
      return (
        <g fill={fill}>
          <ellipse cx="50" cy="33" rx="16" ry="10" />
          <rect x="34" y="33" width="5" height="8" rx="2" />
          <rect x="61" y="33" width="5" height="8" rx="2" />
        </g>
      );
    case "medium_wavy":
      return (
        <g fill={fill}>
          <ellipse cx="50" cy="32" rx="17" ry="11" />
          <path d="M33 38 Q30 50 34 58 Q36 52 38 48" />
          <path d="M67 38 Q70 50 66 58 Q64 52 62 48" />
        </g>
      );
    case "long_straight":
      return (
        <g fill={fill}>
          <ellipse cx="50" cy="32" rx="16" ry="10" />
          <rect x="33" y="34" width="5" height="28" rx="2.5" />
          <rect x="62" y="34" width="5" height="28" rx="2.5" />
        </g>
      );
    case "bun":
      return (
        <g fill={fill}>
          <ellipse cx="50" cy="34" rx="16" ry="10" />
          <circle cx="50" cy="22" r="7" />
          <rect x="47" y="22" width="6" height="12" />
        </g>
      );
    case "curly":
      return (
        <g fill={fill}>
          <circle cx="36" cy="35" r="6" />
          <circle cx="42" cy="29" r="7" />
          <circle cx="50" cy="27" r="7" />
          <circle cx="58" cy="29" r="7" />
          <circle cx="64" cy="35" r="6" />
          <rect x="34" y="35" width="32" height="6" />
        </g>
      );
    case "shaved":
      return (
        <g fill={fill} opacity="0.7">
          <ellipse cx="50" cy="33" rx="16" ry="9" />
        </g>
      );
    default:
      return (
        <g fill={fill}>
          <ellipse cx="50" cy="33" rx="16" ry="10" />
        </g>
      );
  }
}

// Expression: eyes + mouth
function FaceExpression({ expression, skinTone }) {
  const expr = EXPRESSIONS[expression] || EXPRESSIONS.neutral;
  const eyeH = expr.eyeOpen;
  const browY = 38 + expr.browOffset;
  const pupilShift = expr.pupilY;

  return (
    <g>
      {/* Brows */}
      <path
        d={`M41 ${browY} Q44 ${browY - 2} 47 ${browY}`}
        stroke="#3a2a1a"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M53 ${browY} Q56 ${browY - 2} 59 ${browY}`}
        stroke="#3a2a1a"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Eyes - left */}
      <ellipse cx="44" cy="43" rx="3.5" ry={eyeH} fill="white" />
      <ellipse cx="44" cy={43 + pupilShift} rx="2" ry={Math.min(eyeH - 0.5, 2.5)} fill="#2a1a0a" />
      <circle cx="45" cy={41 + pupilShift} r="0.8" fill="white" />
      {/* upper lash line */}
      <path
        d={`M40.5 ${43 - eyeH + 0.3} Q44 ${43 - eyeH - 0.8} 47.5 ${43 - eyeH + 0.3}`}
        stroke="#2a1a0a"
        strokeWidth="1.2"
        fill="none"
      />

      {/* Eyes - right */}
      <ellipse cx="56" cy="43" rx="3.5" ry={eyeH} fill="white" />
      <ellipse cx="56" cy={43 + pupilShift} rx="2" ry={Math.min(eyeH - 0.5, 2.5)} fill="#2a1a0a" />
      <circle cx="57" cy={41 + pupilShift} r="0.8" fill="white" />
      <path
        d={`M52.5 ${43 - eyeH + 0.3} Q56 ${43 - eyeH - 0.8} 59.5 ${43 - eyeH + 0.3}`}
        stroke="#2a1a0a"
        strokeWidth="1.2"
        fill="none"
      />

      {/* Nose — minimal dot */}
      <circle cx="50" cy="49" r="1" fill="#c8956050" />

      {/* Mouth */}
      {expr.mouthType === "neutral" && (
        <path d="M46 54 Q50 56 54 54" stroke="#8B5A2B" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      )}
      {expr.mouthType === "slight_frown" && (
        <path d="M46 55 Q50 53 54 55" stroke="#8B5A2B" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      )}
      {expr.mouthType === "open" && (
        <>
          <path d="M46 54 Q50 59 54 54" stroke="#8B5A2B" strokeWidth="1.5" fill="#c8956060" strokeLinecap="round" />
        </>
      )}
      {expr.mouthType === "grim" && (
        <path d="M46 55 L54 55" stroke="#8B5A2B" strokeWidth="1.5" strokeLinecap="round" />
      )}
    </g>
  );
}

// Outfit (shoulders + top only - visible below head)
function OutfitLayer({ outfit, color }) {
  const fill = OUTFIT_COLORS[color] || OUTFIT_COLORS.grey;
  switch (outfit) {
    case "hoodie":
      return (
        <g>
          <path d="M26 80 Q30 70 40 68 L50 72 L60 68 Q70 70 74 80 L72 100 L28 100 Z" fill={fill} />
          {/* hood drawstring */}
          <path d="M45 72 L48 78 M55 72 L52 78" stroke={fill} strokeWidth="1" opacity="0.6" />
        </g>
      );
    case "jacket":
      return (
        <g>
          <path d="M26 80 Q32 68 42 67 L50 70 L58 67 Q68 68 74 80 L72 100 L28 100 Z" fill={fill} />
          {/* collar lapels */}
          <path d="M42 67 L50 74 L58 67" stroke="#0003" strokeWidth="1" fill="none" />
          <line x1="50" y1="74" x2="50" y2="100" stroke="#0002" strokeWidth="1" />
        </g>
      );
    case "tshirt":
      return (
        <g>
          <path d="M28 80 Q34 70 44 68 L50 71 L56 68 Q66 70 72 80 L70 100 L30 100 Z" fill={fill} />
        </g>
      );
    case "sweater":
      return (
        <g>
          <path d="M26 80 Q32 68 42 67 L50 70 L58 67 Q68 68 74 80 L72 100 L28 100 Z" fill={fill} />
          {/* ribbed bottom */}
          {[82, 86, 90, 94, 98].map(y => (
            <line key={y} x1="29" y1={y} x2="71" y2={y} stroke="#0002" strokeWidth="0.8" />
          ))}
        </g>
      );
    default:
      return (
        <g>
          <path d="M28 80 Q34 70 44 68 L50 71 L56 68 Q66 70 72 80 L70 100 L30 100 Z" fill={fill} />
        </g>
      );
  }
}

export default function CharacterPortrait({
  skinTone = "medium",
  hairStyle = "short_neat",
  hairColor = "black",
  outfit = "tshirt",
  outfitColor = "grey",
  expression = "neutral",
  size = 80,
  className = "",
  assetImage = null, // uploaded real image — overrides SVG avatar
}) {
  const skin = SKIN_TONES[skinTone] || SKIN_TONES.medium;

  // If a real uploaded image is available, render it instead
  if (assetImage) {
    return (
      <img
        src={assetImage}
        alt=""
        width={size}
        height={size}
        className={className}
        style={{ width: size, height: size, objectFit: "cover", borderRadius: "50%" }}
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle (for portrait UI) */}
      <circle cx="50" cy="50" r="49" fill="hsl(30,20%,94%)" />

      {/* Neck */}
      <rect x="44" y="59" width="12" height="12" rx="4" fill={skin} />

      {/* Outfit (behind head) */}
      <OutfitLayer outfit={outfit} color={outfitColor} />

      {/* Head */}
      <ellipse cx="50" cy="42" rx="16" ry="18" fill={skin} />

      {/* Ear left */}
      <ellipse cx="34" cy="43" rx="3" ry="4.5" fill={skin} />
      {/* Ear right */}
      <ellipse cx="66" cy="43" rx="3" ry="4.5" fill={skin} />

      {/* Hair (on top of head) */}
      <HairLayer style={hairStyle} color={hairColor} />

      {/* Face */}
      <FaceExpression expression={expression} skinTone={skinTone} />

      {/* Head outline */}
      <ellipse cx="50" cy="42" rx="16" ry="18" fill="none" stroke="#2a1a0a22" strokeWidth="1" />
    </svg>
  );
}

// Preset configs per character index (0-5)
export const CHARACTER_PRESETS = [
  { skinTone: "medium",  hairStyle: "medium_wavy",  hairColor: "brown",  outfit: "hoodie",  outfitColor: "red"    },
  { skinTone: "light",   hairStyle: "long_straight", hairColor: "blonde", outfit: "jacket",  outfitColor: "blue"   },
  { skinTone: "tan",     hairStyle: "short_neat",    hairColor: "black",  outfit: "tshirt",  outfitColor: "green"  },
  { skinTone: "dark",    hairStyle: "curly",          hairColor: "black",  outfit: "sweater", outfitColor: "purple" },
  { skinTone: "deep",    hairStyle: "bun",            hairColor: "black",  outfit: "jacket",  outfitColor: "teal"   },
  { skinTone: "light",   hairStyle: "shaved",         hairColor: "grey",   outfit: "hoodie",  outfitColor: "grey"   },
];

// Get expression based on member status / fear
export function getExpressionForMember(member) {
  if (!member) return "neutral";
  if (!member.isAlive) return "unstable";
  if (member.isMissing) return "scared";
  if (member.fearLevel > 70) return "scared";
  if (member.fearLevel > 45 || member.isInjured) return "uneasy";
  return "neutral";
}