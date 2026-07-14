import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Edit2, Save, X, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { validateStoryRecord, CANONICAL_STORY_IDS } from "@/lib/dataValidation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StoryPackageTools, { ImportStoryButton, NewFromTemplateButton } from "./StoryPackageTools";

// Seed stories if DB is empty — use CANONICAL story IDs with safe defaults
const SEED_STORIES = [
  {
    story_id: "the_rental", title: "The Rental", chapter_label: "Chapter 1",
    subtitle: "Six friends. One night. Something unfinished.",
    description: "A remote cabin. Old friends. Years ago, something happened here. No one talks about it — until they have to.",
    status: "active", emoji: "🔪", accent_color: "hsl(351 78% 60%)", survivor_count: 6,
    visible_on_homepage: true, sort_order: 0, unlock_requirement: "", ambient_sound_defaults: "none",
  },
  {
    story_id: "low_tide", title: "Low Tide", chapter_label: "Chapter 2",
    subtitle: "A coastal town. The fog rolls in. Something walks with it.",
    description: "The water's been retreating for three days. No one knows why. The town does.",
    status: "coming_soon", emoji: "🌊", accent_color: "hsl(200 65% 55%)", survivor_count: 6,
    visible_on_homepage: true, sort_order: 1, unlock_requirement: "Survive this night first.", ambient_sound_defaults: "none",
  },
  {
    story_id: "mardi_gras_curse", title: "Mardi Gras Curse", chapter_label: "Chapter 3",
    subtitle: "A celebration. A ritual. You weren't supposed to be part of it.",
    description: "Everyone's in costume. Everyone's smiling. Something in the crowd has been smiling longer than the rest.",
    status: "coming_soon", emoji: "🎭", accent_color: "hsl(271 87% 65%)", survivor_count: 6,
    visible_on_homepage: true, sort_order: 2, unlock_requirement: "Survive this night first.", ambient_sound_defaults: "none",
  },
];

const STATUS_COLORS = {
  active:      { bg: "hsl(123 68% 55% / 0.12)", color: "hsl(123 68% 65%)", border: "hsl(123 68% 55% / 0.35)" },
  locked:      { bg: "hsl(252 10% 22%)",          color: "hsl(252 10% 55%)", border: "hsl(252 10% 28%)" },
  draft:       { bg: "hsl(40 90% 62% / 0.12)",   color: "hsl(40 90% 68%)",  border: "hsl(40 90% 62% / 0.35)" },
  coming_soon: { bg: "hsl(271 87% 65% / 0.10)",  color: "hsl(271 87% 68%)", border: "hsl(271 87% 65% / 0.35)" },
};

function StoryForm({ story, onSave, onCancel, eventCount }) {
  const [form, setForm] = useState({
    story_id: "", title: "", chapter_label: "", subtitle: "",
    description: "", status: "locked", emoji: "📖", accent_color: "",
    cover_image_url: "", survivor_count: 6, visible_on_homepage: true,
    unlock_requirement: "", sort_order: 0, act_structure: "", ambient_sound_defaults: "",
    intro_beats: "", intro_image_key: "", intro_fallback_image_key: "", intro_fog_color: "",
    phase_definitions: "", map_background_key: "", map_overlay_key: "", node_layout_preset: "",
    ...story,
  });

  // Parse intro beats for display
  const parsedBeats = (() => {
    try { return form.intro_beats ? JSON.parse(form.intro_beats) : []; }
    catch { return []; }
  })();

  const updateBeat = (i, field, val) => {
    const beats = parsedBeats.length ? [...parsedBeats] : [{id:1,text:"",tapLabel:"Tap to continue"}];
    beats[i] = { ...beats[i], [field]: val };
    setForm(prev => ({ ...prev, intro_beats: JSON.stringify(beats) }));
  };
  const addBeat = () => {
    const beats = [...parsedBeats, { id: parsedBeats.length + 1, text: "", tapLabel: parsedBeats.length === 0 ? "Tap to continue" : "Begin →" }];
    setForm(prev => ({ ...prev, intro_beats: JSON.stringify(beats) }));
  };
  const removeBeat = (i) => {
    const beats = parsedBeats.filter((_, idx) => idx !== i);
    setForm(prev => ({ ...prev, intro_beats: JSON.stringify(beats) }));
  };

  const up = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-3 p-4 rounded-2xl" style={{ background: "hsl(252 12% 14%)", border: "1.5px solid hsl(271 87% 65% / 0.35)" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Edit Story</p>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCancel}><X className="w-3.5 h-3.5" /></Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Story ID</Label>
          <Input value={form.story_id} onChange={e => up("story_id", e.target.value)} className="text-xs h-8 font-mono" placeholder="story_1" />
        </div>
        <div>
          <Label className="text-[10px]">Emoji</Label>
          <Input value={form.emoji} onChange={e => up("emoji", e.target.value)} className="text-xs h-8" placeholder="🏚️" />
        </div>
      </div>

      <div>
        <Label className="text-[10px]">Title</Label>
        <Input value={form.title} onChange={e => up("title", e.target.value)} className="text-xs" placeholder="The Rental" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Chapter Label</Label>
          <Input value={form.chapter_label} onChange={e => up("chapter_label", e.target.value)} className="text-xs h-8" placeholder="Chapter 1" />
        </div>
        <div>
          <Label className="text-[10px]">Status</Label>
          <Select value={form.status} onValueChange={v => up("status", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="locked">Locked</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="coming_soon">Coming Soon</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-[10px]">Subtitle (homepage tagline)</Label>
        <Input value={form.subtitle} onChange={e => up("subtitle", e.target.value)} className="text-xs h-8" />
      </div>

      <div>
        <Label className="text-[10px]">Description (homepage card)</Label>
        <Textarea value={form.description} onChange={e => up("description", e.target.value)} className="text-xs h-16" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Accent Color (CSS)</Label>
          <Input value={form.accent_color} onChange={e => up("accent_color", e.target.value)} className="text-xs h-8" placeholder="hsl(351 78% 60%)" />
        </div>
        <div>
          <Label className="text-[10px]">Survivor Count</Label>
          <Input type="number" value={form.survivor_count} onChange={e => up("survivor_count", Number(e.target.value))} className="text-xs h-8" />
        </div>
      </div>

      <div>
        <Label className="text-[10px]">Cover Image URL</Label>
        <Input value={form.cover_image_url} onChange={e => up("cover_image_url", e.target.value)} className="text-xs h-8" placeholder="https://..." />
      </div>

      <div>
        <Label className="text-[10px]">Unlock Requirement Text</Label>
        <Input value={form.unlock_requirement} onChange={e => up("unlock_requirement", e.target.value)} className="text-xs h-8" placeholder="Survive The Rental first." />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="visible" checked={!!form.visible_on_homepage} onChange={e => up("visible_on_homepage", e.target.checked)} />
        <Label htmlFor="visible" className="text-[10px] cursor-pointer">Visible on homepage</Label>
      </div>

      {/* ── Intro Narration Section ── */}
      <div className="pt-3 mt-1 space-y-3" style={{ borderTop: "1px solid hsl(252 10% 22%)" }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Opening Narration (plug-and-play)</p>
        <p className="text-[9px] text-muted-foreground">These fields control the intro screen for this story. They override hardcoded defaults at runtime.</p>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">Intro Image Key</Label>
            <Input value={form.intro_image_key} onChange={e => up("intro_image_key", e.target.value)} className="text-xs h-8 font-mono" placeholder="introImage" />
          </div>
          <div>
            <Label className="text-[10px]">Fallback Image Key</Label>
            <Input value={form.intro_fallback_image_key} onChange={e => up("intro_fallback_image_key", e.target.value)} className="text-xs h-8 font-mono" placeholder="act1Image" />
          </div>
        </div>

        <div>
          <Label className="text-[10px]">Fog Overlay Color (CSS)</Label>
          <Input value={form.intro_fog_color} onChange={e => up("intro_fog_color", e.target.value)} className="text-xs h-8" placeholder="hsl(271 87% 65% / 0.12)" />
        </div>

        {/* ── Map + Phase Section ── */}
        <div className="pt-3 mt-1 space-y-3" style={{ borderTop: "1px solid hsl(252 10% 22%)" }}>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Map &amp; Phase Settings</p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Map Background Key</Label>
              <Input value={form.map_background_key} onChange={e => up("map_background_key", e.target.value)} className="text-xs h-8 font-mono" placeholder="rentalMapImage" />
            </div>
            <div>
              <Label className="text-[10px]">Map Overlay Key</Label>
              <Input value={form.map_overlay_key} onChange={e => up("map_overlay_key", e.target.value)} className="text-xs h-8 font-mono" placeholder="mapFogOverlay" />
            </div>
          </div>

          <div>
            <Label className="text-[10px]">Node Layout Preset</Label>
            <Input value={form.node_layout_preset} onChange={e => up("node_layout_preset", e.target.value)} className="text-xs h-8" placeholder="cabin | beach | lab | french_quarter" />
          </div>

          <div>
            <Label className="text-[10px]">Phase Definitions (JSON)</Label>
            <p className="text-[9px] text-muted-foreground mb-1">Array of phases: [{`{id, label, sublabel, emoji, color, bg, border, maxChoices}`}]. Leave blank to use built-in per-story phases.</p>
            <Textarea
              value={form.phase_definitions}
              onChange={e => up("phase_definitions", e.target.value)}
              className="text-[10px] font-mono h-24"
              placeholder={`[\n  {"id": "opening", "label": "Night", "sublabel": "Arrival", "emoji": "🌙", "color": "hsl(271 87% 68%)", "maxChoices": 8},\n  {"id": "final_phase", "label": "Dawn", "sublabel": "Outcome", "emoji": "🌅", "maxChoices": 9999}\n]`}
            />
            {form.phase_definitions && (() => {
              try { const p = JSON.parse(form.phase_definitions); return <p className="text-[9px] mt-1" style={{ color: "hsl(123 68% 60%)" }}>✓ {p.length} phase(s) configured</p>; }
              catch { return <p className="text-[9px] mt-1" style={{ color: "hsl(351 78% 65%)" }}>⚠ Invalid JSON</p>; }
            })()}
          </div>
        </div>

        <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-[10px]">Narration Beats ({parsedBeats.length})</Label>
            <button onClick={addBeat} className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: "hsl(271 87% 65%/0.15)", color: "hsl(271 87% 72%)" }}>+ Add Beat</button>
          </div>
          <div className="space-y-2">
            {parsedBeats.map((beat, i) => (
              <div key={i} className="rounded-xl p-3 space-y-2" style={{ background: "hsl(252 12% 18%)", border: "1px solid hsl(252 10% 24%)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-black text-muted-foreground w-4">#{i+1}</span>
                  <Input
                    value={beat.tapLabel || ""}
                    onChange={e => updateBeat(i, "tapLabel", e.target.value)}
                    className="text-[10px] h-6 flex-1"
                    placeholder={i < parsedBeats.length - 1 ? "Tap to continue" : "Begin →"}
                  />
                  <button onClick={() => removeBeat(i)} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "hsl(351 78%/0.15)", color: "hsl(351 78% 65%)" }}>×</button>
                </div>
                <Textarea
                  value={beat.text || ""}
                  onChange={e => updateBeat(i, "text", e.target.value)}
                  rows={2}
                  className="text-[10px] w-full"
                  placeholder="Narration beat text..."
                />
              </div>
            ))}
            {parsedBeats.length === 0 && (
              <p className="text-[9px] text-muted-foreground italic">No beats yet. Click + Add Beat to create opening narration for this story.</p>
            )}
          </div>
        </div>
      </div>

      {typeof eventCount === "number" && (
        <p className="text-[10px] text-muted-foreground">
          Linked events: <span className="font-bold text-foreground">{eventCount}</span>
          {" · "}storyId: <code className="font-mono bg-secondary px-1 rounded">{form.story_id}</code>
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <Button size="sm" className="gap-1 text-xs" onClick={() => onSave(form)}>
          <Save className="w-3 h-3" /> Save
        </Button>
        <Button size="sm" variant="outline" className="text-xs" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export default function StoryManager() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [seeded, setSeeded] = useState(false);
  const CANONICAL_IDS = ["the_rental", "low_tide", "mardi_gras_curse"];

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["stories"],
    queryFn: () => base44.entities.Story.list("sort_order"),
    initialData: [],
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.GameEvent.list("sort_order"),
    initialData: [],
  });

  const getEventCount = (storyId) => events.filter(e => e.story_id === storyId).length;

  // Auto-seed if DB is empty
  const handleSeedDefaults = async () => {
    for (const s of SEED_STORIES) {
      await base44.entities.Story.create(s);
    }
    qc.invalidateQueries({ queryKey: ["stories"] });
    setSeeded(true);
  };

  const handleSave = async (form) => {
    // Validate + normalize before saving
    const validated = validateStoryRecord(form);
    if (form.id) {
      await base44.entities.Story.update(form.id, validated);
    } else {
      await base44.entities.Story.create(validated);
    }
    qc.invalidateQueries({ queryKey: ["stories"] });
    setEditingId(null);
  };

  const handleDelete = async (story) => {
    if (!window.confirm(`Delete "${story.title}"? This does not delete linked events.`)) return;
    await base44.entities.Story.delete(story.id);
    qc.invalidateQueries({ queryKey: ["stories"] });
  };

  const handleToggleVisible = async (story) => {
    await base44.entities.Story.update(story.id, { visible_on_homepage: !story.visible_on_homepage });
    qc.invalidateQueries({ queryKey: ["stories"] });
  };

  const handleNewStory = () => {
    setEditingId("__new__");
  };

  // Detect duplicate story IDs
  const duplicateDetection = (() => {
    const seen = new Map();
    const dupes = [];
    stories.forEach(s => {
      const sid = s.story_id || s.id;
      if (seen.has(sid)) {
        dupes.push(sid);
      } else {
        seen.set(sid, s.id);
      }
    });
    return dupes;
  })();

  const deprecatedIds = stories.filter(s => {
    const sid = s.story_id || s.id;
    return sid.startsWith("story_") && !CANONICAL_STORY_IDS.includes(sid);
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-secondary border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-3">
      {/* Integrity warnings */}
      {deprecatedIds.length > 0 && (
        <div className="rounded-2xl p-3 space-y-2" style={{ background: "hsl(40 90% 60% / 0.12)", border: "1px solid hsl(40 90% 60% / 0.35)" }}>
          <p className="text-[11px] font-bold" style={{ color: "hsl(40 90% 70%)" }}>⚠️ Deprecated Story IDs Found</p>
          <p className="text-[10px] text-muted-foreground">These should use canonical IDs: {CANONICAL_STORY_IDS.join(", ")}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {deprecatedIds.map(s => (
              <code key={s.id} className="text-[9px] px-2 py-0.5 rounded" style={{ background: "hsl(40 90% 60% / 0.25)", color: "hsl(40 90% 75%)" }}>{s.story_id}</code>
            ))}
          </div>
        </div>
      )}
      {duplicateDetection.length > 0 && (
        <div className="rounded-2xl p-3 space-y-2" style={{ background: "hsl(351 78% 60% / 0.12)", border: "1px solid hsl(351 78% 60% / 0.35)" }}>
          <p className="text-[11px] font-bold" style={{ color: "hsl(351 78% 70%)" }}>⚠️ Duplicate Story Records</p>
          <p className="text-[10px] text-muted-foreground">Multiple records with same story_id:</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {duplicateDetection.map(sid => (
              <code key={sid} className="text-[9px] px-2 py-0.5 rounded" style={{ background: "hsl(351 78% 60% / 0.25)", color: "hsl(351 78% 75%)" }}>{sid}</code>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Delete deprecated/duplicate records to keep only one per canonical ID.</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground flex-1">
          Stories are the source of truth for homepage cards. Each links events via <code className="font-mono bg-secondary px-1 rounded">story_id</code>.
        </p>
        <div className="flex gap-2 flex-wrap">
          <ImportStoryButton />
          <NewFromTemplateButton />
          <Button size="sm" variant="outline" className="gap-1" onClick={handleNewStory}>
            <Plus className="w-3.5 h-3.5" /> New Story
          </Button>
        </div>
      </div>

      {stories.length === 0 && !seeded && (
        <div className="rounded-2xl p-5 text-center space-y-3" style={{ background: "hsl(252 12% 14%)", border: "1.5px solid hsl(252 10% 22%)" }}>
          <p className="text-sm font-bold text-foreground">No stories yet</p>
          <p className="text-xs text-muted-foreground">Seed the 3 default chapters, or import a story package.</p>
          <Button size="sm" onClick={handleSeedDefaults}>Seed Default Stories</Button>
        </div>
      )}

      {/* New story form */}
      {editingId === "__new__" && (
        <StoryForm
          story={{ story_id: "story_" + (stories.length + 1), status: "draft", visible_on_homepage: false, emoji: "📖", survivor_count: 6, sort_order: stories.length }}
          onSave={handleSave}
          onCancel={() => setEditingId(null)}
        />
      )}

      {stories.map(story => {
        const sid = story.story_id || story.id;
        const evCount = getEventCount(sid);
        const sc = STATUS_COLORS[story.status] || STATUS_COLORS.locked;
        const isEditing = editingId === sid;

        if (isEditing) {
          return (
            <StoryForm key={sid} story={story} eventCount={evCount} onSave={handleSave} onCancel={() => setEditingId(null)} />
          );
        }

        return (
          <Card key={sid} className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
                style={{ background: sc.bg, border: `1.5px solid ${sc.border}` }}
              >
                {story.emoji || "📖"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold">{story.title || "(untitled)"}</p>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                    {story.status}
                  </span>
                  {!story.visible_on_homepage && (
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: "hsl(252 10% 20%)", color: "hsl(252 8% 45%)", border: "1px solid hsl(252 10% 26%)" }}>
                      hidden
                    </span>
                  )}
                </div>
                {story.chapter_label && <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">{story.chapter_label}</p>}
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{story.description}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <p className="text-[10px] font-mono text-muted-foreground/70">id: <span className="text-foreground">{sid}</span></p>
                  <p className="text-[10px] text-muted-foreground">Events: <span className="font-bold text-foreground">{evCount}</span></p>
                  <p className="text-[10px] text-muted-foreground">Survivors: <span className="font-bold text-foreground">{story.survivor_count ?? 6}</span></p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" title={story.visible_on_homepage ? "Hide from homepage" : "Show on homepage"} onClick={() => handleToggleVisible(story)}>
                  {story.visible_on_homepage ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(sid)}>
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(story)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Package tools row */}
            <div className="pt-2 border-t border-border/30">
              <StoryPackageTools story={story} onDuplicated={() => qc.invalidateQueries({ queryKey: ["stories"] })} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}