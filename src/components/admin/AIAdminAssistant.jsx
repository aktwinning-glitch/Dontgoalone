/**
 * Admin Story Operator — "Don't Go Alone"
 * Admin-only internal tool. Not shown to end users.
 * 7 modes: Inspect | Import | Validate | Repair | Rewrite | Map Assets | Simulate
 */
import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Search, Upload, ShieldCheck, Wrench, PenLine, Image, GitBranch,
  ChevronDown, ChevronUp, Check, X, RotateCcw, AlertTriangle,
  CheckCircle2, XCircle, Loader2, Save, Eye, Play, Cpu, Info
} from "lucide-react";

// ─── MODES ───────────────────────────────────────────────────────────────────
const MODES = [
  { id: "inspect",      label: "Inspect",      icon: Search,     color: "hsl(216 70% 60%)" },
  { id: "import",       label: "Import",       icon: Upload,     color: "hsl(271 87% 65%)" },
  { id: "validate",     label: "Validate",     icon: ShieldCheck,color: "hsl(123 68% 55%)" },
  { id: "repair",       label: "Repair",       icon: Wrench,     color: "hsl(40 90% 58%)"  },
  { id: "rewrite",      label: "Rewrite",      icon: PenLine,    color: "hsl(351 78% 60%)" },
  { id: "ending_audit", label: "Ending Audit", icon: Eye,        color: "hsl(351 78% 68%)" },
  { id: "phase_audit",  label: "Phase Audit",  icon: GitBranch,  color: "hsl(40 90% 58%)"  },
  { id: "cast_audit",   label: "Cast Audit",   icon: Cpu,        color: "hsl(186 72% 50%)" },
  { id: "patch",        label: "Patch",        icon: Save,       color: "hsl(123 68% 55%)" },
  { id: "assets",       label: "Map Assets",   icon: Image,      color: "hsl(186 72% 50%)" },
  { id: "simulate",     label: "Simulate",     icon: Play,       color: "hsl(40 90% 58%)"  },
];

const VALID_STATS = ["strength","speed","resilience","intelligence","fear","charm","influence"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function parseChoices(raw) {
  try { return typeof raw === "string" ? JSON.parse(raw) : (raw || []); } catch { return []; }
}
function parseConds(raw) {
  try { return typeof raw === "string" ? JSON.parse(raw) : (raw || {}); } catch { return {}; }
}
function safeEff(eff) {
  try { return typeof eff === "string" ? JSON.parse(eff) : (eff || {}); } catch { return {}; }
}
function severity(type) {
  if (type === "error")   return { bg: "hsl(351 78% 60% / 0.12)", border: "hsl(351 78% 55% / 0.4)", color: "hsl(351 78% 72%)", Icon: XCircle };
  if (type === "warning") return { bg: "hsl(40 90% 55% / 0.12)", border: "hsl(40 90% 55% / 0.4)", color: "hsl(40 90% 68%)", Icon: AlertTriangle };
  return { bg: "hsl(216 70% 55% / 0.10)", border: "hsl(216 70% 55% / 0.3)", color: "hsl(216 70% 70%)", Icon: Info };
}

// ─── DIFF ROW ─────────────────────────────────────────────────────────────────
function DiffRow({ label, before, after, onToggle, selected }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid hsl(252 10% 24%)" }}>
      <div className="flex items-center gap-2 px-3 py-2" style={{ background: "hsl(252 12% 16%)" }}>
        <input type="checkbox" checked={selected} onChange={onToggle} className="w-3.5 h-3.5 shrink-0" />
        <span className="text-[10px] font-bold flex-1" style={{ color: "hsl(271 87% 72%)" }}>{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-0 text-[9px] font-mono">
        <div className="p-2 border-r" style={{ borderColor: "hsl(252 10% 22%)", background: "hsl(351 78% 55% / 0.05)", color: "hsl(351 78% 70%)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
          — {String(before || "").slice(0, 300)}
        </div>
        <div className="p-2" style={{ background: "hsl(123 68% 50% / 0.05)", color: "hsl(123 68% 65%)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
          + {String(after || "").slice(0, 300)}
        </div>
      </div>
    </div>
  );
}

// ─── ISSUE ROW ────────────────────────────────────────────────────────────────
function IssueRow({ issue }) {
  const s = severity(issue.type);
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-lg text-[10px]"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}>
      <s.Icon className="w-3 h-3 shrink-0 mt-0.5" style={{ color: s.color }} />
      <div className="flex-1 min-w-0">
        <span style={{ color: s.color }}>{issue.msg}</span>
        {issue.fix && <p className="text-muted-foreground mt-0.5">Fix: {issue.fix}</p>}
      </div>
      {issue.eventId && <span className="font-mono text-[8px] text-muted-foreground/50 shrink-0">{issue.eventId}</span>}
    </div>
  );
}

// ─── STORY SELECTOR ───────────────────────────────────────────────────────────
function StoryPills({ stories, value, onChange }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      <button onClick={() => onChange(null)}
        className="text-[9px] px-2.5 py-1 rounded-full font-bold"
        style={{ background: !value ? "hsl(271 87% 65%/0.25)" : "hsl(252 12% 20%)", color: !value ? "hsl(271 87% 78%)" : "hsl(252 8% 52%)", border: `1px solid ${!value ? "hsl(271 87% 65%/0.45)" : "hsl(252 10% 26%)"}` }}>
        All
      </button>
      {stories.map(s => (
        <button key={s.story_id} onClick={() => onChange(s.story_id)}
          className="text-[9px] px-2.5 py-1 rounded-full font-bold"
          style={{ background: value === s.story_id ? "hsl(271 87% 65%/0.25)" : "hsl(252 12% 20%)", color: value === s.story_id ? "hsl(271 87% 78%)" : "hsl(252 8% 52%)", border: `1px solid ${value === s.story_id ? "hsl(271 87% 65%/0.45)" : "hsl(252 10% 26%)"}` }}>
          {s.title || s.story_id}
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODE: INSPECT
// ══════════════════════════════════════════════════════════════════════════════
function InspectMode({ events, stories, characters, sceneAssets, storyId, setStoryId, prefillQuestion, onQuestionConsumed }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");

  // Accept prefilled question from chat composer
  React.useEffect(() => {
    if (prefillQuestion) {
      setQuestion(prefillQuestion);
      onQuestionConsumed?.();
    }
  }, [prefillQuestion]);

  const scoped = storyId ? events.filter(e => e.story_id === storyId) : [];
  const story = stories.find(s => s.story_id === storyId);

  const buildContext = () => {
    const eventIdSet = new Set(scoped.map(e => e.event_id));
    const endings = scoped.filter(e => e.is_ending);
    const noChoiceNonEndings = scoped.filter(ev => parseChoices(ev.choices).length === 0 && !ev.is_ending);
    const brokenLinks = [];
    scoped.forEach(ev => {
      parseChoices(ev.choices).forEach(c => {
        [c.successEffect, c.failEffect].forEach(eff => {
          const e = safeEff(eff);
          if (e.nextEventId && !eventIdSet.has(e.nextEventId)) brokenLinks.push(`${ev.event_id}→${e.nextEventId}`);
        });
        if (c.nextEventId && !eventIdSet.has(c.nextEventId)) brokenLinks.push(`${ev.event_id}→${c.nextEventId}`);
      });
    });
    // Build event graph for continuity analysis
    const eventGraph = scoped.map(ev => {
      const choices = parseChoices(ev.choices);
      return {
        id: ev.event_id,
        night: ev.night || 1,
        sort_order: ev.sort_order || 0,
        text_preview: String(ev.text || "").slice(0, 90),
        image_key: ev.image_key || null,
        is_ending: !!ev.is_ending,
        ending_type: ev.ending_type || null,
        ending_text_preview: ev.ending_text ? String(ev.ending_text).slice(0, 80) : null,
        phase_label: ev.phase_label || null,
        choices: choices.map(c => ({
          text: String(c.text || "").slice(0, 60),
          stat: c.statUsed,
          difficulty: c.difficulty,
          success_next: safeEff(c.successEffect).nextEventId || c.nextEventId || null,
          fail_next: safeEff(c.failEffect).nextEventId || null,
        }))
      };
    }).sort((a, b) => a.sort_order - b.sort_order);
    const storyRecord = story || {};
    // Lightweight: only first 40 events in graph to avoid payload bloat
    const graphSlice = eventGraph.slice(0, 40);
    return {
      story_id: storyId,                                      // SINGLE story only
      title: storyRecord.title || storyId,
      act_structure: storyRecord.act_structure || null,
      phase_definitions: storyRecord.phase_definitions || null,
      map_background_key: storyRecord.map_background_key || null,
      total_events: scoped.length,
      endings: endings.map(e => ({ id: e.event_id, type: e.ending_type, text: String(e.ending_text || e.text || "").slice(0, 100) })),
      broken_links: brokenLinks.slice(0, 20),
      dead_ends: noChoiceNonEndings.map(e => e.event_id),
      nights: [...new Set(scoped.map(e => e.night || 1))].sort(),
      event_graph: graphSlice,           // capped, lightweight
    };
  };

  const run = async () => {
    if (!storyId) return;
    setLoading(true);
    const ctx = buildContext();
    const prompt = `You are a horror game story editor for "Don't Go Alone".
ANALYSE ONLY story_id "${storyId}" — never reference or mix in any other story's events, endings, or issues.

STORY CONTEXT (scoped to ${storyId} only):
${JSON.stringify(ctx, null, 2)}

${question ? `Admin question: ${question}` : "Provide a full structural inspection: continuity gaps, abrupt location/emotion jumps, missing bridge scenes, incomplete endings, wrong phase labels, cast-role leakage, missing assets."}

For each issue: source event, destination event, gap type, smallest patch needed.
For each ending check: reveal → final choice → consequence → ending_text → survivor resolution.

Return JSON:
{
  "summary": "2-3 sentence overview",
  "structure": { "total_events": N, "endings": [...], "nights": [...] },
  "strengths": ["..."],
  "issues": [{ "type": "error|warning|info", "msg": "...", "eventId": "...", "fix": "..." }],
  "continuity_gaps": [{ "from": "event_id", "to": "event_id", "gap_type": "location_jump|emotion_jump|missing_bridge|missing_regroup", "patch": "what scene to insert" }],
  "pacing_notes": ["..."],
  "role_safety_notes": ["..."],
  "next_steps": ["..."]
}`;
    const r = await base44.integrations.Core.InvokeLLM({ prompt, model: "claude_sonnet_4_6", response_json_schema: { type: "object", properties: { summary: { type: "string" }, structure: { type: "object" }, strengths: { type: "array", items: { type: "string" } }, issues: { type: "array", items: { type: "object" } }, continuity_gaps: { type: "array", items: { type: "object" } }, pacing_notes: { type: "array", items: { type: "string" } }, role_safety_notes: { type: "array", items: { type: "string" } }, next_steps: { type: "array", items: { type: "string" } } } } });
    setResult(r);
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      {!storyId && (
        <div className="px-3 py-3 rounded-xl text-center text-[10px] text-muted-foreground" style={{ background: "hsl(252 12% 15%)", border: "1px dashed hsl(252 10% 24%)" }}>
          Select a story above to inspect it.
        </div>
      )}
      <div className="flex gap-2">
        <Input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Optional: ask a specific question about this story..." className="h-8 text-xs flex-1" />
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Inspect
        </Button>
      </div>
      {result && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl text-xs leading-relaxed" style={{ background: "hsl(252 12% 16%)", border: "1px solid hsl(252 10% 22%)", color: "hsl(40 25% 85%)" }}>
            {result.summary}
          </div>
          {result.structure && (
            <div className="grid grid-cols-2 gap-2 text-[9px]">
              {Object.entries(result.structure).map(([k, v]) => (
                <div key={k} className="p-2 rounded-lg" style={{ background: "hsl(252 12% 16%)" }}>
                  <p className="text-muted-foreground uppercase tracking-wider mb-0.5">{k}</p>
                  <p style={{ color: "hsl(271 87% 72%)" }}>{Array.isArray(v) ? v.join(", ") : String(v)}</p>
                </div>
              ))}
            </div>
          )}
          {result.issues?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Issues</p>
              {result.issues.map((iss, i) => <IssueRow key={i} issue={iss} />)}
            </div>
          )}
          {result.strengths?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Strengths</p>
              {result.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-1.5 rounded-lg text-[10px]" style={{ background: "hsl(123 68% 50%/0.08)", border: "1px solid hsl(123 68% 50%/0.25)" }}>
                  <CheckCircle2 className="w-3 h-3 text-success shrink-0 mt-0.5" /><span style={{ color: "hsl(123 68% 68%)" }}>{s}</span>
                </div>
              ))}
            </div>
          )}
          {result.pacing_notes?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Pacing</p>
              {result.pacing_notes.map((n, i) => <IssueRow key={i} issue={{ type: "info", msg: n }} />)}
            </div>
          )}
          {result.continuity_gaps?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Continuity Gaps</p>
              {result.continuity_gaps.map((g, i) => (
                <div key={i} className="px-3 py-2 rounded-lg text-[10px] space-y-0.5" style={{ background: "hsl(40 90% 55%/0.08)", border: "1px solid hsl(40 90% 55%/0.3)" }}>
                  <div className="flex gap-2 items-center">
                    <span className="font-mono" style={{ color: "hsl(271 87% 70%)" }}>{g.from}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-mono" style={{ color: "hsl(271 87% 70%)" }}>{g.to}</span>
                    <span className="ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "hsl(40 90% 55%/0.2)", color: "hsl(40 90% 68%)" }}>{g.gap_type}</span>
                  </div>
                  {g.patch && <p className="text-muted-foreground">Patch: {g.patch}</p>}
                </div>
              ))}
            </div>
          )}
          {result.next_steps?.length > 0 && (
            <div className="p-3 rounded-xl space-y-1" style={{ background: "hsl(271 87% 65%/0.07)", border: "1px solid hsl(271 87% 65%/0.25)" }}>
              <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "hsl(271 87% 72%)" }}>Next Steps</p>
              {result.next_steps.map((s, i) => <p key={i} className="text-[10px]" style={{ color: "hsl(40 25% 78%)" }}>→ {s}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODE: IMPORT
// ══════════════════════════════════════════════════════════════════════════════
function ImportMode({ events, stories, characters, storyId }) {
  const qc = useQueryClient();
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [issues, setIssues] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState([]);
  const [phase, setPhase] = useState("paste"); // paste | inspect | confirm | done

  const tryParse = async () => {
    setParseError(null);
    setIssues([]);
    let json;
    try { json = JSON.parse(raw.trim()); } catch (e) { setParseError("Invalid JSON: " + e.message); return; }

    const found = [];
    const eventIdSet = new Set((json.events || []).map(e => e.event_id));
    const seenIds = new Set();

    // Validate events
    (json.events || []).forEach(ev => {
      if (!ev.event_id) found.push({ type: "error", msg: "Event missing event_id", eventId: "?" });
      if (seenIds.has(ev.event_id)) found.push({ type: "error", msg: `Duplicate event_id: ${ev.event_id}`, eventId: ev.event_id });
      seenIds.add(ev.event_id);
      parseChoices(ev.choices).forEach((c, ci) => {
        if (c.statUsed && !VALID_STATS.includes(c.statUsed)) found.push({ type: "error", msg: `Invalid statUsed "${c.statUsed}" in choice ${ci}`, eventId: ev.event_id });
        [c.successEffect, c.failEffect].forEach(eff => {
          const e = safeEff(eff);
          if (e.nextEventId && !eventIdSet.has(e.nextEventId)) found.push({ type: "error", msg: `Broken link → "${e.nextEventId}"`, eventId: ev.event_id, fix: `Add event "${e.nextEventId}" or fix this nextEventId` });
        });
        if (c.nextEventId && !eventIdSet.has(c.nextEventId)) found.push({ type: "error", msg: `Direct broken link → "${c.nextEventId}"`, eventId: ev.event_id });
      });
      if (ev.is_ending && !ev.ending_type) found.push({ type: "warning", msg: "Ending event missing ending_type", eventId: ev.event_id });
      if (ev.is_ending && !ev.ending_text && !ev.text) found.push({ type: "warning", msg: "Ending event has no text", eventId: ev.event_id });
    });

    // Check for ending coverage
    const endingTypes = (json.events || []).filter(e => e.is_ending).map(e => e.ending_type);
    if (!endingTypes.includes("good")) found.push({ type: "warning", msg: "No good ending found", fix: "Add at least one event with is_ending=true, ending_type=good" });
    if (!endingTypes.includes("bad")) found.push({ type: "warning", msg: "No bad ending found" });

    // Fixed-name leakage
    const charNames = characters.map(c => c.name.toLowerCase());
    (json.events || []).forEach(ev => {
      if (ev.text) {
        charNames.forEach(name => {
          if (ev.text.toLowerCase().includes(name)) found.push({ type: "info", msg: `Event text contains hardcoded name "${name}" — check if role-safe`, eventId: ev.event_id });
        });
      }
    });

    // story_id check
    const incomingId = json.story_id || json.events?.[0]?.story_id;
    const existingStory = stories.find(s => s.story_id === incomingId);
    if (existingStory) found.push({ type: "warning", msg: `Story "${incomingId}" already exists — import will overwrite events`, fix: "A snapshot will be created before import" });
    if (!incomingId) found.push({ type: "error", msg: "No story_id found in package", fix: "Add story_id to root of JSON or to first event" });

    // LLM deeper analysis
    const llmPrompt = `You are a horror game story editor for "Don't Go Alone".
Analyze this story import JSON for issues beyond basic validation.
Story data summary: events=${json.events?.length}, story_id=${incomingId}, endings=${endingTypes.join(",")}, broken_links_found=${found.filter(f=>f.type==="error").length}

Focus on:
- continuity gaps (location jumps without transition)
- branches that collapse too quickly  
- fixed-name dependency in role-safe stories
- intro narration mismatch
- weak escalation sections
- pacing issues

Return JSON: { "additional_issues": [{ "type": "warning|info", "msg": "...", "fix": "..." }], "import_plan": ["step 1", "step 2", ...] }`;
    
    try {
      const llmResult = await base44.integrations.Core.InvokeLLM({
        prompt: llmPrompt,
        response_json_schema: { type: "object", properties: { additional_issues: { type: "array", items: { type: "object" } }, import_plan: { type: "array", items: { type: "string" } } } }
      });
      if (llmResult.additional_issues) found.push(...llmResult.additional_issues);
      if (llmResult.import_plan) json._import_plan = llmResult.import_plan;
    } catch (_) {}

    setIssues(found);
    setParsed(json);
    setPhase("inspect");
  };

  const doImport = async () => {
    if (!parsed) return;
    setImporting(true);
    const log = [];
    const storyId = parsed.story_id || parsed.events?.[0]?.story_id;

    try {
      // Snapshot first
      if (storyId) {
        const existing = await base44.entities.GameEvent.filter({ story_id: storyId });
        if (existing.length > 0) {
          await base44.entities.StorySnapshot.create({
            story_id: storyId,
            label: `Pre-import backup — ${new Date().toLocaleString()}`,
            events_json: JSON.stringify(existing),
            event_count: existing.length,
          });
          log.push(`✓ Snapshot created (${existing.length} events backed up)`);
          for (const ev of existing) await base44.entities.GameEvent.delete(ev.id);
          log.push(`✓ Old events cleared`);
        }
      }

      // Import events
      if (parsed.events?.length) {
        for (const ev of parsed.events) await base44.entities.GameEvent.create(ev);
        log.push(`✓ Imported ${parsed.events.length} events`);
        qc.invalidateQueries({ queryKey: ["events"] });
      }

      // Import characters
      if (parsed.characters?.length) {
        for (const ch of parsed.characters) await base44.entities.Character.create(ch);
        log.push(`✓ Imported ${parsed.characters.length} characters`);
        qc.invalidateQueries({ queryKey: ["characters"] });
      }

      // Import stories
      if (parsed.stories?.length) {
        for (const s of parsed.stories) await base44.entities.Story.create(s);
        log.push(`✓ Imported ${parsed.stories.length} story records`);
        qc.invalidateQueries({ queryKey: ["stories"] });
      }

      // Auto-extract dialogue
      if (storyId && parsed.events?.length) {
        const existingDlg = await base44.entities.Dialogue.filter({ story_id: storyId });
        for (const d of existingDlg) await base44.entities.Dialogue.delete(d.id);
        const dlgRecords = [];
        parsed.events.forEach(ev => {
          if (ev.text) dlgRecords.push({ story_id: storyId, character_name: "Narrator", category: "general", line: String(ev.text).slice(0,1000), trigger_context: `event:${ev.event_id}`, act: ev.night ? `act_${Math.min(ev.night,4)}` : "any", sort_order: ev.sort_order || 0 });
          parseChoices(ev.choices).forEach(c => {
            [["success", c.successEffect], ["fail", c.failEffect]].forEach(([label, eff]) => {
              const e = safeEff(eff);
              if (e.outcomeText) dlgRecords.push({ story_id: storyId, character_name: e.speaker || "Narrator", category: label === "success" ? "general" : "tense", line: String(e.outcomeText).slice(0,1000), trigger_context: `after_choice_${label}`, act: ev.night ? `act_${Math.min(ev.night,4)}` : "any", sort_order: ev.sort_order || 0 });
            });
          });
          if (ev.is_ending && ev.ending_text) dlgRecords.push({ story_id: storyId, character_name: "Narrator", category: "ending", line: String(ev.ending_text).slice(0,1000), trigger_context: `ending:${ev.ending_type || "bad"}`, act: "any", sort_order: ev.sort_order || 0 });
        });
        for (let i = 0; i < dlgRecords.length; i += 20) {
          await Promise.all(dlgRecords.slice(i, i+20).map(r => base44.entities.Dialogue.create(r)));
        }
        log.push(`✓ Extracted ${dlgRecords.length} dialogue records`);
        qc.invalidateQueries({ queryKey: ["dialogue"] });
      }

      setImportLog(log);
      setPhase("done");
    } catch (e) {
      setImportLog([...log, `✗ Error: ${e.message}`]);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-3">
      {phase === "paste" && (
        <>
          <p className="text-[10px] text-muted-foreground">Paste story JSON package below. The assistant will inspect it before any import.</p>
          <Textarea value={raw} onChange={e => setRaw(e.target.value)} rows={10} className="text-xs font-mono" placeholder={'{\n  "story_id": "the_rental",\n  "events": [...],\n  "dialogue": [...]\n}'} />
          {parseError && <p className="text-[10px]" style={{ color: "hsl(351 78% 65%)" }}>{parseError}</p>}
          <Button size="sm" className="gap-1.5 text-xs" onClick={tryParse} disabled={!raw.trim()} style={{ background: "hsl(271 87% 52%)" }}>
            <Eye className="w-3.5 h-3.5" /> Inspect Before Import
          </Button>
        </>
      )}

      {phase === "inspect" && parsed && (
        <>
          <div className="p-3 rounded-xl" style={{ background: "hsl(252 12% 16%)", border: "1px solid hsl(252 10% 22%)" }}>
            <p className="text-xs font-bold mb-1">Package Summary</p>
            <div className="grid grid-cols-2 gap-1 text-[9px]">
              {[
                ["story_id", parsed.story_id || parsed.events?.[0]?.story_id || "unknown"],
                ["Events", parsed.events?.length || 0],
                ["Endings", (parsed.events||[]).filter(e=>e.is_ending).length],
                ["Characters", parsed.characters?.length || 0],
                ["Dialogue", parsed.dialogue?.length || 0],
                ["Errors", issues.filter(i=>i.type==="error").length],
                ["Warnings", issues.filter(i=>i.type==="warning").length],
              ].map(([k,v]) => (
                <div key={k} className="flex gap-1"><span className="text-muted-foreground">{k}:</span><span style={{ color: "hsl(271 87% 72%)" }}>{v}</span></div>
              ))}
            </div>
          </div>

          {parsed._import_plan && (
            <div className="p-3 rounded-xl space-y-1" style={{ background: "hsl(271 87% 65%/0.06)", border: "1px solid hsl(271 87% 65%/0.2)" }}>
              <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "hsl(271 87% 72%)" }}>Recommended Import Plan</p>
              {parsed._import_plan.map((s, i) => <p key={i} className="text-[10px]" style={{ color: "hsl(40 25% 78%)" }}>{i+1}. {s}</p>)}
            </div>
          )}

          {issues.length > 0 && (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Issues ({issues.length})</p>
              {issues.map((iss, i) => <IssueRow key={i} issue={iss} />)}
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => { setParsed(null); setPhase("paste"); }}>← Back</Button>
            {issues.filter(i=>i.type==="error").length === 0 ? (
              <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => setPhase("confirm")} style={{ background: "hsl(123 68% 40%)" }}>
                <Check className="w-3.5 h-3.5" /> Proceed to Import
              </Button>
            ) : (
              <Button size="sm" className="gap-1.5 text-xs h-8 opacity-60" onClick={() => setPhase("confirm")}>
                <AlertTriangle className="w-3.5 h-3.5" /> Import Anyway (errors exist)
              </Button>
            )}
          </div>
        </>
      )}

      {phase === "confirm" && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl space-y-2" style={{ background: "hsl(40 90% 55%/0.08)", border: "1.5px solid hsl(40 90% 55%/0.4)" }}>
            <p className="text-xs font-bold" style={{ color: "hsl(40 90% 68%)" }}>⚠ Confirm Import</p>
            <p className="text-[10px] text-muted-foreground">This will: delete existing events for this story, create a snapshot backup, import {parsed.events?.length} new events, extract dialogue records.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setPhase("inspect")}>← Back</Button>
            <Button size="sm" className="gap-1.5 text-xs h-8" onClick={doImport} disabled={importing} style={{ background: "hsl(123 68% 40%)" }}>
              {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Run Import
            </Button>
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="space-y-2">
          {importLog.map((l, i) => (
            <div key={i} className="text-[10px] px-3 py-1.5 rounded-lg font-mono" style={{ background: l.startsWith("✗") ? "hsl(351 78% 55%/0.1)" : "hsl(123 68% 50%/0.1)", color: l.startsWith("✗") ? "hsl(351 78% 68%)" : "hsl(123 68% 65%)" }}>{l}</div>
          ))}
          <Button size="sm" variant="outline" className="text-xs h-8 mt-2" onClick={() => { setRaw(""); setParsed(null); setIssues([]); setImportLog([]); setPhase("paste"); }}>Import Another</Button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODE: VALIDATE
// ══════════════════════════════════════════════════════════════════════════════
function ValidateMode({ events, stories, characters, sceneAssets, storyId, setStoryId }) {
  const [issues, setIssues] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = () => {
    setLoading(true);
    const scoped = storyId ? events.filter(e => e.story_id === storyId) : events;
    const eventIdSet = new Set(scoped.map(e => e.event_id));
    const assetKeySet = new Set(sceneAssets.map(a => a.key));
    const charNames = characters.map(c => c.name.toLowerCase());
    const found = [];
    const seenIds = new Set();

    scoped.forEach(ev => {
      // Duplicate IDs
      if (seenIds.has(ev.event_id)) found.push({ type: "error", msg: `Duplicate event_id: ${ev.event_id}`, eventId: ev.event_id });
      seenIds.add(ev.event_id);

      const choices = parseChoices(ev.choices);

      // Dead ends (no choices, not ending)
      if (choices.length === 0 && !ev.is_ending) found.push({ type: "error", msg: `Dead end: no choices and not marked as ending`, eventId: ev.event_id, fix: `Add choices or set is_ending=true` });

      choices.forEach((c, ci) => {
        // Invalid statUsed
        if (c.statUsed && !VALID_STATS.includes(c.statUsed)) found.push({ type: "error", msg: `Invalid statUsed "${c.statUsed}" (choice ${ci})`, eventId: ev.event_id, fix: `Use one of: ${VALID_STATS.join(", ")}` });

        [["success", c.successEffect], ["fail", c.failEffect]].forEach(([label, eff]) => {
          const e = safeEff(eff);
          if (e.nextEventId && !eventIdSet.has(e.nextEventId)) found.push({ type: "error", msg: `Broken link [${label}] → "${e.nextEventId}"`, eventId: ev.event_id, fix: `Create event "${e.nextEventId}" or fix the nextEventId` });
        });
        if (c.nextEventId && !eventIdSet.has(c.nextEventId)) found.push({ type: "error", msg: `Direct broken link → "${c.nextEventId}"`, eventId: ev.event_id });

        // Flag consistency
        const conds = parseConds(ev.conditions);
        (conds.flags || []).forEach(f => {
          const isSet = scoped.some(e2 => parseChoices(e2.choices).some(c2 => {
            const se = safeEff(c2.successEffect); const fe = safeEff(c2.failEffect);
            return (se.flagsAdded||[]).includes(f) || (fe.flagsAdded||[]).includes(f);
          }));
          if (!isSet) found.push({ type: "warning", msg: `Condition flag "${f}" is never set in any event`, eventId: ev.event_id });
        });
      });

      // Ending validation
      if (ev.is_ending && !ev.ending_type) found.push({ type: "warning", msg: `Ending missing ending_type`, eventId: ev.event_id });

      // Asset key resolution
      if (ev.image_key && !assetKeySet.has(ev.image_key)) found.push({ type: "warning", msg: `image_key "${ev.image_key}" not found in assets`, eventId: ev.event_id });
      if (ev.background_key && !assetKeySet.has(ev.background_key)) found.push({ type: "warning", msg: `background_key "${ev.background_key}" not found`, eventId: ev.event_id });

      // Fixed-name leakage
      charNames.forEach(name => {
        if (ev.text?.toLowerCase().includes(name)) found.push({ type: "info", msg: `Hardcoded name "${name}" in event text — verify role-safe`, eventId: ev.event_id });
      });
    });

    // Ending coverage per story
    const storiesInScope = storyId ? [storyId] : [...new Set(scoped.map(e => e.story_id))];
    storiesInScope.forEach(sid => {
      const stEvents = scoped.filter(e => e.story_id === sid);
      const endTypes = stEvents.filter(e => e.is_ending).map(e => e.ending_type);
      if (!endTypes.includes("good")) found.push({ type: "error", msg: `[${sid}] No good ending`, fix: "Add an event with is_ending=true, ending_type=good" });
      if (!endTypes.includes("bad")) found.push({ type: "error", msg: `[${sid}] No bad ending` });
    });

    // Unreachable events (BFS from sort_order=0 event)
    const storyStart = scoped.find(e => e.sort_order === 0 || scoped.indexOf(e) === 0);
    if (storyStart && storyId) {
      const reachable = new Set();
      const queue = [storyStart.event_id];
      while (queue.length) {
        const id = queue.shift();
        if (reachable.has(id)) continue;
        reachable.add(id);
        const ev = scoped.find(e => e.event_id === id);
        if (!ev) continue;
        parseChoices(ev.choices).forEach(c => {
          [safeEff(c.successEffect).nextEventId, safeEff(c.failEffect).nextEventId, c.nextEventId].filter(Boolean).forEach(nid => { if (!reachable.has(nid)) queue.push(nid); });
        });
      }
      scoped.forEach(ev => {
        if (!reachable.has(ev.event_id)) found.push({ type: "warning", msg: `Unreachable event (not connected from start)`, eventId: ev.event_id });
      });
    }

    setIssues(found);
    setLoading(false);
  };

  const errors = issues?.filter(i => i.type === "error") || [];
  const warnings = issues?.filter(i => i.type === "warning") || [];
  const infos = issues?.filter(i => i.type === "info") || [];

  return (
    <div className="space-y-3">
      <Button size="sm" className="gap-1.5 text-xs h-8" onClick={run} disabled={loading} style={{ background: "hsl(123 68% 40%)" }}>
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />} Run Full Validation
      </Button>
      {issues !== null && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {[["errors", errors.length, "hsl(351 78% 60%)"], ["warnings", warnings.length, "hsl(40 90% 58%)"], ["info", infos.length, "hsl(216 70% 60%)"]].map(([l, n, c]) => (
              <span key={l} className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${c}/0.15`, color: c }}>{n} {l}</span>
            ))}
            {issues.length === 0 && <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: "hsl(123 68% 50%/0.15)", color: "hsl(123 68% 65%)" }}>✓ Clean</span>}
          </div>
          <div className="space-y-1 max-h-[480px] overflow-y-auto">
            {issues.map((iss, i) => <IssueRow key={i} issue={iss} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODE: REPAIR
// ══════════════════════════════════════════════════════════════════════════════
function RepairMode({ events, stories, characters, storyId, setStoryId }) {
  const qc = useQueryClient();
  const [request, setRequest] = useState("");
  const [diff, setDiff] = useState(null);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState([]);

  const scoped = storyId ? events.filter(e => e.story_id === storyId) : events;

  const generateRepair = async () => {
    setLoading(true);
    setDiff(null);
    const prompt = `You are a horror game story repair tool for "Don't Go Alone".

Admin repair request: ${request}

Current story data (${storyId || "all stories"}):
- Total events: ${scoped.length}
- Story ID: ${storyId || "multiple"}
- Event IDs sample: ${scoped.slice(0,10).map(e=>e.event_id).join(", ")}
- Characters: ${characters.map(c=>c.name).join(", ")}

Generate specific, safe repairs. Return JSON:
{
  "repairs": [
    {
      "id": "unique_repair_id",
      "label": "Human-readable label",
      "type": "update_event|fix_link|update_dialogue",
      "eventId": "existing_event_id",
      "field": "field_name",
      "before": "current value (approximate)",
      "after": "proposed new value",
      "reason": "why this repair is needed"
    }
  ],
  "summary": "Brief explanation of proposed repairs"
}

RULES:
- Do not rename internal story IDs
- Do not invent event IDs not in the existing list unless type is create_event
- For text changes, keep horror tone, atmospheric, tense
- Mark character name substitutions explicitly
- Keep all proposed values under 500 chars for preview`;

    const r = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: { type: "object", properties: { repairs: { type: "array", items: { type: "object" } }, summary: { type: "string" } } }
    });
    setDiff(r);
    const sel = {};
    (r.repairs || []).forEach((rep, i) => { sel[i] = true; });
    setSelected(sel);
    setLoading(false);
  };

  const applySelected = async () => {
    if (!diff) return;
    setApplying(true);
    const log = [];
    const toApply = diff.repairs.filter((_, i) => selected[i]);

    // Snapshot first
    if (storyId) {
      try {
        await base44.entities.StorySnapshot.create({ story_id: storyId, label: `Pre-repair — ${new Date().toLocaleString()}`, events_json: JSON.stringify(scoped), event_count: scoped.length });
        log.push("✓ Snapshot created");
      } catch (_) {}
    }

    for (const rep of toApply) {
      try {
        if (rep.type === "create_event" && rep.new_event) {
          await base44.entities.GameEvent.create({ ...rep.new_event, story_id: rep.new_event.story_id || storyId });
          log.push(`✓ Created event ${rep.new_event.event_id}`);
        } else if ((rep.type === "update_event" || rep.type === "fix_link" || rep.type === "update_dialogue") && rep.eventId) {
          const ev = events.find(e => e.event_id === rep.eventId);
          if (ev) {
            await base44.entities.GameEvent.update(ev.id, { [rep.field]: rep.after });
            log.push(`✓ Updated ${rep.eventId}.${rep.field}`);
          } else {
            log.push(`⚠ Event ${rep.eventId} not found — skipped`);
          }
        } else if (rep.type === "update_story" && storyId) {
          const st = stories.find(s => s.story_id === storyId);
          if (st) {
            await base44.entities.Story.update(st.id, { [rep.field]: rep.after });
            log.push(`✓ Updated story.${rep.field}`);
            qc.invalidateQueries({ queryKey: ["stories"] });
          }
        }
        qc.invalidateQueries({ queryKey: ["events"] });
      } catch (e) {
        log.push(`✗ Failed ${rep.label}: ${e.message}`);
      }
    }
    setApplied(log);
    setApplying(false);
  };

  return (
    <div className="space-y-3">
      <Textarea value={request} onChange={e => setRequest(e.target.value)} rows={3} className="text-xs" placeholder='Describe what to repair: "Fix dead characters still speaking", "Make the basement death scene more physical", "Convert fixed-name events to runtime role references"...' />
      <Button size="sm" className="gap-1.5 text-xs h-8" onClick={generateRepair} disabled={loading || !request.trim()} style={{ background: "hsl(40 90% 45%)" }}>
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />} Generate Repair Plan
      </Button>

      {diff && (
        <div className="space-y-3">
          <p className="text-[10px] text-muted-foreground">{diff.summary}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">DIFF PREVIEW — select repairs to apply</p>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {(diff.repairs || []).map((rep, i) => (
              <DiffRow key={i} label={rep.label} before={rep.before} after={rep.after}
                selected={!!selected[i]} onToggle={() => setSelected(s => ({ ...s, [i]: !s[i] }))} />
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="gap-1.5 text-xs h-8" onClick={applySelected} disabled={applying || Object.values(selected).every(v => !v)} style={{ background: "hsl(123 68% 40%)" }}>
              {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Apply Selected
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setSelected(Object.fromEntries(Object.keys(selected).map(k => [k, true])))}>Select All</Button>
            <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setSelected(Object.fromEntries(Object.keys(selected).map(k => [k, false])))}>None</Button>
          </div>
          {applied.length > 0 && (
            <div className="space-y-1">
              {applied.map((l, i) => <div key={i} className="text-[10px] font-mono px-3 py-1 rounded" style={{ background: l.startsWith("✗") ? "hsl(351 78%/0.1)" : "hsl(123 68%/0.1)", color: l.startsWith("✗") ? "hsl(351 78% 68%)" : "hsl(123 68% 65%)" }}>{l}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODE: ENDING AUDIT
// ══════════════════════════════════════════════════════════════════════════════
function EndingAuditMode({ events, stories, storyId, setStoryId }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const scoped = storyId ? events.filter(e => e.story_id === storyId) : events;
  const endings = scoped.filter(e => e.is_ending);

  const run = async () => {
    setLoading(true);
    const endingData = endings.map(ev => ({
      event_id: ev.event_id,
      ending_type: ev.ending_type,
      text_preview: String(ev.text || "").slice(0, 200),
      ending_text: ev.ending_text || null,
      choices: parseChoices(ev.choices).map(c => String(c.text || "").slice(0, 80)),
      sort_order: ev.sort_order,
    }));
    // Find events that lead into endings
    const endingIds = new Set(endings.map(e => e.event_id));
    const preEnding = scoped.filter(ev =>
      parseChoices(ev.choices).some(c => {
        const sn = safeEff(c.successEffect).nextEventId || c.nextEventId;
        const fn = safeEff(c.failEffect).nextEventId;
        return endingIds.has(sn) || endingIds.has(fn);
      })
    ).map(ev => ({ event_id: ev.event_id, text_preview: String(ev.text || "").slice(0, 100) }));

    const prompt = `You are a horror story ending reviewer for "Don't Go Alone".
Analyse ONLY story_id "${storyId || "all"}" endings. Do NOT reference other stories.

Endings in this story:
${JSON.stringify(endingData, null, 2)}

Events directly before endings:
${JSON.stringify(preEnding, null, 2)}

For each ending, check all 5 required steps:
1. reveal or confrontation scene present
2. final player action/choice
3. consequence/outcome text
4. ending_text (payoff)
5. survivor state resolution

Also flag:
- reveal-only endings (confrontation without resolution)
- endings that cut off too abruptly
- endings missing final choice
- endings missing survivor outcome
- endings where the pre-ending event reads like the real ending (ending started too late)

Return JSON:
{
  "ending_reports": [
    {
      "event_id": "...",
      "ending_type": "good|bad|mixed",
      "steps_present": ["reveal", "final_choice", "consequence", "ending_text", "survivor_resolution"],
      "steps_missing": [...],
      "verdict": "complete|incomplete|reveal_only|abrupt_cutoff",
      "issue": "description of the problem",
      "fix": "smallest patch to fix it"
    }
  ],
  "summary": "overall ending quality"
}`;
    const r = await base44.integrations.Core.InvokeLLM({ prompt, model: "claude_sonnet_4_6", response_json_schema: { type: "object", properties: { ending_reports: { type: "array", items: { type: "object" } }, summary: { type: "string" } } } });
    setResult(r);
    setLoading(false);
  };

  const VERDICT_STYLE = {
    complete: { color: "hsl(123 68% 65%)", bg: "hsl(123 68% 50%/0.08)", border: "hsl(123 68% 50%/0.25)" },
    incomplete: { color: "hsl(40 90% 68%)", bg: "hsl(40 90% 55%/0.08)", border: "hsl(40 90% 55%/0.3)" },
    reveal_only: { color: "hsl(351 78% 68%)", bg: "hsl(351 78% 55%/0.1)", border: "hsl(351 78% 55%/0.35)" },
    abrupt_cutoff: { color: "hsl(351 78% 72%)", bg: "hsl(351 78% 55%/0.12)", border: "hsl(351 78% 55%/0.45)" },
  };

  return (
    <div className="space-y-3">
      {!storyId && <p className="text-[10px] text-muted-foreground">Select a specific story for a scoped ending audit.</p>}
      <div className="text-[9px] text-muted-foreground">{endings.length} ending event{endings.length !== 1 ? "s" : ""} found in scope.</div>
      <Button size="sm" className="gap-1.5 text-xs h-8" onClick={run} disabled={loading || endings.length === 0} style={{ background: "hsl(351 78% 42%)" }}>
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />} Run Ending Audit
      </Button>
      {result && (
        <div className="space-y-3">
          <p className="text-[10px] text-muted-foreground">{result.summary}</p>
          {(result.ending_reports || []).map((rep, i) => {
            const vs = VERDICT_STYLE[rep.verdict] || VERDICT_STYLE.incomplete;
            return (
              <div key={i} className="rounded-xl p-3 space-y-2" style={{ background: vs.bg, border: `1.5px solid ${vs.border}` }}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] font-bold" style={{ color: "hsl(271 87% 70%)" }}>{rep.event_id}</span>
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${vs.color}/0.2`, color: vs.color }}>{rep.ending_type?.toUpperCase()}</span>
                  <span className="ml-auto text-[8px] font-black uppercase tracking-wider" style={{ color: vs.color }}>{rep.verdict?.replace("_", " ")}</span>
                </div>
                {rep.steps_present?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {rep.steps_present.map(s => <span key={s} className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{ background: "hsl(123 68% 50%/0.15)", color: "hsl(123 68% 65%)" }}>✓ {s}</span>)}
                    {(rep.steps_missing || []).map(s => <span key={s} className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{ background: "hsl(351 78% 55%/0.15)", color: "hsl(351 78% 68%)" }}>✗ {s}</span>)}
                  </div>
                )}
                {rep.issue && <p className="text-[10px]" style={{ color: vs.color }}>{rep.issue}</p>}
                {rep.fix && <p className="text-[9px] text-muted-foreground">Fix: {rep.fix}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODE: PHASE AUDIT
// ══════════════════════════════════════════════════════════════════════════════
function PhaseAuditMode({ events, stories, storyId, setStoryId }) {
  const qc = useQueryClient();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState([]);

  const scoped = storyId ? events.filter(e => e.story_id === storyId) : events;
  const story = stories.find(s => s.story_id === storyId);

  const run = async () => {
    setLoading(true);
    const eventSample = scoped.slice(0, 60).map(ev => ({
      event_id: ev.event_id,
      sort_order: ev.sort_order || 0,
      night: ev.night || 1,
      phase_label: ev.phase_label || null,
      text_preview: String(ev.text || "").slice(0, 100),
    }));
    const prompt = `You are a phase label auditor for horror game "Don't Go Alone".
Analyse ONLY story "${storyId}" — do NOT reference other stories.

Story title: ${story?.title || storyId}
Story act_structure: ${story?.act_structure || "(not set)"}
Story phase_definitions: ${story?.phase_definitions || "(not set — may be using Rental defaults)"}

Event sample with current phase labels:
${JSON.stringify(eventSample, null, 2)}

Check for:
- Phase labels from The Rental being used verbatim in non-Rental stories
- Temporal mismatches (e.g. event says "By sunrise" but label says "Late Afternoon")
- Night 1 events showing Act 3/4 labels
- Correct act-to-phase mapping for THIS specific story
- Events needing per-event phase_label overrides
- Whether phase_definitions should be set on the Story record

Return JSON:
{
  "verdict": "ok|needs_fixes",
  "summary": "...",
  "mismatches": [
    { "event_id": "...", "current_label": "...", "recommended_label": "...", "reason": "..." }
  ],
  "recommended_phase_definitions": "JSON string of phase array for this story, or null if ok",
  "notes": ["..."]
}`;
    const r = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: { type: "object", properties: { verdict: { type: "string" }, summary: { type: "string" }, mismatches: { type: "array", items: { type: "object" } }, recommended_phase_definitions: { type: "string" }, notes: { type: "array", items: { type: "string" } } } } });
    setResult(r);
    setLoading(false);
  };

  const applyPhaseDefs = async () => {
    if (!result?.recommended_phase_definitions || !storyId) return;
    setApplying(true);
    try {
      const st = stories.find(s => s.story_id === storyId);
      if (st) {
        await base44.entities.Story.update(st.id, { phase_definitions: result.recommended_phase_definitions });
        qc.invalidateQueries({ queryKey: ["stories"] });
        setApplied(["✓ phase_definitions updated on Story record"]);
      }
    } catch (e) { setApplied([`✗ ${e.message}`]); }
    setApplying(false);
  };

  return (
    <div className="space-y-3">
      {!storyId && <p className="text-[10px] text-muted-foreground">Select a specific story for a phase label audit.</p>}
      <Button size="sm" className="gap-1.5 text-xs h-8" onClick={run} disabled={loading || !storyId} style={{ background: "hsl(40 90% 45%)" }}>
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitBranch className="w-3.5 h-3.5" />} Run Phase Audit
      </Button>
      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: result.verdict === "ok" ? "hsl(123 68% 50%/0.15)" : "hsl(40 90% 55%/0.15)", color: result.verdict === "ok" ? "hsl(123 68% 65%)" : "hsl(40 90% 68%)" }}>{result.verdict?.toUpperCase()}</span>
            <p className="text-[10px] text-muted-foreground flex-1">{result.summary}</p>
          </div>
          {result.mismatches?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Label Mismatches ({result.mismatches.length})</p>
              {result.mismatches.map((m, i) => (
                <div key={i} className="px-3 py-2 rounded-lg text-[10px] space-y-0.5" style={{ background: "hsl(40 90% 55%/0.07)", border: "1px solid hsl(40 90% 55%/0.25)" }}>
                  <div className="flex gap-2">
                    <span className="font-mono" style={{ color: "hsl(271 87% 70%)" }}>{m.event_id}</span>
                    <span className="text-muted-foreground line-through text-[9px]">{m.current_label || "(none)"}</span>
                    <span>→</span>
                    <span style={{ color: "hsl(123 68% 65%)" }}>{m.recommended_label}</span>
                  </div>
                  {m.reason && <p className="text-muted-foreground">{m.reason}</p>}
                </div>
              ))}
            </div>
          )}
          {result.recommended_phase_definitions && (
            <div className="space-y-2">
              <div className="p-2 rounded-lg text-[9px] font-mono" style={{ background: "hsl(252 12% 15%)", border: "1px solid hsl(252 10% 22%)", color: "hsl(123 68% 65%)", whiteSpace: "pre-wrap", maxHeight: 120, overflow: "auto" }}>
                {result.recommended_phase_definitions.slice(0, 400)}
              </div>
              <Button size="sm" className="gap-1.5 text-xs h-8" onClick={applyPhaseDefs} disabled={applying} style={{ background: "hsl(123 68% 38%)" }}>
                {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Apply Phase Definitions to Story
              </Button>
              {applied.map((l, i) => <div key={i} className="text-[10px] font-mono" style={{ color: l.startsWith("✗") ? "hsl(351 78% 68%)" : "hsl(123 68% 65%)" }}>{l}</div>)}
            </div>
          )}
          {result.notes?.map((n, i) => <IssueRow key={i} issue={{ type: "info", msg: n }} />)}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODE: CAST AUDIT
// ══════════════════════════════════════════════════════════════════════════════
function CastAuditMode({ events, stories, characters, storyId, setStoryId }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const scoped = storyId ? events.filter(e => e.story_id === storyId) : events;

  const run = async () => {
    setLoading(true);
    const charNames = characters.map(c => c.name);
    const eventSample = scoped.map(ev => ({
      event_id: ev.event_id,
      sort_order: ev.sort_order || 0,
      text_snippet: String(ev.text || "").slice(0, 200),
      choices: parseChoices(ev.choices).map(c => ({
        text: String(c.text || "").slice(0, 80),
        outcome: String(safeEff(c.successEffect).outcomeText || "").slice(0, 80),
      }))
    }));
    const prompt = `You are a cast-safety auditor for horror game "Don't Go Alone".
Analyse ONLY story "${storyId || "all"}" — do NOT reference other stories.

Known character names (shared cast — randomized at runtime):
${charNames.join(", ")}

Event texts to audit:
${JSON.stringify(eventSample, null, 2)}

Detect:
1. Fixed hardcoded character names used in event text (should use role references)
2. Dead/missing characters still speaking or being referenced positively later
3. Characters referenced in events who may not be in the player's cast for this run
4. Pronoun inconsistency (she/he/they) if character is role-randomized
5. Choice text that assumes a specific named character is present
6. Narrator or outcome text that names specific characters who could be dead

Return JSON:
{
  "summary": "overall cast safety status",
  "leakage_issues": [
    {
      "event_id": "...",
      "type": "fixed_name|dead_speaker|guaranteed_presence|pronoun_inconsistency",
      "character_name": "...",
      "text_excerpt": "...",
      "fix": "exact recommended text change or approach"
    }
  ],
  "safe_events_count": N,
  "notes": ["..."]
}`;
    const r = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: { type: "object", properties: { summary: { type: "string" }, leakage_issues: { type: "array", items: { type: "object" } }, safe_events_count: { type: "number" }, notes: { type: "array", items: { type: "string" } } } } });
    setResult(r);
    setLoading(false);
  };

  const LEAK_COLORS = {
    fixed_name: "hsl(351 78% 68%)",
    dead_speaker: "hsl(40 90% 68%)",
    guaranteed_presence: "hsl(40 90% 60%)",
    pronoun_inconsistency: "hsl(216 70% 65%)",
  };

  return (
    <div className="space-y-3">
      <Button size="sm" className="gap-1.5 text-xs h-8" onClick={run} disabled={loading} style={{ background: "hsl(186 72% 38%)" }}>
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />} Run Cast Audit
      </Button>
      {result && (
        <div className="space-y-3">
          <div className="flex gap-3 items-center">
            <p className="text-[10px] text-muted-foreground flex-1">{result.summary}</p>
            {result.safe_events_count != null && (
              <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: "hsl(123 68% 50%/0.15)", color: "hsl(123 68% 65%)" }}>{result.safe_events_count} safe</span>
            )}
          </div>
          {result.leakage_issues?.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Leakage Issues ({result.leakage_issues.length})</p>
              {result.leakage_issues.map((iss, i) => {
                const c = LEAK_COLORS[iss.type] || "hsl(40 90% 68%)";
                return (
                  <div key={i} className="px-3 py-2 rounded-lg text-[10px] space-y-1" style={{ background: `${c}/0.07`, border: `1px solid ${c}/0.3` }}>
                    <div className="flex gap-2 items-center">
                      <span className="font-mono" style={{ color: "hsl(271 87% 70%)" }}>{iss.event_id}</span>
                      <span className="font-bold" style={{ color: c }}>{iss.character_name}</span>
                      <span className="text-[8px] ml-auto px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${c}/0.15`, color: c }}>{iss.type?.replace("_", " ")}</span>
                    </div>
                    {iss.text_excerpt && <p className="text-muted-foreground italic">"{iss.text_excerpt}"</p>}
                    {iss.fix && <p style={{ color: "hsl(123 68% 62%)" }}>Fix: {iss.fix}</p>}
                  </div>
                );
              })}
            </div>
          ) : <IssueRow issue={{ type: "info", msg: "No cast leakage detected." }} />}
          {result.notes?.map((n, i) => <IssueRow key={i} issue={{ type: "info", msg: n }} />)}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODE: PATCH (write + insert a new scene directly)
// ══════════════════════════════════════════════════════════════════════════════
function PatchMode({ events, stories, storyId, setStoryId }) {
  const qc = useQueryClient();
  const [patchType, setPatchType] = useState("bridge");
  const [fromEventId, setFromEventId] = useState("");
  const [toEventId, setToEventId] = useState("");
  const [instruction, setInstruction] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const scoped = storyId ? events.filter(e => e.story_id === storyId) : events;
  const fromEvent = scoped.find(e => e.event_id === fromEventId);
  const toEvent = scoped.find(e => e.event_id === toEventId);

  const PATCH_TYPES = [
    { id: "bridge", label: "Bridge Scene", desc: "Transition between two locations/moments" },
    { id: "regroup", label: "Regroup Scene", desc: "Party reassembles after a split/trauma" },
    { id: "clue_bridge", label: "Clue Bridge", desc: "Connect a clue discovery to the next objective" },
    { id: "confrontation", label: "Confrontation", desc: "Add a final confrontation before an ending" },
    { id: "ending", label: "Full Ending", desc: "Write a complete ending event" },
  ];

  const generate = async () => {
    if (!storyId || !fromEventId) return;
    setLoading(true);
    setPreview(null);
    const story = stories.find(s => s.story_id === storyId);
    const prompt = `You are a horror story scene writer for "Don't Go Alone".
Write a new ${patchType} scene for story "${storyId}" (${story?.title || storyId}).

This scene will be inserted BETWEEN:
FROM: ${fromEvent?.event_id || "(start)"} — "${String(fromEvent?.text || "").slice(0, 120)}"
TO: ${toEvent?.event_id || "(end of story)"} — "${String(toEvent?.text || "").slice(0, 120)}"

Patch type: ${patchType}
Admin notes: ${instruction || "(none)"}

Rules:
- Keep horror/atmospheric tone matching the story
- Use role-safe language ("one of your group", "the person beside you" not hardcoded names)
- The new event must connect FROM → new event → TO via nextEventId
- Include 2 meaningful choices with statUsed, difficulty, successEffect, failEffect
- successEffect and failEffect must each have outcomeText and nextEventId pointing to "${toEventId || "(next_event_id)"}"
- Assign a sort_order between the FROM and TO events
- Assign a unique event_id like "${storyId}_patch_${patchType}_${Date.now().toString(36)}"

Return JSON (the full GameEvent record ready to insert):
{
  "event_id": "...",
  "story_id": "${storyId}",
  "text": "full scene text (150-250 words)",
  "night": ${fromEvent?.night || 1},
  "sort_order": ${fromEvent?.sort_order != null ? (fromEvent.sort_order + 0.5) : 99},
  "is_ending": false,
  "choices": [
    {
      "text": "choice text",
      "statUsed": "strength|speed|resilience|intelligence|charm|influence",
      "difficulty": 5,
      "successEffect": { "outcomeText": "...", "fearChange": -5, "threatChange": 0, "nextEventId": "${toEventId || "next_event_id"}" },
      "failEffect": { "outcomeText": "...", "fearChange": 12, "threatChange": 8, "nextEventId": "${toEventId || "next_event_id"}" }
    }
  ]
}`;
    const r = await base44.integrations.Core.InvokeLLM({ prompt, model: "claude_sonnet_4_6", response_json_schema: { type: "object", properties: { event_id: { type: "string" }, story_id: { type: "string" }, text: { type: "string" }, night: { type: "number" }, sort_order: { type: "number" }, is_ending: { type: "boolean" }, choices: { type: "array", items: { type: "object" } } } } });
    // Stringify choices for storage
    setPreview({ ...r, choices: JSON.stringify(r.choices || []) });
    setLoading(false);
  };

  const save = async () => {
    if (!preview) return;
    setSaving(true);
    await base44.entities.GameEvent.create(preview);
    qc.invalidateQueries({ queryKey: ["events"] });
    setSaved(true);
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      {!storyId && <p className="text-[10px] text-muted-foreground">Select a specific story to write a patch scene.</p>}
      {storyId && (
        <>
          <div className="flex gap-1.5 flex-wrap">
            {PATCH_TYPES.map(pt => (
              <button key={pt.id} onClick={() => setPatchType(pt.id)}
                className="text-[9px] px-2.5 py-1 rounded-full font-bold"
                style={{ background: patchType === pt.id ? "hsl(123 68% 50%/0.2)" : "hsl(252 12% 20%)", color: patchType === pt.id ? "hsl(123 68% 65%)" : "hsl(252 8% 52%)", border: `1px solid ${patchType === pt.id ? "hsl(123 68% 50%/0.45)" : "hsl(252 10% 26%)"}` }}>
                {pt.label}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-muted-foreground">{PATCH_TYPES.find(p => p.id === patchType)?.desc}</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] text-muted-foreground mb-1">FROM event</p>
              <select value={fromEventId} onChange={e => setFromEventId(e.target.value)} className="w-full h-8 rounded-lg text-[10px] px-2 bg-card border" style={{ borderColor: "hsl(252 10% 22%)" }}>
                <option value="">— pick event —</option>
                {scoped.map(ev => <option key={ev.event_id} value={ev.event_id}>{ev.event_id}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground mb-1">TO event (next after patch)</p>
              <select value={toEventId} onChange={e => setToEventId(e.target.value)} className="w-full h-8 rounded-lg text-[10px] px-2 bg-card border" style={{ borderColor: "hsl(252 10% 22%)" }}>
                <option value="">— pick event —</option>
                {scoped.map(ev => <option key={ev.event_id} value={ev.event_id}>{ev.event_id}</option>)}
              </select>
            </div>
          </div>
          <Textarea value={instruction} onChange={e => setInstruction(e.target.value)} rows={2} className="text-xs" placeholder="Optional notes: tone, specific details, character focus..." />
          <Button size="sm" className="gap-1.5 text-xs h-8" onClick={generate} disabled={loading || !fromEventId} style={{ background: "hsl(123 68% 38%)" }}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Generate Patch Scene
          </Button>
          {preview && !saved && (
            <div className="space-y-2">
              <div className="p-3 rounded-xl text-[10px] space-y-2" style={{ background: "hsl(252 12% 16%)", border: "1px solid hsl(123 68% 50%/0.3)" }}>
                <div className="flex gap-2">
                  <span className="font-mono font-bold" style={{ color: "hsl(271 87% 70%)" }}>{preview.event_id}</span>
                  <span className="text-muted-foreground">night {preview.night} · sort {preview.sort_order}</span>
                </div>
                <p className="leading-relaxed" style={{ color: "hsl(40 25% 85%)" }}>{preview.text}</p>
                <p className="text-muted-foreground">{JSON.parse(preview.choices || "[]").length} choice(s) included</p>
              </div>
              <Button size="sm" className="gap-1.5 text-xs h-8" onClick={save} disabled={saving} style={{ background: "hsl(123 68% 40%)" }}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Insert into Story
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setPreview(null)}>Discard</Button>
            </div>
          )}
          {saved && (
            <div className="px-3 py-2 rounded-lg text-[10px] font-mono" style={{ background: "hsl(123 68% 50%/0.1)", color: "hsl(123 68% 65%)" }}>
              ✓ Patch scene inserted into story. Refresh events to see it.
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODE: REWRITE
// ══════════════════════════════════════════════════════════════════════════════
function RewriteMode({ events, stories, storyId, setStoryId }) {
  const qc = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState("");
  const [instruction, setInstruction] = useState("");
  const [diff, setDiff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const scoped = storyId ? events.filter(e => e.story_id === storyId) : events;
  const selectedEvent = scoped.find(e => e.event_id === selectedEventId);

  const generate = async () => {
    if (!selectedEvent) return;
    setLoading(true);
    setDiff(null);
    const prompt = `You are a horror fiction writer for "Don't Go Alone".

Rewrite the following game event text according to the admin's instruction.
Keep the same narrative intent, preserve flags/conditions logic, maintain horror/atmospheric tone.
Do NOT change any event_id, nextEventId, or structural data — only rewrite prose.

Event ID: ${selectedEvent.event_id}
Current text: ${selectedEvent.text}
Current ending_text: ${selectedEvent.ending_text || "(none)"}

Admin instruction: ${instruction}

Return JSON:
{
  "new_text": "rewritten event text",
  "new_ending_text": "rewritten ending text or empty string if no change",
  "notes": "brief explanation of changes made"
}`;
    const r = await base44.integrations.Core.InvokeLLM({ prompt, model: "claude_sonnet_4_6", response_json_schema: { type: "object", properties: { new_text: { type: "string" }, new_ending_text: { type: "string" }, notes: { type: "string" } } } });
    setDiff({ ...r, original: selectedEvent });
    setLoading(false);
  };

  const apply = async () => {
    if (!diff || !selectedEvent) return;
    setSaving(true);
    const updates = { text: diff.new_text };
    if (diff.new_ending_text) updates.ending_text = diff.new_ending_text;
    await base44.entities.GameEvent.update(selectedEvent.id, updates);
    qc.invalidateQueries({ queryKey: ["events"] });
    setDiff(null);
    setSelectedEventId("");
    setInstruction("");
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[9px] text-muted-foreground mb-1">Select event to rewrite</p>
        <select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}
          className="w-full h-8 rounded-lg text-xs px-2 bg-card border"
          style={{ borderColor: "hsl(252 10% 22%)", color: "hsl(40 25% 85%)" }}>
          <option value="">— pick an event —</option>
          {scoped.map(ev => <option key={ev.event_id} value={ev.event_id}>{ev.event_id} — {String(ev.text||"").slice(0,50)}</option>)}
        </select>
      </div>

      {selectedEvent && (
        <div className="p-2 rounded-lg text-[9px] text-muted-foreground" style={{ background: "hsl(252 12% 15%)", border: "1px solid hsl(252 10% 20%)" }}>
          <span className="font-mono font-bold" style={{ color: "hsl(271 87% 70%)" }}>{selectedEvent.event_id}</span>
          <p className="mt-0.5">{selectedEvent.text?.slice(0, 150)}</p>
        </div>
      )}

      <Textarea value={instruction} onChange={e => setInstruction(e.target.value)} rows={2} className="text-xs"
        placeholder='e.g. "Make this death more physical and visceral", "Remove the hardcoded name Morgan", "Add more dread before the reveal"' />

      <Button size="sm" className="gap-1.5 text-xs h-8" onClick={generate} disabled={loading || !selectedEvent || !instruction.trim()} style={{ background: "hsl(351 78% 45%)" }}>
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PenLine className="w-3.5 h-3.5" />} Generate Rewrite
      </Button>

      {diff && (
        <div className="space-y-2">
          <DiffRow label={`Rewrite: ${diff.original.event_id}.text`} before={diff.original.text} after={diff.new_text} selected={true} onToggle={() => {}} />
          {diff.new_ending_text && diff.new_ending_text !== diff.original.ending_text && (
            <DiffRow label={`Rewrite: ${diff.original.event_id}.ending_text`} before={diff.original.ending_text} after={diff.new_ending_text} selected={true} onToggle={() => {}} />
          )}
          {diff.notes && <p className="text-[9px] text-muted-foreground italic">{diff.notes}</p>}
          <div className="flex gap-2">
            <Button size="sm" className="gap-1.5 text-xs h-8" onClick={apply} disabled={saving} style={{ background: "hsl(123 68% 40%)" }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Apply Rewrite
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setDiff(null)}>Discard</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODE: MAP ASSETS
// ══════════════════════════════════════════════════════════════════════════════
function MapAssetsMode({ events, sceneAssets, stories, storyId, setStoryId }) {
  const qc = useQueryClient();
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(null);

  const scoped = storyId ? events.filter(e => e.story_id === storyId) : events;
  const assetKeySet = new Set(sceneAssets.map(a => a.key));

  const allRefKeys = useMemo(() => {
    const keys = new Set();
    scoped.forEach(ev => {
      if (ev.image_key) keys.add(ev.image_key);
      if (ev.background_key) keys.add(ev.background_key);
    });
    return [...keys];
  }, [scoped]);

  const unresolved = allRefKeys.filter(k => !assetKeySet.has(k));
  const unused = sceneAssets.filter(a => !allRefKeys.includes(a.key));

  const generateSuggestions = async () => {
    setLoading(true);
    const prompt = `You are an asset mapper for a horror game "Don't Go Alone".

Unresolved asset keys (referenced in events but no matching asset):
${unresolved.join(", ") || "none"}

Available uploaded assets:
${sceneAssets.map(a => a.key).join(", ") || "none"}

Unused uploaded assets (uploaded but not referenced):
${unused.map(a => a.key).join(", ") || "none"}

Events referencing unresolved keys (sample):
${scoped.filter(ev => (ev.image_key && !assetKeySet.has(ev.image_key)) || (ev.background_key && !assetKeySet.has(ev.background_key))).slice(0, 10).map(ev => `${ev.event_id}: image_key=${ev.image_key||""} background_key=${ev.background_key||""}`).join("\n")}

Suggest asset mappings and fixes. Return JSON:
{
  "mappings": [
    { "event_id": "...", "field": "image_key|background_key", "current_key": "...", "suggested_key": "...", "reason": "..." }
  ],
  "new_keys_needed": ["key names that should be uploaded"],
  "notes": "..."
}`;
    const r = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: { type: "object", properties: { mappings: { type: "array", items: { type: "object" } }, new_keys_needed: { type: "array", items: { type: "string" } }, notes: { type: "string" } } } });
    setSuggestions(r);
    setLoading(false);
  };

  const applyMapping = async (mapping) => {
    setApplying(mapping.event_id);
    const ev = events.find(e => e.event_id === mapping.event_id);
    if (ev) {
      await base44.entities.GameEvent.update(ev.id, { [mapping.field]: mapping.suggested_key });
      qc.invalidateQueries({ queryKey: ["events"] });
    }
    setApplying(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-[9px]">
        <span className="px-2 py-0.5 rounded font-bold" style={{ background: "hsl(351 78% 60%/0.15)", color: "hsl(351 78% 68%)" }}>{unresolved.length} unresolved keys</span>
        <span className="px-2 py-0.5 rounded font-bold" style={{ background: "hsl(40 90% 58%/0.15)", color: "hsl(40 90% 68%)" }}>{unused.length} unused assets</span>
        <span className="px-2 py-0.5 rounded font-bold" style={{ background: "hsl(123 68% 50%/0.15)", color: "hsl(123 68% 65%)" }}>{sceneAssets.length} total</span>
      </div>

      {unresolved.length > 0 && (
        <div className="p-2 rounded-lg" style={{ background: "hsl(351 78% 55%/0.06)", border: "1px solid hsl(351 78% 55%/0.2)" }}>
          <p className="text-[9px] font-bold mb-1" style={{ color: "hsl(351 78% 68%)" }}>Unresolved keys:</p>
          <div className="flex flex-wrap gap-1">
            {unresolved.map(k => <span key={k} className="font-mono text-[8px] px-1.5 py-0.5 rounded" style={{ background: "hsl(351 78% 55%/0.15)", color: "hsl(351 78% 72%)" }}>{k}</span>)}
          </div>
        </div>
      )}

      <Button size="sm" className="gap-1.5 text-xs h-8" onClick={generateSuggestions} disabled={loading || (unresolved.length === 0 && unused.length === 0)} style={{ background: "hsl(186 72% 40%)" }}>
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Image className="w-3.5 h-3.5" />} Suggest Mappings
      </Button>

      {suggestions && (
        <div className="space-y-3">
          {suggestions.notes && <p className="text-[10px] text-muted-foreground">{suggestions.notes}</p>}
          {suggestions.new_keys_needed?.length > 0 && (
            <div className="p-2 rounded-lg" style={{ background: "hsl(271 87% 65%/0.07)", border: "1px solid hsl(271 87% 65%/0.2)" }}>
              <p className="text-[9px] font-bold mb-1" style={{ color: "hsl(271 87% 72%)" }}>Assets that should be uploaded:</p>
              <div className="flex flex-wrap gap-1">{suggestions.new_keys_needed.map(k => <span key={k} className="font-mono text-[8px] px-1.5 py-0.5 rounded" style={{ background: "hsl(271 87% 65%/0.15)", color: "hsl(271 87% 75%)" }}>{k}</span>)}</div>
            </div>
          )}
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {(suggestions.mappings || []).map((m, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "hsl(252 12% 16%)", border: "1px solid hsl(252 10% 22%)" }}>
                <div className="flex-1 min-w-0 text-[9px]">
                  <span className="font-mono" style={{ color: "hsl(271 87% 70%)" }}>{m.event_id}</span>
                  <span className="text-muted-foreground mx-1">·</span>
                  <span className="text-muted-foreground">{m.current_key}</span>
                  <span className="mx-1">→</span>
                  <span style={{ color: "hsl(123 68% 62%)" }}>{m.suggested_key}</span>
                </div>
                <Button size="sm" className="h-6 text-[8px] px-2 shrink-0" onClick={() => applyMapping(m)} disabled={applying === m.event_id} style={{ background: "hsl(123 68% 38%)" }}>
                  {applying === m.event_id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : "Apply"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODE: SIMULATE
// ══════════════════════════════════════════════════════════════════════════════
function SimulateMode({ events, characters, stories, storyId, setStoryId }) {
  const [castSize, setCastSize] = useState(4);
  const [choiceStrategy, setChoiceStrategy] = useState("random");
  const [runs, setRuns] = useState(0);
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);

  const scoped = storyId ? events.filter(e => e.story_id === storyId) : [];

  const simulate = () => {
    if (scoped.length === 0) return;
    setRunning(true);
    const SIM_RUNS = Math.max(1, Math.min(runs || 10, 50));
    const outcomes = { good: 0, bad: 0, mixed: 0, stuck: 0 };
    const paths = [];
    const endingReach = {};

    for (let r = 0; r < SIM_RUNS; r++) {
      let fear = 30;
      let threat = 20;
      const flags = {};
      const path = [];
      let current = scoped.find(e => e.sort_order === 0) || scoped[0];
      let steps = 0;

      while (current && steps < 80) {
        path.push(current.event_id);
        steps++;
        if (current.is_ending) {
          const et = current.ending_type || "bad";
          outcomes[et] = (outcomes[et] || 0) + 1;
          endingReach[current.event_id] = (endingReach[current.event_id] || 0) + 1;
          break;
        }
        const choices = parseChoices(current.choices);
        if (choices.length === 0) { outcomes.stuck++; break; }

        // Pick a choice
        let choice;
        if (choiceStrategy === "random") choice = choices[Math.floor(Math.random() * choices.length)];
        else if (choiceStrategy === "best") choice = choices[0];
        else choice = choices[choices.length - 1];

        // Roll vs difficulty
        const stat = choice.statUsed || "strength";
        const charStat = characters.length > 0 ? Math.round(characters.reduce((s, c) => s + (c[stat] || 5), 0) / characters.length) : 5;
        const success = (charStat + Math.random() * 4) >= (choice.difficulty || 5);
        const eff = safeEff(success ? choice.successEffect : choice.failEffect);

        fear = Math.max(0, Math.min(100, fear + (eff.fearChange || 0)));
        threat = Math.max(0, Math.min(100, threat + (eff.threatChange || 0)));
        (eff.flagsAdded || []).forEach(f => { flags[f] = true; });

        const nextId = eff.nextEventId || choice.nextEventId;
        const next = nextId ? scoped.find(e => e.event_id === nextId) : null;
        if (!next) { outcomes.stuck++; break; }
        current = next;
      }
      paths.push({ length: path.length, finalFear: fear, finalThreat: threat, flags: Object.keys(flags) });
    }

    const avgLen = paths.reduce((s, p) => s + p.length, 0) / paths.length;
    const avgFear = paths.reduce((s, p) => s + p.finalFear, 0) / paths.length;
    setResults({ outcomes, endingReach, avgLen: avgLen.toFixed(1), avgFear: avgFear.toFixed(1), simRuns: SIM_RUNS });
    setRunning(false);
  };

  return (
    <div className="space-y-3">
      {!storyId && <p className="text-[10px] text-muted-foreground">Select a story to simulate.</p>}
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div>
          <p className="text-muted-foreground mb-1">Runs</p>
          <Input type="number" min={1} max={50} value={runs || 10} onChange={e => setRuns(+e.target.value)} className="h-7 text-xs" />
        </div>
        <div>
          <p className="text-muted-foreground mb-1">Strategy</p>
          <select value={choiceStrategy} onChange={e => setChoiceStrategy(e.target.value)} className="w-full h-7 rounded-lg text-xs px-2 bg-card border" style={{ borderColor: "hsl(252 10% 22%)" }}>
            <option value="random">Random</option>
            <option value="best">First choice</option>
            <option value="worst">Last choice</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button size="sm" className="h-7 gap-1.5 text-xs w-full" onClick={simulate} disabled={running || !storyId} style={{ background: "hsl(40 90% 45%)" }}>
            {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Run
          </Button>
        </div>
      </div>

      {results && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Good endings", results.outcomes.good || 0, "hsl(123 68% 55%)"],
              ["Bad endings", results.outcomes.bad || 0, "hsl(351 78% 60%)"],
              ["Mixed endings", results.outcomes.mixed || 0, "hsl(40 90% 58%)"],
              ["Stuck (dead end)", results.outcomes.stuck || 0, "hsl(252 8% 55%)"],
              ["Avg. path length", results.avgLen + " events", "hsl(216 70% 60%)"],
              ["Avg. final fear", results.avgFear, "hsl(271 87% 65%)"],
            ].map(([l, v, c]) => (
              <div key={l} className="p-2 rounded-lg" style={{ background: "hsl(252 12% 16%)" }}>
                <p className="text-[8px] text-muted-foreground uppercase tracking-wider">{l}</p>
                <p className="text-xs font-bold" style={{ color: c }}>{v} / {results.simRuns}</p>
              </div>
            ))}
          </div>

          {Object.keys(results.endingReach).length > 0 && (
            <div className="p-2 rounded-lg" style={{ background: "hsl(252 12% 15%)", border: "1px solid hsl(252 10% 20%)" }}>
              <p className="text-[9px] font-bold text-muted-foreground mb-1">Endings reached:</p>
              {Object.entries(results.endingReach).map(([id, count]) => (
                <div key={id} className="flex items-center gap-2 text-[9px]">
                  <span className="font-mono" style={{ color: "hsl(271 87% 70%)" }}>{id}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted">
                    <div className="h-1.5 rounded-full" style={{ width: `${(count / results.simRuns) * 100}%`, background: "hsl(271 87% 60%)" }} />
                  </div>
                  <span className="text-muted-foreground">{count}×</span>
                </div>
              ))}
            </div>
          )}

          {results.outcomes.stuck > results.simRuns * 0.3 && (
            <IssueRow issue={{ type: "warning", msg: `${results.outcomes.stuck} of ${results.simRuns} runs got stuck — check for dead ends or broken links`, fix: "Run Validate mode to find broken nextEventId links" }} />
          )}
        </div>
      )}
    </div>
  );
}

export default function AIAdminAssistant({ selectedStoryId }) {
  const [mode, setMode] = useState("inspect");
  const [storyId, setStoryId] = useState(selectedStoryId || null);
  const [chatInput, setChatInput] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState(null);

  const { data: stories = [] } = useQuery({ queryKey: ["stories"], queryFn: () => base44.entities.Story.list("sort_order") });
  const { data: events = [] } = useQuery({ queryKey: ["events"], queryFn: () => base44.entities.GameEvent.list("sort_order") });
  const { data: characters = [] } = useQuery({ queryKey: ["characters"], queryFn: () => base44.entities.Character.list("sort_order") });
  const { data: sceneAssets = [] } = useQuery({ queryKey: ["sceneAssets"], queryFn: () => base44.entities.SceneAsset.list() });

  const handleChatSend = () => {
    if (!chatInput.trim() || !storyId) return;
    setPendingQuestion(chatInput.trim());
    setChatInput("");
    if (mode !== "inspect") setMode("inspect");
  };

  const shared = { events, stories, characters, sceneAssets, storyId, setStoryId };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
        style={{ background: "hsl(271 87% 65%/0.07)", border: "1.5px solid hsl(271 87% 65%/0.22)" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "hsl(271 87% 65%/0.18)", border: "1px solid hsl(271 87% 65%/0.35)" }}>
          <Cpu className="w-4.5 h-4.5" style={{ color: "hsl(271 87% 80%)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-sm tracking-wide" style={{ color: "hsl(271 87% 82%)" }}>Story Operator</h2>
          <p className="text-[9px] text-muted-foreground">One story at a time · reads + writes story data · rollback supported</p>
        </div>
      </div>

      {/* Chat composer — primary input, chat-first */}
      <div className="flex gap-2">
        <Input
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
          placeholder={storyId ? `Ask about ${storyId}… or describe a repair…` : "Select a story below, then ask anything…"}
          className="h-9 text-xs flex-1"
          style={{ background: "hsl(252 12% 14%)", borderColor: "hsl(252 10% 22%)" }}
        />
        <Button size="sm" className="h-9 px-3 shrink-0" onClick={handleChatSend} disabled={!chatInput.trim() || !storyId}
          style={{ background: "hsl(271 87% 52%)" }}>
          <Search className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Story scope — always visible, single-story lock */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-muted-foreground shrink-0">Story:</span>
        <StoryPills stories={stories} value={storyId} onChange={v => { setStoryId(v); setPendingQuestion(null); }} />
      </div>

      {/* Primary actions */}
      {(() => {
        const PRIMARY = ["inspect", "repair", "patch"];
        const ADVANCED = MODES.filter(m => !PRIMARY.includes(m.id));
        return (
          <>
            <div className="flex gap-2">
              {MODES.filter(m => PRIMARY.includes(m.id)).map(m => (
                <button key={m.id} onClick={() => setMode(m.id)} className="flex-1 flex items-center justify-center gap-1.5 text-[10px] py-2 rounded-xl font-bold transition-all"
                  style={{ background: mode === m.id ? `${m.color}/0.2` : "hsl(252 12% 17%)", color: mode === m.id ? m.color : "hsl(252 8% 52%)", border: `1.5px solid ${mode === m.id ? `${m.color}/0.55` : "hsl(252 10% 24%)"}` }}>
                  <m.icon className="w-3 h-3" />{m.label}
                </button>
              ))}
            </div>
            <details className="group">
              <summary className="list-none cursor-pointer flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground/70 hover:text-muted-foreground py-1 select-none">
                <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" /> Advanced Tools
              </summary>
              <div className="flex gap-1.5 flex-wrap pt-2">
                {ADVANCED.map(m => (
                  <button key={m.id} onClick={() => setMode(m.id)} className="flex items-center gap-1.5 text-[9px] px-2.5 py-1.5 rounded-xl font-bold transition-all"
                    style={{ background: mode === m.id ? `${m.color}/0.2` : "hsl(252 12% 17%)", color: mode === m.id ? m.color : "hsl(252 8% 52%)", border: `1px solid ${mode === m.id ? `${m.color}/0.5` : "hsl(252 10% 24%)"}` }}>
                    <m.icon className="w-3 h-3" />{m.label}
                  </button>
                ))}
              </div>
            </details>
          </>
        );
      })()}

      {/* Mode content */}
      <div className="rounded-2xl p-4" style={{ background: "hsl(252 12% 13%)", border: "1px solid hsl(252 10% 19%)" }}>
        {mode === "inspect"      && <InspectMode {...shared} prefillQuestion={pendingQuestion} onQuestionConsumed={() => setPendingQuestion(null)} />}
        {mode === "import"       && <ImportMode {...shared} />}
        {mode === "validate"     && <ValidateMode {...shared} />}
        {mode === "repair"       && <RepairMode {...shared} />}
        {mode === "rewrite"      && <RewriteMode {...shared} />}
        {mode === "ending_audit" && <EndingAuditMode {...shared} />}
        {mode === "phase_audit"  && <PhaseAuditMode {...shared} />}
        {mode === "cast_audit"   && <CastAuditMode {...shared} />}
        {mode === "patch"        && <PatchMode {...shared} />}
        {mode === "assets"       && <MapAssetsMode {...shared} />}
        {mode === "simulate"     && <SimulateMode {...shared} />}
      </div>
    </div>
  );
}