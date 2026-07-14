import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { normalizeStoryId } from "@/lib/dataValidation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const STORY_ID = "the_rental";

export default function RentalDebugPanel() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const run = async () => {
    setLoading(true);
    try {
      // Fetch ALL GameEvent rows, filter by normalized story_id (same logic as GameScreen)
      const all = await base44.entities.GameEvent.list("sort_order");
      const forRental = all.filter(e => normalizeStoryId(e.story_id) === STORY_ID);
      const sorted = [...forRental].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

      // "Runtime" first event = what GameScreen resolves (sort_order asc, no conditions = first)
      const runtimeFirst = sorted[0] || null;

      setData({
        totalCount: forRental.length,
        first5: sorted.slice(0, 5).map(e => ({ event_id: e.event_id, sort_order: e.sort_order, story_id: e.story_id })),
        dbFirstEventId: sorted[0]?.event_id || "—",
        dbFirstText: (sorted[0]?.text || "").substring(0, 120),
        runtimeEventId: runtimeFirst?.event_id || "—",
        runtimeText: (runtimeFirst?.text || "").substring(0, 120),
        match: sorted[0]?.event_id === runtimeFirst?.event_id,
        rawStoryIds: [...new Set(forRental.map(e => e.story_id))],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl p-4 space-y-3 text-[11px]" style={{ background: "hsl(252 12% 13%)", border: "1.5px solid hsl(40 90% 62% / 0.4)" }}>
      <div className="flex items-center justify-between">
        <p className="font-bold text-sm text-foreground">🔍 Debug: <code className="font-mono text-warning">the_rental</code> Event Source</p>
        <Button size="sm" variant="outline" className="gap-1 h-7 text-[10px]" onClick={run} disabled={loading}>
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading..." : "Run Check"}
        </Button>
      </div>

      {!data && (
        <p className="text-muted-foreground text-[10px]">Click "Run Check" to query base44.entities.GameEvent and compare with runtime.</p>
      )}

      {data && (
        <div className="space-y-3">
          {/* DB State */}
          <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(252 12% 18%)", border: "1px solid hsl(252 10% 26%)" }}>
            <p className="font-bold text-foreground uppercase tracking-widest text-[9px]">📦 DB State (base44.entities.GameEvent)</p>
            <p className="text-muted-foreground"><span className="font-bold text-foreground">Total rows for the_rental:</span> {data.totalCount}</p>
            <p className="text-muted-foreground"><span className="font-bold text-foreground">Raw story_id values found:</span> {data.rawStoryIds.join(", ") || "none"}</p>
            <div>
              <p className="font-bold text-foreground mb-1">First 5 event_ids (by sort_order):</p>
              {data.first5.length === 0 ? (
                <p className="text-destructive">No events found for the_rental</p>
              ) : (
                <ol className="space-y-0.5 ml-2">
                  {data.first5.map((e, i) => (
                    <li key={i} className="font-mono text-[10px] text-foreground">
                      [{e.sort_order ?? i}] <span className="text-violet">{e.event_id}</span> <span className="text-muted-foreground">(story_id: {e.story_id})</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div>
              <p className="font-bold text-foreground mb-1">First event text:</p>
              <p className="italic text-muted-foreground">"{data.dbFirstText}{data.dbFirstText.length >= 120 ? "…" : ""}"</p>
            </div>
          </div>

          {/* Runtime State */}
          <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(252 12% 18%)", border: "1px solid hsl(252 10% 26%)" }}>
            <p className="font-bold text-foreground uppercase tracking-widest text-[9px]">🎮 Runtime-Resolved Event (GameScreen would load)</p>
            <p className="text-muted-foreground"><span className="font-bold text-foreground">event_id:</span> <span className="font-mono text-violet">{data.runtimeEventId}</span></p>
            <div>
              <p className="font-bold text-foreground mb-1">Text:</p>
              <p className="italic text-muted-foreground">"{data.runtimeText}{data.runtimeText.length >= 120 ? "…" : ""}"</p>
            </div>
          </div>

          {/* Match indicator */}
          <div
            className="rounded-xl px-3 py-2 font-bold text-center"
            style={{
              background: data.match ? "hsl(123 68% 55% / 0.1)" : "hsl(351 78% 60% / 0.1)",
              border: `1px solid ${data.match ? "hsl(123 68% 55% / 0.4)" : "hsl(351 78% 60% / 0.4)"}`,
              color: data.match ? "hsl(123 68% 65%)" : "hsl(351 78% 68%)",
            }}
          >
            {data.totalCount === 0
              ? "❌ No events imported for the_rental — import the package first"
              : data.match
              ? "✅ DB and runtime are in sync"
              : "⚠️ DB first event does not match runtime-resolved event"}
          </div>
        </div>
      )}
    </div>
  );
}