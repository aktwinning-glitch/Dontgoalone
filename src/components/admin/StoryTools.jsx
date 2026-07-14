import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import StoryGraphEditor from "@/components/admin/StoryGraphEditor";
import {
  Users, Flag, MessageSquare, ShieldAlert, Image, GitBranch, Share2,
  Search, RefreshCw, CheckCircle2, AlertTriangle, XCircle,
  ChevronDown, ChevronUp, Loader2, Save, Trash2
} from "lucide-react";

// ─── SHARED STORY SELECTOR ─────────────────────────────────────────────────
function StorySelector({ stories, value, onChange }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {stories.map(s => (
        <button
          key={s.story_id}
          onClick={() => onChange(s.story_id)}
          className="text-[9px] px-2.5 py-1 rounded-full font-bold transition-all"
          style={{
            background: value === s.story_id ? "hsl(271 87% 65% / 0.25)" : "hsl(252 12% 20%)",
            color: value === s.story_id ? "hsl(271 87% 78%)" : "hsl(252 8% 55%)",
            border: `1px solid ${value === s.story_id ? "hsl(271 87% 65% / 0.45)" : "hsl(252 10% 26%)"}`,
          }}
        >{s.title || s.story_id}</button>
      ))}
    </div>
  );
}

// ─── ROLE ASSIGNMENT EDITOR ────────────────────────────────────────────────
const ROLES = [
  { id: "front_door_opener", label: "Front Door Opener", statKey: "strength", desc: "Opens/forces entry. Prefers high strength." },
  { id: "cautious_observer", label: "Cautious Observer", statKey: "intelligence", desc: "Spots clues, reads environments." },
  { id: "basement_reader", label: "Basement Reader", statKey: "intelligence", desc: "Decodes clues in dangerous areas." },
  { id: "kitchen_partner", label: "Kitchen Partner", statKey: "charm", desc: "Calm dialogue partner in confined spaces." },
  { id: "forest_partner", label: "Forest Partner", statKey: "speed", desc: "Outdoor scout, runner." },
  { id: "first_missing_target", label: "First Missing Target", statKey: "fear", desc: "High fear makes them disappear first." },
  { id: "first_death_target", label: "First Death Target", statKey: "resilience", desc: "Low resilience = primary casualty risk." },
  { id: "regroup_leader", label: "Regroup Leader", statKey: "influence", desc: "Rallies the group after a loss." },
  { id: "attic_witness", label: "Attic Witness", statKey: "fear", desc: "Discovers something in an elevated area." },
  { id: "confrontation_partner", label: "Confrontation Partner", statKey: "strength", desc: "Faces the threat directly." },
  { id: "sacrifice_candidate", label: "Sacrifice Candidate", statKey: "resilience", desc: "Volunteers or is pushed to sacrifice." },
];

function RoleAssignmentEditor({ storyId, characters }) {
  const [expanded, setExpanded] = useState(null);
  const [weights, setWeights] = useState({});

  const getTopCandidates = (role) => {
    const statKey = role.statKey;
    return [...characters]
      .map(c => ({ ...c, score: (c[statKey] || 5) + (weights[`${role.id}_${c.id}`] || 0) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-muted-foreground">
        Define how story roles map to cast members via weighted stat scoring. These rules run at game start when the cast is randomized.
      </p>
      {ROLES.map(role => (
        <div key={role.id} className="rounded-xl overflow-hidden" style={{ border: "1px solid hsl(252 10% 22%)" }}>
          <button
            onClick={() => setExpanded(expanded === role.id ? null : role.id)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-left"
            style={{ background: "hsl(252 12% 16%)" }}
          >
            <div>
              <p className="text-xs font-bold text-foreground">{role.label}</p>
              <p className="text-[9px] text-muted-foreground">{role.desc}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded" style={{ background: "hsl(271 87% 65% / 0.18)", color: "hsl(271 87% 75%)" }}>
                stat: {role.statKey}
              </span>
              {expanded === role.id ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
            </div>
          </button>
          {expanded === role.id && (
            <div className="px-3 pb-3 pt-2 space-y-3" style={{ background: "hsl(252 12% 13%)" }}>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Top Candidates (by {role.statKey})</p>
              <div className="space-y-1">
                {getTopCandidates(role).map((c, i) => (
                  <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "hsl(252 12% 18%)", border: "1px solid hsl(252 10% 24%)" }}>
                    <span className="text-[8px] font-black text-muted-foreground w-4">#{i+1}</span>
                    <span className="text-xs font-semibold flex-1">{c.name}</span>
                    <span className="text-[9px] font-mono" style={{ color: "hsl(271 87% 72%)" }}>{role.statKey}: {c[role.statKey] || 5}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] text-muted-foreground">bias:</span>
                      <input
                        type="number"
                        min={-5}
                        max={5}
                        value={weights[`${role.id}_${c.id}`] || 0}
                        onChange={e => setWeights(w => ({ ...w, [`${role.id}_${c.id}`]: parseInt(e.target.value) || 0 }))}
                        className="w-12 h-5 text-[9px] text-center rounded border bg-transparent"
                        style={{ borderColor: "hsl(252 10% 28%)" }}
                      />
                    </div>
                  </div>
                ))}
                {characters.length === 0 && <p className="text-[10px] text-muted-foreground italic">No characters loaded.</p>}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── FLAG + CONDITION REGISTRY ─────────────────────────────────────────────
function FlagRegistry({ storyId, events }) {
  const storyEvents = storyId ? events.filter(e => e.story_id === storyId) : events;

  const flagMap = useMemo(() => {
    const map = {};
    for (const ev of storyEvents) {
      const processEffect = (eff, evId, label) => {
        const e = typeof eff === "string" ? (() => { try { return JSON.parse(eff); } catch { return {}; } })() : (eff || {});
        (e.flagsAdded || []).forEach(f => {
          if (!map[f]) map[f] = { setIn: [], checkedIn: [], type: "flag" };
          map[f].setIn.push(`${evId} (${label})`);
        });
        (e.flagsRequired || []).forEach(f => {
          if (!map[f]) map[f] = { setIn: [], checkedIn: [], type: "flag" };
          map[f].checkedIn.push(`${evId} (${label})`);
        });
      };
      const choices = (() => { try { return typeof ev.choices === "string" ? JSON.parse(ev.choices) : (ev.choices || []); } catch { return []; } })();
      const conds = (() => { try { return typeof ev.conditions === "string" ? JSON.parse(ev.conditions) : (ev.conditions || {}); } catch { return {}; } })();
      (conds.flags || []).forEach(f => {
        if (!map[f]) map[f] = { setIn: [], checkedIn: [], type: "condition" };
        map[f].checkedIn.push(`${ev.event_id} (condition)`);
      });
      choices.forEach(c => {
        if (c.successEffect) processEffect(c.successEffect, ev.event_id, "success");
        if (c.failEffect) processEffect(c.failEffect, ev.event_id, "fail");
      });
    }
    return map;
  }, [storyEvents]);

  const flags = Object.entries(flagMap);
  const orphaned = flags.filter(([, v]) => v.setIn.length === 0);
  const unused = flags.filter(([, v]) => v.checkedIn.length === 0);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-[9px]">
        <span className="px-2 py-0.5 rounded font-bold" style={{ background: "hsl(351 78% 60% / 0.15)", color: "hsl(351 78% 68%)" }}>
          {orphaned.length} never set
        </span>
        <span className="px-2 py-0.5 rounded font-bold" style={{ background: "hsl(40 90% 58% / 0.15)", color: "hsl(40 90% 68%)" }}>
          {unused.length} never checked
        </span>
        <span className="px-2 py-0.5 rounded font-bold" style={{ background: "hsl(123 68% 50% / 0.15)", color: "hsl(123 68% 65%)" }}>
          {flags.length} total flags
        </span>
      </div>
      {flags.length === 0 && <p className="text-[10px] text-muted-foreground italic">No flags found. Import or create events first.</p>}
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {flags.map(([flag, info]) => {
          const isOrphaned = info.setIn.length === 0;
          const isUnused = info.checkedIn.length === 0;
          return (
            <div key={flag} className="px-3 py-2 rounded-lg" style={{ background: "hsl(252 12% 16%)", border: `1px solid ${isOrphaned ? "hsl(351 78% 60% / 0.35)" : isUnused ? "hsl(40 90% 58% / 0.35)" : "hsl(252 10% 22%)"}` }}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold flex-1" style={{ color: isOrphaned ? "hsl(351 78% 68%)" : isUnused ? "hsl(40 90% 68%)" : "hsl(271 87% 72%)" }}>
                  {flag}
                </span>
                {isOrphaned && <span className="text-[7px] font-black px-1.5 rounded" style={{ background: "hsl(351 78% 60% / 0.2)", color: "hsl(351 78% 68%)" }}>NEVER SET</span>}
                {isUnused && !isOrphaned && <span className="text-[7px] font-black px-1.5 rounded" style={{ background: "hsl(40 90% 58% / 0.2)", color: "hsl(40 90% 68%)" }}>UNUSED</span>}
              </div>
              <p className="text-[8px] text-muted-foreground mt-0.5">
                Set in: {info.setIn.slice(0, 3).join(", ") || "—"} · Checked in: {info.checkedIn.slice(0, 3).join(", ") || "—"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── DIALOGUE WORKBENCH ────────────────────────────────────────────────────
function DialogueWorkbench({ storyId }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [editLine, setEditLine] = useState("");

  const { data: lines = [], isLoading } = useQuery({
    queryKey: ["dialogue", storyId],
    queryFn: () => storyId
      ? base44.entities.Dialogue.filter({ story_id: storyId }, "sort_order")
      : base44.entities.Dialogue.list("sort_order"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Dialogue.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dialogue"] }); setEditingId(null); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Dialogue.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dialogue"] }),
  });

  const filtered = lines.filter(l => {
    const matchCat = filterCat === "all" || l.category === filterCat;
    const matchSearch = !search || l.line?.toLowerCase().includes(search.toLowerCase()) || l.character_name?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const CATS = ["all", "banter", "clue", "regroup", "chase", "ending", "tense", "emotional", "general"];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search lines..." className="pl-7 h-7 text-xs" />
        </div>
      </div>
      <div className="flex gap-1 flex-wrap">
        {CATS.map(c => (
          <button key={c} onClick={() => setFilterCat(c)}
            className="text-[8px] px-2 py-0.5 rounded-full font-bold capitalize"
            style={{ background: filterCat === c ? "hsl(271 87% 65% / 0.25)" : "hsl(252 12% 20%)", color: filterCat === c ? "hsl(271 87% 78%)" : "hsl(252 8% 55%)" }}>
            {c}
          </button>
        ))}
      </div>
      <p className="text-[9px] text-muted-foreground">{filtered.length} lines {storyId ? `for ${storyId}` : "across all stories"}</p>
      {isLoading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</div>}
      <div className="space-y-1 max-h-[500px] overflow-y-auto">
        {filtered.map(l => (
          <div key={l.id} className="rounded-xl overflow-hidden" style={{ border: "1px solid hsl(252 10% 22%)" }}>
            {editingId === l.id ? (
              <div className="p-3 space-y-2" style={{ background: "hsl(252 12% 15%)" }}>
                <Textarea value={editLine} onChange={e => setEditLine(e.target.value)} rows={3} className="text-xs" />
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1 text-xs h-7" onClick={() => updateMutation.mutate({ id: l.id, data: { line: editLine } })} disabled={updateMutation.isPending}>
                    <Save className="w-3 h-3" /> Save
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 px-3 py-2" style={{ background: "hsl(252 12% 16%)" }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-bold" style={{ color: "hsl(271 87% 72%)" }}>{l.character_name}</span>
                    <span className="text-[7px] px-1 py-0.5 rounded font-bold uppercase" style={{ background: "hsl(252 12% 22%)", color: "hsl(252 8% 52%)" }}>{l.category}</span>
                    {l.trigger_context && <span className="text-[7px] text-muted-foreground/60 truncate">{l.trigger_context}</span>}
                  </div>
                  <p className="text-[10px] leading-relaxed" style={{ color: "hsl(40 25% 82%)" }}>{l.line}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditingId(l.id); setEditLine(l.line); }} className="text-[8px] px-2 py-1 rounded" style={{ background: "hsl(271 87% 65% / 0.15)", color: "hsl(271 87% 72%)" }}>Edit</button>
                  <button onClick={() => deleteMutation.mutate(l.id)} className="text-[8px] px-2 py-1 rounded" style={{ background: "hsl(351 78% 60% / 0.12)", color: "hsl(351 78% 65%)" }}>
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && !isLoading && (
          <p className="text-[10px] text-muted-foreground italic text-center py-6">
            No dialogue found. Import a story JSON to auto-populate, or add lines in the Dialogue tab.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── CONTINUITY CHECKER ────────────────────────────────────────────────────
function ContinuityChecker({ storyId, events, characters }) {
  const [issues, setIssues] = useState(null);
  const [running, setRunning] = useState(false);

  const storyEvents = storyId ? events.filter(e => e.story_id === storyId) : events;
  const charNames = characters.map(c => c.name);

  const runCheck = () => {
    setRunning(true);
    const found = [];

    // Build all event IDs
    const eventIdSet = new Set(storyEvents.map(e => e.event_id));

    // Check for broken links, duplicate IDs, dead speakers
    const seenIds = new Set();
    for (const ev of storyEvents) {
      // Duplicate event IDs
      if (seenIds.has(ev.event_id)) {
        found.push({ type: "error", msg: `Duplicate event_id: ${ev.event_id}` });
      }
      seenIds.add(ev.event_id);

      // Check choices
      const choices = (() => { try { return typeof ev.choices === "string" ? JSON.parse(ev.choices) : (ev.choices || []); } catch { return []; } })();
      for (const c of choices) {
        const checkEffect = (eff, label) => {
          const e = typeof eff === "string" ? (() => { try { return JSON.parse(eff); } catch { return {}; } })() : (eff || {});
          if (e.nextEventId && !eventIdSet.has(e.nextEventId)) {
            found.push({ type: "error", msg: `Broken link in ${ev.event_id} → ${label}.nextEventId = "${e.nextEventId}" (missing)` });
          }
          // Check for named characters in outcome text
          if (e.outcomeText) {
            charNames.forEach(name => {
              if (e.outcomeText.includes(name) && ev.is_ending) {
                found.push({ type: "warning", msg: `Ending event ${ev.event_id} contains named character "${name}" — may leak in role-safe runs` });
              }
            });
          }
        };
        if (c.successEffect) checkEffect(c.successEffect, "successEffect");
        if (c.failEffect) checkEffect(c.failEffect, "failEffect");
        if (c.nextEventId && !eventIdSet.has(c.nextEventId)) {
          found.push({ type: "error", msg: `Direct link in ${ev.event_id}: choice nextEventId "${c.nextEventId}" missing` });
        }
      }

      // Missing ending for is_ending events
      if (ev.is_ending && !ev.ending_text && !ev.text) {
        found.push({ type: "warning", msg: `Ending event ${ev.event_id} has no text` });
      }

      // Named character leakage in event text (warns when hardcoded)
      if (ev.text) {
        charNames.forEach(name => {
          if (ev.text.includes(name)) {
            found.push({ type: "info", msg: `Event ${ev.event_id}: contains hardcoded name "${name}" — role-safe? Verify it's intentional.` });
          }
        });
      }
    }

    // Events with no choices and not an ending
    const noChoiceDeadEnds = storyEvents.filter(ev => {
      const choices = (() => { try { return typeof ev.choices === "string" ? JSON.parse(ev.choices) : (ev.choices || []); } catch { return []; } })();
      return choices.length === 0 && !ev.is_ending;
    });
    noChoiceDeadEnds.forEach(ev => {
      found.push({ type: "warning", msg: `Dead end: ${ev.event_id} has no choices and is not an ending` });
    });

    setIssues(found);
    setRunning(false);
  };

  const errors = issues?.filter(i => i.type === "error") || [];
  const warnings = issues?.filter(i => i.type === "warning") || [];
  const infos = issues?.filter(i => i.type === "info") || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button size="sm" className="gap-1.5 text-xs h-8" onClick={runCheck} disabled={running}>
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
          Run Continuity Check
        </Button>
        <p className="text-[9px] text-muted-foreground">{storyEvents.length} events scanned</p>
      </div>
      {issues !== null && (
        <div className="space-y-2">
          <div className="flex gap-2 text-[9px]">
            <span className="px-2 py-0.5 rounded font-bold" style={{ background: "hsl(351 78% 60% / 0.15)", color: "hsl(351 78% 68%)" }}>{errors.length} errors</span>
            <span className="px-2 py-0.5 rounded font-bold" style={{ background: "hsl(40 90% 58% / 0.15)", color: "hsl(40 90% 68%)" }}>{warnings.length} warnings</span>
            <span className="px-2 py-0.5 rounded font-bold" style={{ background: "hsl(216 70% 60% / 0.15)", color: "hsl(216 70% 72%)" }}>{infos.length} info</span>
          </div>
          {issues.length === 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: "hsl(123 68% 50% / 0.1)", color: "hsl(123 68% 65%)", border: "1px solid hsl(123 68% 50% / 0.3)" }}>
              <CheckCircle2 className="w-4 h-4" /> No issues found.
            </div>
          )}
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg text-[10px]"
                style={{ background: "hsl(252 12% 15%)", border: `1px solid ${issue.type === "error" ? "hsl(351 78% 60% / 0.3)" : issue.type === "warning" ? "hsl(40 90% 58% / 0.3)" : "hsl(216 70% 60% / 0.2)"}` }}>
                {issue.type === "error" && <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "hsl(351 78% 65%)" }} />}
                {issue.type === "warning" && <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "hsl(40 90% 65%)" }} />}
                {issue.type === "info" && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "hsl(216 70% 68%)" }} />}
                <span style={{ color: issue.type === "error" ? "hsl(351 78% 72%)" : issue.type === "warning" ? "hsl(40 90% 72%)" : "hsl(216 70% 75%)" }}>
                  {issue.msg}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FULL ASSET MAPPER (editable repair tool) ─────────────────────────────
function AssetMapper({ storyId, events, sceneAssets }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | unresolved | mapped | unused
  const [pickerOpen, setPickerOpen] = useState(null); // event.id+field key
  const [pickerValue, setPickerValue] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [bulkSelected, setBulkSelected] = useState(new Set());
  const [bulkAssetKey, setBulkAssetKey] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [rescanning, setRescanning] = useState(false);

  const updateEvent = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GameEvent.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      setBusyId(null);
      setPickerOpen(null);
      setPickerValue("");
    },
  });

  const storyEvents = storyId ? events.filter(e => e.story_id === storyId) : events;
  const assetByKey = Object.fromEntries(sceneAssets.map(a => [a.key, a]));

  // Gather all image_key / background_key references from events
  const rows = [];
  storyEvents.forEach(ev => {
    [["image_key", ev.image_key], ["background_key", ev.background_key]]
      .filter(([, v]) => v)
      .forEach(([field, key]) => {
        rows.push({ evId: ev.id, eventId: ev.event_id, storyId: ev.story_id, field, key, asset: assetByKey[key] || null });
      });
  });

  const allRefKeys = new Set(rows.map(r => r.key));
  const unresolvedRows = rows.filter(r => !r.asset);
  const mappedRows = rows.filter(r => r.asset);
  const unusedAssets = sceneAssets.filter(a => !allRefKeys.has(a.key));

  // Apply search filter
  const displayRows = (() => {
    const base = filter === "unresolved" ? unresolvedRows
      : filter === "mapped" ? mappedRows
      : filter === "unused" ? unusedAssets.map(a => ({ evId: null, eventId: null, storyId: null, field: "asset", key: a.key, asset: a }))
      : rows;
    if (!search) return base;
    const q = search.toLowerCase();
    return base.filter(r => (r.eventId || r.key || "").toLowerCase().includes(q) || r.key?.toLowerCase().includes(q));
  })();

  const handleConnect = async (row, assetKey) => {
    if (!assetKey) return;
    setBusyId(row.evId + row.field);
    setStatusMsg("");
    await updateEvent.mutateAsync({ id: row.evId, data: { [row.field]: assetKey } });
    setStatusMsg(`✓ Connected ${row.field} on ${row.eventId} → ${assetKey}`);
  };

  const handleDisconnect = async (row) => {
    setBusyId(row.evId + row.field);
    setStatusMsg("");
    await updateEvent.mutateAsync({ id: row.evId, data: { [row.field]: "" } });
    setStatusMsg(`✓ Disconnected ${row.field} from ${row.eventId}`);
  };

  const handleAutoMatch = async () => {
    setStatusMsg("Auto-matching...");
    let count = 0;
    for (const row of unresolvedRows) {
      // Try exact key match first, then partial name match
      const best = sceneAssets.find(a => a.key === row.key)
        || sceneAssets.find(a => a.key?.toLowerCase().includes(row.key?.toLowerCase().split("_")[0]))
        || sceneAssets.find(a => row.key?.toLowerCase().includes(a.key?.toLowerCase().split("_")[0]));
      if (best) {
        await updateEvent.mutateAsync({ id: row.evId, data: { [row.field]: best.key } });
        count++;
      }
    }
    setStatusMsg(`Auto-match complete: ${count} connections made.`);
  };

  const handleBulkApply = async () => {
    if (!bulkAssetKey || bulkSelected.size === 0) return;
    setStatusMsg("Applying bulk mapping...");
    let count = 0;
    for (const rowKey of bulkSelected) {
      const row = unresolvedRows.find(r => r.evId + r.field === rowKey);
      if (row) { await updateEvent.mutateAsync({ id: row.evId, data: { [row.field]: bulkAssetKey } }); count++; }
    }
    setBulkSelected(new Set());
    setBulkAssetKey("");
    setStatusMsg(`✓ Bulk applied to ${count} rows.`);
  };

  const handleRescan = async () => {
    setRescanning(true);
    await qc.invalidateQueries({ queryKey: ["events"] });
    await qc.invalidateQueries({ queryKey: ["sceneAssets"] });
    setRescanning(false);
    setStatusMsg("✓ Rescanned — data refreshed from server.");
  };

  const FILTER_OPTS = [
    { v: "all", label: `All (${rows.length})` },
    { v: "unresolved", label: `Unresolved (${unresolvedRows.length})` },
    { v: "mapped", label: `Mapped (${mappedRows.length})` },
    { v: "unused", label: `Unused Assets (${unusedAssets.length})` },
  ];

  return (
    <div className="space-y-3">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-2 text-[9px]">
        <span className="px-2 py-0.5 rounded font-bold" style={{ background: "hsl(351 78% 60% / 0.15)", color: "hsl(351 78% 68%)" }}>{unresolvedRows.length} unresolved</span>
        <span className="px-2 py-0.5 rounded font-bold" style={{ background: "hsl(123 68% 50% / 0.15)", color: "hsl(123 68% 65%)" }}>{mappedRows.length} mapped</span>
        <span className="px-2 py-0.5 rounded font-bold" style={{ background: "hsl(40 90% 58% / 0.15)", color: "hsl(40 90% 68%)" }}>{unusedAssets.length} unused assets</span>
        <span className="px-2 py-0.5 rounded font-bold" style={{ background: "hsl(216 70% 60% / 0.15)", color: "hsl(216 70% 72%)" }}>{sceneAssets.length} total assets</span>
      </div>

      {/* Action toolbar */}
      <div className="flex flex-wrap gap-2">
        <button onClick={handleRescan} disabled={rescanning}
          className="flex items-center gap-1.5 text-[9px] px-3 py-1.5 rounded-lg font-bold transition-all"
          style={{ background: "hsl(216 70% 55% / 0.18)", color: "hsl(216 70% 72%)", border: "1px solid hsl(216 70% 55% / 0.35)" }}>
          {rescanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Re-Scan Assets
        </button>
        <button onClick={() => { setBulkSelected(new Set()); setFilter("all"); setSearch(""); setStatusMsg(""); }}
          className="flex items-center gap-1.5 text-[9px] px-3 py-1.5 rounded-lg font-bold"
          style={{ background: "hsl(252 12% 20%)", color: "hsl(252 8% 55%)", border: "1px solid hsl(252 10% 26%)" }}>
          Reset View
        </button>
        {unresolvedRows.length > 0 && (
          <button onClick={handleAutoMatch}
            className="flex items-center gap-1.5 text-[9px] px-3 py-1.5 rounded-lg font-bold"
            style={{ background: "hsl(271 87% 65% / 0.2)", color: "hsl(271 87% 78%)", border: "1px solid hsl(271 87% 65% / 0.4)" }}>
            <Search className="w-3 h-3" /> Auto-Match
          </button>
        )}
      </div>

      {statusMsg && (
        <div className="px-3 py-2 rounded-lg text-[9px] font-bold" style={{ background: "hsl(123 68% 50% / 0.1)", color: "hsl(123 68% 65%)", border: "1px solid hsl(123 68% 50% / 0.25)" }}>
          {statusMsg}
        </div>
      )}

      {/* Bulk apply bar */}
      {bulkSelected.size > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background: "hsl(271 87% 65% / 0.08)", border: "1px solid hsl(271 87% 65% / 0.3)" }}>
          <span className="text-[9px] font-bold" style={{ color: "hsl(271 87% 78%)" }}>{bulkSelected.size} selected</span>
          <select value={bulkAssetKey} onChange={e => setBulkAssetKey(e.target.value)}
            className="flex-1 h-7 text-[9px] rounded-lg px-2 border"
            style={{ background: "hsl(252 12% 18%)", borderColor: "hsl(252 10% 28%)", color: "hsl(40 25% 85%)" }}>
            <option value="">— pick asset to apply —</option>
            {sceneAssets.map(a => <option key={a.key} value={a.key}>{a.key}</option>)}
          </select>
          <button onClick={handleBulkApply} disabled={!bulkAssetKey}
            className="text-[9px] px-3 py-1.5 rounded-lg font-black"
            style={{ background: "hsl(271 87% 55%)", color: "white" }}>
            Apply Bulk
          </button>
          <button onClick={() => setBulkSelected(new Set())} className="text-[9px] px-2 py-1.5 rounded-lg" style={{ color: "hsl(252 8% 55%)" }}>Clear</button>
        </div>
      )}

      {/* Filters + search */}
      <div className="flex flex-wrap gap-1.5">
        {FILTER_OPTS.map(o => (
          <button key={o.v} onClick={() => setFilter(o.v)}
            className="text-[8px] px-2 py-1 rounded-full font-bold"
            style={{
              background: filter === o.v ? "hsl(271 87% 65% / 0.25)" : "hsl(252 12% 20%)",
              color: filter === o.v ? "hsl(271 87% 78%)" : "hsl(252 8% 55%)",
              border: `1px solid ${filter === o.v ? "hsl(271 87% 65% / 0.45)" : "hsl(252 10% 26%)"}`,
            }}>{o.label}</button>
        ))}
      </div>
      <div className="relative">
        <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search event ID, key, asset name..." className="pl-7 h-7 text-xs" />
      </div>

      {/* Preview lightbox */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)" }} onClick={() => setPreviewUrl(null)}>
          <img src={previewUrl} alt="preview" className="max-w-xs max-h-64 rounded-xl object-contain" />
          <p className="absolute bottom-8 text-xs text-white opacity-60">Tap to close</p>
        </div>
      )}

      {/* Row list */}
      <div className="space-y-1.5 max-h-[480px] overflow-y-auto">
        {filter === "unused" ? (
          unusedAssets.filter(a => !search || a.key?.toLowerCase().includes(search.toLowerCase())).map(a => (
            <div key={a.key} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "hsl(252 12% 16%)", border: "1px solid hsl(40 90% 58% / 0.25)" }}>
              {a.image_url
                ? <img src={a.image_url} alt="" className="w-8 h-8 rounded object-cover cursor-pointer shrink-0" onClick={() => setPreviewUrl(a.image_url)} />
                : <div className="w-8 h-8 rounded shrink-0" style={{ background: "hsl(252 12% 25%)" }} />}
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[9px] font-bold truncate" style={{ color: "hsl(40 90% 68%)" }}>{a.key}</p>
                <p className="text-[8px] text-muted-foreground truncate">{a.description || "(no description)"}</p>
              </div>
              {a.image_url && (
                <button onClick={() => setPreviewUrl(a.image_url)} className="text-[8px] px-2 py-1 rounded font-bold" style={{ background: "hsl(216 70% 55% / 0.18)", color: "hsl(216 70% 72%)" }}>Preview</button>
              )}
            </div>
          ))
        ) : (
          displayRows.map(row => {
            const rowKey = row.evId + row.field;
            const resolved = !!row.asset;
            const isOpen = pickerOpen === rowKey;
            const isBusy = busyId === rowKey;
            const isBulkChecked = bulkSelected.has(rowKey);

            return (
              <div key={rowKey} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${resolved ? "hsl(123 68% 50% / 0.2)" : "hsl(351 78% 60% / 0.35)"}` }}>
                <div className="flex items-center gap-2 px-3 py-2" style={{ background: resolved ? "hsl(252 12% 16%)" : "hsl(351 78% 60% / 0.07)" }}>
                  {/* Bulk checkbox (unresolved only) */}
                  {!resolved && (
                    <input type="checkbox" checked={isBulkChecked}
                      onChange={e => setBulkSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(rowKey) : n.delete(rowKey); return n; })}
                      className="w-3 h-3 shrink-0" />
                  )}

                  {/* Thumbnail */}
                  {row.asset?.image_url
                    ? <img src={row.asset.image_url} alt="" className="w-8 h-8 rounded object-cover cursor-pointer shrink-0" onClick={() => setPreviewUrl(row.asset.image_url)} />
                    : <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center text-[10px]" style={{ background: "hsl(252 12% 25%)", color: "hsl(351 78% 65%)" }}>?</div>
                  }

                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[9px] font-bold truncate" style={{ color: resolved ? "hsl(123 68% 65%)" : "hsl(351 78% 68%)" }}>{row.key}</p>
                    <p className="text-[8px] text-muted-foreground truncate">{row.eventId} · {row.field} · {row.storyId}</p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-1 shrink-0">
                    {row.asset?.image_url && (
                      <button onClick={() => setPreviewUrl(row.asset.image_url)} className="text-[7px] px-1.5 py-1 rounded font-bold" style={{ background: "hsl(216 70% 55% / 0.18)", color: "hsl(216 70% 72%)" }}>👁</button>
                    )}
                    <button onClick={() => { setPickerOpen(isOpen ? null : rowKey); setPickerValue(row.asset?.key || ""); }}
                      className="text-[7px] px-2 py-1 rounded font-bold"
                      style={{ background: "hsl(271 87% 65% / 0.18)", color: "hsl(271 87% 78%)" }}>
                      {resolved ? "Replace" : "Connect"}
                    </button>
                    {resolved && (
                      <button onClick={() => handleDisconnect(row)} disabled={isBusy}
                        className="text-[7px] px-2 py-1 rounded font-bold"
                        style={{ background: "hsl(351 78% 60% / 0.15)", color: "hsl(351 78% 68%)" }}>
                        {isBusy ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : "Disconnect"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline picker */}
                {isOpen && (
                  <div className="px-3 py-2 space-y-2" style={{ background: "hsl(252 12% 13%)", borderTop: "1px solid hsl(252 10% 20%)" }}>
                    <div className="flex gap-2">
                      <select value={pickerValue} onChange={e => setPickerValue(e.target.value)}
                        className="flex-1 h-7 text-[9px] rounded-lg px-2 border"
                        style={{ background: "hsl(252 12% 18%)", borderColor: "hsl(252 10% 28%)", color: "hsl(40 25% 85%)" }}>
                        <option value="">— choose an asset —</option>
                        {sceneAssets.map(a => <option key={a.key} value={a.key}>{a.key}{a.description ? ` · ${a.description.slice(0,30)}` : ""}</option>)}
                      </select>
                      {pickerValue && sceneAssets.find(a => a.key === pickerValue)?.image_url && (
                        <img src={sceneAssets.find(a => a.key === pickerValue).image_url} alt="" className="w-7 h-7 rounded object-cover cursor-pointer" onClick={() => setPreviewUrl(sceneAssets.find(a => a.key === pickerValue).image_url)} />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleConnect(row, pickerValue)} disabled={!pickerValue || isBusy}
                        className="text-[9px] px-3 py-1.5 rounded-lg font-black flex items-center gap-1"
                        style={{ background: "hsl(123 68% 45% / 0.85)", color: "white" }}>
                        {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Save Connection
                      </button>
                      <button onClick={() => setPickerOpen(null)} className="text-[9px] px-3 py-1.5 rounded-lg" style={{ color: "hsl(252 8% 55%)" }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        {displayRows.length === 0 && filter !== "unused" && (
          <p className="text-[10px] text-muted-foreground italic text-center py-6">
            {filter === "unresolved" ? "All keys are resolved! ✓" : filter === "mapped" ? "No mapped keys yet." : "No events with image keys found."}
          </p>
        )}
        {filter === "unused" && unusedAssets.length === 0 && (
          <p className="text-[10px] text-muted-foreground italic text-center py-6">No unused assets.</p>
        )}
      </div>
    </div>
  );
}

// ─── BRANCH SIMULATOR ─────────────────────────────────────────────────────
function BranchSimulator({ storyId, events, characters }) {
  const [selectedChar, setSelectedChar] = useState("");
  const [flags, setFlags] = useState({});
  const [fear, setFear] = useState(30);
  const [threat, setThreat] = useState(20);
  const [path, setPath] = useState([]);
  const [customFlag, setCustomFlag] = useState("");

  const storyEvents = storyId ? events.filter(e => e.story_id === storyId) : events;
  const startEvent = storyEvents.find(e => e.sort_order === 0) || storyEvents[0];
  const [currentEventId, setCurrentEventId] = useState(startEvent?.event_id || null);

  const currentEvent = storyEvents.find(e => e.event_id === currentEventId);
  const choices = (() => { try { return typeof currentEvent?.choices === "string" ? JSON.parse(currentEvent.choices) : (currentEvent?.choices || []); } catch { return []; } })();

  const resolveEffect = (eff) => {
    const e = typeof eff === "string" ? (() => { try { return JSON.parse(eff); } catch { return {}; } })() : (eff || {});
    const newFlags = { ...flags };
    (e.flagsAdded || []).forEach(f => { newFlags[f] = true; });
    setFlags(newFlags);
    setFear(f => Math.max(0, Math.min(100, f + (e.fearChange || 0))));
    setThreat(t => Math.max(0, Math.min(100, t + (e.threatChange || 0))));
    setPath(p => [...p, { eventId: currentEventId, outcomeText: e.outcomeText || "(no text)", fearChange: e.fearChange, flagsAdded: e.flagsAdded }]);
    if (e.nextEventId) setCurrentEventId(e.nextEventId);
  };

  const makeChoice = (choice, success) => {
    resolveEffect(success ? choice.successEffect : choice.failEffect);
  };

  const resetSim = () => {
    setPath([]);
    setFlags({});
    setFear(30);
    setThreat(20);
    setCurrentEventId(startEvent?.event_id || null);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="p-2 rounded-lg" style={{ background: "hsl(252 12% 16%)" }}>
          <p className="text-muted-foreground mb-1">Fear: {fear}</p>
          <input type="range" min={0} max={100} value={fear} onChange={e => setFear(+e.target.value)} className="w-full" />
        </div>
        <div className="p-2 rounded-lg" style={{ background: "hsl(252 12% 16%)" }}>
          <p className="text-muted-foreground mb-1">Threat: {threat}</p>
          <input type="range" min={0} max={100} value={threat} onChange={e => setThreat(+e.target.value)} className="w-full" />
        </div>
      </div>

      <div className="flex gap-2">
        <Input value={customFlag} onChange={e => setCustomFlag(e.target.value)} placeholder="Set a flag manually..." className="h-7 text-xs flex-1" />
        <Button size="sm" className="h-7 text-xs" onClick={() => { if (customFlag.trim()) { setFlags(f => ({ ...f, [customFlag.trim()]: true })); setCustomFlag(""); } }}>
          Set Flag
        </Button>
      </div>

      {Object.keys(flags).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {Object.keys(flags).map(f => (
            <span key={f} className="font-mono text-[8px] px-1.5 py-0.5 rounded" style={{ background: "hsl(123 68% 50% / 0.15)", color: "hsl(123 68% 65%)" }}>{f}</span>
          ))}
        </div>
      )}

      {currentEvent ? (
        <div className="space-y-3">
          <div className="p-3 rounded-xl" style={{ background: "hsl(252 12% 15%)", border: "1px solid hsl(252 10% 24%)" }}>
            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">{currentEvent.event_id}</p>
            <p className="text-xs leading-relaxed" style={{ color: "hsl(40 30% 88%)" }}>{currentEvent.text?.slice(0, 300)}</p>
            {currentEvent.is_ending && (
              <span className="inline-block mt-2 text-[8px] font-black px-2 py-0.5 rounded" style={{ background: "hsl(351 78% 60% / 0.2)", color: "hsl(351 78% 68%)" }}>
                ENDING — {currentEvent.ending_type?.toUpperCase()}
              </span>
            )}
          </div>

          {choices.length > 0 && (
            <div className="space-y-1">
              {choices.map((c, i) => (
                <div key={i} className="rounded-lg p-2 space-y-1" style={{ background: "hsl(252 12% 17%)", border: "1px solid hsl(252 10% 24%)" }}>
                  <p className="text-[10px] font-semibold">{c.text}</p>
                  <p className="text-[8px] text-muted-foreground">Stat: {c.statUsed} · Diff: {c.difficulty}</p>
                  <div className="flex gap-1">
                    <button onClick={() => makeChoice(c, true)} className="text-[8px] px-2 py-1 rounded font-bold" style={{ background: "hsl(123 68% 50% / 0.2)", color: "hsl(123 68% 65%)" }}>
                      ✓ Success path
                    </button>
                    <button onClick={() => makeChoice(c, false)} className="text-[8px] px-2 py-1 rounded font-bold" style={{ background: "hsl(351 78% 60% / 0.2)", color: "hsl(351 78% 65%)" }}>
                      ✗ Fail path
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={resetSim}>
              <RefreshCw className="w-3 h-3" /> Reset
            </Button>
            {path.length > 0 && <span className="text-[9px] text-muted-foreground self-center">{path.length} steps taken</span>}
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground italic">No events. Import story data first.</p>
      )}

      {path.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Run Path</p>
          {path.map((step, i) => (
            <div key={i} className="px-2 py-1.5 rounded-lg text-[9px]" style={{ background: "hsl(252 12% 15%)", border: "1px solid hsl(252 10% 22%)" }}>
              <span className="font-mono text-muted-foreground">Step {i+1}: {step.eventId}</span>
              {step.outcomeText && <p className="text-foreground/70 mt-0.5">→ {step.outcomeText.slice(0, 80)}</p>}
              {(step.fearChange || step.flagsAdded?.length) ? (
                <p className="text-muted-foreground/60 mt-0.5">
                  {step.fearChange ? `fear ${step.fearChange > 0 ? "+" : ""}${step.fearChange}` : ""}
                  {step.flagsAdded?.length ? ` · flags: ${step.flagsAdded.join(", ")}` : ""}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN STORY TOOLS PANEL ────────────────────────────────────────────────
const TOOLS = [
  { id: "graph", label: "Story Graph", icon: Share2 },
  { id: "roles", label: "Role Editor", icon: Users },
  { id: "flags", label: "Flag Registry", icon: Flag },
  { id: "dialogue", label: "Dialogue Workbench", icon: MessageSquare },
  { id: "continuity", label: "Continuity Checker", icon: ShieldAlert },
  { id: "assets", label: "Asset Mapper", icon: Image },
  { id: "simulator", label: "Branch Simulator", icon: GitBranch },
];

export default function StoryTools({ selectedStoryId }) {
  const [activeTool, setActiveTool] = useState("graph");
  const [activeStory, setActiveStory] = useState(selectedStoryId || null);

  const { data: stories = [] } = useQuery({ queryKey: ["stories"], queryFn: () => base44.entities.Story.list("sort_order") });
  const { data: events = [] } = useQuery({ queryKey: ["events"], queryFn: () => base44.entities.GameEvent.list("sort_order") });
  const { data: characters = [] } = useQuery({ queryKey: ["characters"], queryFn: () => base44.entities.Character.list("sort_order") });
  const { data: sceneAssets = [] } = useQuery({ queryKey: ["sceneAssets"], queryFn: () => base44.entities.SceneAsset.list() });

  return (
    <div className="space-y-4">
      {/* Story selector */}
      <div className="p-3 rounded-xl space-y-2" style={{ background: "hsl(252 12% 15%)", border: "1px solid hsl(252 10% 20%)" }}>
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Active Story</p>
        <StorySelector stories={stories} value={activeStory} onChange={setActiveStory} />
      </div>

      {/* Tool tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTool(t.id)}
            className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-xl font-bold transition-all"
            style={{
              background: activeTool === t.id ? "hsl(271 87% 65% / 0.22)" : "hsl(252 12% 17%)",
              color: activeTool === t.id ? "hsl(271 87% 78%)" : "hsl(252 8% 55%)",
              border: `1px solid ${activeTool === t.id ? "hsl(271 87% 65% / 0.45)" : "hsl(252 10% 24%)"}`,
            }}
          >
            <t.icon className="w-3 h-3" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tool content */}
      <div className="rounded-2xl p-4" style={{ background: "hsl(252 12% 13%)", border: "1px solid hsl(252 10% 20%)" }}>
        {activeTool === "graph" && <StoryGraphEditor events={events} storyId={activeStory} />}
        {activeTool === "roles" && <RoleAssignmentEditor storyId={activeStory} characters={characters} />}
        {activeTool === "flags" && <FlagRegistry storyId={activeStory} events={events} />}
        {activeTool === "dialogue" && <DialogueWorkbench storyId={activeStory} />}
        {activeTool === "continuity" && <ContinuityChecker storyId={activeStory} events={events} characters={characters} />}
        {activeTool === "assets" && <AssetMapper storyId={activeStory} events={events} sceneAssets={sceneAssets} />}
        {activeTool === "simulator" && <BranchSimulator storyId={activeStory} events={events} characters={characters} />}
      </div>
    </div>
  );
}