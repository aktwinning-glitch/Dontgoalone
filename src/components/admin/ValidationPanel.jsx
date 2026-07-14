import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Wrench, Loader2 } from "lucide-react";

const VALID_STORY_IDS = new Set(["the_rental", "low_tide", "mardi_gras_curse", "the_lab"]);

function parseChoices(raw) {
  try { return typeof raw === "string" ? JSON.parse(raw) : (raw || []); } catch { return []; }
}
function safeEff(e) {
  try { return typeof e === "string" ? JSON.parse(e) : (e || {}); } catch { return {}; }
}

// VALIDATION RULES
function runValidation(events, stories) {
  const errors = [];
  const warnings = [];
  const info = [];
  const continuity = [];

  if (!events.length) {
    errors.push({ code: "NO_EVENTS", msg: "No events loaded. Import or create events first." });
    return { errors, warnings, info, continuity };
  }

  // 1. story_id validity — must match canonical IDs
  const storyIds = [...new Set(events.map(e => e.story_id).filter(Boolean))];
  storyIds.forEach(sid => {
    if (!VALID_STORY_IDS.has(sid) && !stories.find(s => s.story_id === sid)) {
      errors.push({ code: "INVALID_STORY_ID", msg: `story_id "${sid}" is not a known story. Valid: ${[...VALID_STORY_IDS].join(", ")}` });
    }
  });
  const legacyIds = events.filter(e => /^story_\d+$/.test(e.story_id || ""));
  if (legacyIds.length) {
    errors.push({ code: "LEGACY_STORY_ID", msg: `${legacyIds.length} event(s) use legacy story_id like 'story_1'. Must be migrated to canonical IDs.`, canFix: true, fixType: "legacy_ids", events: legacyIds.map(e => e.id) });
  }

  // 2. Duplicate event_ids (within each story scope)
  const byStory = {};
  events.forEach(e => {
    const sid = e.story_id || "_unknown";
    if (!byStory[sid]) byStory[sid] = {};
    byStory[sid][e.event_id] = (byStory[sid][e.event_id] || 0) + 1;
  });
  Object.entries(byStory).forEach(([sid, idMap]) => {
    const dupes = Object.entries(idMap).filter(([, c]) => c > 1).map(([id]) => id);
    if (dupes.length) errors.push({ code: "DUPLICATE_IDS", msg: `[${sid}] Duplicate event_ids: ${dupes.join(", ")}` });
  });

  // 3. Build event maps per story
  const eventIdSet = new Set(events.map(e => e.event_id));

  // 4. Broken nextEventId links
  events.forEach(ev => {
    parseChoices(ev.choices).forEach((ch, ci) => {
      const links = [
        ch.nextEventId,
        safeEff(ch.successEffect).nextEventId,
        safeEff(ch.failEffect).nextEventId,
      ].filter(Boolean);
      links.forEach(id => {
        if (!eventIdSet.has(id)) {
          errors.push({ code: "BROKEN_LINK", msg: `${ev.event_id}.choices[${ci}] → "${id}" not found` });
        }
      });
    });
  });

  // 5. Endings
  const endings = events.filter(e => e.is_ending);
  if (!endings.length) {
    errors.push({ code: "NO_ENDINGS", msg: "No ending events found." });
  } else {
    const hasGood = endings.some(e => e.ending_type === "good");
    const hasBad = endings.some(e => e.ending_type === "bad");
    if (!hasGood) warnings.push({ code: "NO_GOOD_ENDING", msg: "No 'good' ending found." });
    if (!hasBad) warnings.push({ code: "NO_BAD_ENDING", msg: "No 'bad' ending found." });
    // Endings without ending_text
    endings.forEach(e => {
      if (!e.ending_text && !e.text) warnings.push({ code: "EMPTY_ENDING", msg: `Ending ${e.event_id} has no ending_text or text.` });
    });
    info.push({ code: "ENDINGS_FOUND", msg: `${endings.length} ending(s): ${endings.map(e => `${e.event_id}[${e.ending_type}]`).join(", ")}` });
  }

  // 6. Required fields
  events.forEach(ev => {
    if (!ev.event_id) errors.push({ code: "MISSING_ID", msg: `Event missing event_id: "${ev.text?.slice(0, 40)}"` });
    if (!ev.text) warnings.push({ code: "MISSING_TEXT", msg: `Event ${ev.event_id} has no text.` });
    if (!ev.story_id) warnings.push({ code: "MISSING_STORY_ID", msg: `Event ${ev.event_id} has no story_id set.` });
    if (!ev.image_key) warnings.push({ code: "MISSING_IMAGE_KEY", msg: `Event ${ev.event_id} has no image_key.` });
    if (!ev.location && !ev.is_ending) warnings.push({ code: "MISSING_LOCATION", msg: `Event ${ev.event_id} missing location. Will default to 'living'.` });
    if (!ev.is_ending) {
      const ch = parseChoices(ev.choices);
      if (!ch.length) warnings.push({ code: "NO_CHOICES", msg: `Event ${ev.event_id} is not an ending but has no choices (dead end).` });
      // Check for partyConsequence without required fields
      ch.forEach((choice, ci) => {
        const eff = safeEff(choice.successEffect);
        const feff = safeEff(choice.failEffect);
        [eff, feff].forEach((e, ei) => {
          if (e.partyConsequence?.outcome === "dead" || e.partyConsequence?.outcome === "missing") {
            const pc = e.partyConsequence;
            if (!pc.memberId) warnings.push({ code: "BAD_CONSEQUENCE", msg: `${ev.event_id}.choices[${ci}].${ei === 0 ? "success" : "fail"}Effect: partyConsequence missing memberId` });
            if (!pc.statusText) warnings.push({ code: "BAD_CONSEQUENCE", msg: `${ev.event_id}.choices[${ci}].${ei === 0 ? "success" : "fail"}Effect: partyConsequence missing statusText` });
          }
        });
      });
    }
  });

  // 7. Orphan detection
  const reachable = new Set();
  events.forEach(ev => {
    parseChoices(ev.choices).forEach(ch => {
      [ch.nextEventId, safeEff(ch.successEffect).nextEventId, safeEff(ch.failEffect).nextEventId]
        .filter(Boolean).forEach(id => reachable.add(id));
    });
  });
  const sorted = [...events].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  if (sorted[0]) reachable.add(sorted[0].event_id);
  const orphans = events.filter(e => !reachable.has(e.event_id) && !e.is_ending);
  if (orphans.length > 0) {
    warnings.push({ code: "ORPHANED_EVENTS", msg: `${orphans.length} orphaned events (unreachable): ${orphans.slice(0, 5).map(e => e.event_id).join(", ")}${orphans.length > 5 ? "..." : ""}` });
  }

  // 8. Story record check
  storyIds.forEach(sid => {
    if (!stories.find(s => s.story_id === sid)) {
      errors.push({ code: "MISSING_STORY_RECORD", msg: `Events reference story_id "${sid}" but no Story record exists.` });
    }
  });

  // 9. NARRATIVE CONTINUITY CHECKS
  events.forEach((ev, idx) => {
    const choices = parseChoices(ev.choices);
    if (ev.is_ending) {
      // Endings must have ending_text
      if (!ev.ending_text) continuity.push({ type: "warning", msg: `${ev.event_id}: Ending event missing ending_text — player has no resolution payoff.` });
      // Pre-ending events: last non-ending event before this should have a choice leading here
      const leadsToThis = events.filter(e => e.event_id !== ev.event_id && parseChoices(e.choices).some(c =>
        [c.nextEventId, safeEff(c.successEffect).nextEventId, safeEff(c.failEffect).nextEventId].includes(ev.event_id)
      ));
      if (!leadsToThis.length) continuity.push({ type: "warning", msg: `${ev.event_id}: Ending is unreachable — no event leads to it.` });
    }
    // Abrupt location jump check (if location set)
    if (ev.location && idx > 0) {
      const prev = sorted[idx - 1];
      if (prev?.location && prev.location !== ev.location) {
        const outdoorLocs = new Set(["woods", "outdoor", "porch"]);
        const indoorLocs = new Set(["living", "kitchen", "upstairs", "basement", "indoor"]);
        const prevOut = outdoorLocs.has(prev.location);
        const curIn = indoorLocs.has(ev.location);
        const prevIn = indoorLocs.has(prev.location);
        const curOut = outdoorLocs.has(ev.location);
        const hasTransition = choices.some(c => (c.text || "").toLowerCase().includes("go inside") ||
          (c.text || "").toLowerCase().includes("head back") ||
          (c.text || "").toLowerCase().includes("return"));
        if ((prevOut && curIn) || (prevIn && curOut)) {
          if (!hasTransition) {
            continuity.push({ type: "warning", msg: `${ev.event_id}: Abrupt indoor/outdoor jump from ${prev.event_id} (${prev.location} → ${ev.location}) — missing transition scene.` });
          }
        }
      }
    }
    // Dead ends that aren't endings
    if (!ev.is_ending && choices.length === 0) {
      continuity.push({ type: "error", msg: `${ev.event_id}: Dead end — not an ending but has no choices. Flow will break here.` });
    }
    // Events with no nextEventId on any choice (narrative drift)
    if (!ev.is_ending && choices.length > 0) {
      const allLinked = choices.every(c =>
        c.nextEventId || safeEff(c.successEffect).nextEventId || safeEff(c.failEffect).nextEventId
      );
      if (!allLinked) {
        continuity.push({ type: "warning", msg: `${ev.event_id}: Some choices have no nextEventId — may fall through unintentionally.` });
      }
    }
  });

  // 10. LOCATION + GROUP_SPREAD VALIDATION (Phase 2)
  const VALID_LOCATIONS = new Set(["living", "kitchen", "porch", "upstairs", "basement", "woods", "outdoor", "indoor", ""]);
  events.forEach(ev => {
    // Invalid location value
    if (ev.location && !VALID_LOCATIONS.has(ev.location)) {
      warnings.push({ code: "INVALID_LOCATION", msg: `${ev.event_id}: location "${ev.location}" is not valid. Must be one of: living, kitchen, porch, upstairs, basement, woods, outdoor, indoor` });
    }
    // group_spread validation
    if (ev.group_spread) {
      let spread = null;
      try { spread = typeof ev.group_spread === "string" ? JSON.parse(ev.group_spread) : ev.group_spread; } catch {
        warnings.push({ code: "BAD_GROUP_SPREAD", msg: `${ev.event_id}: group_spread is not valid JSON.` });
      }
      if (Array.isArray(spread)) {
        spread.forEach((entry, idx) => {
          if (!entry.memberId) warnings.push({ code: "SPREAD_MISSING_ID", msg: `${ev.event_id}: group_spread[${idx}] missing memberId.` });
          if (entry.location && !VALID_LOCATIONS.has(entry.location)) {
            warnings.push({ code: "SPREAD_INVALID_LOC", msg: `${ev.event_id}: group_spread[${idx}] location "${entry.location}" is not a valid zone.` });
          }
        });
        // Detect multiple members isolated in woods/basement with no companion
        const danger = spread.filter(e => e.location === "woods" || e.location === "basement");
        danger.forEach(entry => {
          const companions = spread.filter(e => e.memberId !== entry.memberId && e.location === entry.location);
          if (!companions.length) {
            continuity.push({ type: "warning", msg: `${ev.event_id}: ${entry.memberId} is alone in "${entry.location}" — high isolation risk zone. Consider explicit consequence or warning sign.` });
          }
        });
      }
    }
    // High-threat events without a location set — map won't show danger properly
    if (!ev.location && !ev.is_ending) {
      const ch = parseChoices(ev.choices);
      const hasDangerEffect = ch.some(c => {
        const fe = safeEff(c.failEffect);
        return (fe.threatChange || 0) >= 10 || (fe.fearChange || 0) >= 15;
      });
      if (hasDangerEffect) {
        info.push({ code: "MISSING_LOCATION_ON_DANGER", msg: `${ev.event_id}: High-threat event has no location set — map atmosphere won't escalate correctly.` });
      }
    }
  });

  // 11. MAP + ASSET VALIDATION
  stories.forEach(story => {
    if (!story.map_background_key) {
      warnings.push({ code: "MISSING_MAP_BG", msg: `Story "${story.story_id}" has no map_background_key. Map will use fallback.` });
    }
    if (story.map_node_layout) {
      try {
        const layout = typeof story.map_node_layout === "string" ? JSON.parse(story.map_node_layout) : story.map_node_layout;
        if (!Array.isArray(layout) || layout.length < 6) {
          warnings.push({ code: "BAD_MAP_LAYOUT", msg: `Story "${story.story_id}" map_node_layout must have 6 zones.` });
        } else {
          const requiredZones = ["living", "kitchen", "porch", "upstairs", "basement", "woods"];
          const missing = requiredZones.filter(z => !layout.find(l => l.id === z));
          if (missing.length) {
            warnings.push({ code: "MAP_LAYOUT_MISSING_ZONES", msg: `Story "${story.story_id}" custom map layout missing zones: ${missing.join(", ")}` });
          }
        }
      } catch {
        errors.push({ code: "MAP_LAYOUT_INVALID_JSON", msg: `Story "${story.story_id}" map_node_layout is invalid JSON.` });
      }
    }
  });

  // 12. DEATH PACING VALIDATION
  events.forEach(ev => {
    const choices = parseChoices(ev.choices);
    // Events before sort_order 12 (roughly Act 1) with dangerAllowed
    const earlyEvent = (ev.sort_order || 0) < 12;
    if (earlyEvent && ev.death_allowed) {
      continuity.push({ type: "warning", msg: `${ev.event_id}: death_allowed on early event (sort_order ${ev.sort_order}). Act 1 should not allow deaths.` });
    }
    choices.forEach((ch, ci) => {
      if (ch.dangerAllowed && earlyEvent) {
        continuity.push({ type: "warning", msg: `${ev.event_id}.choices[${ci}]: dangerAllowed on early event — passive death won't fire but scripted consequence may.` });
      }
      // Check for death consequences without separation setup
      const se = safeEff(ch.successEffect);
      const fe = safeEff(ch.failEffect);
      [se, fe].forEach((eff, ei) => {
        if (eff.partyConsequence?.outcome === "dead") {
          if (!eff.partyConsequence.statusText) {
            warnings.push({ code: "DEATH_NO_TEXT", msg: `${ev.event_id}.choices[${ci}].${ei === 0 ? "success" : "fail"}Effect: death consequence has no statusText.` });
          }
        }
      });
    });
  });

  // 13. BRANCH VALIDATION (The Rental post-basement)
  const rentalEvents = events.filter(e => e.story_id === "the_rental");
  if (rentalEvents.length > 0) {
    const branchFlags = ["branch_kitchen", "branch_upstairs", "branch_woods", "branch_dock"];
    const branchNames = { branch_kitchen: "Kitchen", branch_upstairs: "Upstairs Bedroom", branch_woods: "Woods", branch_dock: "Dock/Lake" };

    branchFlags.forEach(flag => {
      // Check if any event sets this flag
      const setter = rentalEvents.find(e => {
        const ch = parseChoices(e.choices);
        return ch.some(c => {
          return (c.flagsAdded?.[flag]) ||
            (safeEff(c.successEffect).flagsAdded?.[flag]) ||
            (safeEff(c.failEffect).flagsAdded?.[flag]);
        });
      });
      if (!setter) {
        warnings.push({ code: "MISSING_BRANCH_FLAG", msg: `The Rental: No event sets flag "${flag}" — ${branchNames[flag]} branch is unreachable.` });
      }
      // Check if any event requires this flag (branch content exists)
      const requires = rentalEvents.filter(e => {
        try {
          const conds = typeof e.conditions === "string" ? JSON.parse(e.conditions) : (e.conditions || {});
          return (conds.requiredFlags || []).includes(flag);
        } catch { return false; }
      });
      if (!requires.length) {
        continuity.push({ type: "warning", msg: `The Rental: No events require flag "${flag}" — ${branchNames[flag]} branch has no content.` });
      }
    });

    // Check for living_room_regroup
    const regroup = rentalEvents.find(e => e.event_id?.includes("regroup"));
    if (!regroup) {
      continuity.push({ type: "warning", msg: "The Rental: No regroup event found — branches may not reconnect." });
    }
  }

  info.push({ code: "TOTALS", msg: `${events.length} total events, ${storyIds.length} story_id(s), ${endings.length} ending(s), ${stories.length} story record(s).` });

  return { errors, warnings, info, continuity };
}

function IssueRow({ item, type }) {
  const colors = { error: "#e8705a", warning: "#f5c842", info: "#5ae87a" };
  const Icons = { error: XCircle, warning: AlertTriangle, info: CheckCircle2 };
  const color = colors[type];
  const Icon = Icons[type];
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-lg text-[11px]" style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color }} />
      <div>
        <span className="font-mono text-[9px] uppercase tracking-widest opacity-60">{item.code}</span>
        <p style={{ color: type === "info" ? "hsl(40 30% 80%)" : "inherit" }}>{item.msg}</p>
      </div>
    </div>
  );
}

export default function ValidationPanel({ selectedStoryId }) {
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showContinuity, setShowContinuity] = useState(false);
  const [liveResult, setLiveResult] = useState(null);
  const [migrating, setMigrating] = useState(false);
  const [migrateLog, setMigrateLog] = useState([]);
  const qc = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.GameEvent.list("sort_order"),
    refetchInterval: 30000,
  });

  const { data: stories = [] } = useQuery({
    queryKey: ["stories"],
    queryFn: () => base44.entities.Story.list("sort_order"),
  });

  const runScan = useCallback(() => {
    const filteredEvents = selectedStoryId ? events.filter(e => e.story_id === selectedStoryId) : events;
    if (!filteredEvents.length) return;
    setLiveResult(runValidation(filteredEvents, stories));
  }, [events, stories, selectedStoryId]);

  useEffect(() => { runScan(); }, [runScan]);

  const validate = () => {
    setRunning(true);
    const filteredEvents = selectedStoryId ? events.filter(e => e.story_id === selectedStoryId) : events;
    setTimeout(() => {
      const r = runValidation(filteredEvents, stories);
      setResult(r);
      setLiveResult(r);
      setRunning(false);
    }, 100);
  };

  // Migrate legacy story_id values
  const migrateStoryIds = async () => {
    setMigrating(true);
    const log = [];
    const legacyEvents = events.filter(e => /^story_\d+$/.test(e.story_id || ""));
    // Try to infer correct story_id from event_id prefix
    const STORY_PREFIXES = { "the_rental": ["evt_", "rental", "cabin", "timeshare"], "low_tide": ["tide", "beach", "low"], "mardi_gras_curse": ["mardi", "gras", "parade", "curse"], "the_lab": ["lab", "experiment", "facility"] };
    for (const ev of legacyEvents) {
      const eid = (ev.event_id || "").toLowerCase();
      let inferredId = null;
      for (const [sid, prefixes] of Object.entries(STORY_PREFIXES)) {
        if (prefixes.some(p => eid.includes(p))) { inferredId = sid; break; }
      }
      // If there's only one real story, assign it
      if (!inferredId && stories.length === 1) inferredId = stories[0].story_id;
      if (inferredId) {
        await base44.entities.GameEvent.update(ev.id, { story_id: inferredId });
        log.push(`✓ ${ev.event_id}: ${ev.story_id} → ${inferredId}`);
      } else {
        log.push(`⚠ ${ev.event_id}: Could not infer story_id (was ${ev.story_id})`);
      }
    }
    qc.invalidateQueries({ queryKey: ["events"] });
    setMigrateLog(log);
    setMigrating(false);
  };

  const totalIssues = result ? result.errors.length + result.warnings.length : 0;
  const isClean = result && result.errors.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm tracking-wide">Validation Engine</h3>
          <p className="text-[10px] text-muted-foreground">
            {selectedStoryId ? `Checking story: ${selectedStoryId}` : "All stories"}
          </p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={validate} disabled={running}>
          <RefreshCw className={`w-3.5 h-3.5 ${running ? "animate-spin" : ""}`} />
          Run Validation
        </Button>
      </div>

      {result && (
        <div className="space-y-3">
          {/* Score bar */}
          <div className="rounded-2xl p-4 flex items-center gap-4" style={{
            background: isClean ? "hsl(123 68% 55% / 0.08)" : "hsl(351 78% 60% / 0.08)",
            border: `1.5px solid ${isClean ? "hsl(123 68% 55% / 0.4)" : "hsl(351 78% 60% / 0.4)"}`,
          }}>
            {isClean
              ? <CheckCircle2 className="w-8 h-8 text-success shrink-0" />
              : <XCircle className="w-8 h-8 text-destructive shrink-0" />
            }
            <div>
              <p className="font-bold text-sm">{isClean ? "All checks passed" : `${result.errors.length} error(s), ${result.warnings.length} warning(s)`}</p>
              <p className="text-[10px] text-muted-foreground">{result.info.find(i => i.code === "TOTALS")?.msg}</p>
            </div>
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-destructive">Errors ({result.errors.length})</p>
              {result.errors.map((e, i) => <IssueRow key={i} item={e} type="error" />)}
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-warning">Warnings ({result.warnings.length})</p>
              {result.warnings.map((w, i) => <IssueRow key={i} item={w} type="warning" />)}
            </div>
          )}

          {/* Info toggle */}
          {result.info.length > 0 && (
            <div>
              <button onClick={() => setShowInfo(v => !v)} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                {showInfo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Info ({result.info.length})
              </button>
              {showInfo && (
                <div className="space-y-1.5 mt-2">
                  {result.info.map((item, i) => <IssueRow key={i} item={item} type="info" />)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Continuity section */}
      {result && result.continuity?.length > 0 && (
        <div>
          <button onClick={() => setShowContinuity(v => !v)} className="flex items-center gap-1 text-[10px] font-bold text-warning">
            {showContinuity ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Narrative Continuity ({result.continuity.length})
          </button>
          {showContinuity && (
            <div className="space-y-1.5 mt-2">
              {result.continuity.map((c, i) => <IssueRow key={i} item={{ msg: c.msg }} type={c.type === "error" ? "error" : "warning"} />)}
            </div>
          )}
        </div>
      )}

      {/* Migration tool */}
      {result && result.errors.some(e => e.fixType === "legacy_ids") && (
        <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(40 90% 55% / 0.08)", border: "1px solid hsl(40 90% 55% / 0.3)" }}>
          <p className="text-[10px] font-bold text-warning">Legacy story_id migration needed</p>
          <p className="text-[9px] text-muted-foreground">Events use old 'story_1' format. Auto-migrate to canonical IDs.</p>
          <Button size="sm" className="gap-1.5 text-xs h-8" onClick={migrateStoryIds} disabled={migrating}
            style={{ background: "hsl(40 90% 45%)" }}>
            {migrating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />}
            Run Migration
          </Button>
          {migrateLog.length > 0 && (
            <div className="space-y-0.5 max-h-32 overflow-y-auto">
              {migrateLog.map((l, i) => (
                <div key={i} className="text-[9px] font-mono" style={{ color: l.startsWith("⚠") ? "hsl(40 90% 68%)" : "hsl(123 68% 65%)" }}>{l}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {!result && (
        <div className="text-center py-8 text-[11px] text-muted-foreground/40">
          Press "Run Validation" to check story IDs, event links, endings, orphaned nodes, and narrative continuity.
        </div>
      )}
    </div>
  );
}