import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, ArrowRight, TrendingUp, TrendingDown, Eye } from "lucide-react";
import { getCurrentPhase } from "@/lib/phaseSystem";
import { buildConsequenceExplanation } from "@/lib/progressionEngine";

const PHASE_ACT_LABEL = { arrival: "Act 1 Outcome", exploration: "Act 1 Outcome", escalation: "Act 2 Outcome", survival: "Act 2 Outcome", collapse: "Act 3 Outcome", resolution: "Final Outcome", final: "Final Outcome" };

export default function ResultPanel({ result, onContinue, affectedPortrait, affectedName, choiceCount = 0 }) {
  const outcomeText = result?.outcomeText;
  useEffect(() => {
    if (result && !outcomeText) {
      const timer = setTimeout(onContinue, 120);
      return () => clearTimeout(timer);
    }
  }, [result, outcomeText, onContinue]);
  if (!result) return null;

  const { success, statChanges, fearChange, threatChange, consequenceTags } = result;
  const explanation = buildConsequenceExplanation(result);
  const phase = getCurrentPhase(choiceCount);
  const changes = [];
  Object.entries(statChanges || {}).forEach(([stat, delta]) => { if (delta) changes.push({ label: stat.toUpperCase(), value: delta }); });
  if (fearChange) changes.push({ label: "FEAR", value: fearChange });
  if (threatChange) changes.push({ label: "THREAT", value: threatChange });

  const accentColor = success ? "#5ae87a" : "#e8705a";
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 22, scale: .93 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16 }} className={`rounded-3xl overflow-hidden ${success ? "animate-glow-success" : "animate-shake"}`} style={{ background: success ? "hsl(123 68% 55% / .07)" : "hsl(351 78% 60% / .08)", border: `2px solid ${accentColor}66`, boxShadow: `0 0 40px ${accentColor}30` }}>
        <div className="h-1.5" style={{ background: `linear-gradient(90deg,transparent,${accentColor},transparent)` }} />
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${accentColor}18`, border: `2px solid ${accentColor}50` }}>{success ? <CheckCircle2 className="w-5 h-5" style={{ color: accentColor }} /> : <XCircle className="w-5 h-5" style={{ color: accentColor }} />}</div>
            <div className="flex-1"><p className="text-[8px] font-black uppercase tracking-widest opacity-60" style={{ color: accentColor }}>{PHASE_ACT_LABEL[phase.id] || "Outcome"}</p><p className="text-[11px] font-black uppercase tracking-widest" style={{ color: accentColor }}>{success ? "✓ Survived" : "✗ Failed"}</p></div>
            {affectedPortrait && <div className="flex flex-col items-center"><img src={affectedPortrait} alt="" className="w-10 h-10 rounded-full object-cover" style={{ boxShadow: `0 0 0 2px ${accentColor}` }} />{affectedName && <span className="text-[7px] text-muted-foreground">{affectedName.split(" ")[0]}</span>}</div>}
          </div>

          {outcomeText && <div className="rounded-2xl px-4 py-3 bg-black/20 border border-white/10"><p className="text-sm font-display italic leading-relaxed">{outcomeText}</p></div>}

          <div className="rounded-2xl border border-white/10 bg-white/[.025] p-3">
            <div className="flex items-center gap-2"><Eye className="w-3.5 h-3.5" style={{ color: accentColor }} /><p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: accentColor }}>Why it happened</p></div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{explanation.why}</p>
          </div>

          {changes.length > 0 && <div><p className="text-[8px] uppercase tracking-widest text-muted-foreground mb-1.5">What changed</p><div className="flex flex-wrap gap-1.5">{changes.map(({ label, value }) => {
            const positive = value > 0;
            const bad = (label === "FEAR" || label === "THREAT") ? positive : !positive;
            const color = bad ? "#e8705a" : "#5ae87a";
            const Icon = positive ? TrendingUp : TrendingDown;
            return <div key={label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ background: `${color}12`, border: `1px solid ${color}35` }}><Icon className="w-2.5 h-2.5" style={{ color }} /><span className="text-[9px] font-bold" style={{ color }}>{label}</span><span className="text-[10px] font-black" style={{ color }}>{value > 0 ? "+" : ""}{value}</span></div>;
          })}</div></div>}

          {consequenceTags?.length > 0 && <div><p className="text-[8px] uppercase tracking-widest text-muted-foreground mb-1.5">What it may affect</p><div className="flex flex-wrap gap-1.5">{consequenceTags.map((tag, index) => <span key={index} className="text-[8px] font-bold px-2 py-1 rounded-lg bg-white/[.05] border border-white/10 text-amber-200/80">{tag}</span>)}</div></div>}

          <motion.button whileTap={{ scale: .97 }} onClick={onContinue} className="w-full h-12 rounded-2xl text-sm font-black flex items-center justify-center gap-2 text-white" style={{ background: `linear-gradient(135deg,${accentColor}cc,${accentColor}77)`, boxShadow: `0 4px 20px ${accentColor}45` }}>Keep Moving <ArrowRight className="w-4 h-4" /></motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
