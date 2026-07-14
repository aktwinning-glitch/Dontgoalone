import React from "react";

const STAT_COLORS = {
  strength: "bg-chart-1",
  speed: "bg-chart-2",
  resilience: "bg-chart-3",
  intelligence: "bg-chart-4",
  fear: "bg-destructive",
  charm: "bg-chart-5",
  influence: "bg-chart-2",
};

const STAT_LABELS = {
  strength: "STR",
  speed: "SPD",
  resilience: "RES",
  intelligence: "INT",
  fear: "FEAR",
  charm: "CHA",
  influence: "INF",
};

export default function StatBar({ stat, value, maxValue = 20, compact = false }) {
  const pct = Math.min(100, (value / maxValue) * 100);
  const color = STAT_COLORS[stat] || "bg-primary";
  const label = STAT_LABELS[stat] || stat.toUpperCase();

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-muted-foreground w-8 font-medium">{label}</span>
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
        <span className="w-4 text-right text-muted-foreground">{value}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}