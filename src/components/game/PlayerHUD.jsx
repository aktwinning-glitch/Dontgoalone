import React from "react";
import { useGame } from "@/lib/GameContext";
import { Moon, Package } from "lucide-react";
import { getThreatLevel } from "@/lib/gameEngine";

// Compact inline HUD — kept minimal, TopBar in GameScreen handles meters
export default function PlayerHUD() {
  const { player } = useGame();
  if (!player) return null;

  const { label: threatLabel, level } = getThreatLevel(player.threat);
  const threatColors = ["text-success", "text-warning", "text-chart-1", "text-destructive"];

  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-display font-bold text-foreground">{player.characterName}</span>
        <span className="text-[9px] text-muted-foreground">·</span>
        <div className="flex items-center gap-1">
          <Moon className="w-2.5 h-2.5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-semibold">Night {player.night}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {player.inventory && player.inventory.length > 0 && (
          <div className="flex items-center gap-1">
            <Package className="w-3 h-3 text-muted-foreground" />
            {player.inventory.slice(0, 3).map(item => (
              <span
                key={item.id}
                className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
                  item.cursed
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : "bg-secondary text-secondary-foreground border-border"
                }`}
              >
                {item.name}
              </span>
            ))}
          </div>
        )}
        <span className={`text-[9px] font-bold uppercase tracking-wider ${threatColors[level]}`}>
          ⬥ {threatLabel}
        </span>
      </div>
    </div>
  );
}