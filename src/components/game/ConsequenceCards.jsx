/**
 * ConsequenceCards — Phase 2
 * Displays visible consequence indicators after a choice:
 * trust changes, fear spikes, suspicion shifts, injuries, item changes.
 * Appears briefly then fades.
 */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ConsequenceCards({ cards = [], visible }) {
  if (!cards.length) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="flex flex-wrap gap-1.5"
        >
          {cards.map((card, i) => (
            <motion.div
              key={`${card.type}-${i}`}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ delay: i * 0.07, type: "spring", stiffness: 380, damping: 22 }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
              style={{
                background: `${card.color}10`,
                border: `1px solid ${card.color}35`,
                boxShadow: `0 0 8px ${card.color}18`,
              }}
            >
              <span className="text-[10px]">{card.icon}</span>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold leading-none" style={{ color: card.color }}>
                  {card.label}
                  {card.value !== undefined && card.value !== 1 && card.value !== -1 && (
                    <span className="ml-1 opacity-80">{card.value > 0 ? `+${card.value}` : card.value}</span>
                  )}
                </span>
                {card.description && (
                  <span className="text-[8px] leading-none mt-0.5 opacity-60" style={{ color: card.color }}>
                    {card.description}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}