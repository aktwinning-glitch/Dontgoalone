import React, { useState, useEffect, useRef } from "react";

// Typewriter component — renders text char by char with a blinking cursor.
// When done, calls onComplete if provided.
export default function TypewriterText({
  text = "",
  speed = 28,           // ms per character
  className = "",
  onComplete,
  onTap,                // optional: skip to full text on tap
  showCursor = true,
}) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef(null);

  // Reset when text changes
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    indexRef.current = 0;
    clearInterval(timerRef.current);

    if (!text) return;

    timerRef.current = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) {
        clearInterval(timerRef.current);
        setDone(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(timerRef.current);
  }, [text, speed]);

  const skip = () => {
    if (!done) {
      clearInterval(timerRef.current);
      setDisplayed(text);
      setDone(true);
      onComplete?.();
    }
    onTap?.();
  };

  return (
    <span className={className} onClick={skip} style={{ cursor: done ? "default" : "pointer" }}>
      {displayed}
      {showCursor && !done && (
        <span
          className="inline-block w-[2px] h-[1em] ml-[1px] align-middle rounded-sm"
          style={{
            background: "hsl(351 78% 60%)",
            animation: "blink 0.9s step-end infinite",
          }}
        />
      )}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </span>
  );
}