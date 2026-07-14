import React from "react";
import { motion } from "framer-motion";

export default function FearMeter({ fear }) {
  const pct = Math.min(100, fear);
  const isHigh = fear > 70;
  const isCritical = fear > 85;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="font-medium text-foreground">Fear</span>
        <span className={`font-mono ${isCritical ? "text-destructive font-bold" : isHigh ? "text-warning font-semibold" : "text-muted-foreground"}`}>
          {fear}
        </span>
      </div>
      <div className="h-2.5 bg-secondary rounded-full overflow-hidden relative">
        <motion.div
          className={`h-full rounded-full ${isCritical ? "bg-destructive" : isHigh ? "bg-warning" : "bg-chart-4"}`}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        {isCritical && (
          <motion.div
            className="absolute inset-0 bg-destructive/20 rounded-full"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}
      </div>
    </div>
  );
}