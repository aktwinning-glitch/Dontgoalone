import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Save, Image, Upload } from "lucide-react";

export default function SceneManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const { data: scenes } = useQuery({
    queryKey: ["sceneAssets"],
    queryFn: () => base44.entities.SceneAsset.list(),
    initialData: [],
  });

  const save = useMutation({
    mutationFn: (data) =>
      data.id ? base44.entities.SceneAsset.update(data.id, data) : base44.entities.SceneAsset.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sceneAssets"] }); setEditing(null); },
  });

  const remove = useMutation({
    mutationFn: (id) => base44.entities.SceneAsset.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sceneAssets"] }),
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEditing(prev => ({ ...prev, image_url: file_url }));
  };

  if (editing) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-sm">{editing.id ? "Edit" : "New"} Scene Asset</h3>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Key (unique identifier)</Label>
            <Input value={editing.key || ""} onChange={e => setEditing({ ...editing, key: e.target.value })} placeholder="e.g. cabin_exterior" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Input value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Image</Label>
            {editing.image_url && (
              <img src={editing.image_url} alt="" className="w-full h-32 rounded-lg object-cover mb-2" />
            )}
            <label className="cursor-pointer flex items-center gap-1 text-xs text-primary hover:underline">
              <Upload className="w-3 h-3" /> Upload Image
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            </label>
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
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm">Scene Assets ({scenes.length})</h3>
        <Button size="sm" variant="outline" onClick={() => setEditing({ key: "", description: "", image_url: "" })} className="gap-1 text-xs">
          <Plus className="w-3 h-3" /> Add
        </Button>
      </div>
      {scenes.map(s => (
        <Card
          key={s.id}
          className="p-3 flex items-center gap-3 transition-all"
          style={dropTarget === s.id ? { border: "1.5px solid hsl(271 87% 65% / 0.8)", background: "hsl(271 87% 65% / 0.08)" } : {}}
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setDropTarget(s.id); }}
          onDragLeave={() => setDropTarget(null)}
          onDrop={e => {
            e.preventDefault();
            setDropTarget(null);
            const url = e.dataTransfer.getData("application/x-asset-url") || e.dataTransfer.getData("text/plain");
            if (url) save.mutate({ ...s, image_url: url });
          }}
        >
          {s.image_url ? (
            <img src={s.image_url} alt="" className="w-12 h-8 rounded object-cover pointer-events-none" />
          ) : (
            <div className="w-12 h-8 rounded bg-secondary flex items-center justify-center">
              <Image className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono font-medium">{s.key}</p>
            <p className="text-[10px] text-muted-foreground truncate">{s.description || "—"}</p>
            {dropTarget === s.id && <p className="text-[9px] text-violet font-bold mt-0.5">Drop to assign image →</p>}
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing({ ...s })}>
              <Save className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(s.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}