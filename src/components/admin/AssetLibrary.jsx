import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Upload, Image, User, X, Check, Search, Grid, List,
  Tag, Plus, Pencil, Trash2, FolderOpen, Link
} from "lucide-react";

const CATEGORIES = ["scene", "character", "item", "environment", "ui"];
const CATEGORY_COLORS = {
  scene: "hsl(216 70% 50%)", character: "hsl(271 87% 60%)",
  item: "hsl(40 90% 55%)", environment: "hsl(123 68% 48%)", ui: "hsl(186 72% 50%)",
};

// ─── Upload button ────────────────────────────────────────────────────────────
function UploadButton({ onUploaded, label = "Upload", accept = "image/*" }) {
  const [uploading, setUploading] = useState(false);
  return (
    <label className="cursor-pointer">
      <div className={`flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-colors
        ${uploading ? "opacity-50 pointer-events-none" : "hover:opacity-80"}`}
        style={{ background: "hsl(216 70% 40% / 0.2)", border: "1px solid hsl(216 70% 50% / 0.4)", color: "hsl(216 70% 72%)" }}>
        {uploading
          ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          : <Upload className="w-3 h-3" />}
        {uploading ? "Uploading…" : label}
      </div>
      <input type="file" accept={accept} className="hidden" onChange={async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          await onUploaded(file_url, file.name);
        } finally { setUploading(false); e.target.value = ""; }
      }} />
    </label>
  );
}

// ─── Asset Card ───────────────────────────────────────────────────────────────
function AssetCard({ asset, view, onEditKey, onTag, onDelete, onReplace }) {
  const [editingKey, setEditingKey] = useState(false);
  const [keyVal, setKeyVal] = useState(asset.key || "");
  const [editingTags, setEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState(asset.tags || "");
  const imgUrl = asset.image_url || asset.portrait_url || "";

  const catColor = CATEGORY_COLORS[asset.category] || "hsl(252 8% 50%)";

  if (view === "grid") {
    return (
      <div className="relative rounded-xl overflow-hidden group"
        draggable
        onDragStart={e => {
          e.dataTransfer.setData("application/x-asset-url", imgUrl);
          e.dataTransfer.setData("application/x-asset-key", asset.key || "");
          e.dataTransfer.effectAllowed = "copy";
        }}
        style={{ border: "1px solid hsl(252 10% 22%)", background: "hsl(252 12% 14%)" }}>
        {imgUrl
          ? <img src={imgUrl} alt="" className="w-full h-28 object-cover pointer-events-none" />
          : <div className="w-full h-28 flex items-center justify-center" style={{ background: "hsl(252 10% 18%)" }}>
              <Image className="w-6 h-6 text-muted-foreground/30" />
            </div>
        }
        {asset.category && (
          <div className="absolute top-1.5 left-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: `${catColor}28`, border: `1px solid ${catColor}55`, color: catColor }}>
            {asset.category}
          </div>
        )}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 gap-1">
          <p className="text-[9px] font-mono font-bold text-white truncate">{asset.key || asset.name || "—"}</p>
          <div className="flex gap-1">
            <UploadButton onUploaded={(url) => onReplace(asset.id, url)} label="Replace" />
            <button onClick={() => onDelete(asset.id)} className="p-1 rounded hover:bg-red-500/30">
              <Trash2 className="w-3 h-3 text-red-400" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      draggable
      onDragStart={e => {
        e.dataTransfer.setData("application/x-asset-url", imgUrl);
        e.dataTransfer.setData("application/x-asset-key", asset.key || "");
        e.dataTransfer.effectAllowed = "copy";
      }}
      style={{ background: "hsl(252 12% 14%)", border: "1px solid hsl(252 10% 20%)", cursor: "grab" }}>
      {imgUrl
        ? <img src={imgUrl} alt="" className="w-12 h-9 rounded-lg object-cover shrink-0 pointer-events-none" style={{ border: "1px solid hsl(252 10% 22%)" }} />
        : <div className="w-12 h-9 rounded-lg shrink-0 flex items-center justify-center" style={{ background: "hsl(252 10% 18%)" }}>
            <Image className="w-4 h-4 text-muted-foreground/30" />
          </div>
      }
      <div className="flex-1 min-w-0">
        {editingKey ? (
          <div className="flex items-center gap-1">
            <input autoFocus className="flex-1 text-[10px] font-mono bg-transparent rounded px-2 py-1"
              style={{ border: "1px solid hsl(252 10% 30%)", color: "hsl(40 30% 85%)" }}
              value={keyVal} onChange={e => setKeyVal(e.target.value)} />
            <button onClick={() => { onEditKey(asset.id, keyVal); setEditingKey(false); }} className="p-1 rounded hover:bg-success/20">
              <Check className="w-3 h-3 text-success" />
            </button>
            <button onClick={() => { setKeyVal(asset.key || ""); setEditingKey(false); }} className="p-1 opacity-40 hover:opacity-80">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] font-mono font-semibold truncate" style={{ color: "hsl(40 30% 82%)" }}>{asset.key || asset.name || "—"}</p>
            {asset.category && (
              <span className="text-[8px] px-1.5 py-0.5 rounded font-bold shrink-0"
                style={{ background: `${catColor}20`, border: `1px solid ${catColor}40`, color: catColor }}>
                {asset.category}
              </span>
            )}
          </div>
        )}
        {editingTags ? (
          <div className="flex items-center gap-1 mt-0.5">
            <input autoFocus className="flex-1 text-[9px] bg-transparent rounded px-2 py-0.5"
              style={{ border: "1px solid hsl(252 10% 28%)", color: "hsl(252 8% 55%)" }}
              placeholder="tag1, tag2" value={tagInput} onChange={e => setTagInput(e.target.value)} />
            <button onClick={() => { onTag(asset.id, tagInput); setEditingTags(false); }} className="p-1 rounded hover:bg-success/20">
              <Check className="w-3 h-3 text-success" />
            </button>
            <button onClick={() => setEditingTags(false)} className="p-1 opacity-40 hover:opacity-80"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <p className="text-[9px] text-muted-foreground/40 truncate cursor-pointer hover:text-muted-foreground/60 mt-0.5"
            onClick={() => setEditingTags(true)}>
            {asset.tags ? `🏷 ${asset.tags}` : "add tags…"}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button title="Edit key" onClick={() => { setKeyVal(asset.key || ""); setEditingKey(true); }}
          className="p-1.5 rounded opacity-40 hover:opacity-80"><Pencil className="w-3 h-3" /></button>
        <UploadButton onUploaded={(url) => onReplace(asset.id, url)} label="" />
        <button title="Delete" onClick={() => onDelete(asset.id)} className="p-1.5 rounded opacity-30 hover:opacity-70 hover:text-red-400">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AssetLibrary() {
  const qc = useQueryClient();
  const [view, setView] = useState("list");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [newAssetForm, setNewAssetForm] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newCategory, setNewCategory] = useState("scene");
  const [newTags, setNewTags] = useState("");

  const { data: scenes = [] } = useQuery({
    queryKey: ["sceneAssets"],
    queryFn: () => base44.entities.SceneAsset.list(),
  });
  const { data: characters = [] } = useQuery({
    queryKey: ["characters"],
    queryFn: () => base44.entities.Character.list("sort_order"),
  });

  // Merge characters (as assets) and scenes into unified list
  const allAssets = useMemo(() => [
    ...scenes.map(s => ({ ...s, _type: "scene" })),
    ...characters.map(c => ({ ...c, key: c.name, image_url: c.portrait_url, _type: "character", category: "character" })),
  ], [scenes, characters]);

  const filtered = useMemo(() => allAssets.filter(a => {
    const matchSearch = !search || (a.key || a.name || "").toLowerCase().includes(search.toLowerCase()) || (a.tags || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || a.category === filterCat || (filterCat === "character" && a._type === "character") || (filterCat === "scene" && a._type === "scene");
    return matchSearch && matchCat;
  }), [allAssets, search, filterCat]);

  const handleReplace = async (id, url, type) => {
    if (type === "character") await base44.entities.Character.update(id, { portrait_url: url });
    else await base44.entities.SceneAsset.update(id, { image_url: url });
    qc.invalidateQueries({ queryKey: type === "character" ? ["characters"] : ["sceneAssets"] });
  };

  const handleEditKey = async (id, key, type) => {
    if (type === "character") await base44.entities.Character.update(id, { name: key });
    else await base44.entities.SceneAsset.update(id, { key });
    qc.invalidateQueries({ queryKey: type === "character" ? ["characters"] : ["sceneAssets"] });
  };

  const handleTag = async (id, tags, type) => {
    if (type === "scene") { await base44.entities.SceneAsset.update(id, { tags }); qc.invalidateQueries({ queryKey: ["sceneAssets"] }); }
  };

  const handleDelete = async (id, type) => {
    if (type === "character") { await base44.entities.Character.delete(id); qc.invalidateQueries({ queryKey: ["characters"] }); }
    else { await base44.entities.SceneAsset.delete(id); qc.invalidateQueries({ queryKey: ["sceneAssets"] }); }
  };

  const handleUploadNew = async (url, filename) => {
    const key = newKey.trim() || filename.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_]/gi, "_").toLowerCase();
    await base44.entities.SceneAsset.create({
      key, image_url: url, category: newCategory, tags: newTags, description: filename,
    });
    qc.invalidateQueries({ queryKey: ["sceneAssets"] });
    setNewKey(""); setNewTags(""); setNewAssetForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-1 min-w-0 rounded-lg px-3 py-1.5"
          style={{ background: "hsl(252 12% 16%)", border: "1px solid hsl(252 10% 22%)" }}>
          <Search className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search key or tags…"
            className="flex-1 bg-transparent text-xs outline-none" style={{ color: "hsl(40 30% 82%)" }} />
        </div>
        {/* Category filter */}
        <div className="flex gap-1">
          {["all", "scene", "character", "item", "environment"].map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              className="text-[9px] font-bold px-2 py-1.5 rounded-lg capitalize"
              style={{
                background: filterCat === c ? "hsl(271 87% 52% / 0.25)" : "hsl(252 12% 16%)",
                border: `1px solid ${filterCat === c ? "hsl(271 87% 52% / 0.5)" : "hsl(252 10% 22%)"}`,
                color: filterCat === c ? "hsl(271 87% 78%)" : "hsl(252 8% 55%)",
              }}>{c}</button>
          ))}
        </div>
        <div className="flex gap-1">
          <button onClick={() => setView("list")} className="p-1.5 rounded-lg"
            style={{ background: view === "list" ? "hsl(252 12% 22%)" : "transparent", border: "1px solid hsl(252 10% 22%)" }}>
            <List className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button onClick={() => setView("grid")} className="p-1.5 rounded-lg"
            style={{ background: view === "grid" ? "hsl(252 12% 22%)" : "transparent", border: "1px solid hsl(252 10% 22%)" }}>
            <Grid className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
        <Button size="sm" className="gap-1 text-[10px] h-8 shrink-0"
          onClick={() => setNewAssetForm(v => !v)}
          style={{ background: "hsl(123 68% 35%)", color: "white" }}>
          <Plus className="w-3 h-3" /> Add Asset
        </Button>
      </div>

      {/* New asset upload form */}
      {newAssetForm && (
        <div className="p-3 rounded-xl space-y-2" style={{ background: "hsl(252 12% 15%)", border: "1px solid hsl(252 10% 22%)" }}>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">New Scene Asset</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="Key (e.g. cabin_interior)"
              className="text-xs rounded-lg px-2 py-1.5 bg-transparent"
              style={{ border: "1px solid hsl(252 10% 26%)", color: "hsl(40 30% 82%)" }} />
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
              className="text-xs rounded-lg px-2 py-1.5 bg-transparent"
              style={{ border: "1px solid hsl(252 10% 26%)", color: "hsl(40 30% 82%)" }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <input value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="Tags: dark, forest, night"
            className="w-full text-xs rounded-lg px-2 py-1.5 bg-transparent"
            style={{ border: "1px solid hsl(252 10% 26%)", color: "hsl(40 30% 82%)" }} />
          <UploadButton onUploaded={handleUploadNew} label="Upload & Add to Library" accept="image/*,audio/*" />
        </div>
      )}

      {/* Drag hint */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[9px]"
        style={{ background: "hsl(216 70% 50% / 0.07)", border: "1px solid hsl(216 70% 50% / 0.2)", color: "hsl(216 70% 65%)" }}>
        <Link className="w-3 h-3 shrink-0" />
        Drag any asset onto a scene card to assign its image key · Click tags to edit them
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-[9px] text-muted-foreground/50">
        <span>{allAssets.length} total assets</span>
        <span>·</span>
        <span>{scenes.length} scenes</span>
        <span>·</span>
        <span>{characters.length} characters</span>
        {search && <span>· {filtered.length} match</span>}
      </div>

      {/* Asset list/grid */}
      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground/30 text-center py-8">No assets found.</p>
      ) : view === "grid" ? (
        <div className="grid grid-cols-3 gap-2">
          {filtered.map(asset => (
            <AssetCard key={asset.id} asset={asset} view="grid"
              onReplace={(id, url) => handleReplace(id, url, asset._type)}
              onEditKey={(id, key) => handleEditKey(id, key, asset._type)}
              onTag={(id, tags) => handleTag(id, tags, asset._type)}
              onDelete={(id) => handleDelete(id, asset._type)} />
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(asset => (
            <AssetCard key={asset.id} asset={asset} view="list"
              onReplace={(id, url) => handleReplace(id, url, asset._type)}
              onEditKey={(id, key) => handleEditKey(id, key, asset._type)}
              onTag={(id, tags) => handleTag(id, tags, asset._type)}
              onDelete={(id) => handleDelete(id, asset._type)} />
          ))}
        </div>
      )}
    </div>
  );
}