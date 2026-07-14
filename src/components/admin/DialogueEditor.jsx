import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Save, MessageSquare, Filter, Copy, Zap, Loader2 } from "lucide-react";

const CATEGORIES = ["general", "banter", "clue", "regroup", "chase", "ending", "suspicious", "funny", "tense", "emotional"];
const ACTS = ["any", "act_1", "act_2", "act_3", "act_4", "act_5"];
const CONTEXTS = ["", "low_fear", "high_fear", "after_death", "after_choice_success", "after_choice_fail", "isolated", "milestone"];

const EMPTY = { story_id: "", character_name: "", category: "general", line: "", trigger_context: "", act: "any", tags: "", sort_order: 0 };

function Pill({ value, active, onClick }) {
  return (
    <button onClick={onClick} className="text-[9px] px-2 py-0.5 rounded-full font-bold capitalize transition-colors"
      style={{
        background: active ? "hsl(271 87% 65% / 0.25)" : "hsl(252 12% 20%)",
        border: `1px solid ${active ? "hsl(271 87% 65% / 0.5)" : "hsl(252 10% 26%)"}`,
        color: active ? "hsl(271 87% 78%)" : "hsl(252 8% 55%)",
      }}>
      {value}
    </button>
  );
}

function DialogueForm({ item, stories, characters, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY, ...item });
  const up = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const charOptions = characters.map(c => c.name);
  // dedupe
  const charSet = [...new Set(charOptions)];

  return (
    <div className="space-y-3 p-4 rounded-2xl" style={{ background: "hsl(252 12% 14%)", border: "1.5px solid hsl(271 87% 65% / 0.3)" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{item?.id ? "Edit" : "New"} Dialogue Line</p>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCancel}><Plus className="w-3.5 h-3.5 rotate-45" /></Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Story ID</Label>
          <select value={form.story_id} onChange={e => up("story_id", e.target.value)}
            className="w-full h-8 px-2 rounded-lg text-xs font-mono"
            style={{ background: "hsl(252 12% 18%)", border: "1px solid hsl(252 10% 26%)", color: "hsl(40 30% 88%)" }}>
            <option value="">— any —</option>
            {stories.map(s => <option key={s.story_id} value={s.story_id}>{s.story_id}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-[10px]">Character</Label>
          <Input list="char-list" value={form.character_name} onChange={e => up("character_name", e.target.value)} className="text-xs h-8" placeholder="Ashley" />
          <datalist id="char-list">{charSet.map(c => <option key={c} value={c} />)}</datalist>
        </div>
      </div>

      <div>
        <Label className="text-[10px]">Dialogue Line</Label>
        <Textarea value={form.line} onChange={e => up("line", e.target.value)} className="h-20 text-xs" placeholder="What does this character say?" />
      </div>

      <div>
        <Label className="text-[10px]">Category</Label>
        <div className="flex flex-wrap gap-1 mt-1">
          {CATEGORIES.map(c => <Pill key={c} value={c} active={form.category === c} onClick={() => up("category", c)} />)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Act</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {ACTS.map(a => <Pill key={a} value={a} active={form.act === a} onClick={() => up("act", a)} />)}
          </div>
        </div>
        <div>
          <Label className="text-[10px]">Trigger Context</Label>
          <select value={form.trigger_context} onChange={e => up("trigger_context", e.target.value)}
            className="w-full h-8 px-2 rounded-lg text-[10px]"
            style={{ background: "hsl(252 12% 18%)", border: "1px solid hsl(252 10% 26%)", color: "hsl(40 30% 88%)" }}>
            {CONTEXTS.map(c => <option key={c} value={c}>{c || "— any —"}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Tags (comma-sep)</Label>
          <Input value={form.tags || ""} onChange={e => up("tags", e.target.value)} className="text-xs h-8" placeholder="horror, funny" />
        </div>
        <div>
          <Label className="text-[10px]">Sort Order</Label>
          <Input type="number" value={form.sort_order || 0} onChange={e => up("sort_order", Number(e.target.value))} className="text-xs h-8" />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" className="gap-1 text-xs" onClick={() => onSave(form)}><Save className="w-3 h-3" /> Save</Button>
        <Button size="sm" variant="outline" className="text-xs" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export default function DialogueEditor({ selectedStoryId }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [filterChar, setFilterChar] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterStory, setFilterStory] = useState(selectedStoryId || "");
  const [search, setSearch] = useState("");

  const [populating, setPopulating] = useState(false);
  const [populateLog, setPopulateLog] = useState("");

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.GameEvent.list("sort_order"),
  });

  const { data: lines = [] } = useQuery({
    queryKey: ["dialogue"],
    queryFn: () => base44.entities.Dialogue.list("sort_order"),
  });

  const { data: stories = [] } = useQuery({
    queryKey: ["stories"],
    queryFn: () => base44.entities.Story.list("sort_order"),
  });

  const { data: characters = [] } = useQuery({
    queryKey: ["characters"],
    queryFn: () => base44.entities.Character.list("sort_order"),
  });

  const save = useMutation({
    mutationFn: (data) => data.id ? base44.entities.Dialogue.update(data.id, data) : base44.entities.Dialogue.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dialogue"] }); setEditing(null); },
  });

  const remove = useMutation({
    mutationFn: (id) => base44.entities.Dialogue.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dialogue"] }),
  });

  const duplicate = useMutation({
    mutationFn: (line) => {
      const { id, created_date, updated_date, created_by, ...rest } = line;
      return base44.entities.Dialogue.create(rest);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dialogue"] }),
  });

  const populateFromEvents = async () => {
    setPopulating(true);
    const storyToProcess = filterStory || selectedStoryId;
    const scopedEvents = storyToProcess ? events.filter(e => e.story_id === storyToProcess) : events;
    const existingLines = lines.filter(l => l.story_id === storyToProcess);
    const existingContexts = new Set(existingLines.map(l => l.trigger_context));
    const records = [];
    scopedEvents.forEach(ev => {
      // Main event text as Narrator line
      const ctx = `event:${ev.event_id}`;
      if (!existingContexts.has(ctx) && ev.text) {
        records.push({ story_id: ev.story_id || storyToProcess, character_name: "Narrator", category: ev.is_ending ? "ending" : "general", line: String(ev.text).slice(0, 1000), trigger_context: ctx, act: ev.night ? `act_${Math.min(ev.night, 4)}` : "any", sort_order: ev.sort_order || 0 });
      }
      // Ending text
      if (ev.is_ending && ev.ending_text) {
        const endCtx = `ending:${ev.ending_type || "bad"}`;
        if (!existingContexts.has(endCtx)) {
          records.push({ story_id: ev.story_id || storyToProcess, character_name: "Narrator", category: "ending", line: String(ev.ending_text).slice(0, 1000), trigger_context: endCtx, act: "any", sort_order: ev.sort_order || 0 });
        }
      }
      // Choice outcome texts
      let choices;
      try { choices = typeof ev.choices === "string" ? JSON.parse(ev.choices) : (ev.choices || []); } catch { choices = []; }
      choices.forEach((c, ci) => {
        [["success", c.successEffect], ["fail", c.failEffect]].forEach(([label, eff]) => {
          let e; try { e = typeof eff === "string" ? JSON.parse(eff) : (eff || {}); } catch { e = {}; }
          if (e.outcomeText) {
            const octx = `choice_${label}:${ev.event_id}:${ci}`;
            if (!existingContexts.has(octx)) {
              records.push({ story_id: ev.story_id || storyToProcess, character_name: e.speaker || "Narrator", category: label === "success" ? "general" : "tense", line: String(e.outcomeText).slice(0, 1000), trigger_context: octx, act: ev.night ? `act_${Math.min(ev.night, 4)}` : "any", sort_order: ev.sort_order || 0 });
            }
          }
        });
      });
    });
    // Batch create
    for (let i = 0; i < records.length; i += 15) {
      await Promise.all(records.slice(i, i + 15).map(r => base44.entities.Dialogue.create(r)));
    }
    qc.invalidateQueries({ queryKey: ["dialogue"] });
    setPopulateLog(`✓ Extracted ${records.length} new dialogue record(s) from ${scopedEvents.length} events.`);
    setPopulating(false);
  };

  const filtered = useMemo(() => {
    return lines.filter(l => {
      if (filterStory && l.story_id !== filterStory) return false;
      if (filterChar && l.character_name !== filterChar) return false;
      if (filterCat && l.category !== filterCat) return false;
      if (search && !l.line?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [lines, filterStory, filterChar, filterCat, search]);

  const chars = [...new Set(lines.map(l => l.character_name).filter(Boolean))].sort();
  const cats = [...new Set(lines.map(l => l.category).filter(Boolean))].sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="font-display text-sm tracking-wide">Dialogue Editor</h3>
          <p className="text-[10px] text-muted-foreground">{filtered.length} / {lines.length} lines</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={populateFromEvents} disabled={populating}
            title="Auto-extract dialogue from imported events">
            {populating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            Auto-Fill
          </Button>
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setEditing({ ...EMPTY, story_id: filterStory || selectedStoryId || "" })}>
            <Plus className="w-3 h-3" /> Add Line
          </Button>
        </div>
      </div>
      {populateLog && (
        <div className="text-[10px] px-3 py-2 rounded-lg font-mono" style={{ background: "hsl(123 68% 50% / 0.1)", color: "hsl(123 68% 65%)" }}>{populateLog}</div>
      )}

      {/* Filters */}
      <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(252 12% 16%)", border: "1px solid hsl(252 10% 22%)" }}>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3 h-3 text-muted-foreground shrink-0" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search lines..." className="text-[10px] h-7 flex-1 min-w-24" />
        </div>
        <div className="flex flex-wrap gap-1">
          <Pill value="all stories" active={!filterStory} onClick={() => setFilterStory("")} />
          {stories.map(s => <Pill key={s.story_id} value={s.story_id} active={filterStory === s.story_id} onClick={() => setFilterStory(filterStory === s.story_id ? "" : s.story_id)} />)}
        </div>
        {chars.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <Pill value="all chars" active={!filterChar} onClick={() => setFilterChar("")} />
            {chars.map(c => <Pill key={c} value={c} active={filterChar === c} onClick={() => setFilterChar(filterChar === c ? "" : c)} />)}
          </div>
        )}
        {cats.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <Pill value="all types" active={!filterCat} onClick={() => setFilterCat("")} />
            {cats.map(c => <Pill key={c} value={c} active={filterCat === c} onClick={() => setFilterCat(filterCat === c ? "" : c)} />)}
          </div>
        )}
      </div>

      {editing && (
        <DialogueForm
          item={editing}
          stories={stories}
          characters={characters}
          onSave={(data) => save.mutate(data)}
          onCancel={() => setEditing(null)}
        />
      )}

      {filtered.length === 0 && !editing && (
        <div className="text-center py-8 text-[11px] text-muted-foreground/40">
          No dialogue lines found. Add lines or adjust filters.
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(l => {
          const catColors = {
            clue: "#5ae87a", suspicious: "#f5c842", tense: "#e8705a", emotional: "#c87af5",
            funny: "#f5c842", chase: "#e8705a", banter: "#5ac8f5", regroup: "#78b0f5",
            ending: "#c87af5", general: "#888",
          };
          const catColor = catColors[l.category] || "#888";
          return (
            <Card key={l.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${catColor}18` }}>
                    <MessageSquare className="w-3 h-3" style={{ color: catColor }} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className="text-[10px] font-bold text-foreground">{l.character_name}</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase" style={{ background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}30` }}>{l.category}</span>
                    {l.act && l.act !== "any" && <span className="text-[8px] text-muted-foreground/60 font-mono">{l.act}</span>}
                    {l.story_id && <span className="text-[8px] font-mono text-muted-foreground/50">{l.story_id}</span>}
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed line-clamp-2">"{l.line}"</p>
                  {l.trigger_context && <p className="text-[9px] text-muted-foreground mt-0.5">⚡ {l.trigger_context}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Duplicate" onClick={() => duplicate.mutate(l)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing({ ...l })}>
                    <Save className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(l.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}