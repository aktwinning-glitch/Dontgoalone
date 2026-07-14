import React, { useState, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, GripVertical, CheckCircle2, Loader2, Image, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";

function FileRow({ file, index, onRemove, onMoveUp, onMoveDown, onUpdateKey, isFirst, isLast, status }) {
  const isImage = file.file.type.startsWith("image/");
  const isJson = file.file.type === "application/json" || file.file.name.endsWith(".json");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-2 rounded-xl p-2"
      style={{ background: "hsl(252 12% 18%)", border: "1px solid hsl(252 10% 24%)" }}
    >
      {/* Drag handle + reorder buttons */}
      <div className="flex flex-col items-center gap-0.5 shrink-0">
        <button
          onClick={() => onMoveUp(index)}
          disabled={isFirst}
          className="w-4 h-3 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
          style={{ fontSize: 8 }}
        >▲</button>
        <GripVertical className="w-3 h-3 text-muted-foreground/40" />
        <button
          onClick={() => onMoveDown(index)}
          disabled={isLast}
          className="w-4 h-3 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
          style={{ fontSize: 8 }}
        >▼</button>
      </div>

      {/* Preview */}
      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center" style={{ background: "hsl(252 12% 22%)" }}>
        {isImage && file.preview
          ? <img src={file.preview} alt="" className="w-full h-full object-cover" />
          : isJson
          ? <FileText className="w-4 h-4 text-muted-foreground" />
          : <Image className="w-4 h-4 text-muted-foreground" />
        }
      </div>

      {/* Info + key edit */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-[10px] text-muted-foreground truncate">{file.file.name}</p>
        {isImage && (
          <Input
            value={file.assetKey}
            onChange={e => onUpdateKey(index, e.target.value)}
            placeholder="asset_key (e.g. lake_front)"
            className="h-5 text-[9px] font-mono px-2"
          />
        )}
        <span
          className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded"
          style={{ background: isImage ? "hsl(271 87% 65% / 0.15)" : "hsl(40 90% 62% / 0.15)", color: isImage ? "hsl(271 87% 75%)" : "hsl(40 90% 68%)" }}
        >
          {isImage ? "image" : isJson ? "json" : "file"}
        </span>
      </div>

      {/* Status */}
      <div className="shrink-0">
        {status === "uploading" && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        {status === "done" && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "hsl(123 68% 55%)" }} />}
        {status === "error" && <AlertCircle className="w-3.5 h-3.5" style={{ color: "hsl(351 78% 60%)" }} />}
        {!status && (
          <button onClick={() => onRemove(index)} className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function BulkImport({ onImportComplete }) {
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileStatuses, setFileStatuses] = useState({});
  const [importType, setImportType] = useState("scene"); // scene | character
  const inputRef = useRef(null);
  const qc = useQueryClient();

  const addFiles = useCallback((rawFiles) => {
    const newEntries = Array.from(rawFiles).map((f, i) => ({
      id: `${Date.now()}_${i}`,
      file: f,
      preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
      assetKey: f.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
    }));
    setFiles(prev => [...prev, ...newEntries]);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleRemove = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));
  const handleMoveUp = (idx) => {
    if (idx === 0) return;
    setFiles(prev => { const a = [...prev]; [a[idx-1], a[idx]] = [a[idx], a[idx-1]]; return a; });
  };
  const handleMoveDown = (idx) => {
    setFiles(prev => { if (idx >= prev.length - 1) return prev; const a = [...prev]; [a[idx], a[idx+1]] = [a[idx+1], a[idx]]; return a; });
  };
  const handleUpdateKey = (idx, key) => {
    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, assetKey: key } : f));
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    const newStatuses = {};

    for (let i = 0; i < files.length; i++) {
      const entry = files[i];
      newStatuses[entry.id] = "uploading";
      setFileStatuses({ ...newStatuses });

      const isJson = entry.file.type === "application/json" || entry.file.name.endsWith(".json");

      if (isJson) {
        // JSON import — read and parse
        const text = await entry.file.text();
        const parsed = JSON.parse(text);
        const storyId = parsed.story_id || parsed.events?.[0]?.story_id;

        // ── Events ──────────────────────────────────────────
        if (Array.isArray(parsed.events) && parsed.events.length > 0) {
          if (storyId) {
            const existing = await base44.entities.GameEvent.list();
            const toDelete = existing.filter(e => e.story_id === storyId);
            for (const ev of toDelete) await base44.entities.GameEvent.delete(ev.id);
            qc.invalidateQueries({ queryKey: ["events"] });
          }
          for (const ev of parsed.events) {
            await base44.entities.GameEvent.create(ev);
          }

          // ── AUTO-EXTRACT DIALOGUE from events ───────────────
          if (storyId) {
            // Delete old dialogue for this story first
            const existingDialogue = await base44.entities.Dialogue.list();
            const oldLines = existingDialogue.filter(d => d.story_id === storyId);
            for (const d of oldLines) await base44.entities.Dialogue.delete(d.id);

            const dialogueRecords = [];

            for (const ev of parsed.events) {
              // Event narration text → narration record
              if (ev.text) {
                dialogueRecords.push({
                  story_id: storyId,
                  character_name: "Narrator",
                  category: "general",
                  line: String(ev.text).slice(0, 1000),
                  trigger_context: `event:${ev.event_id}`,
                  act: ev.night ? `act_${Math.min(ev.night, 4)}` : "any",
                  tags: ev.event_id,
                  sort_order: ev.sort_order || 0,
                });
              }

              // Parse choices for outcome text
              const choices = (() => {
                try { return typeof ev.choices === "string" ? JSON.parse(ev.choices) : (ev.choices || []); }
                catch { return []; }
              })();

              for (const choice of choices) {
                const extractEffect = (effect, label) => {
                  const eff = typeof effect === "string" ? (() => { try { return JSON.parse(effect); } catch { return {}; } })() : (effect || {});
                  if (eff.outcomeText) {
                    dialogueRecords.push({
                      story_id: storyId,
                      character_name: eff.speaker || "Narrator",
                      category: label === "success" ? "general" : "tense",
                      line: String(eff.outcomeText).slice(0, 1000),
                      trigger_context: label === "success" ? "after_choice_success" : "after_choice_fail",
                      act: ev.night ? `act_${Math.min(ev.night, 4)}` : "any",
                      tags: `${ev.event_id},${label}`,
                      sort_order: ev.sort_order || 0,
                    });
                  }
                  // Dialogue lines inside effect
                  if (Array.isArray(eff.dialogue)) {
                    for (const dl of eff.dialogue) {
                      if (dl.line || dl.text) {
                        dialogueRecords.push({
                          story_id: storyId,
                          character_name: dl.character || dl.speaker || "Character",
                          category: "general",
                          line: String(dl.line || dl.text).slice(0, 1000),
                          trigger_context: label === "success" ? "after_choice_success" : "after_choice_fail",
                          act: ev.night ? `act_${Math.min(ev.night, 4)}` : "any",
                          tags: `${ev.event_id},${label}`,
                          sort_order: ev.sort_order || 0,
                        });
                      }
                    }
                  }
                };
                if (choice.successEffect) extractEffect(choice.successEffect, "success");
                if (choice.failEffect) extractEffect(choice.failEffect, "fail");
              }

              // Explicit top-level dialogue array on event
              if (Array.isArray(ev.dialogue)) {
                for (const dl of ev.dialogue) {
                  if (dl.line || dl.text) {
                    dialogueRecords.push({
                      story_id: storyId,
                      character_name: dl.character || dl.speaker || "Character",
                      category: dl.category || "general",
                      line: String(dl.line || dl.text).slice(0, 1000),
                      trigger_context: dl.trigger_context || `event:${ev.event_id}`,
                      act: dl.act || (ev.night ? `act_${Math.min(ev.night, 4)}` : "any"),
                      tags: dl.tags || ev.event_id,
                      sort_order: ev.sort_order || 0,
                    });
                  }
                }
              }

              // Ending text
              if (ev.is_ending && ev.ending_text) {
                dialogueRecords.push({
                  story_id: storyId,
                  character_name: "Narrator",
                  category: "ending",
                  line: String(ev.ending_text).slice(0, 1000),
                  trigger_context: `ending:${ev.ending_type || "bad"}`,
                  act: "any",
                  tags: `${ev.event_id},ending,${ev.ending_type || ""}`,
                  sort_order: ev.sort_order || 0,
                });
              }
            }

            // Also parse top-level dialogue array if present
            if (Array.isArray(parsed.dialogue)) {
              for (const dl of parsed.dialogue) {
                if (dl.line || dl.text) {
                  dialogueRecords.push({
                    story_id: storyId,
                    character_name: dl.character_name || dl.character || dl.speaker || "Character",
                    category: dl.category || "general",
                    line: String(dl.line || dl.text).slice(0, 1000),
                    trigger_context: dl.trigger_context || "general",
                    act: dl.act || "any",
                    tags: dl.tags || "",
                    sort_order: dl.sort_order || 0,
                  });
                }
              }
            }

            // Bulk create dialogue records (in batches of 20)
            for (let di = 0; di < dialogueRecords.length; di += 20) {
              const batch = dialogueRecords.slice(di, di + 20);
              await Promise.all(batch.map(r => base44.entities.Dialogue.create(r)));
            }
            qc.invalidateQueries({ queryKey: ["dialogue"] });
          }
        }

        // ── Characters ──────────────────────────────────────
        if (Array.isArray(parsed.characters)) {
          for (const ch of parsed.characters) {
            await base44.entities.Character.create(ch);
          }
        }

        // ── Stories ─────────────────────────────────────────
        if (Array.isArray(parsed.stories)) {
          for (const s of parsed.stories) {
            await base44.entities.Story.create(s);
          }
        }

        newStatuses[entry.id] = "done";
      } else {
        // ── Image upload ────────────────────────────────────
        const { file_url } = await base44.integrations.Core.UploadFile({ file: entry.file });
        if (importType === "scene") {
          await base44.entities.SceneAsset.create({
            key: entry.assetKey || entry.file.name,
            image_url: file_url,
            description: entry.file.name,
          });
        } else if (importType === "character") {
          await base44.entities.SceneAsset.create({
            key: `portrait_${entry.assetKey}`,
            image_url: file_url,
            description: `Portrait: ${entry.file.name}`,
          });
        }
        newStatuses[entry.id] = "done";
      }

      setFileStatuses({ ...newStatuses });
    }

    qc.invalidateQueries({ queryKey: ["sceneAssets"] });
    qc.invalidateQueries({ queryKey: ["characters"] });
    setUploading(false);
    onImportComplete?.();
  };

  const allDone = files.length > 0 && files.every(f => fileStatuses[f.id] === "done");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-xs font-bold text-foreground flex-1">Bulk Import</p>
        <div className="flex rounded-lg overflow-hidden border border-border text-[10px]">
          {["scene", "character"].map(t => (
            <button
              key={t}
              onClick={() => setImportType(t)}
              className="px-3 py-1 font-bold capitalize"
              style={{
                background: importType === t ? "hsl(271 87% 55%)" : "transparent",
                color: importType === t ? "white" : "hsl(252 8% 60%)",
              }}
            >{t}</button>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        animate={{ borderColor: dragOver ? "hsl(271 87% 65%)" : "hsl(252 10% 26%)" }}
        className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer py-8 transition-colors"
        style={{ background: dragOver ? "hsl(271 87% 65% / 0.06)" : "hsl(252 12% 14%)" }}
      >
        <Upload className="w-5 h-5 text-muted-foreground" />
        <p className="text-[10px] text-muted-foreground text-center">
          Drag images or JSON files here<br />
          <span className="text-foreground font-semibold">or click to browse</span>
        </p>
        <p className="text-[9px] text-muted-foreground/60">PNG, JPG, WebP, JSON</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.json"
          className="hidden"
          onChange={e => addFiles(e.target.files)}
        />
      </motion.div>

      {/* File queue */}
      <AnimatePresence>
        {files.map((f, i) => (
          <FileRow
            key={f.id}
            file={f}
            index={i}
            isFirst={i === 0}
            isLast={i === files.length - 1}
            status={fileStatuses[f.id]}
            onRemove={handleRemove}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onUpdateKey={handleUpdateKey}
          />
        ))}
      </AnimatePresence>

      {files.length > 0 && !allDone && (
        <Button
          size="sm"
          className="w-full gap-2 text-xs"
          disabled={uploading}
          onClick={handleUpload}
          style={{ background: "hsl(271 87% 55%)" }}
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Upload {files.length} file{files.length !== 1 ? "s" : ""}
        </Button>
      )}

      {allDone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 justify-center py-2 rounded-xl text-xs font-bold"
          style={{ background: "hsl(123 68% 55% / 0.1)", color: "hsl(123 68% 65%)", border: "1px solid hsl(123 68% 55% / 0.3)" }}
        >
          <CheckCircle2 className="w-4 h-4" />
          All files uploaded successfully.
        </motion.div>
      )}
    </div>
  );
}