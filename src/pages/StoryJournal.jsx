import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Package, Users, ChevronDown, ChevronUp, Network } from "lucide-react";
import RelationshipNetwork from "@/components/game/RelationshipNetwork";
import { useGame } from "@/lib/GameContext";
import { getItem } from "@/lib/itemsConfig";
import { getCurrentPhase } from "@/lib/phaseSystem";

const PHASE_ACT_MAP = {
  arrival: "Act 1", exploration: "Act 1",
  escalation: "Act 2", survival: "Act 2",
  collapse: "Act 3", resolution: "Final",
};

function JournalEntry({ entry, index }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "hsl(252 12% 14%)",
        border: `1.5px solid ${entry.success ? "hsl(123 68% 55% / 0.2)" : "hsl(351 78% 60% / 0.2)"}`,
      }}
    >
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left px-4 py-3 flex items-start gap-3"
      >
        {/* Outcome indicator */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          style={{
            background: entry.success ? "hsl(123 68% 55% / 0.15)" : "hsl(351 78% 60% / 0.15)",
            border: `1.5px solid ${entry.success ? "hsl(123 68% 55% / 0.4)" : "hsl(351 78% 60% / 0.4)"}`,
          }}
        >
          <span className="text-[10px]">{entry.success ? "✓" : "✗"}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: "hsl(252 12% 20%)", color: "hsl(40 30% 60%)" }}
            >
              {entry.actLabel}
            </span>
            {entry.choiceText && (
              <span className="text-[9px] font-semibold text-muted-foreground truncate">{entry.choiceText}</span>
            )}
          </div>
          <p className="text-xs text-foreground leading-snug line-clamp-2">{entry.outcomeText}</p>
        </div>

        <div className="shrink-0 mt-1">
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-0 space-y-2 border-t border-border/30">
              {entry.statChanges && Object.entries(entry.statChanges).filter(([, v]) => v !== 0).map(([stat, val]) => (
                <div key={stat} className="flex items-center justify-between text-[9px]">
                  <span className="text-muted-foreground uppercase tracking-wider">{stat}</span>
                  <span style={{ color: val > 0 ? "hsl(123 68% 65%)" : "hsl(351 78% 65%)" }}>
                    {val > 0 ? "+" : ""}{val}
                  </span>
                </div>
              ))}
              {entry.fearChange !== 0 && (
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-muted-foreground uppercase tracking-wider">Fear</span>
                  <span style={{ color: entry.fearChange > 0 ? "hsl(351 78% 65%)" : "hsl(123 68% 65%)" }}>
                    {entry.fearChange > 0 ? "+" : ""}{entry.fearChange}
                  </span>
                </div>
              )}
              {entry.tags?.map((tag, i) => (
                <span
                  key={i}
                  className="inline-block mr-1 text-[8px] font-bold px-2 py-0.5 rounded-lg"
                  style={{ background: "hsl(252 12% 20%)", color: "hsl(40 30% 60%)", border: "1px solid hsl(252 10% 26%)" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function InventoryItem({ itemId }) {
  const def = getItem(itemId);
  if (!def) return null;
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="rounded-xl px-3 py-2.5 flex items-center gap-3"
      style={{ background: "hsl(252 12% 14%)", border: "1.5px solid hsl(271 87% 65% / 0.2)" }}
    >
      <span className="text-xl">{def.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-foreground">{def.name}</p>
        <p className="text-[9px] text-muted-foreground leading-snug">{def.flavor}</p>
      </div>
      {def.stat_bonus && (
        <div className="flex flex-col items-end gap-0.5">
          {Object.entries(def.stat_bonus).map(([stat, val]) => (
            <span
              key={stat}
              className="text-[8px] font-black px-1.5 py-0.5 rounded"
              style={{ background: "hsl(271 87% 65% / 0.15)", color: "hsl(271 87% 75%)" }}
            >
              +{val} {stat.slice(0, 3).toUpperCase()}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

const TABS = [
  { id: "events", label: "Events", icon: BookOpen },
  { id: "inventory", label: "Items", icon: Package },
  { id: "party", label: "Group", icon: Users },
  { id: "network", label: "Network", icon: Network },
];

export default function StoryJournal() {
  const navigate = useNavigate();
  const { player, party, choiceCount, charImageMap } = useGame();
  const [activeTab, setActiveTab] = useState("events");

  const eventHistory = useMemo(() => {
    if (!player?.journalLog) return [];
    return [...player.journalLog].reverse();
  }, [player?.journalLog]);

  const inventory = player?.inventory || [];
  const aliveParty = (party || []).filter(m => m.isAlive && !m.isMissing);
  const deadParty = (party || []).filter(m => !m.isAlive);
  const missingParty = (party || []).filter(m => m.isMissing && m.isAlive);

  if (!player) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="font-display text-xl text-foreground">No active run.</p>
          <button onClick={() => navigate("/home")} className="text-xs text-muted-foreground underline">Go Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 pt-5 pb-3"
        style={{ background: "hsl(252 13% 11% / 0.97)", borderBottom: "1px solid hsl(252 10% 18%)", backdropFilter: "blur(8px)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "hsl(252 12% 18%)", border: "1px solid hsl(252 10% 24%)" }}
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <h1 className="font-display text-xl text-foreground tracking-wide leading-none">Story Journal</h1>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">
              {choiceCount} choices made · {player.characterName}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold transition-all"
                style={{
                  background: active ? "hsl(271 87% 65% / 0.15)" : "transparent",
                  border: `1px solid ${active ? "hsl(271 87% 65% / 0.35)" : "hsl(252 10% 20%)"}`,
                  color: active ? "hsl(271 87% 75%)" : "hsl(252 8% 50%)",
                }}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
                {tab.id === "inventory" && inventory.length > 0 && (
                  <span className="ml-0.5 w-4 h-4 rounded-full text-[7px] font-black flex items-center justify-center" style={{ background: "hsl(271 87% 55%)", color: "white" }}>
                    {inventory.length}
                  </span>
                )}
                {tab.id === "events" && eventHistory.length > 0 && (
                  <span className="ml-0.5 rounded px-1 text-[7px] font-black" style={{ background: "hsl(252 12% 24%)", color: "hsl(252 8% 55%)" }}>
                    {eventHistory.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <AnimatePresence mode="wait">

          {/* Events tab */}
          {activeTab === "events" && (
            <motion.div key="events" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2.5">
              {eventHistory.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <p className="text-4xl">📖</p>
                  <p className="font-display text-lg text-foreground">Nothing logged yet.</p>
                  <p className="text-xs text-muted-foreground">Choices you make will appear here.</p>
                </div>
              ) : (
                eventHistory.map((entry, i) => (
                  <JournalEntry key={i} entry={entry} index={i} />
                ))
              )}
            </motion.div>
          )}

          {/* Inventory tab */}
          {activeTab === "inventory" && (
            <motion.div key="inventory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2.5">
              {inventory.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <p className="text-4xl">🎒</p>
                  <p className="font-display text-lg text-foreground">Backpack is empty.</p>
                  <p className="text-xs text-muted-foreground">Items found during the run appear here.</p>
                </div>
              ) : (
                inventory.map((item, i) => (
                  <InventoryItem key={i} itemId={item.id || item} />
                ))
              )}
            </motion.div>
          )}

          {/* Party tab */}
          {activeTab === "party" && (
            <motion.div key="party" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {aliveParty.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-black text-muted-foreground mb-2">Alive ({aliveParty.length})</p>
                  <div className="space-y-2">
                    {aliveParty.map(m => (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                        style={{ background: "hsl(252 12% 14%)", border: "1.5px solid hsl(123 68% 55% / 0.2)" }}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ background: "hsl(123 68% 55%)" }} />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-foreground">{m.isPlayer ? `${m.name} (You)` : m.name}</p>
                          {m.currentStatusText && (
                            <p className="text-[9px] text-muted-foreground italic">{m.currentStatusText}</p>
                          )}
                        </div>
                        {m.fearLevel !== undefined && (
                          <span className="text-[9px] text-muted-foreground">Fear {m.fearLevel}%</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {missingParty.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-black text-muted-foreground mb-2">Missing ({missingParty.length})</p>
                  <div className="space-y-2">
                    {missingParty.map(m => (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                        style={{ background: "hsl(252 12% 14%)", border: "1.5px solid hsl(40 90% 62% / 0.25)" }}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ background: "hsl(40 90% 62%)" }} />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-foreground">{m.name}</p>
                          {m.currentStatusText && (
                            <p className="text-[9px] text-muted-foreground italic">{m.currentStatusText}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {deadParty.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-black text-muted-foreground mb-2">Gone ({deadParty.length})</p>
                  <div className="space-y-2">
                    {deadParty.map(m => (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl opacity-50"
                        style={{ background: "hsl(252 12% 12%)", border: "1px solid hsl(351 78% 60% / 0.15)" }}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ background: "hsl(351 78% 60%)" }} />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-muted-foreground">{m.name}</p>
                          {m.currentStatusText && (
                            <p className="text-[9px] text-muted-foreground/60 italic">{m.currentStatusText}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Network tab */}
          {activeTab === "network" && (
            <motion.div key="network" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="text-center">
                <p className="text-[9px] uppercase tracking-widest font-black text-muted-foreground mb-1">Relationship Web</p>
                <p className="text-[8px] text-muted-foreground/60">Line strength shows trust. Dashes show doubt.</p>
              </div>
              {(!party || party.length === 0) ? (
                <div className="text-center py-12 space-y-2">
                  <p className="text-4xl">🕸️</p>
                  <p className="font-display text-lg text-foreground">No group yet.</p>
                  <p className="text-xs text-muted-foreground">Party members appear here once in-game.</p>
                </div>
              ) : (
                <RelationshipNetwork party={party} charImageMap={charImageMap} />
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}