import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Users, Trophy, Sparkles } from "lucide-react";
import { getLegacyProfile } from "@/lib/legacyService";
import { STARTER_TRAITS } from "@/lib/progressionEngine";

const tabs = [
  { id: "evidence", label: "Evidence", icon: BookOpen },
  { id: "survivors", label: "Survivors", icon: Users },
  { id: "endings", label: "Endings", icon: Trophy },
  { id: "traits", label: "Traits", icon: Sparkles },
];

export default function LegacyHub() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("evidence");
  const { data: profile, isLoading } = useQuery({ queryKey: ["legacyProfile"], queryFn: getLegacyProfile });

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center">Loading legacy…</div>;

  const clues = profile?.discovered_clue_ids || [];
  const survivors = profile?.survivor_records || [];
  const endings = profile?.unlocked_ending_ids || [];
  const traits = STARTER_TRAITS.filter(item => (profile?.unlocked_trait_ids || []).includes(item.id));

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate("/home")} className="flex items-center gap-2 text-sm text-muted-foreground mb-6"><ArrowLeft className="w-4 h-4" /> Back</button>
        <div className="rounded-3xl border border-fuchsia-400/20 bg-card p-6 mb-5">
          <p className="text-[10px] uppercase tracking-[.3em] text-fuchsia-300">Survivor Headquarters</p>
          <div className="flex items-end justify-between gap-4 mt-2">
            <div><h1 className="font-display text-3xl">Your Legacy</h1><p className="text-sm text-muted-foreground mt-1">Every ending, clue, scar, and survivor stays with you.</p></div>
            <div className="text-right"><p className="text-3xl font-bold text-cyan-300">{profile?.legacy_currency || 0}</p><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Legacy</p></div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-5">
          {tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={`rounded-xl border p-3 text-xs flex flex-col items-center gap-1 ${tab === id ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-200" : "border-border bg-card text-muted-foreground"}`}><Icon className="w-4 h-4" />{label}</button>)}
        </div>

        <div className="grid gap-3">
          {tab === "evidence" && (clues.length ? clues.map(id => <Card key={id} title={String(id).replaceAll("_", " ")} label="Discovered clue" />) : <Empty text="No evidence recovered yet." />)}
          {tab === "survivors" && (survivors.length ? survivors.map((record, i) => <Card key={`${record.characterId}-${i}`} title={record.characterName || "Unknown survivor"} label={`${record.runsSurvived || 1} run${record.runsSurvived === 1 ? "" : "s"} survived · ${record.status || "survived"}`} />) : <Empty text="No survivor records yet." />)}
          {tab === "endings" && (endings.length ? endings.map(id => <Card key={id} title={String(id).split(":").join(" — ")} label="Ending unlocked" />) : <Empty text="No endings archived yet." />)}
          {tab === "traits" && (traits.length ? traits.map(trait => <Card key={trait.id} title={trait.name} label={trait.description} />) : <Empty text="No permanent traits unlocked yet." />)}
        </div>
      </div>
    </div>
  );
}

function Card({ title, label }) {
  return <div className="rounded-2xl border border-border bg-card p-4"><h3 className="font-semibold capitalize">{title}</h3><p className="text-sm text-muted-foreground mt-1">{label}</p></div>;
}

function Empty({ text }) {
  return <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">{text}</div>;
}
