import React from "react";
import { getThreatLevel } from "@/lib/gameEngine";
import { motion } from "framer-motion";
import { Eye, EyeOff, Footprints, Skull } from "lucide-react";

const THREAT_CONFIG = [
  { icon: EyeOff, color: "text-muted-foreground", bg: "bg-secondary" },
  { icon: Footprints, color: "text-warning", bg: "bg-warning/10" },
  { icon: Eye, color: "text-chart-4", bg: "bg-chart-4/10" },
  { icon: Skull, color: "text-destructive", bg: "bg-destructive/10" },
];

export default function ThreatIndicator({ threat }) {
  const { label, level } = getThreatLevel(threat);
  const config = THREAT_CONFIG[level];
  const Icon = config.icon;

  return (
    <motion.div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bg}`}
      animate={level >= 3 ? { scale: [1, 1.02, 1] } : {}}
      transition={level >= 3 ? { repeat: Infinity, duration: 2 } : {}}
    >
      <Icon className={`w-4 h-4 ${config.color}`} />
      <span className={`text-xs font-medium ${config.color}`}>{label}</span>
    </motion.div>
  );
}