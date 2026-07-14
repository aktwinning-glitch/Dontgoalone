import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, Trash2, ChevronDown, ChevronUp, AlertTriangle, Check } from "lucide-react";

export default function SnapshotManager({ selectedStoryId }) {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [status, setStatus] = useState(null);

  const storyId = selectedStoryId || "the_rental";

  const { data: snapshots = [], refetch } = useQuery({
    queryKey: ["snapshots", storyId],
    queryFn: () => base44.entities.StorySnapshot.filter({ story_id: storyId }, "-created_date", 20),
  });

  const handleSave = async () => {
    if (!label.trim()) return;
    setSaving(true);
    setStatus(null);
    try {
      const [events, dialogues, characters] = await Promise.all([
        base44.entities.GameEvent.filter({ story_id: storyId }),
        base44.entities.Dialogue.filter({ story_id: storyId }),
        base44.entities.Character.list(),
      ]);
      await base44.entities.StorySnapshot.create({
        story_id: storyId,
        label: label.trim(),
        notes: notes.trim(),
        events_json: JSON.stringify(events),
        dialogue_json: JSON.stringify(dialogues),
        characters_json: JSON.stringify(characters),
        event_count: events.length,
        dialogue_count: dialogues.length,
      });
      setLabel("");
      setNotes("");
      setStatus({ type: "success", msg: `Checkpoint saved: ${events.length} events, ${dialogues.length} dialogue lines.` });
      refetch();
    } catch (e) {
      setStatus({ type: "error", msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (snap) => {
    setRestoring(snap.id);
    setStatus(null);
    try {
      const events = JSON.parse(snap.events_json || "[]");
      const dialogues = JSON.parse(snap.dialogue_json || "[]");

      // Delete existing events and dialogue for this story
      const [existingEvents, existingDialogue] = await Promise.all([
        base44.entities.GameEvent.filter({ story_id: storyId }),
        base44.entities.Dialogue.filter({ story_id: storyId }),
      ]);
      await Promise.all([
        ...existingEvents.map(e => base44.entities.GameEvent.delete(e.id)),
        ...existingDialogue.map(d => base44.entities.Dialogue.delete(d.id)),
      ]);

      // Recreate from snapshot (strip DB-managed fields)
      const stripMeta = ({ id, created_date, updated_date, created_by, ...rest }) => rest;
      await Promise.all([
        ...events.map(e => base44.entities.GameEvent.create(stripMeta(e))),
        ...dialogues.map(d => base44.entities.Dialogue.create(stripMeta(d))),
      ]);

      ["events", "dialogue"].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
      setStatus({ type: "success", msg: `Restored "${snap.label}": ${events.length} events, ${dialogues.length} dialogue lines recreated.` });
      setConfirmRestore(null);
    } catch (e) {
      setStatus({ type: "error", msg: e.message });
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async (snapId) => {
    await base44.entities.StorySnapshot.delete(snapId);
    refetch();
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid hsl(252 10% 22%)" }}>
      {/* Header */}
      <button onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ background: "hsl(252 12% 15%)" }}>
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4" style={{ color: "hsl(186 72% 55%)" }} />
          <span className="text-sm font-bold" style={{ color: "hsl(186 72% 72%)" }}>Story Checkpoints</span>
          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
            style={{ background: "hsl(186 72% 50% / 0.15)", border: "1px solid hsl(186 72% 50% / 0.3)", color: "hsl(186 72% 65%)" }}>
            {snapshots.length} saved
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-4" style={{ background: "hsl(252 12% 12%)" }}>

          {/* Save new checkpoint */}
          <div className="space-y-2 p-3 rounded-xl" style={{ background: "hsl(252 12% 16%)", border: "1px solid hsl(252 10% 22%)" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Save Checkpoint</p>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Checkpoint label (e.g. 'Before Act 2 rewrite')"
              className="w-full text-xs rounded-lg px-3 py-2 bg-transparent"
              style={{ border: "1px solid hsl(252 10% 26%)", color: "hsl(40 30% 85%)" }}
            />
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full text-xs rounded-lg px-3 py-2 bg-transparent"
              style={{ border: "1px solid hsl(252 10% 26%)", color: "hsl(40 30% 85%)" }}
            />
            <Button size="sm" className="gap-1.5 text-xs" onClick={handleSave}
              disabled={saving || !label.trim()}
              style={{ background: "hsl(186 72% 38%)", color: "white" }}>
              <Camera className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Save Checkpoint"}
            </Button>
          </div>

          {/* Status */}
          {status && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
              style={{
                background: status.type === "success" ? "hsl(123 68% 45% / 0.1)" : "hsl(351 78% 60% / 0.1)",
                border: `1px solid ${status.type === "success" ? "hsl(123 68% 45% / 0.3)" : "hsl(351 78% 60% / 0.3)"}`,
                color: status.type === "success" ? "hsl(123 68% 65%)" : "hsl(351 78% 65%)",
              }}>
              {status.type === "success" ? <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
              {status.msg}
            </div>
          )}

          {/* Snapshot list */}
          {snapshots.length === 0 ? (
            <p className="text-xs text-muted-foreground/40 text-center py-4">No checkpoints saved yet.</p>
          ) : (
            <div className="space-y-2">
              {snapshots.map(snap => (
                <div key={snap.id} className="rounded-xl overflow-hidden"
                  style={{ border: confirmRestore?.id === snap.id ? "1px solid hsl(351 78% 60% / 0.5)" : "1px solid hsl(252 10% 22%)" }}>
                  <div className="flex items-center gap-3 px-3 py-2.5" style={{ background: "hsl(252 12% 17%)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: "hsl(40 30% 85%)" }}>{snap.label}</p>
                      <p className="text-[9px] text-muted-foreground/50 mt-0.5">
                        {new Date(snap.created_date).toLocaleString()} · {snap.event_count} events · {snap.dialogue_count} lines
                        {snap.notes && <span className="ml-1 italic">· {snap.notes}</span>}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="gap-1 text-[10px] h-7 px-2"
                        onClick={() => setConfirmRestore(confirmRestore?.id === snap.id ? null : snap)}
                        style={{ borderColor: "hsl(351 78% 60% / 0.4)", color: "hsl(351 78% 65%)" }}>
                        <RotateCcw className="w-3 h-3" /> Restore
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-30 hover:opacity-70"
                        onClick={() => handleDelete(snap.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Confirm restore */}
                  {confirmRestore?.id === snap.id && (
                    <div className="px-3 pb-3 pt-2 space-y-2" style={{ background: "hsl(351 78% 60% / 0.06)" }}>
                      <p className="text-[10px]" style={{ color: "hsl(351 78% 65%)" }}>
                        ⚠️ This will DELETE all current events and dialogue for <strong>{storyId}</strong> and restore from this checkpoint. This cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" className="gap-1 text-[10px] h-7"
                          onClick={() => handleRestore(snap)}
                          disabled={restoring === snap.id}
                          style={{ background: "hsl(351 78% 48%)", color: "white" }}>
                          {restoring === snap.id ? "Restoring..." : "Confirm Restore"}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-[10px] h-7"
                          onClick={() => setConfirmRestore(null)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}