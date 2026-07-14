import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Cinematic ending frames per ending type
const ENDING_FRAMES = {
  good: [
    "The sun came up eventually. You almost didn't believe it would.",
    "Everyone you left with made it to the car. The cabin got smaller in the rearview.",
    "Nobody talked much on the drive back. That was fine.",
    "You never figured out who sent the message. Maybe you weren't supposed to.",
  ],
  mixed: [
    "You got out. Some of them didn't.",
    "The road out was longer than you remembered. Quieter too.",
    "You kept replaying the moment you made the wrong call. You still do.",
    "You made it back. Carrying a little more than you arrived with.",
  ],
  bad: [
    "The cabin held its breath and then let it out slowly.",
    "No one came to look. Not at first.",
    "By morning, there was nothing left to find — or no one left to look.",
    "Whatever was in that cabin... it got what it came for.",
  ],
  bad_call: [
    "It wasn't the threat that got you. It was one decision.",
    "You saw it too late. The wrong door. The wrong person. The wrong call.",
    "Somewhere in the sequence of events, there was a moment.",
    "You'd replay it for a long time after. If there was an after.",
  ],
  paranoia: [
    "You stopped trusting everyone. Turns out that was the right instinct.",
    "The cabin teaches you something about people: pressure reveals them.",
    "You weren't wrong. You were just too right, too late.",
    "What you brought back wasn't answers. It was the knowledge that you were always the closest to the truth.",
  ],
  traitor_success: [
    "They planned this. You understand that now.",
    "The message. The invitation. The timing. All of it.",
    "You thought you were solving a mystery. You were inside one.",
    "They were already gone before you realized they were never on your side.",
  ],
};

export default function EndingNarration({ endingType, sceneImage, onComplete }) {
  const frames = ENDING_FRAMES[endingType] || ENDING_FRAMES.mixed;
  const [frame, setFrame] = useState(0);
  const isLast = frame >= frames.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete?.();
    } else {
      setFrame(f => f + 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-end"
      style={{ background: "hsl(252 14% 7%)" }}
    >
      {/* Scene image — full bleed atmospheric */}
      {sceneImage && (
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={sceneImage}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: "saturate(0.35) brightness(0.3)" }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, hsl(252 14% 7%) 40%, hsl(252 14% 7% / 0.6) 100%)" }} />
        </div>
      )}

      {/* Frame counter dots */}
      <div className="absolute top-10 left-0 right-0 flex justify-center gap-1.5 z-10">
        {frames.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === frame ? 16 : 5,
              height: 5,
              background: i === frame ? "hsl(351 78% 62%)" : "hsl(252 10% 30%)",
            }}
          />
        ))}
      </div>

      {/* Narration frame */}
      <div className="relative z-10 w-full max-w-sm px-6 pb-16 space-y-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={frame}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45 }}
            className="text-center"
          >
            <p
              className="font-display text-xl leading-relaxed"
              style={{ color: "hsl(40 35% 90%)", textShadow: "0 2px 20px hsl(252 14% 4%)" }}
            >
              {frames[frame]}
            </p>
          </motion.div>
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleNext}
          className="w-full h-12 rounded-2xl text-sm font-bold"
          style={{
            background: isLast ? "hsl(351 78% 58%)" : "hsl(252 12% 22%)",
            border: isLast ? "none" : "1px solid hsl(252 10% 30%)",
            color: isLast ? "white" : "hsl(40 30% 75%)",
          }}
        >
          {isLast ? "See Results →" : "Continue"}
        </motion.button>
      </div>
    </div>
  );
}