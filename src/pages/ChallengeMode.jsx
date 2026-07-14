import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { CHALLENGES } from "@/lib/progressionEngine";
import { useGame } from "@/lib/GameContext";

export default function ChallengeMode() {
  const navigate = useNavigate();
  const { setActiveModifiers } = useGame();

  const startChallenge = challenge => {
    setActiveModifiers([challenge.id, ...challenge.modifiers]);
    try { localStorage.setItem("dont_go_alone_active_challenge", JSON.stringify(challenge)); } catch {}
    navigate("/select");
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate("/home")} className="flex items-center gap-2 text-sm text-muted-foreground mb-6"><ArrowLeft className="w-4 h-4" /> Back</button>
        <div className="mb-6">
          <div className="flex items-center gap-2 text-fuchsia-300"><ShieldAlert className="w-5 h-5" /><span className="text-[10px] uppercase tracking-[.3em]">Roguelite mode</span></div>
          <h1 className="font-display text-4xl mt-2">Challenge Mode</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">The same story, harsher rules. Complete a challenge to earn bonus Legacy and unlock future modifiers.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {CHALLENGES.map(challenge => (
            <button key={challenge.id} onClick={() => startChallenge(challenge)} className="text-left rounded-2xl border border-border bg-card p-5 hover:border-fuchsia-300/40 hover:bg-fuchsia-300/[.04] transition">
              <div className="flex justify-between gap-4"><h2 className="font-display text-xl">{challenge.title}</h2><span className="text-cyan-300 font-bold">+{challenge.reward}</span></div>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{challenge.description}</p>
              <p className="text-[10px] uppercase tracking-widest text-fuchsia-300 mt-4">Start challenge →</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
