import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import ResponsiveSelect from "@/components/ui/ResponsiveSelect";
import { Plus, Trash2, Save, FileText, ChevronDown, ChevronUp } from "lucide-react";

const STATS = ["strength", "speed", "resilience", "intelligence", "fear", "charm", "influence"];
const LOCATIONS = ["", "living", "kitchen", "porch", "upstairs", "basement", "woods", "outdoor", "indoor"];

function ChoiceEditor({ choice, onChange, onRemove, index }) {
  const [expanded, setExpanded] = useState(false);

  const update = (field, value) => onChange({ ...choice, [field]: value });
  const updateEffect = (type, field, value) => {
    const effect = typeof choice[type] === "string" ? JSON.parse(choice[type] || "{}") : (choice[type] || {});
    onChange({ ...choice, [type]: { ...effect, [field]: value } });
  };

  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-muted-foreground">#{index + 1}</span>
        <Input value={choice.text || ""} onChange={e => update("text", e.target.value)} placeholder="Choice text" className="text-xs h-8" />
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-destructive" onClick={onRemove}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
      {expanded && (
        <div className="space-y-2 pl-6">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Stat Used</Label>
              <ResponsiveSelect
                value={choice.statUsed || ""}
                onValueChange={v => update("statUsed", v)}
                placeholder="Stat"
                options={STATS.map(s => ({ value: s, label: s }))}
                triggerClassName="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px]">Difficulty (1-4)</Label>
              <Input type="number" min={1} max={4} value={choice.difficulty || 2} onChange={e => update("difficulty", Number(e.target.value))} className="h-8 text-xs" />
            </div>
          </div>
          <div>
            <Label className="text-[10px]">Next Event ID</Label>
            <Input value={choice.nextEventId || ""} onChange={e => update("nextEventId", e.target.value)} className="h-8 text-xs" placeholder="event_X" />
          </div>
          <div>
            <Label className="text-[10px]">Success Effect (JSON)</Label>
            <Textarea
              value={typeof choice.successEffect === "object" ? JSON.stringify(choice.successEffect, null, 2) : (choice.successEffect || "")}
              onChange={e => {
                try { update("successEffect", JSON.parse(e.target.value)); } catch { update("successEffect", e.target.value); }
              }}
              className="h-20 text-[10px] font-mono"
              placeholder='{"outcomeText":"...", "fearChange":0, "threatChange":0}'
            />
          </div>
          <div>
            <Label className="text-[10px]">Fail Effect (JSON)</Label>
            <Textarea
              value={typeof choice.failEffect === "object" ? JSON.stringify(choice.failEffect, null, 2) : (choice.failEffect || "")}
              onChange={e => {
                try { update("failEffect", JSON.parse(e.target.value)); } catch { update("failEffect", e.target.value); }
              }}
              className="h-20 text-[10px] font-mono"
              placeholder='{"outcomeText":"...", "fearChange":5, "threatChange":10}'
            />
          </div>
          <div>
            <Label className="text-[10px]">Flags Added (JSON)</Label>
            <Input
              value={typeof choice.flagsAdded === "object" ? JSON.stringify(choice.flagsAdded) : (choice.flagsAdded || "")}
              onChange={e => {
                try { update("flagsAdded", JSON.parse(e.target.value)); } catch { update("flagsAdded", e.target.value); }
              }}
              className="h-8 text-[10px] font-mono"
              placeholder='{"noise_made": true}'
            />
          </div>
        </div>
      )}
    </Card>
  );
}

export default function EventEditor() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [storyFilter, setStoryFilter] = useState("");

  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.GameEvent.list("sort_order"),
    initialData: [],
  });

  const { data: stories = [] } = useQuery({
    queryKey: ["stories"],
    queryFn: () => base44.entities.Story.list("sort_order"),
  });

  const storyOptions = stories.map(s => ({ value: s.story_id, label: `${s.story_id} — ${s.title}` }));
  const filteredEvents = storyFilter ? events.filter(e => e.story_id === storyFilter) : events;

  const save = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        choices: typeof data.choices === "string" ? data.choices : JSON.stringify(data.choices || []),
        conditions: typeof data.conditions === "string" ? data.conditions : JSON.stringify(data.conditions || null),
      };
      return data.id
        ? base44.entities.GameEvent.update(data.id, payload)
        : base44.entities.GameEvent.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); setEditing(null); },
  });

  const remove = useMutation({
    mutationFn: (id) => base44.entities.GameEvent.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });

  if (editing) {
    const choices = typeof editing.choices === "string" ? JSON.parse(editing.choices || "[]") : (editing.choices || []);

    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-sm">{editing.id ? "Edit" : "New"} Event</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Event ID</Label>
              <Input value={editing.event_id || ""} onChange={e => setEditing({ ...editing, event_id: e.target.value })} placeholder="event_1" className="text-xs" />
            </div>
            <div>
              <Label className="text-xs">Night</Label>
              <Input type="number" value={editing.night || 1} onChange={e => setEditing({ ...editing, night: Number(e.target.value) })} className="text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Story ID</Label>
            <ResponsiveSelect
              value={editing.story_id || ""}
              onValueChange={v => setEditing({ ...editing, story_id: v })}
              placeholder="Select story..."
              options={storyOptions.length ? storyOptions : [{ value: editing.story_id || "", label: editing.story_id || "No stories" }]}
              triggerClassName="h-8 text-xs"
            />
            </div>
            <div>
              <Label className="text-xs">Sort Order</Label>
              <Input type="number" value={editing.sort_order || 0} onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })} className="text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Location</Label>
              <select value={editing.location || ""} onChange={e => setEditing({ ...editing, location: e.target.value })}
                className="w-full h-8 px-2 rounded-md text-xs border border-input bg-transparent">
                {LOCATIONS.map(l => <option key={l} value={l}>{l || "— none —"}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Phase Label</Label>
              <Input value={editing.phase_label || ""} onChange={e => setEditing({ ...editing, phase_label: e.target.value })} className="text-xs h-8" placeholder="e.g. The Search" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Text</Label>
            <Textarea value={editing.text || ""} onChange={e => setEditing({ ...editing, text: e.target.value })} className="h-24 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Image Key</Label>
            <Input value={editing.image_key || ""} onChange={e => setEditing({ ...editing, image_key: e.target.value })} className="text-xs" placeholder="cabin_exterior" />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={editing.is_ending || false} onCheckedChange={v => setEditing({ ...editing, is_ending: v })} />
              <Label className="text-xs">Is Ending</Label>
            </div>
            {editing.is_ending && (
              <ResponsiveSelect
                value={editing.ending_type || ""}
                onValueChange={v => setEditing({ ...editing, ending_type: v })}
                placeholder="Type"
                options={[
                  { value: "good", label: "Good" },
                  { value: "mixed", label: "Mixed" },
                  { value: "bad", label: "Bad" },
                ]}
                triggerClassName="h-8 text-xs w-24"
              />
            )}
          </div>
          {editing.is_ending && (
            <div>
              <Label className="text-xs">Ending Text</Label>
              <Textarea value={editing.ending_text || ""} onChange={e => setEditing({ ...editing, ending_text: e.target.value })} className="h-16 text-xs" />
            </div>
          )}
          <div>
            <Label className="text-xs">Conditions (JSON)</Label>
            <Textarea
              value={typeof editing.conditions === "object" && editing.conditions !== null ? JSON.stringify(editing.conditions, null, 2) : (editing.conditions || "")}
              onChange={e => {
                try { setEditing({ ...editing, conditions: JSON.parse(e.target.value) }); } catch { setEditing({ ...editing, conditions: e.target.value }); }
              }}
              className="h-16 text-[10px] font-mono"
              placeholder='{"flags":{"noise_made":true},"minThreat":50}'
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-semibold">Choices ({choices.length})</Label>
              <Button size="sm" variant="outline" className="text-[10px] h-6 gap-1" onClick={() => {
                setEditing({ ...editing, choices: [...choices, { text: "", statUsed: "strength", difficulty: 2, successEffect: {}, failEffect: {}, nextEventId: "" }] });
              }}>
                <Plus className="w-2.5 h-2.5" /> Add
              </Button>
            </div>
            {choices.map((c, i) => (
              <ChoiceEditor
                key={i}
                choice={c}
                index={i}
                onChange={(updated) => {
                  const newChoices = [...choices];
                  newChoices[i] = updated;
                  setEditing({ ...editing, choices: newChoices });
                }}
                onRemove={() => {
                  setEditing({ ...editing, choices: choices.filter((_, j) => j !== i) });
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => save.mutate(editing)} disabled={save.isPending} className="gap-1">
            <Save className="w-3 h-3" /> Save
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Events</h3>
          <select value={storyFilter} onChange={e => setStoryFilter(e.target.value)}
            className="text-[10px] h-7 px-2 rounded-lg font-mono"
            style={{ background: "hsl(252 12% 18%)", border: "1px solid hsl(252 10% 26%)", color: "hsl(40 30% 80%)" }}>
            <option value="">All ({events.length})</option>
            {stories.map(s => <option key={s.story_id} value={s.story_id}>{s.story_id} ({events.filter(e => e.story_id === s.story_id).length})</option>)}
          </select>
        </div>
        <Button size="sm" variant="outline" onClick={() => setEditing({ event_id: "", text: "", choices: [], night: 1, sort_order: events.length, story_id: storyFilter || "" })} className="gap-1 text-xs">
          <Plus className="w-3 h-3" /> Add
        </Button>
      </div>
      {filteredEvents.map(ev => (
        <Card key={ev.id} className="p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono font-medium">{ev.event_id}</p>
            <p className="text-[10px] text-muted-foreground truncate">{ev.text}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {ev.is_ending && <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground">END</span>}
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
              const parsed = {
                ...ev,
                choices: ev.choices ? JSON.parse(ev.choices) : [],
                conditions: ev.conditions ? JSON.parse(ev.conditions) : null,
              };
              setEditing(parsed);
            }}>
              <Save className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(ev.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}