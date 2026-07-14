import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, Download, Copy, FileJson, CheckCircle, X, Wand2 } from "lucide-react";

// Story Templates
const STORY_TEMPLATES = {
  slasher: {
    label: "One-Night Slasher",
    emoji: "🔪",
    meta: { status: "draft", emoji: "🔪", accent_color: "hsl(351 78% 60%)", survivor_count: 6, visible_on_homepage: false },
    act_structure: JSON.stringify([
      { label: "Act 1: Arrival",       event_range: "1-8",   description: "Group arrives. First signs of danger." },
      { label: "Act 2: Isolation",     event_range: "9-18",  description: "Communication cut off. Someone goes missing." },
      { label: "Act 3: The Hunt",      event_range: "19-28", description: "The killer strikes. Panic sets in." },
      { label: "Act 4: Confrontation", event_range: "29-36", description: "Final showdown or desperate escape." },
    ]),
    starter_events: [
      { event_id: "_a1_arrive",   night: 1, text: "[REPLACE] The group pulls up to the location.", choices: [{text:"[Choice A]",statUsed:"intelligence",difficulty:2,successEffect:{outcomeText:"[Success]",fearChange:0,threatChange:0},failEffect:{outcomeText:"[Fail]",fearChange:4,threatChange:3},nextEventId:"_a1_explore"}] },
      { event_id: "_a1_explore",  night: 1, text: "[REPLACE] First exploration. Something feels wrong.", choices: [{text:"[Choice A]",statUsed:"speed",difficulty:2,successEffect:{outcomeText:"[Success]",fearChange:0,threatChange:0},failEffect:{outcomeText:"[Fail]",fearChange:5,threatChange:4},nextEventId:"_a2_isolate"}] },
      { event_id: "_a2_isolate",  night: 1, text: "[REPLACE] The group loses contact with the outside world.", choices: [{text:"[Choice A]",statUsed:"resilience",difficulty:2,successEffect:{outcomeText:"[Success]",fearChange:0,threatChange:2},failEffect:{outcomeText:"[Fail]",fearChange:8,threatChange:8},nextEventId:"_a3_hunt"}] },
      { event_id: "_a3_hunt",     night: 1, text: "[REPLACE] The killer makes their first move.", choices: [{text:"[Choice A]",statUsed:"strength",difficulty:3,successEffect:{outcomeText:"[Success]",fearChange:5,threatChange:5},failEffect:{outcomeText:"[Fail]",fearChange:14,threatChange:15},nextEventId:"_a4_confront"}] },
      { event_id: "_a4_confront", night: 1, text: "[REPLACE] Final confrontation.", is_ending: false, choices: [{text:"[Escape]",statUsed:"speed",difficulty:3,successEffect:{outcomeText:"[Escaped]",fearChange:0,threatChange:-10},failEffect:{outcomeText:"[Caught]",fearChange:20,threatChange:20}}] },
      { event_id: "_end_good",    night: 1, text: "[REPLACE] Against the odds, you made it out.", is_ending: true, ending_type: "good",  ending_text: "[REPLACE]" },
      { event_id: "_end_bad",     night: 1, text: "[REPLACE] Not everyone survives the night.",   is_ending: true, ending_type: "bad",   ending_text: "[REPLACE]" },
    ],
  },
  curse: {
    label: "Curse / Ritual",
    emoji: "🕯️",
    meta: { status: "draft", emoji: "🕯️", accent_color: "hsl(271 87% 65%)", survivor_count: 6, visible_on_homepage: false },
    act_structure: JSON.stringify([
      { label: "Act 1: The Discovery", event_range: "1-7",   description: "Group discovers something they shouldn't have." },
      { label: "Act 2: The Spreading", event_range: "8-16",  description: "The curse begins affecting people." },
      { label: "Act 3: The Ritual",    event_range: "17-25", description: "The curse demands a price." },
      { label: "Act 4: Break or Feed", event_range: "26-34", description: "Break the curse or become part of it." },
    ]),
    starter_events: [
      { event_id: "_a1_discover", night: 1, text: "[REPLACE] The group finds something strange.", choices: [{text:"[Investigate]",statUsed:"intelligence",difficulty:2,successEffect:{outcomeText:"[Found clue]",fearChange:3,threatChange:0},failEffect:{outcomeText:"[Spooked]",fearChange:8,threatChange:4},nextEventId:"_a2_spread"}] },
      { event_id: "_a2_spread",   night: 1, text: "[REPLACE] Someone is behaving strangely.", choices: [{text:"[Choice A]",statUsed:"charm",difficulty:2,successEffect:{outcomeText:"[Success]",fearChange:2,threatChange:0},failEffect:{outcomeText:"[Fail]",fearChange:10,threatChange:6},nextEventId:"_a3_ritual"}] },
      { event_id: "_a3_ritual",   night: 1, text: "[REPLACE] The ritual is beginning.", choices: [{text:"[Resist]",statUsed:"resilience",difficulty:3,successEffect:{outcomeText:"[Resisted]",fearChange:5,threatChange:0},failEffect:{outcomeText:"[Consumed]",fearChange:16,threatChange:14},nextEventId:"_a4_break"}] },
      { event_id: "_a4_break",    night: 1, text: "[REPLACE] One last chance to break the cycle.", is_ending: false, choices: [{text:"[Break it]",statUsed:"intelligence",difficulty:4,successEffect:{outcomeText:"[Freed]",fearChange:0,threatChange:-20},failEffect:{outcomeText:"[Failed]",fearChange:20,threatChange:20}}] },
      { event_id: "_end_good",    night: 1, text: "[REPLACE] The curse is broken.",         is_ending: true, ending_type: "good",  ending_text: "[REPLACE]" },
      { event_id: "_end_mixed",   night: 1, text: "[REPLACE] Some of you survived it.",      is_ending: true, ending_type: "mixed", ending_text: "[REPLACE]" },
      { event_id: "_end_bad",     night: 1, text: "[REPLACE] The ritual claimed all of you.", is_ending: true, ending_type: "bad",   ending_text: "[REPLACE]" },
    ],
  },
  creature: {
    label: "Creature Stalker",
    emoji: "👾",
    meta: { status: "draft", emoji: "👾", accent_color: "hsl(200 65% 55%)", survivor_count: 6, visible_on_homepage: false },
    act_structure: JSON.stringify([
      { label: "Act 1: Sighting", event_range: "1-7",   description: "Something is watching." },
      { label: "Act 2: Stalking", event_range: "8-16",  description: "It follows. People start disappearing." },
      { label: "Act 3: Cornered", event_range: "17-24", description: "No way out. It closes in." },
      { label: "Act 4: Survive",  event_range: "25-32", description: "Fight, flee, or outsmart it." },
    ]),
    starter_events: [
      { event_id: "_a1_sight",   night: 1, text: "[REPLACE] Something moves outside. Too big to be an animal.", choices: [{text:"[Look closer]",statUsed:"intelligence",difficulty:2,successEffect:{outcomeText:"[Saw it]",fearChange:6,threatChange:2},failEffect:{outcomeText:"[Spooked]",fearChange:10,threatChange:5},nextEventId:"_a2_stalk"}] },
      { event_id: "_a2_stalk",   night: 1, text: "[REPLACE] It's following someone in the group.", choices: [{text:"[Distract]",statUsed:"charm",difficulty:3,successEffect:{outcomeText:"[Distracted]",fearChange:4,threatChange:-4},failEffect:{outcomeText:"[Saw you]",fearChange:12,threatChange:12},nextEventId:"_a3_corner"}] },
      { event_id: "_a3_corner",  night: 1, text: "[REPLACE] You're cornered. It's right outside.", choices: [{text:"[Hold line]",statUsed:"strength",difficulty:3,successEffect:{outcomeText:"[Held]",fearChange:5,threatChange:-5},failEffect:{outcomeText:"[Breached]",fearChange:18,threatChange:18},nextEventId:"_a4_survive"}] },
      { event_id: "_a4_survive", night: 1, text: "[REPLACE] Final stand.", is_ending: false, choices: [{text:"[Flee]",statUsed:"speed",difficulty:4,successEffect:{outcomeText:"[Escaped]",fearChange:0,threatChange:-20},failEffect:{outcomeText:"[Caught]",fearChange:25,threatChange:25}}] },
      { event_id: "_end_good",   night: 1, text: "[REPLACE] You outran it.",    is_ending: true, ending_type: "good", ending_text: "[REPLACE]" },
      { event_id: "_end_bad",    night: 1, text: "[REPLACE] It was relentless.", is_ending: true, ending_type: "bad",  ending_text: "[REPLACE]" },
    ],
  },
  rotating_killer: {
    label: "Rotating Killer",
    emoji: "🎭",
    meta: { status: "draft", emoji: "🎭", accent_color: "hsl(40 90% 60%)", survivor_count: 6, visible_on_homepage: false },
    act_structure: JSON.stringify([
      { label: "Act 1: Suspicion", event_range: "1-8",   description: "One of the group is the killer. But who?" },
      { label: "Act 2: Clues",     event_range: "9-18",  description: "Evidence mounts. Accusations fly." },
      { label: "Act 3: Betrayal",  event_range: "19-26", description: "Someone reveals themselves — or is framed." },
      { label: "Act 4: Reckoning", event_range: "27-34", description: "Confront, flee, or eliminate the killer." },
    ]),
    starter_events: [
      { event_id: "_a1_suspect", night: 1, text: "[REPLACE] Something couldn't be an accident. Someone in the group did this.", choices: [{text:"[Accuse]",statUsed:"influence",difficulty:2,successEffect:{outcomeText:"[Believed]",fearChange:3,threatChange:1},failEffect:{outcomeText:"[Dismissed]",fearChange:7,threatChange:4},nextEventId:"_a2_clue"}] },
      { event_id: "_a2_clue",    night: 1, text: "[REPLACE] You find a clue pointing to someone.", choices: [{text:"[Share]",statUsed:"charm",difficulty:2,successEffect:{outcomeText:"[Trusted]",fearChange:2,threatChange:0},failEffect:{outcomeText:"[Doubted]",fearChange:6,threatChange:5},nextEventId:"_a3_betray"}] },
      { event_id: "_a3_betray",  night: 1, text: "[REPLACE] The killer makes a move.", choices: [{text:"[Confront]",statUsed:"strength",difficulty:3,successEffect:{outcomeText:"[Confronted]",fearChange:5,threatChange:-5},failEffect:{outcomeText:"[Ambushed]",fearChange:16,threatChange:18},nextEventId:"_a4_reckon"}] },
      { event_id: "_a4_reckon",  night: 1, text: "[REPLACE] The moment of truth.", is_ending: false, choices: [{text:"[Expose]",statUsed:"intelligence",difficulty:4,successEffect:{outcomeText:"[Exposed]",fearChange:0,threatChange:-20},failEffect:{outcomeText:"[Wrong]",fearChange:20,threatChange:20}}] },
      { event_id: "_end_good",   night: 1, text: "[REPLACE] The right person was caught.",  is_ending: true, ending_type: "good",  ending_text: "[REPLACE]" },
      { event_id: "_end_mixed",  night: 1, text: "[REPLACE] The truth is complicated.",      is_ending: true, ending_type: "mixed", ending_text: "[REPLACE]" },
      { event_id: "_end_bad",    night: 1, text: "[REPLACE] The wrong person paid the price.", is_ending: true, ending_type: "bad", ending_text: "[REPLACE]" },
    ],
  },
};

async function createFromTemplate(templateKey, storyId, title, qc) {
  const tpl = STORY_TEMPLATES[templateKey];
  if (!tpl) return;
  const story = {
    story_id: storyId,
    title,
    chapter_label: "",
    subtitle: "[REPLACE — one-line tagline]",
    description: "[REPLACE — homepage card description]",
    unlock_requirement: "",
    act_structure: tpl.act_structure,
    sort_order: 99,
    ...tpl.meta,
  };
  await base44.entities.Story.create(story);
  for (let i = 0; i < tpl.starter_events.length; i++) {
    const ev = tpl.starter_events[i];
    await base44.entities.GameEvent.create({
      ...ev,
      story_id: storyId,
      sort_order: i,
      choices: JSON.stringify(ev.choices || []),
    });
  }
  qc.invalidateQueries({ queryKey: ["stories"] });
  qc.invalidateQueries({ queryKey: ["events"] });
}

// Export
async function exportStoryPackage(story) {
  const events = await base44.entities.GameEvent.filter({ story_id: story.story_id });
  const pkg = {
    _version: "1.0",
    _exported_at: new Date().toISOString(),
    metadata: story,
    events,
  };
  const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `story-package-${story.story_id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Duplicate
async function duplicateStory(story, qc) {
  const newId = story.story_id + "_copy_" + Date.now().toString(36);
  const newStory = { ...story, story_id: newId, title: story.title + " (Copy)", status: "draft", visible_on_homepage: false };
  delete newStory.id;
  await base44.entities.Story.create(newStory);
  qc.invalidateQueries({ queryKey: ["stories"] });
}

// Design doc auto-detect + convert
function isDesignDoc(obj) {
  return !!(obj.storyId && (obj.events || obj.acts));
}

function convertDesignDoc(doc) {
  const choicesMap = {};
  (doc.choices || []).forEach(c => { choicesMap[c.choiceId] = c; });
  const act_structure = (doc.acts || []).map(a => ({
    label: `${a.actId?.toUpperCase()}: ${a.name}`,
    event_range: (a.events || []).join(", "),
    description: a.goal || "",
  }));
  const events = (doc.events || []).map((ev, idx) => {
    const resolvedChoices = (ev.choices || []).map(cRef => {
      const c = typeof cRef === "string" ? choicesMap[cRef] : cRef;
      if (!c) return null;
      const fx = c.effect || {};
      return {
        text: c.text || "[Choice]",
        statUsed: c.stat || "resilience",
        difficulty: fx.risk === "high" ? 3 : 2,
        nextEventId: c.nextEvent || null,
        successEffect: { outcomeText: fx.successText || "You manage it.", fearChange: fx.fear ? Math.min(0, fx.fear) : 0, threatChange: 0, flagsAdded: { ...(fx.trust !== undefined ? { group_trust: fx.trust } : {}), ...(fx.isolation ? { alone_count: 1 } : {}) } },
        failEffect: { outcomeText: fx.failText || "That didn't work.", fearChange: fx.fear ? Math.max(0, fx.fear) + 4 : 5, threatChange: fx.risk === "high" ? 10 : 4, flagsAdded: fx.isolation ? { alone_count: 1, panic_spread: true } : {} },
      };
    }).filter(Boolean);
    let narration = ev.narration || "";
    if (ev.danger?.isolationRisk) narration += "\n\n[Isolation Warning: This location is dangerous alone.]";
    if (ev.deathEvent?.possible) narration += `\n\n[${ev.deathEvent.description || "Someone may not make it out of here."}]`;
    return {
      event_id: ev.eventId,
      story_id: doc.storyId,
      text: narration,
      night: 1,
      sort_order: idx,
      image_key: ev.location || null,
      is_ending: false,
      ending_type: "",
      choices: JSON.stringify(resolvedChoices),
      conditions: ev.danger?.deathTrigger ? JSON.stringify({ requiredFlags: { alone_count: 1 }, minFear: 60 }) : null,
    };
  });
  (doc.endings || []).forEach((ending, idx) => {
    events.push({
      event_id: `${doc.storyId}_end_${ending.type}`,
      story_id: doc.storyId,
      text: ending.text || ending.title || "[Ending]",
      night: 1,
      sort_order: 1000 + idx,
      is_ending: true,
      ending_type: ending.type === "total_loss" ? "bad" : ending.type === "group_survival" ? "good" : "mixed",
      ending_text: ending.text || "",
      choices: JSON.stringify([]),
    });
  });
  const metadata = {
    story_id: doc.storyId,
    title: doc.title || doc.storyId,
    chapter_label: doc.chapterLabel || "",
    subtitle: doc.subtitle || "",
    description: doc.homepageShortDescription || "",
    status: doc.status || "draft",
    visible_on_homepage: doc.visibleOnHomepage ?? false,
    survivor_count: 6,
    act_structure: JSON.stringify(act_structure),
    sort_order: 0,
  };
  return { _version: "1.0", _converted_from: "design_doc", metadata, events };
}

// Strict inline validator
const VALID_STATS = ["strength", "speed", "resilience", "intelligence", "charm", "influence", "fear"];

function strictValidatePackage(pkg) {
  const errors = [];
  const meta = pkg.metadata || {};
  if (!meta.story_id) errors.push("Missing: metadata.story_id");
  if (!meta.title)    errors.push("Missing: metadata.title");

  const events = pkg.events;
  if (!Array.isArray(events) || events.length === 0) {
    errors.push("Missing or empty: events array");
    return errors;
  }

  const eventIdSet = new Set();
  const duplicates = [];

  events.forEach((ev, i) => {
    const label = `events[${i}] (${ev.event_id || "NO_ID"})`;
    if (!ev.event_id) errors.push(`${label}: missing event_id`);
    if (!ev.text)     errors.push(`${label}: missing text`);
    if (ev.event_id) {
      if (eventIdSet.has(ev.event_id)) duplicates.push(ev.event_id);
      else eventIdSet.add(ev.event_id);
    }
    if (ev.choices) {
      let choices;
      try { choices = typeof ev.choices === "string" ? JSON.parse(ev.choices) : ev.choices; }
      catch { errors.push(`${label}: choices is not valid JSON`); return; }
      choices.forEach((ch, ci) => {
        const clabel = `${label}.choices[${ci}]`;
        if (ch.statUsed && !VALID_STATS.includes(ch.statUsed)) {
          errors.push(`${clabel}: invalid statUsed "${ch.statUsed}" (valid: ${VALID_STATS.join(", ")})`);
        }
        if (ch.difficulty !== undefined) {
          const d = Number(ch.difficulty);
          if (isNaN(d) || d < 1 || d > 5) errors.push(`${clabel}: difficulty "${ch.difficulty}" out of range (1-5)`);
        }
      });
    }
  });

  if (duplicates.length > 0) errors.push(`Duplicate event_ids: ${[...new Set(duplicates)].join(", ")}`);

  // Broken nextEventId references
  events.forEach((ev, i) => {
    if (!ev.choices) return;
    let choices;
    try { choices = typeof ev.choices === "string" ? JSON.parse(ev.choices) : ev.choices; }
    catch { return; }
    choices.forEach((ch, ci) => {
      const nextId = ch.nextEventId || (ch.successEffect && typeof ch.successEffect === "object" ? ch.successEffect.nextEventId : null);
      if (nextId && !eventIdSet.has(nextId)) {
        errors.push(`events[${i}] (${ev.event_id}).choices[${ci}]: nextEventId "${nextId}" not found in event list`);
      }
    });
  });

  return errors;
}

// Normalise any supported input format into { metadata, events }
function normalisePkg(jsonStr) {
  let pkg = JSON.parse(jsonStr);
  if (isDesignDoc(pkg)) pkg = convertDesignDoc(pkg);
  if (!pkg.metadata && (pkg.story_id || pkg.events)) {
    pkg = {
      _version: "1.0",
      metadata: {
        story_id: pkg.story_id,
        title: pkg.title,
        chapter_label: pkg.chapter_label || "",
        subtitle: pkg.subtitle || "",
        description: pkg.description || "",
        emoji: pkg.emoji || "📖",
        status: pkg.status || "draft",
        visible_on_homepage: pkg.visible_on_homepage ?? false,
        accent_color: pkg.accent_color || "",
        cover_image_url: pkg.cover_image_url || "",
        survivor_count: pkg.survivor_count || 6,
        sort_order: pkg.sort_order || 0,
      },
      events: pkg.events || [],
    };
  }
  return pkg;
}

// Import modal
function ImportModal({ onClose }) {
  const qc = useQueryClient();
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState(null);
  const [errors, setErrors] = useState([]);
  const [step, setStep] = useState("input"); // input | confirm | done
  const [saving, setSaving] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = React.useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setRaw(ev.target.result || "");
    reader.readAsText(file);
  };

  const handleValidate = () => {
    setErrors([]);
    setParsed(null);
    let pkg;
    try { pkg = normalisePkg(raw); }
    catch (e) { setErrors(["Invalid JSON: " + e.message]); return; }
    const errs = strictValidatePackage(pkg);
    if (errs.length) { setErrors(errs); return; }
    setParsed(pkg);
    setStep("confirm");
  };

  const handleCommit = async () => {
    if (!parsed) return;
    const storyId = parsed.metadata.story_id;
    const events = parsed.events || [];
    setSaving(true);
    setErrors([]);
    try {
      // 1. Upsert story record — no duplicates
      const existing = await base44.entities.Story.filter({ story_id: storyId });
      if (existing.length > 0) {
        await base44.entities.Story.update(existing[0].id, parsed.metadata);
      } else {
        await base44.entities.Story.create(parsed.metadata);
      }
      // 2. Delete all old GameEvent rows for this story
      const oldEvents = await base44.entities.GameEvent.filter({ story_id: storyId });
      for (const old of oldEvents) await base44.entities.GameEvent.delete(old.id);
      // 3. Insert fresh rows — preserving sort_order, text, choices exactly
      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        await base44.entities.GameEvent.create({
          ...ev,
          story_id: storyId,
          sort_order: ev.sort_order ?? i,
          choices: typeof ev.choices === "string" ? ev.choices : JSON.stringify(ev.choices || []),
        });
      }
      qc.invalidateQueries({ queryKey: ["stories"] });
      qc.invalidateQueries({ queryKey: ["events"] });
      const first = events[0];
      setImportResult({ storyId, count: events.length, firstEventId: first?.event_id || "—", firstText: (first?.text || "").substring(0, 120) });
      setStep("done");
    } catch (e) {
      setErrors(["Import failed: " + e.message]);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => { setStep("input"); setRaw(""); setFileName(""); setParsed(null); setErrors([]); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-lg rounded-2xl p-5 space-y-4 overflow-y-auto" style={{ maxHeight: "90vh", background: "hsl(252 12% 13%)", border: "1.5px solid hsl(271 87% 65% / 0.35)" }}>
        <div className="flex items-center justify-between">
          <p className="font-bold text-sm">Import Story Package</p>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {step === "input" && (
          <div className="space-y-3">
            <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileUpload} />
            <Button size="sm" variant="outline" className="gap-1.5 w-full" onClick={() => fileInputRef.current?.click()}>
              <FileJson className="w-3.5 h-3.5" /> {fileName || "Upload .json file"}
            </Button>
            <div>
              <Label className="text-[10px] mb-1 block">Or paste JSON</Label>
              <Textarea
                value={raw}
                onChange={e => { setRaw(e.target.value); setFileName(""); }}
                className="font-mono text-[11px] h-40"
                placeholder='{"metadata":{"story_id":"the_rental","title":"The Rental"},"events":[...]}'
              />
            </div>
            {raw && (() => {
              try {
                const obj = JSON.parse(raw);
                return <div className="text-[8px] text-muted-foreground p-2 rounded" style={{ background: "hsl(252 12% 18%)" }}>Keys: {Object.keys(obj).join(", ")} · events: {Array.isArray(obj.events) ? obj.events.length : "?"}</div>;
              } catch { return <div className="text-[8px] text-destructive">Invalid JSON</div>; }
            })()}
            {errors.length > 0 && (
              <div className="rounded-xl p-3 space-y-1" style={{ background: "hsl(351 78% 60% / 0.1)", border: "1px solid hsl(351 78% 60% / 0.3)" }}>
                {errors.map((e, i) => <p key={i} className="text-[11px] text-destructive">{e}</p>)}
              </div>
            )}
            <Button size="sm" onClick={handleValidate} disabled={!raw.trim()} className="gap-1">
              <Upload className="w-3.5 h-3.5" /> Validate Package
            </Button>
          </div>
        )}

        {step === "confirm" && parsed && (
          <div className="space-y-3">
            <div className="rounded-xl p-3 space-y-1.5" style={{ background: "hsl(252 12% 18%)", border: "1px solid hsl(123 68% 55% / 0.35)" }}>
              <p className="text-[10px] font-bold text-success mb-1">✅ Validation passed</p>
              <p className="text-[10px] text-muted-foreground"><span className="font-bold text-foreground">story_id:</span> {parsed.metadata.story_id}</p>
              <p className="text-[10px] text-muted-foreground"><span className="font-bold text-foreground">title:</span> {parsed.metadata.title}</p>
              <p className="text-[10px] text-muted-foreground"><span className="font-bold text-foreground">events:</span> {parsed.events?.length || 0}</p>
              <p className="text-[10px] text-muted-foreground"><span className="font-bold text-foreground">first event_id:</span> {parsed.events?.[0]?.event_id || "—"}</p>
              <p className="text-[10px] text-muted-foreground italic">"{(parsed.events?.[0]?.text || "").substring(0, 80)}..."</p>
              <p className="text-[9px] text-warning mt-2">⚠️ All existing GameEvent rows for <code>{parsed.metadata.story_id}</code> will be deleted and replaced.</p>
            </div>
            {errors.length > 0 && (
              <div className="rounded-xl p-3" style={{ background: "hsl(351 78% 60% / 0.1)", border: "1px solid hsl(351 78% 60% / 0.3)" }}>
                {errors.map((e, i) => <p key={i} className="text-[11px] text-destructive">{e}</p>)}
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCommit} disabled={saving} className="gap-1">
                <Upload className="w-3.5 h-3.5" /> {saving ? "Importing..." : "Commit Import"}
              </Button>
              <Button size="sm" variant="outline" onClick={reset}>Back</Button>
            </div>
          </div>
        )}

        {step === "done" && importResult && (
          <div className="py-2 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-success shrink-0" />
              <p className="font-bold text-sm text-success">Import Complete</p>
            </div>
            <div className="rounded-xl p-3 space-y-1.5" style={{ background: "hsl(123 68% 55% / 0.08)", border: "1px solid hsl(123 68% 55% / 0.3)" }}>
              <p className="text-[10px] text-muted-foreground"><span className="font-bold text-foreground">story_id:</span> {importResult.storyId}</p>
              <p className="text-[10px] text-muted-foreground"><span className="font-bold text-foreground">GameEvent rows written:</span> {importResult.count}</p>
              <p className="text-[10px] text-muted-foreground"><span className="font-bold text-foreground">first event_id:</span> {importResult.firstEventId}</p>
              <p className="text-[10px] text-muted-foreground italic">"{importResult.firstText}{importResult.firstText.length >= 120 ? "…" : ""}"</p>
            </div>
            <p className="text-[9px] text-muted-foreground">Gameplay will load these events immediately on next run.</p>
            <Button size="sm" onClick={onClose}>Close</Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Template Picker Modal
function TemplateModal({ onClose }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [storyId, setStoryId] = useState("");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!selected || !storyId.trim() || !title.trim()) { setError("Story ID and Title are required."); return; }
    setCreating(true);
    setError("");
    try {
      await createFromTemplate(selected, storyId.trim(), title.trim(), qc);
      setDone(true);
    } catch (e) {
      setError("Failed: " + e.message);
    } finally { setCreating(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-md rounded-2xl p-5 space-y-4" style={{ background: "hsl(252 12% 13%)", border: "1.5px solid hsl(271 87% 65% / 0.35)" }}>
        <div className="flex items-center justify-between">
          <p className="font-bold text-sm">New Story from Template</p>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        {!done ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(STORY_TEMPLATES).map(([key, tpl]) => (
                <button key={key} onClick={() => setSelected(key)}
                  className="rounded-xl p-3 text-left transition-all"
                  style={{
                    background: selected === key ? "hsl(271 87% 65% / 0.18)" : "hsl(252 12% 18%)",
                    border: `1.5px solid ${selected === key ? "hsl(271 87% 65% / 0.55)" : "hsl(252 10% 24%)"}`,
                  }}
                >
                  <div className="text-xl mb-1">{tpl.emoji}</div>
                  <p className="text-[11px] font-bold text-foreground">{tpl.label}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{JSON.parse(tpl.act_structure).length} acts</p>
                </button>
              ))}
            </div>
            {selected && (
              <div className="space-y-2">
                <div>
                  <Label className="text-[10px]">Story ID (unique, e.g. story_4)</Label>
                  <input value={storyId} onChange={e => setStoryId(e.target.value)} className="w-full h-8 rounded-lg px-3 text-xs font-mono" style={{ background: "hsl(252 12% 18%)", border: "1px solid hsl(252 10% 26%)", color: "white" }} placeholder="story_4" />
                </div>
                <div>
                  <Label className="text-[10px]">Story Title</Label>
                  <input value={title} onChange={e => setTitle(e.target.value)} className="w-full h-8 rounded-lg px-3 text-xs" style={{ background: "hsl(252 12% 18%)", border: "1px solid hsl(252 10% 26%)", color: "white" }} placeholder="My New Story" />
                </div>
              </div>
            )}
            {error && <p className="text-[11px] text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={creating || !selected} className="gap-1">
                <Wand2 className="w-3.5 h-3.5" />{creating ? "Creating..." : "Create Story"}
              </Button>
              <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </>
        ) : (
          <div className="text-center py-4 space-y-3">
            <CheckCircle className="w-10 h-10 mx-auto text-success" />
            <p className="font-bold text-sm">Story Created from Template</p>
            <p className="text-xs text-muted-foreground">Starter events added. Edit text in the Events tab.</p>
            <Button size="sm" onClick={onClose}>Done</Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Main export
export default function StoryPackageTools({ story, onDuplicated }) {
  const qc = useQueryClient();
  const [showImport, setShowImport] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try { await exportStoryPackage(story); } finally { setExporting(false); }
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try { await duplicateStory(story, qc); onDuplicated?.(); } finally { setDuplicating(false); }
  };

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" className="gap-1 text-[11px] h-7" onClick={handleExport} disabled={exporting}>
          <Download className="w-3 h-3" />{exporting ? "Exporting..." : "Export"}
        </Button>
        <Button size="sm" variant="outline" className="gap-1 text-[11px] h-7" onClick={handleDuplicate} disabled={duplicating}>
          <Copy className="w-3 h-3" />{duplicating ? "Copying..." : "Duplicate"}
        </Button>
        <Button size="sm" variant="outline" className="gap-1 text-[11px] h-7" onClick={() => setShowImport(true)}>
          <Upload className="w-3 h-3" />Import Pkg
        </Button>
      </div>
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      {showTemplate && <TemplateModal onClose={() => setShowTemplate(false)} />}
    </>
  );
}

// Standalone import button (for top-level use)
export function ImportStoryButton() {
  const [show, setShow] = useState(false);
  return (
    <>
      <Button size="sm" className="gap-1.5" onClick={() => setShow(true)}>
        <Upload className="w-3.5 h-3.5" /> Import Story Package
      </Button>
      {show && <ImportModal onClose={() => setShow(false)} />}
    </>
  );
}

// Standalone template button
export function NewFromTemplateButton() {
  const [show, setShow] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShow(true)}>
        <Wand2 className="w-3.5 h-3.5" /> From Template
      </Button>
      {show && <TemplateModal onClose={() => setShow(false)} />}
    </>
  );
}