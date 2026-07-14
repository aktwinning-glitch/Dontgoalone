import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, ChevronUp, Clock, Swords } from "lucide-react";
import AchievementBadges from "@/components/achievements/AchievementBadges";
import { Button } from "@/components/ui/button";

// ── Helpers ─────────────────────────────────────────────────────────────────

const ENDING_CONFIG = {
  good:  { emoji: "🌅", label: "Survived",  color: "hsl(123 68% 55%)",  bg: "hsl(123 68% 55% / 0.12)", border: "hsl(123 68% 55% / 0.3)" },
  mixed: { emoji: "🌫️", label: "Bittersweet", color: "hsl(40 90% 62%)", bg: "hsl(40 90% 62% / 0.12)", border: "hsl(40 90% 62% / 0.3)" },
  bad:   { emoji: "💀", label: "Game Over", color: "hsl(351 78% 60%)",  bg: "hsl(351 78% 60% / 0.12)", border: "hsl(351 78% 60% / 0.3)" },
  "":    { emoji: "🌫️", label: "Unknown",   color: "hsl(252 8% 55%)",   bg: "hsl(252 10% 18%)",        border: "hsl(252 10% 24%)" },
};

const FLAG_LABELS = {
  chose_self: "Chose self over group",
  chose_group: "Sacrificed for the group",
  chose_one: "Saved one person",
  self_sacrifice: "Offered self up",
  betrayed_ally: "Betrayed an ally",
  truth_spoken: "Spoke the truth",
  lie_protected: "Kept the lie alive",
  basement_entered: "Went into the basement",
  photo_revealed: "Showed everyone the photo",
  old_secret_revealed: "Uncovered the old secret",
  sender_named: "Named the message sender",
  suspect_trapped: "Trapped the suspect",
  trusted_unlikely: "Trusted the wrong person (or did you?)",
  used_bait: "Used someone as bait",
  held_ground: "Held their ground",
};

// ── Event node graph ─────────────────────────────────────────────────────────

function EventNodeGraph({ eventPath }) {
  if (!eventPath || eventPath.length === 0) return null;

  const maxVisible = 20;
  const path = eventPath.slice(0, maxVisible);
  const nodeW = 28;
  const nodeH = 22;
  const spacing = 36;
  const rows = Math.ceil(path.length / 5);
  const cols = Math.min(path.length, 5);
  const svgW = cols * spacing + 16;
  const svgH = rows * 44 + 16;

  const getPos = (i) => {
    const row = Math.floor(i / 5);
    const col = row % 2 === 0 ? i % 5 : 4 - (i % 5); // snake pattern
    return { x: col * spacing + spacing / 2, y: row * 44 + 22 };
  };

  // Act coloring
  const getActColor = (eventId) => {
    if (!eventId) return "hsl(252 10% 30%)";
    if (eventId.includes("_a1_")) return "hsl(200 65% 50%)";
    if (eventId.includes("_a2_")) return "hsl(271 87% 60%)";
    if (eventId.includes("_a3_")) return "hsl(40 90% 55%)";
    if (eventId.includes("_a4_")) return "hsl(18 75% 55%)";
    if (eventId.includes("_a5_")) return "hsl(351 78% 55%)";
    if (eventId.includes("_a6_")) return "hsl(123 68% 50%)";
    return "hsl(252 10% 40%)";
  };

  return (
    <div className="overflow-x-auto">
      <svg width={svgW} height={svgH} style={{ minWidth: svgW }}>
        {/* Connecting lines */}
        {path.map((id, i) => {
          if (i === 0) return null;
          const from = getPos(i - 1);
          const to = getPos(i);
          return (
            <line
              key={`line-${i}`}
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke="hsl(252 10% 28%)"
              strokeWidth="1.5"
              strokeDasharray={i === path.length - 1 ? "3 3" : "none"}
            />
          );
        })}
        {/* Nodes */}
        {path.map((id, i) => {
          const { x, y } = getPos(i);
          const color = getActColor(id);
          const isLast = i === path.length - 1;
          const isFirst = i === 0;
          const act = id?.match(/_a(\d)_/)?.[1];
          return (
            <g key={id || i}>
              <circle
                cx={x} cy={y} r={isFirst || isLast ? 9 : 7}
                fill={isLast ? color : "hsl(252 12% 16%)"}
                stroke={color}
                strokeWidth={isFirst || isLast ? 2 : 1.5}
              />
              {act && (
                <text
                  x={x} y={y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="7"
                  fill={isLast ? "white" : color}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {act}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-2">
        {["A1", "A2", "A3", "A4", "A5", "A6"].map((act, i) => {
          const colors = ["hsl(200 65% 50%)", "hsl(271 87% 60%)", "hsl(40 90% 55%)", "hsl(18 75% 55%)", "hsl(351 78% 55%)", "hsl(123 68% 50%)"];
          return (
            <div key={act} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: colors[i] }} />
              <span className="text-[8px] text-muted-foreground font-mono">{act}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Run card ─────────────────────────────────────────────────────────────────

function RunCard({ run, index }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = ENDING_CONFIG[run.ending_type] || ENDING_CONFIG[""];

  const partyOutcomes = (() => {
    try { return JSON.parse(run.party_outcomes || "[]"); } catch { return []; }
  })();
  const majorFlags = (() => {
    try { return JSON.parse(run.major_flags || "[]"); } catch { return []; }
  })();
  const eventPath = (() => {
    try { return JSON.parse(run.event_path || "[]"); } catch { return []; }
  })();

  const date = run.created_date
    ? new Date(run.created_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 280, damping: 24 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: "hsl(252 12% 13%)", border: `1.5px solid ${cfg.border}` }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
        >
          {cfg.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-foreground">{run.character_name}</p>
            <span
              className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full"
              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
            >{cfg.label}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground">{run.story_title || run.story_id}</span>
            {date && <span className="text-[9px] text-muted-foreground/60 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{date}</span>}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Survivors badge */}
          <div className="text-center">
            <p className="text-sm font-bold" style={{ color: run.survivors_count > 0 ? "hsl(123 68% 60%)" : "hsl(351 78% 60%)" }}>
              {run.survivors_count}/{run.total_party}
            </p>
            <p className="text-[8px] text-muted-foreground uppercase tracking-wide">saved</p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: "hsl(252 10% 20%)" }}>

              {/* Stats strip */}
              <div className="flex gap-3 pt-3 flex-wrap">
                {[
                  { label: "Fear",    value: run.final_fear,     color: "hsl(351 78% 62%)" },
                  { label: "Threat",  value: run.final_threat,   color: "hsl(40 90% 62%)" },
                  { label: "Nights",  value: run.nights_survived, color: "hsl(271 87% 68%)" },
                  { label: "Choices", value: run.choices_made,   color: "hsl(200 65% 60%)" },
                ].map(s => (
                  <div key={s.label} className="flex-1 min-w-[60px] rounded-xl p-2 text-center" style={{ background: "hsl(252 12% 18%)" }}>
                    <p className="text-base font-bold" style={{ color: s.color }}>{s.value ?? 0}</p>
                    <p className="text-[8px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Killer reveal */}
              {run.killer_character_name && (
                <div
                  className="flex items-center gap-2 rounded-xl px-3 py-2"
                  style={{ background: "hsl(351 78% 55% / 0.1)", border: "1px solid hsl(351 78% 55% / 0.25)" }}
                >
                  <Swords className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(351 78% 65%)" }} />
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">The Killer Was</p>
                    <p className="text-sm font-bold" style={{ color: "hsl(351 78% 68%)" }}>{run.killer_character_name}</p>
                  </div>
                </div>
              )}

              {/* Party outcomes */}
              {partyOutcomes.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground mb-2">Party</p>
                  <div className="flex flex-wrap gap-2">
                    {partyOutcomes.map((m, i) => {
                      const statusColors = {
                        survived: "hsl(123 68% 55%)",
                        injured: "hsl(40 90% 62%)",
                        missing: "hsl(252 8% 55%)",
                        gone: "hsl(351 78% 60%)",
                      };
                      const c = statusColors[m.status?.toLowerCase()] || statusColors.gone;
                      return (
                        <div key={i} className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: "hsl(252 12% 18%)", border: `1px solid ${c}40` }}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                          <span className="text-[9px] font-semibold text-foreground">{m.name}</span>
                          <span className="text-[8px] text-muted-foreground">{m.status}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Major choices */}
              {majorFlags.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground mb-2">Key Decisions</p>
                  <div className="space-y-1">
                    {majorFlags.map((flag, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-[9px] mt-0.5" style={{ color: "hsl(271 87% 68%)" }}>▸</span>
                        <p className="text-[10px] text-foreground leading-relaxed">
                          {FLAG_LABELS[flag] || flag.replace(/_/g, " ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Event path graph */}
              {eventPath.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground mb-2">Event Path</p>
                  <EventNodeGraph eventPath={eventPath} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RunHistory() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: runs, isLoading } = useQuery({
    queryKey: ["runHistory"],
    queryFn: () => base44.entities.RunHistory.list("-created_date", 50),
    initialData: [],
  });

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(null);
  const PULL_THRESHOLD = 64;

  const onTouchStart = useCallback((e) => {
    if (window.scrollY === 0) touchStartY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (touchStartY.current === null) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setPullY(Math.min(delta * 0.45, PULL_THRESHOLD));
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (pullY >= PULL_THRESHOLD) {
      setRefreshing(true);
      await qc.invalidateQueries({ queryKey: ["runHistory"] });
      setTimeout(() => setRefreshing(false), 600);
    }
    setPullY(0);
    touchStartY.current = null;
  }, [pullY, qc]);

  return (
    <div
      className="min-h-screen bg-background flex flex-col max-w-lg mx-auto overflow-y-auto"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ overscrollBehavior: "none" }}
    >
      {/* Pull-to-refresh indicator */}
      <AnimatePresence>
        {(pullY > 8 || refreshing) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: refreshing ? 40 : pullY * 0.6, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center justify-center overflow-hidden"
            style={{ background: "hsl(252 14% 9%)" }}
          >
            <div className={`w-5 h-5 rounded-full border-2 border-secondary ${refreshing ? "border-t-primary animate-spin" : "border-t-muted-foreground"}`} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 pb-4 flex items-center gap-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.25rem)", background: "hsl(252 14% 9% / 0.97)", borderBottom: "1px solid hsl(252 10% 18%)" }}
      >
        <button
          onClick={() => navigate("/home")}
          className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          style={{ background: "hsl(252 12% 18%)" }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-xl tracking-wide text-foreground">Run History</h1>
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest">
            {runs.length} session{runs.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
        <div className="text-2xl">📋</div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}>
        {/* Achievements dashboard */}
        {!isLoading && <AchievementBadges runs={runs} />}

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 border-3 border-secondary border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && runs.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 space-y-4"
          >
            <div className="text-5xl">🏚️</div>
            <p className="font-display text-lg text-foreground">No runs yet.</p>
            <p className="text-xs text-muted-foreground text-center max-w-[220px]">
              Complete your first game to see your history here.
            </p>
            <Button onClick={() => navigate("/select")} className="mt-2 rounded-2xl">
              Start a Run
            </Button>
          </motion.div>
        )}

        {runs.map((run, i) => (
          <RunCard key={run.id} run={run} index={i} />
        ))}
      </div>
    </div>
  );
}