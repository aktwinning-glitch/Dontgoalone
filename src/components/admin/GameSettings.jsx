import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sliders, Zap, Skull, Users, Eye, Type, Sparkles, Volume2 } from "lucide-react";

const STORAGE_KEY = "dga_game_settings";

const AMBIENT_THEMES = [
  { id: "none",        label: "None (silent)" },
  { id: "soft_wind",   label: "Soft Wind" },
  { id: "night_forest",label: "Night Forest" },
  { id: "distant_lake",label: "Distant Lake" },
  { id: "cabin_hum",   label: "Cabin Hum" },
  { id: "basement_drone", label: "Basement Drone" },
  { id: "low_horror",  label: "Low Horror Pulse" },
];

const DEFAULTS = {
  // Sound
  soundEnabled: true,
  ambientEnabled: true,
  ambientVolume: 40,
  uiSoundEnabled: false,
  uiSoundVolume: 30,
  typingSoundEnabled: false,
  ambientTheme: "night_forest",
  // UI
  glowStrength: 70,
  vignetteIntensity: 60,
  colorContrast: 80,
  // Story
  difficulty: 50,
  suspicionIntensity: 50,
  deathRarity: 50,
  trustGain: 50,
  trustLoss: 50,
  activePartySize: 6,
  // Animation
  motionIntensity: 70,
  bounceStrength: 60,
  // Typography
  narrationSpeed: 22,
  dialogueSpeed: 18,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function saveSettings(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function Section({ icon: Icon, title, children }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "hsl(252 12% 14%)",
        border: "1px solid hsl(252 10% 22%)",
      }}
    >
      <div
        className="px-4 py-3 flex items-center gap-2 border-b"
        style={{ borderColor: "hsl(252 10% 20%)" }}
      >
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: "hsl(271 87% 65% / 0.15)" }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: "hsl(271 87% 75%)" }} />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-foreground">{title}</p>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
}

function SliderControl({ label, value, min = 0, max = 100, step = 5, onChange, unit = "%", description }) {
  const pct = ((value - min) / (max - min)) * 100;
  const accent = pct > 70 ? "#e8705a" : pct > 40 ? "#e8d05a" : "#5ae87a";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-foreground">{label}</p>
          {description && <p className="text-[9px] text-muted-foreground">{description}</p>}
        </div>
        <span
          className="text-xs font-black px-2 py-0.5 rounded-lg"
          style={{ background: `${accent}18`, color: accent }}
        >
          {value}{unit}
        </span>
      </div>
      <div className="relative h-2 rounded-full" style={{ background: "hsl(252 10% 22%)" }}>
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accent}99, ${accent})` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        />
      </div>
    </div>
  );
}

function StepperControl({ label, value, min = 1, max = 12, onChange, description }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-foreground">{label}</p>
        {description && <p className="text-[9px] text-muted-foreground">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black"
          style={{ background: "hsl(252 12% 20%)", border: "1px solid hsl(252 10% 28%)", color: "hsl(40 30% 80%)" }}
        >
          −
        </button>
        <span className="text-sm font-black text-foreground w-5 text-center">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black"
          style={{ background: "hsl(252 12% 20%)", border: "1px solid hsl(252 10% 28%)", color: "hsl(40 30% 80%)" }}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function GameSettings() {
  const [settings, setSettings] = useState(loadSettings);
  const [saved, setSaved] = useState(false);

  const update = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: val }));
    setSaved(false);
  };

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setSettings(DEFAULTS);
    saveSettings(DEFAULTS);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-lg text-foreground">Game Settings</h2>
          <p className="text-[10px] text-muted-foreground">
            Control tone, pacing, and visual intensity — no code required.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="text-[10px] font-bold px-3 py-1.5 rounded-xl"
            style={{ background: "hsl(252 12% 18%)", border: "1px solid hsl(252 10% 26%)", color: "hsl(252 10% 55%)" }}
          >
            Reset
          </button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleSave}
            className="text-[10px] font-black px-3 py-1.5 rounded-xl text-white"
            style={{
              background: saved
                ? "linear-gradient(135deg, hsl(123 68% 50%), hsl(123 68% 38%))"
                : "linear-gradient(135deg, hsl(271 87% 65%), hsl(271 87% 50%))",
              boxShadow: saved ? "0 2px 12px hsl(123 68% 50% / 0.4)" : "0 2px 12px hsl(271 87% 65% / 0.4)",
              transition: "background 0.3s",
            }}
          >
            {saved ? "✓ Saved" : "Save"}
          </motion.button>
        </div>
      </div>

      {/* UI */}
      <Section icon={Eye} title="Visual / UI">
        <SliderControl
          label="Glow Strength"
          value={settings.glowStrength}
          onChange={v => update("glowStrength", v)}
          description="Intensity of neon glow effects on UI elements"
        />
        <SliderControl
          label="Vignette Intensity"
          value={settings.vignetteIntensity}
          onChange={v => update("vignetteIntensity", v)}
          description="Edge darkening on scene backgrounds"
        />
        <SliderControl
          label="Color Contrast"
          value={settings.colorContrast}
          onChange={v => update("colorContrast", v)}
          description="Overall visual contrast of the game UI"
        />
      </Section>

      {/* Story */}
      <Section icon={Skull} title="Story / Difficulty">
        <SliderControl
          label="Difficulty"
          value={settings.difficulty}
          onChange={v => update("difficulty", v)}
          description="Base success chance modifier across all choices"
        />
        <SliderControl
          label="Suspicion Escalation"
          value={settings.suspicionIntensity}
          onChange={v => update("suspicionIntensity", v)}
          description="How fast threat grows per bad choice"
        />
        <SliderControl
          label="Death Rarity"
          value={settings.deathRarity}
          onChange={v => update("deathRarity", v)}
          description="Higher = deaths happen less often"
        />
        <SliderControl
          label="Trust Gain"
          value={settings.trustGain}
          onChange={v => update("trustGain", v)}
          description="How much loyalty grows on good choices"
        />
        <SliderControl
          label="Trust Loss"
          value={settings.trustLoss}
          onChange={v => update("trustLoss", v)}
          description="How much loyalty drops on failures"
        />
        <StepperControl
          label="Active Party Size"
          value={settings.activePartySize}
          min={2}
          max={8}
          onChange={v => update("activePartySize", v)}
          description="Number of characters active per run (including player)"
        />
      </Section>

      {/* Animation */}
      <Section icon={Sparkles} title="Animation">
        <SliderControl
          label="Motion Intensity"
          value={settings.motionIntensity}
          onChange={v => update("motionIntensity", v)}
          description="Scale of all UI motion and transitions"
        />
        <SliderControl
          label="Bounce Strength"
          value={settings.bounceStrength}
          onChange={v => update("bounceStrength", v)}
          description="Spring bounciness of card and portrait animations"
        />
      </Section>

      {/* Typography */}
      <Section icon={Type} title="Typography / Speed">
        <SliderControl
          label="Narration Speed"
          value={settings.narrationSpeed}
          min={5}
          max={60}
          step={1}
          unit="ms"
          onChange={v => update("narrationSpeed", v)}
          description="Milliseconds per character in typewriter narration"
        />
        <SliderControl
          label="Dialogue Speed"
          value={settings.dialogueSpeed}
          min={5}
          max={60}
          step={1}
          unit="ms"
          onChange={v => update("dialogueSpeed", v)}
          description="Milliseconds per character in dialogue lines"
        />
      </Section>

      {/* Sound */}
      <Section icon={Volume2} title="Sound">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-foreground">Master Sound</p>
            <p className="text-[9px] text-muted-foreground">Enable all in-game audio</p>
          </div>
          <button
            onClick={() => update("soundEnabled", !settings.soundEnabled)}
            className="relative w-10 h-5.5 rounded-full transition-colors"
            style={{
              background: settings.soundEnabled ? "hsl(123 68% 45%)" : "hsl(252 10% 28%)",
              border: "1.5px solid hsl(252 10% 32%)",
              width: 40, height: 22,
            }}
          >
            <div
              className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
              style={{
                left: settings.soundEnabled ? "calc(100% - 18px)" : 2,
                background: "white",
                boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
              }}
            />
          </button>
        </div>

        {settings.soundEnabled && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Ambient Sound</p>
                <p className="text-[9px] text-muted-foreground">Background atmosphere loop</p>
              </div>
              <button
                onClick={() => update("ambientEnabled", !settings.ambientEnabled)}
                className="relative rounded-full transition-colors"
                style={{ background: settings.ambientEnabled ? "hsl(123 68% 45%)" : "hsl(252 10% 28%)", border: "1.5px solid hsl(252 10% 32%)", width: 40, height: 22 }}
              >
                <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all" style={{ left: settings.ambientEnabled ? "calc(100% - 18px)" : 2, background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
              </button>
            </div>
            {settings.ambientEnabled && (
              <>
                <SliderControl label="Ambient Volume" value={settings.ambientVolume} onChange={v => update("ambientVolume", v)} description="Loop volume for background sound" />
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-foreground">Ambient Theme</p>
                  <p className="text-[9px] text-muted-foreground">Default sound for story 1</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {AMBIENT_THEMES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => update("ambientTheme", t.id)}
                        className="px-2.5 py-1.5 rounded-xl text-[9px] font-bold text-left transition-all"
                        style={{
                          background: settings.ambientTheme === t.id ? "hsl(271 87% 65% / 0.2)" : "hsl(252 12% 18%)",
                          border: settings.ambientTheme === t.id ? "1px solid hsl(271 87% 65% / 0.5)" : "1px solid hsl(252 10% 24%)",
                          color: settings.ambientTheme === t.id ? "hsl(271 87% 80%)" : "hsl(252 8% 55%)",
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Typing Sound</p>
                <p className="text-[9px] text-muted-foreground">Subtle click on typewriter text</p>
              </div>
              <button
                onClick={() => update("typingSoundEnabled", !settings.typingSoundEnabled)}
                className="relative rounded-full transition-colors"
                style={{ background: settings.typingSoundEnabled ? "hsl(123 68% 45%)" : "hsl(252 10% 28%)", border: "1.5px solid hsl(252 10% 32%)", width: 40, height: 22 }}
              >
                <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all" style={{ left: settings.typingSoundEnabled ? "calc(100% - 18px)" : 2, background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
              </button>
            </div>
          </>
        )}
      </Section>

      <p className="text-[9px] text-muted-foreground text-center pb-2">
        Settings apply on next game start. Stored locally in browser.
      </p>
    </div>
  );
}