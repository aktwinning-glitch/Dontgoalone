import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Zap, RotateCcw, CheckCircle2, AlertCircle, Loader2, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeStoryId } from "@/lib/dataValidation";

export default function SeedEventsPanel() {
  const qc = useQueryClient();
  const [status, setStatus] = useState(null); // null | "loading" | "success" | "error" | "skipped"
  const [message, setMessage] = useState("");
  const [count, setCount] = useState(0);

  const { data: stories } = useQuery({
    queryKey: ["stories"],
    queryFn: () => base44.entities.Story.list("sort_order"),
    initialData: [],
  });

  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.GameEvent.list("sort_order"),
    initialData: [],
  });

  const [selectedStoryId, setSelectedStoryId] = useState("the_rental");

  // Normalize story_id for matching
  const normalizedSelectedId = normalizeStoryId(selectedStoryId);
  const selectedStory = stories.find(s => normalizeStoryId(s.story_id || s.id) === normalizedSelectedId);
  const storyEvents = events.filter(e => normalizeStoryId(e.story_id) === normalizedSelectedId);

  // Check if a story package (act_structure with real events) exists for selected story
  const hasPackage = (() => {
    if (!selectedStory?.act_structure) return false;
    try {
      const acts = JSON.parse(selectedStory.act_structure);
      return Array.isArray(acts) && acts.length > 0;
    } catch { return false; }
  })();

  const runSeed = async (force = false) => {
    if (!selectedStoryId) return;
    setStatus("loading");
    setMessage("");
    const res = await base44.functions.invoke("seedRentalEvents", { force, storyId: selectedStoryId });
    const data = res.data;
    if (data.status === "success") {
      setStatus("success");
      setMessage(data.message);
      setCount(data.events?.length || 0);
      qc.invalidateQueries({ queryKey: ["events"] });
    } else if (data.status === "skipped") {
      setStatus("skipped");
      setMessage(data.message);
      setCount(data.count || 0);
    } else {
      setStatus("error");
      setMessage(data.error || "Unknown error");
    }
  };

  const statusIcon = {
    loading: <Loader2 className="w-4 h-4 animate-spin" />,
    success: <CheckCircle2 className="w-4 h-4" style={{ color: "hsl(123 68% 55%)" }} />,
    skipped: <CheckCircle2 className="w-4 h-4" style={{ color: "hsl(40 90% 62%)" }} />,
    error: <AlertCircle className="w-4 h-4" style={{ color: "hsl(351 78% 60%)" }} />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 space-y-3"
      style={{ background: "hsl(252 12% 13%)", border: "1.5px solid hsl(271 87% 65% / 0.25)" }}
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "hsl(271 87% 65% / 0.15)" }}>
          <Zap className="w-3.5 h-3.5" style={{ color: "hsl(271 87% 75%)" }} />
        </div>
        <div>
          <p className="text-xs font-bold text-foreground">Seed Story Events</p>
          <p className="text-[10px] text-muted-foreground">Seed starter events from a story package.</p>
        </div>
      </div>

      {/* Story selector */}
      {stories.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">Select Story</p>
          <div className="flex flex-wrap gap-1.5">
            {stories.map(s => (
              <button
                key={s.story_id}
                onClick={() => setSelectedStoryId(s.story_id)}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all"
                style={{
                  background: selectedStoryId === s.story_id ? "hsl(271 87% 65% / 0.25)" : "hsl(252 12% 18%)",
                  border: `1px solid ${selectedStoryId === s.story_id ? "hsl(271 87% 65% / 0.55)" : "hsl(252 10% 24%)"}`,
                  color: selectedStoryId === s.story_id ? "hsl(271 87% 78%)" : "hsl(var(--muted-foreground))",
                }}
              >
                {s.emoji || "📖"} {s.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Package status */}
      {selectedStory && (
        <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "hsl(252 12% 18%)" }}>
          <PackageOpen className="w-3 h-3" style={{ color: hasPackage ? "hsl(123 68% 55%)" : "hsl(40 90% 62%)" }} />
          <span className="text-[10px] text-muted-foreground flex-1">
            {hasPackage ? "Story package found" : "No package — import one first"}
          </span>
          <span className="text-xs font-bold text-foreground">{storyEvents.length} events</span>
        </div>
      )}

      {!hasPackage && selectedStory && (
        <div className="rounded-xl px-3 py-2.5" style={{ background: "hsl(40 90% 62% / 0.08)", border: "1px solid hsl(40 90% 62% / 0.3)" }}>
          <p className="text-[10px] text-warning font-semibold">No valid story package found for "{selectedStory.title}".</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">Import a story package first using the Import Pkg button above.</p>
        </div>
      )}

      {status && message && (
        <div className="flex items-start gap-2 rounded-xl px-3 py-2" style={{
          background: status === "success" ? "hsl(123 68% 55% / 0.08)" : status === "error" ? "hsl(351 78% 60% / 0.08)" : "hsl(40 90% 62% / 0.08)",
          border: `1px solid ${status === "success" ? "hsl(123 68% 55% / 0.3)" : status === "error" ? "hsl(351 78% 60% / 0.3)" : "hsl(40 90% 62% / 0.3)"}`,
        }}>
          {statusIcon[status]}
          <p className="text-[10px] leading-relaxed text-foreground">{message}</p>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          className="gap-1.5 text-xs flex-1"
          disabled={status === "loading" || !hasPackage}
          onClick={() => runSeed(false)}
          style={{ background: "hsl(271 87% 55%)" }}
        >
          {status === "loading" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
          Seed Events
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          disabled={status === "loading" || !hasPackage}
          onClick={() => runSeed(true)}
        >
          <RotateCcw className="w-3 h-3" />
          Re-seed
        </Button>
      </div>

      <p className="text-[9px] text-muted-foreground">
        Re-seed deletes and recreates all events. Existing edits will be lost.
      </p>
    </motion.div>
  );
}