import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package, Sparkles } from "lucide-react";
import { getItem } from "@/lib/itemsConfig";

function ItemCard({ item, onUse, onClose }) {
  const def = getItem(item.id || item);
  if (!def) return null;

  const bonuses = Object.entries(def.stat_bonus || {});

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 6 }}
      className="rounded-2xl p-4 space-y-3"
      style={{ background: "hsl(252 12% 16%)", border: "1.5px solid hsl(271 87% 65% / 0.3)" }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{def.emoji}</span>
          <div>
            <p className="text-sm font-bold text-foreground">{def.name}</p>
            <p className="text-[9px] text-muted-foreground italic">{def.flavor}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-foreground/80 leading-relaxed">{def.description}</p>

      {bonuses.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {bonuses.map(([stat, val]) => (
            <span
              key={stat}
              className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full"
              style={{ background: "hsl(271 87% 65% / 0.12)", color: "hsl(271 87% 75%)", border: "1px solid hsl(271 87% 65% / 0.3)" }}
            >
              +{val} {stat}
            </span>
          ))}
        </div>
      )}

      {def.usable && onUse && (
        <button
          onClick={() => onUse(def)}
          className="w-full h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
          style={{ background: "hsl(351 78% 55%)", color: "white" }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {def.use_label || "Use Item"}
        </button>
      )}
    </motion.div>
  );
}

export default function InventoryPanel({ inventory = [], onUseItem, onClose }) {
  const [selected, setSelected] = useState(null);

  const items = inventory.map(i => getItem(i.id || i)).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: "hsl(252 13% 6% / 0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="rounded-t-3xl p-5 space-y-4 max-h-[70vh] overflow-y-auto"
        style={{ background: "hsl(252 12% 12%)", border: "1.5px solid hsl(252 10% 22%)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-bold text-foreground">Inventory</p>
            <span className="text-[9px] text-muted-foreground ml-1">{items.length} item{items.length !== 1 ? "s" : ""}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {items.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <div className="text-3xl">🎒</div>
            <p className="text-xs text-muted-foreground">Nothing yet. Items are found during events.</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {selected ? (
            <ItemCard
              key="detail"
              item={selected}
              onUse={(def) => { onUseItem?.(def); setSelected(null); onClose(); }}
              onClose={() => setSelected(null)}
            />
          ) : (
            <motion.div key="grid" className="grid grid-cols-3 gap-2">
              {items.map((def) => (
                <motion.button
                  key={def.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => setSelected(def)}
                  className="rounded-2xl p-3 flex flex-col items-center gap-2 text-center"
                  style={{ background: "hsl(252 12% 18%)", border: "1px solid hsl(252 10% 24%)" }}
                >
                  <span className="text-2xl">{def.emoji}</span>
                  <p className="text-[9px] font-bold text-foreground leading-tight">{def.name}</p>
                  {def.usable && (
                    <span className="text-[7px] uppercase tracking-wide px-1.5 py-0.5 rounded-full" style={{ background: "hsl(351 78% 55% / 0.2)", color: "hsl(351 78% 70%)" }}>usable</span>
                  )}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stat bonus summary */}
        {items.length > 0 && !selected && (
          <div className="rounded-xl px-3 py-2 flex flex-wrap gap-2" style={{ background: "hsl(252 12% 16%)" }}>
            <p className="text-[9px] text-muted-foreground w-full uppercase tracking-widest font-bold mb-1">Active Bonuses</p>
            {(() => {
              const totals = {};
              items.forEach(def => {
                Object.entries(def.stat_bonus || {}).forEach(([s, v]) => {
                  totals[s] = (totals[s] || 0) + v;
                });
              });
              return Object.entries(totals).map(([s, v]) => (
                <span key={s} className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "hsl(271 87% 65% / 0.12)", color: "hsl(271 87% 75%)" }}>
                  +{v} {s}
                </span>
              ));
            })()}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}