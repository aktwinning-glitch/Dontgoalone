import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Save, User, Upload } from "lucide-react";

const EMPTY_CHAR = { name: "", description: "", portrait_url: "", strength: 5, speed: 5, resilience: 5, intelligence: 5, fear: 5, charm: 5, influence: 5, sort_order: 0 };
const STATS = ["strength", "speed", "resilience", "intelligence", "fear", "charm", "influence"];

export default function CharacterManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: characters, isLoading } = useQuery({
    queryKey: ["characters"],
    queryFn: () => base44.entities.Character.list("sort_order"),
    initialData: [],
  });

  const save = useMutation({
    mutationFn: (data) =>
      data.id ? base44.entities.Character.update(data.id, data) : base44.entities.Character.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["characters"] }); setEditing(null); },
  });

  const remove = useMutation({
    mutationFn: (id) => base44.entities.Character.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["characters"] }),
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEditing(prev => ({ ...prev, portrait_url: file_url }));
  };

  if (editing) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-sm">{editing.id ? "Edit" : "New"} Character</h3>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} className="h-16" />
          </div>
          <div>
            <Label className="text-xs">Portrait</Label>
            <div className="flex items-center gap-2">
              {editing.portrait_url && <img src={editing.portrait_url} alt="" className="w-10 h-10 rounded-full object-cover" />}
              <label className="cursor-pointer flex items-center gap-1 text-xs text-primary hover:underline">
                <Upload className="w-3 h-3" /> Upload
                <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              </label>
            </div>
          </div>
          <div>
            <Label className="text-xs">Sort Order</Label>
            <Input type="number" value={editing.sort_order || 0} onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {STATS.map(s => (
              <div key={s}>
                <Label className="text-[10px] uppercase">{s}</Label>
                <Input type="number" min={1} max={20} value={editing[s] || 5} onChange={e => setEditing({ ...editing, [s]: Number(e.target.value) })} />
              </div>
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
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm">Characters ({characters.length})</h3>
        <Button size="sm" variant="outline" onClick={() => setEditing({ ...EMPTY_CHAR })} className="gap-1 text-xs">
          <Plus className="w-3 h-3" /> Add
        </Button>
      </div>
      {characters.map(c => (
        <Card key={c.id} className="p-3 flex items-center gap-3">
          {c.portrait_url ? (
            <img src={c.portrait_url} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{c.name}</p>
            <p className="text-[10px] text-muted-foreground">{c.description || "No description"}</p>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing({ ...c })}>
              <Save className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(c.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}