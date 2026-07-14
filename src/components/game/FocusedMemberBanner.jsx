import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getMemberStatus, MEMBER_STATUS } from "@/lib/partyEngine";
import CharacterPortrait, { CHARACTER_PRESETS, getExpressionForMember } from "./CharacterPortrait";

const STATUS_CONFIG = {
  [MEMBER_STATUS.NORMAL]:  { label: "OK",        color: "text-success",     bg: "bg-success/10 border-success/20"      },
  [MEMBER_STATUS.NERVOUS]: { label: "Nervous",   color: "text-warning",     bg: "bg-warning/10 border-warning/20"      },
  [MEMBER_STATUS.INJURED]: { label: "Injured",   color: "text-chart-1",     bg: "bg-chart-1/10 border-chart-1/20"      },
  [MEMBER_STATUS.MISSING]: { label: "Missing",   color: "text-muted-foreground", bg: "bg-muted/50 border-border"        },
  [MEMBER_STATUS.DEAD]:    { label: "Gone",       color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
};

export default function FocusedMemberBanner({ member }) {
  if (!member) return null;

  const status = getMemberStatus(member);
  const config = STATUS_CONFIG[status] || STATUS_CONFIG[MEMBER_STATUS.NORMAL];
  const expression = getExpressionForMember(member);

  // Find preset index — use member name hash as stable index
  const presetIndex = (member.name?.charCodeAt(0) || 0) % CHARACTER_PRESETS.length;
  const preset = CHARACTER_PRESETS[presetIndex];

  return (
    <AnimatePresence>
      <motion.div
        key={member.id}
        initial={{ opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className={`rounded-2xl border p-3 flex items-center gap-3 ${config.bg}`}
      >
        {/* Portrait */}
        <div className="shrink-0 rounded-full overflow-hidden ring-2 ring-border/50 shadow-sm">
          <CharacterPortrait {...preset} expression={expression} size={48} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-display text-sm font-bold text-foreground truncate">{member.name}</span>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${config.color} ${config.bg}`}>
              {config.label}
            </span>
          </div>
          {member.roleTag && (
            <p className="text-[10px] text-muted-foreground italic mb-1 truncate">{member.roleTag}</p>
          )}
          {member.currentStatusText && (
            <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
              {member.currentStatusText}
            </p>
          )}
          {/* Fear bar */}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold w-6">Fear</span>
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-destructive/70 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, member.fearLevel)}%` }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}