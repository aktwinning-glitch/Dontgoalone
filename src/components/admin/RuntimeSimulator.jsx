import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, SkipForward, RotateCcw, GitBranch, Eye, ChevronRight, Zap } from "lucide-react";

// RuntimeSimulator: Allows admin to walk through event branches without playing the game.
// Simulates stat/fear/threat changes, shows next events, and previews branch outcomes.

function calcSuccessChance(statValue, difficulty) {
  const base = statValue / 10;
  const diffMod = 1 - ((difficulty - 1) / 4) * 0.55;
  return Math.min(0.95, Math.max(0.05, base * diffMod));
}

export default function RuntimeSimulator({ selectedStoryId }) {
  const [currentEventId, setCurrentEventId] = useState("");
  const [jumpInput, setJumpInput] = useState("");
  const [simStats, setSimStats] = useState({ fear: 20, threat: 10, strength: 6, speed: 5, resilience: 5, intelligence: 5, charm: 5, influence: 5 });
  const [history, setHistory] = useState([]);
  const [flags, setFlags] = useState({});
  const [choiceResult, setChoiceResult] = useState(null);

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.GameEvent.list("sort_order"),
  });

  const storyEvents = useMemo(() => {
    if (!selectedStoryId) return events;
    return events.filter(e => e.story_id === selectedStoryId);
  }, [events, selectedStoryId]);

  const currentEvent = storyEvents.find(e => e.event_id === currentEventId);
  const firstEvent = storyEvents.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))[0];

  const choices = useMemo(() => {
    if (!currentEvent?.choices) return [];
    try { return JSON.parse(currentEvent.choices); } catch { return []; }
  }, [currentEvent]);

  const start = () => {
    if (!firstEvent) return;
    setCurrentEventId(firstEvent.event_id);
    setHistory([firstEvent.event_id]);
    setSimStats({ fear: 20, threat: 10, strength: 6, speed: 5, resilience: 5, intelligence: 5, charm: 5, influence: 5 });
    setFlags({});
    setChoiceResult(null);
  };

  const jumpTo = (id) => {
    const ev = storyEvents.find(e => e.event_id === id);
    if (!ev) return;
    setCurrentEventId(id);
    setHistory(prev => [...prev, id]);
    setChoiceResult(null);
  };

  const simulateChoice = (choice, forceSuccess = null) => {
    const statVal = simStats[choice.statUsed] || 5;
    const chance = calcSuccessChance(statVal, choice.difficulty || 2);
    const success = forceSuccess !== null ? forceSuccess : Math.random() < chance;
    const effect = success ? choice.successEffect : choice.failEffect;
    const parsed = typeof effect === "string" ? JSON.parse(effect || "{}") : (effect || {});

    // Apply stat changes
    const newStats = { ...simStats };
    if (parsed.fearChange) newStats.fear = Math.max(0, Math.min(100, newStats.fear + parsed.fearChange));
    if (parsed.threatChange) newStats.threat = Math.max(0, Math.min(100, newStats.threat + parsed.threatChange));
    if (parsed.statChanges) Object.entries(parsed.statChanges).forEach(([k, v]) => { if (newStats[k] !== undefined) newStats[k] = Math.max(0, Math.min(10, newStats[k] + v)); });
    setSimStats(newStats);

    // Apply flags
    if (parsed.flagsAdded) setFlags(prev => ({ ...prev, ...parsed.flagsAdded }));

    setChoiceResult({
      success,
      outcomeText: parsed.outcomeText || (success ? "Success." : "Failed."),
      nextEventId: choice.nextEventId,
      fearChange: parsed.fearChange || 0,
      threatChange: parsed.threatChange || 0,
    });
  };

  const continueToNext = () => {
    if (choiceResult?.nextEventId) {
      jumpTo(choiceResult.nextEventId);
    }
    setChoiceResult(null);
  };

  const reset = () => {
    setCurrentEventId("");
    setHistory([]);
    setFlags({});
    setChoiceResult(null);
  };

  const statKeys = ["strength", "speed", "resilience", "intelligence", "charm", "influence"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm tracking-wide">Runtime Simulator</h3>
          <p className="text-[10px] text-muted-foreground">{storyEvents.length} events · {selectedStoryId || "all"}</p>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={reset} disabled={!currentEventId}>
            <RotateCcw className="w-3 h-3" /> Reset
          </Button>
          <Button size="sm" className="gap-1 text-xs h-7" onClick={start}>
            <Play className="w-3 h-3" /> Start
          </Button>
        </div>
      </div>

      {/* Sim stats */}
      <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(252 12% 18%)", border: "1px solid hsl(252 10% 24%)" }}>
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Simulated Player Stats</p>
        <div className="grid grid-cols-4 gap-2">
          <div>
            <p className="text-[8px] text-danger uppercase">Fear</p>
            <div className="flex items-center gap-1">
              <input type="range" min={0} max={100} value={simStats.fear} onChange={e => setSimStats(prev => ({ ...prev, fear: Number(e.target.value) }))} className="flex-1 h-1.5 accent-red-500" />
              <span className="text-[9px] font-mono w-6 text-right">{simStats.fear}</span>
            </div>
          </div>
          <div>
            <p className="text-[8px] text-warning uppercase">Threat</p>
            <div className="flex items-center gap-1">
              <input type="range" min={0} max={100} value={simStats.threat} onChange={e => setSimStats(prev => ({ ...prev, threat: Number(e.target.value) }))} className="flex-1 h-1.5 accent-yellow-500" />
              <span className="text-[9px] font-mono w-6 text-right">{simStats.threat}</span>
            </div>
          </div>
          {statKeys.map(s => (
            <div key={s}>
              <p className="text-[8px] text-muted-foreground uppercase">{s.slice(0, 4)}</p>
              <div className="flex items-center gap-1">
                <input type="range" min={1} max={10} value={simStats[s] || 5} onChange={e => setSimStats(prev => ({ ...prev, [s]: Number(e.target.value) }))} className="flex-1 h-1.5" />
                <span className="text-[9px] font-mono w-4 text-right">{simStats[s] || 5}</span>
              </div>
            </div>
          ))}
        </div>
        {Object.keys(flags).length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {Object.entries(flags).map(([k, v]) => (
              <span key={k} className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: "hsl(271 87% 65% / 0.15)", color: "hsl(271 87% 75%)" }}>{k}={String(v)}</span>
            ))}
          </div>
        )}
      </div>

      {/* Jump to event */}
      <div className="flex gap-2">
        <Input
          value={jumpInput}
          onChange={e => setJumpInput(e.target.value)}
          placeholder="Jump to event_id..."
          className="text-xs h-8 font-mono"
          onKeyDown={e => { if (e.key === "Enter") { jumpTo(jumpInput); setJumpInput(""); } }}
        />
        <Button size="sm" variant="outline" className="h-8 gap-1 text-xs shrink-0" onClick={() => { jumpTo(jumpInput); setJumpInput(""); }}>
          <SkipForward className="w-3 h-3" /> Jump
        </Button>
      </div>

      {/* Current event */}
      {!currentEventId ? (
        <div className="text-center py-8 text-[11px] text-muted-foreground/40">
          Press Start to begin simulation from the first event, or jump to a specific event_id.
        </div>
      ) : currentEvent ? (
        <div className="space-y-3">
          {/* Event card */}
          <div className="rounded-2xl overflow-hidden" style={{ border: "1.5px solid hsl(271 87% 65% / 0.3)", background: "hsl(252 12% 16%)" }}>
            <div className="px-4 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid hsl(252 10% 22%)", background: "hsl(252 12% 13%)" }}>
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-mono text-[10px] text-violet-400">{currentEvent.event_id}</span>
              <span className="text-[9px] text-muted-foreground/50">night:{currentEvent.night}</span>
              {currentEvent.is_ending && (
                <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: "hsl(351 78% 60% / 0.25)", color: "hsl(351 78% 75%)" }}>ENDING · {currentEvent.ending_type}</span>
              )}
            </div>
            <div className="p-4">
              <p className="text-sm leading-relaxed text-foreground/90">{currentEvent.text}</p>
              {currentEvent.is_ending && currentEvent.ending_text && (
                <p className="mt-2 text-xs text-muted-foreground italic border-t pt-2" style={{ borderColor: "hsl(252 10% 24%)" }}>{currentEvent.ending_text}</p>
              )}
            </div>
          </div>

          {/* Choice result */}
          {choiceResult && (
            <div className="rounded-xl p-3 space-y-2" style={{
              background: choiceResult.success ? "hsl(123 68% 55% / 0.08)" : "hsl(351 78% 60% / 0.08)",
              border: `1px solid ${choiceResult.success ? "hsl(123 68% 55% / 0.4)" : "hsl(351 78% 60% / 0.4)"}`,
            }}>
              <p className="text-[10px] font-bold" style={{ color: choiceResult.success ? "#5ae87a" : "#e8705a" }}>
                {choiceResult.success ? "✓ SUCCESS" : "✗ FAILED"}
              </p>
              <p className="text-xs">{choiceResult.outcomeText}</p>
              <div className="flex gap-2 text-[9px] font-mono">
                {choiceResult.fearChange !== 0 && <span style={{ color: choiceResult.fearChange > 0 ? "#e8705a" : "#5ae87a" }}>FEAR {choiceResult.fearChange > 0 ? "+" : ""}{choiceResult.fearChange}</span>}
                {choiceResult.threatChange !== 0 && <span style={{ color: choiceResult.threatChange > 0 ? "#f5c842" : "#5ae87a" }}>THREAT {choiceResult.threatChange > 0 ? "+" : ""}{choiceResult.threatChange}</span>}
              </div>
              {choiceResult.nextEventId && (
                <Button size="sm" className="gap-1 text-xs h-7" onClick={continueToNext}>
                  <ChevronRight className="w-3 h-3" /> Continue → {choiceResult.nextEventId}
                </Button>
              )}
            </div>
          )}

          {/* Choices */}
          {!choiceResult && !currentEvent.is_ending && choices.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Choose an action</p>
              {choices.map((ch, i) => {
                const statVal = simStats[ch.statUsed] || 5;
                const chance = calcSuccessChance(statVal, ch.difficulty || 2);
                const pct = Math.round(chance * 100);
                const color = pct >= 70 ? "#5ae87a" : pct >= 40 ? "#f5c842" : "#e8705a";
                return (
                  <div key={i} className="rounded-xl p-3 space-y-2" style={{ background: "hsl(252 12% 18%)", border: "1px solid hsl(252 10% 26%)" }}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold flex-1">{ch.text}</p>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      {ch.statUsed} (value: {statVal}) · diff: {ch.difficulty} · next: <span className="font-mono text-violet-400">{ch.nextEventId || "—"}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="text-[10px] h-6 gap-1 flex-1" style={{ borderColor: "#5ae87a40", color: "#5ae87a" }}
                        onClick={() => simulateChoice(ch, true)}>
                        <Zap className="w-2.5 h-2.5" /> Force Success
                      </Button>
                      <Button size="sm" variant="outline" className="text-[10px] h-6 gap-1 flex-1" style={{ borderColor: "#e8705a40", color: "#e8705a" }}
                        onClick={() => simulateChoice(ch, false)}>
                        Force Fail
                      </Button>
                      <Button size="sm" variant="outline" className="text-[10px] h-6 gap-1" onClick={() => simulateChoice(ch)}>
                        <GitBranch className="w-2.5 h-2.5" /> Random
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-[11px] text-destructive/70">
          Event "{currentEventId}" not found in loaded events.
        </div>
      )}

      {/* History */}
      {history.length > 1 && (
        <div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">Path ({history.length})</p>
          <div className="flex flex-wrap gap-1">
            {history.map((id, i) => (
              <button key={i} onClick={() => jumpTo(id)}
                className="text-[9px] font-mono px-2 py-1 rounded-lg"
                style={{ background: id === currentEventId ? "hsl(271 87% 65% / 0.25)" : "hsl(252 12% 18%)", color: id === currentEventId ? "hsl(271 87% 75%)" : "hsl(252 8% 55%)", border: `1px solid ${id === currentEventId ? "hsl(271 87% 65% / 0.4)" : "hsl(252 10% 24%)"}` }}>
                {id}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}