import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Zap, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { THE_RENTAL_PACKAGE } from "@/lib/storyPackages/theRental";
import { motion } from "framer-motion";

export default function LoadRentalButton() {
  const qc = useQueryClient();
  const [status, setStatus] = useState(null); // null | "loading" | "success" | "error"
  const [message, setMessage] = useState("");

  const handleLoadRental = async () => {
    setStatus("loading");
    setMessage("");
    try {
      const meta = THE_RENTAL_PACKAGE;

      // Upsert story metadata
      const existing = await base44.entities.Story.filter({
        story_id: meta.story_id,
      });

      if (existing.length > 0) {
        await base44.entities.Story.update(existing[0].id, meta);
      } else {
        await base44.entities.Story.create({
          story_id: meta.story_id,
          title: meta.title,
          chapter_label: meta.chapter_label,
          subtitle: meta.subtitle,
          description: meta.description,
          emoji: meta.emoji,
          status: meta.status,
          visible_on_homepage: meta.visible_on_homepage,
          accent_color: meta.accent_color,
          cover_image_url: meta.cover_image_url,
          survivor_count: meta.survivor_count,
          sort_order: meta.sort_order,
          act_structure: JSON.stringify(meta.acts),
          ambient_sound_defaults: JSON.stringify(meta.ambient_sound_defaults),
        });
      }

      // Upsert events
      const existingEvents = await base44.entities.GameEvent.filter({
        story_id: meta.story_id,
      });
      const existingMap = {};
      existingEvents.forEach((e) => {
        existingMap[e.event_id] = e.id;
      });

      for (const evt of meta.events) {
        const dbId = existingMap[evt.event_id];
        const dbEvent = {
          event_id: evt.event_id,
          story_id: meta.story_id,
          text: evt.text,
          night: evt.night || 1,
          sort_order: evt.sort_order || 0,
          image_key: evt.image_key || null,
          is_ending: evt.is_ending || false,
          ending_type: evt.ending_type || "",
          ending_text: evt.ending_text || "",
          choices: evt.choices ? JSON.stringify(evt.choices) : "[]",
          conditions: evt.conditions ? JSON.stringify(evt.conditions) : null,
        };

        if (dbId) {
          await base44.entities.GameEvent.update(dbId, dbEvent);
        } else {
          await base44.entities.GameEvent.create(dbEvent);
        }
      }

      qc.invalidateQueries({ queryKey: ["stories"] });
      qc.invalidateQueries({ queryKey: ["events"] });
      setStatus("success");
      setMessage(
        `Loaded The Rental: ${meta.events.length} events across ${meta.acts.length} acts`
      );
    } catch (e) {
      setStatus("error");
      setMessage("Failed: " + e.message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 space-y-3"
      style={{ background: "hsl(252 12% 13%)", border: "1.5px solid hsl(271 87% 65% / 0.25)" }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "hsl(271 87% 65% / 0.15)" }}
        >
          <Zap className="w-3.5 h-3.5" style={{ color: "hsl(271 87% 75%)" }} />
        </div>
        <div>
          <p className="text-xs font-bold text-foreground">Load The Rental</p>
          <p className="text-[10px] text-muted-foreground">Complete 36-event story package</p>
        </div>
      </div>

      {status && message && (
        <div
          className="flex items-start gap-2 rounded-xl px-3 py-2"
          style={{
            background:
              status === "success"
                ? "hsl(123 68% 55% / 0.08)"
                : status === "error"
                  ? "hsl(351 78% 60% / 0.08)"
                  : "hsl(40 90% 62% / 0.08)",
            border: `1px solid ${
              status === "success"
                ? "hsl(123 68% 55% / 0.3)"
                : status === "error"
                  ? "hsl(351 78% 60% / 0.3)"
                  : "hsl(40 90% 62% / 0.3)"
            }`,
          }}
        >
          {status === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
          ) : status === "error" ? (
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          ) : (
            <Loader2 className="w-4 h-4 text-warning animate-spin shrink-0 mt-0.5" />
          )}
          <p className="text-[10px] leading-relaxed text-foreground">{message}</p>
        </div>
      )}

      <Button
        size="sm"
        className="gap-1.5 text-xs flex-1"
        disabled={status === "loading"}
        onClick={handleLoadRental}
        style={{ background: "hsl(271 87% 55%)" }}
      >
        {status === "loading" ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Zap className="w-3 h-3" />
        )}
        {status === "loading" ? "Loading..." : "Load Story"}
      </Button>

      <p className="text-[9px] text-muted-foreground">
        Loads or overwrites The Rental story with all events and assets.
      </p>
    </motion.div>
  );
}