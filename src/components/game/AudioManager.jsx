import { useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audioManager";

/**
 * Mounts the audio engine lifecycle to the game.
 * Renders a tiny mute toggle button.
 */
export function useAudioManager(player, sceneKey = null) {
  const startedRef = useRef(false);

  // Derive act from event ID
  const act = (() => {
    const m = player?.currentEventId?.match(/_a(\d)_/);
    return m ? parseInt(m[1]) : 1;
  })();

  // Start on first interaction (required by browsers)
  useEffect(() => {
    const handleInteraction = () => {
      if (!startedRef.current) {
        startedRef.current = true;
        audioManager.start();
      }
    };
    window.addEventListener("click", handleInteraction, { once: true });
    window.addEventListener("touchstart", handleInteraction, { once: true });
    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
    };
  }, []);

  // Update layers on state change
  useEffect(() => {
    if (!player) return;
    audioManager.update({
      act,
      fear: player.stats?.fear ?? 0,
      threat: player.threat ?? 0,
    });
  }, [act, player?.stats?.fear, player?.threat]);

  // Scene-based audio profile
  useEffect(() => {
    if (!sceneKey) return;
    audioManager.updateScene(sceneKey);
  }, [sceneKey]);

  // Stop on unmount
  useEffect(() => {
    return () => { audioManager.stop(); startedRef.current = false; };
  }, []);
}

export default function AudioManagerWidget() {
  const [muted, setMuted] = useState(false);

  const toggle = () => {
    if (muted) { audioManager.unmute(); setMuted(false); }
    else { audioManager.mute(); setMuted(true); }
  };

  return (
    <button
      onClick={toggle}
      title={muted ? "Unmute ambient audio" : "Mute ambient audio"}
      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] transition-opacity"
      style={{
        background: "hsl(252 12% 20%)",
        border: "1px solid hsl(252 10% 26%)",
        opacity: muted ? 0.45 : 1,
      }}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}