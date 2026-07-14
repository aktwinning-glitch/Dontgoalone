import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrentPhase } from "@/lib/phaseSystem";

// Context-aware act break lines — reference actual run conditions
function getActBreakLines(choiceCount, player, party) {
  const survived = (party || []).filter(m => m.isAlive && !m.isMissing).length;
  const total = (party || []).length;
  const fear = player?.stats?.fear || 0;
  const hasDeaths = (party || []).some(m => !m.isAlive);
  const hasMissing = (party || []).some(m => m.isMissing);
  const phase = getCurrentPhase(choiceCount);

  // Arrival → Exploration
  if (phase.id === "exploration") {
    const lines = [
      "The sun's going down. You barely noticed until it was almost gone.",
    ];
    if (hasDeaths) lines.push("Someone didn't make it through the first part. The group isn't saying much about it.");
    else if (fear > 40) lines.push("Everyone's a little quieter than they were an hour ago.");
    else lines.push("For now, everyone's still here. That's something.");
    if (player?.flags?.noise_made) lines.push("Whatever's out there already knows someone's here.");
    return lines;
  }

  // Exploration → Night
  if (phase.id === "escalation") {
    const lines = ["It's fully dark now."];
    if (survived < total) lines.push(`${total - survived} of you are already gone. The rest are pretending not to count.`);
    else lines.push("No one's left yet. That's more than you expected.");
    if (fear > 55) lines.push("The fear's getting harder to hide.");
    else lines.push("You're holding it together. Barely counts, but it counts.");
    return lines;
  }

  // Night → Deep Night
  if (phase.id === "survival") {
    const lines = ["You don't know exactly what time it is. Late enough that it doesn't matter."];
    if (hasDeaths && hasMissing) lines.push("Some are gone. Some are missing. The difference is getting smaller.");
    else if (hasDeaths) lines.push("You keep thinking about who you started this with.");
    else if (hasMissing) lines.push("Someone's still out there. Or something is.");
    else lines.push("Against the odds, you're all still together. Don't say that out loud.");
    return lines;
  }

  // Deep Night → Pre-Sunrise
  if (phase.id === "collapse") {
    return [
      "Almost morning. Almost.",
      survived > 1
        ? `There are ${survived} of you left. That might be enough.`
        : "You're the last one still moving. That's not a good sign.",
    ];
  }

  return ["Something changed. You're not sure when."];
}

export default function ActBreakNarration({ choiceCount, player, party, onComplete }) {
  const lines = getActBreakLines(choiceCount, player, party);
  const [frame, setFrame] = useState(0);
  const isLast = frame >= lines.length - 1;
  const phase = getCurrentPhase(choiceCount);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center px-8"
      style={{ background: "hsl(252 14% 7% / 0.96)", backdropFilter: "blur(6px)" }}
      onClick={() => isLast ? onComplete() : setFrame(f => f + 1)}
    >
      {/* Phase badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-8 rounded-full px-4 py-1"
        style={{ background: phase.bg, border: `1px solid ${phase.border}` }}
      >
        <p className="text-[9px] uppercase tracking-[0.25em] font-black" style={{ color: phase.color }}>
          {phase.emoji} {phase.label}
        </p>
      </motion.div>

      {/* Line */}
      <AnimatePresence mode="wait">
        <motion.p
          key={frame}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35 }}
          className="font-display text-xl text-center leading-relaxed max-w-xs"
          style={{ color: "hsl(40 35% 92%)", textShadow: "0 2px 20px hsl(252 14% 4%)" }}
        >
          {lines[frame]}
        </motion.p>
      </AnimatePresence>

      {/* Tap hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-10 text-[9px] uppercase tracking-widest text-muted-foreground/40"
      >
        {isLast ? "tap to continue" : "tap to continue"}
      </motion.p>

      {/* Dot indicators */}
      <div className="flex gap-1.5 mt-4">
        {lines.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === frame ? 14 : 4,
              height: 4,
              background: i === frame ? phase.color : "hsl(252 10% 28%)",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}