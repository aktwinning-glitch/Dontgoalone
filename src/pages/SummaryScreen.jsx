import React, { useMemo, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/lib/GameContext";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Home, Clock, Sparkles, BookOpen, Trophy, Users } from "lucide-react";
import { getMemberStatus, MEMBER_STATUS } from "@/lib/partyEngine";
import CharacterPortrait, { CHARACTER_PRESETS, getExpressionForMember } from "@/components/game/CharacterPortrait";
import EndingNarration from "@/components/game/EndingNarration";
import { validateEndingType, generateEndingSummary } from "@/lib/endingValidator";
import { buildRunLegacyResult } from "@/lib/progressionEngine";
import { applyLegacyRun, getLegacyProfile } from "@/lib/legacyService";

const ENDING_CONFIG = {
  good: { emoji: "🌅", title: "Clean Escape", subtitle: "Everyone you could save — saved.", color: "text-success", bg: "bg-success/10 border-success/30" },
  mixed: { emoji: "🌫️", title: "Survivor's Guilt", subtitle: "You made it. Not everyone did.", color: "text-warning", bg: "bg-warning/10 border-warning/30" },
  bad: { emoji: "💀", title: "Total Loss", subtitle: "The house remembers everything.", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
  bad_call: { emoji: "❌", title: "Bad Call", subtitle: "The wrong choice at the wrong moment.", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
  paranoia: { emoji: "👁️", title: "Paranoia", subtitle: "You suspected everyone. You were right.", color: "text-warning", bg: "bg-warning/10 border-warning/30" },
  traitor_success: { emoji: "🗡️", title: "Traitor's Victory", subtitle: "They were always one step ahead.", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
};

function MemberResult({ member, index, assetImage }) {
  const status = getMemberStatus(member);
  const preset = CHARACTER_PRESETS[index % CHARACTER_PRESETS.length];
  const statusLabel = {
    [MEMBER_STATUS.NORMAL]: { label: "Survived", color: "text-success" },
    [MEMBER_STATUS.NERVOUS]: { label: "Survived", color: "text-success" },
    [MEMBER_STATUS.INJURED]: { label: "Injured", color: "text-warning" },
    [MEMBER_STATUS.MISSING]: { label: "Missing", color: "text-muted-foreground" },
    [MEMBER_STATUS.DEAD]: { label: "Gone", color: "text-destructive" },
  }[status] || { label: "?", color: "text-muted-foreground" };
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`rounded-full overflow-hidden ring-2 ${status === MEMBER_STATUS.DEAD ? "opacity-40 grayscale ring-destructive/30" : status === MEMBER_STATUS.MISSING ? "opacity-55 grayscale ring-border/30" : status === MEMBER_STATUS.INJURED ? "ring-warning/60" : member.isPlayer ? "ring-primary" : "ring-border/50"}`} style={{ width: 48, height: 48 }}>
        <CharacterPortrait {...preset} expression={getExpressionForMember(member)} size={48} assetImage={assetImage} />
      </div>
      <p className={`text-[9px] font-bold uppercase ${statusLabel.color}`}>{statusLabel.label}</p>
      <p className="text-[8px] text-muted-foreground">{member.isPlayer ? "You" : member.name?.split(" ")[0]}</p>
    </div>
  );
}

const NOTABLE_FLAGS = ["chose_self", "chose_group", "self_sacrifice", "betrayed_ally", "truth_spoken", "basement_entered", "photo_revealed", "old_secret_revealed", "sender_named", "suspect_trapped", "trusted_unlikely", "used_bait", "held_ground"];
const CLUE_FLAGS = ["photo_revealed", "old_secret_revealed", "sender_named", "truth_spoken", "basement_entered"];

export default function SummaryScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { player, party, resetGame, charImageMap, killerCharacterId, threatType, discoveredClues, objectiveState, temporaryTraits, activeModifiers, elapsedTurns } = useGame();
  const savedRef = useRef(false);
  const [showNarration, setShowNarration] = useState(true);
  const [legacyResult, setLegacyResult] = useState(null);
  const [legacyProfile, setLegacyProfile] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const { data: sceneAssets = [] } = useQuery({ queryKey: ["sceneAssets"], queryFn: () => base44.entities.SceneAsset.list(), initialData: [] });
  const { data: events = [] } = useQuery({ queryKey: ["events"], queryFn: () => base44.entities.GameEvent.list(), initialData: [] });
  const { data: existingProfile } = useQuery({ queryKey: ["legacyProfile"], queryFn: getLegacyProfile });

  const ending = useMemo(() => {
    if (!player) return null;
    const endEvent = events.find(event => event.event_id === player.currentEventId && event.is_ending);
    const endingType = validateEndingType(player, party);
    const summary = generateEndingSummary(player, party);
    return { ...(endEvent || {}), ending_type: endingType, ending_text: summary || endEvent?.ending_text || "The night is over." };
  }, [player, party, events]);

  const permanentClues = useMemo(() => {
    const fromFlags = CLUE_FLAGS.filter(flag => player?.flags?.[flag]).map(flag => ({ id: `${player?.storyId || "story"}:${flag}`, title: flag.replaceAll("_", " ") }));
    const map = new Map([...(discoveredClues || []), ...fromFlags].map(clue => [clue.id, clue]));
    return Array.from(map.values());
  }, [discoveredClues, player]);

  const survived = party?.filter(member => member.isAlive && !member.isMissing).length || 0;
  const total = party?.length || 0;
  const config = ENDING_CONFIG[ending?.ending_type] || ENDING_CONFIG.mixed;

  useEffect(() => {
    if (!player || !ending || !existingProfile || savedRef.current) return;
    savedRef.current = true;
    const result = buildRunLegacyResult({
      player,
      party,
      endingType: ending.ending_type,
      discoveredClues: permanentClues,
      objectiveState,
      existingEndingIds: existingProfile.unlocked_ending_ids || [],
      activeModifiers,
      elapsedTurns,
    });
    setLegacyResult(result);

    const killerMember = party.find(member => member.id === killerCharacterId);
    const partyOutcomes = party.map(member => ({ name: member.name, status: !member.isAlive ? "Gone" : member.isMissing ? "Missing" : member.isInjured ? "Injured" : "Survived" }));
    const majorFlags = Object.keys(player.flags || {}).filter(key => NOTABLE_FLAGS.includes(key) && player.flags[key]);

    Promise.all([
      base44.entities.RunHistory.create({
        story_id: player.storyId || "the_rental",
        story_title: player.storyTitle || "The Rental",
        character_name: player.characterName || "Unknown",
        character_id: player.characterId || "",
        killer_character_id: killerCharacterId || "",
        killer_character_name: killerMember?.name || "",
        survivors_count: survived,
        total_party: total,
        ending_type: ending.ending_type || "",
        final_fear: player.stats?.fear || 0,
        final_threat: player.threat || 0,
        nights_survived: player.nightsSurvived || 1,
        choices_made: player.choicesMade || 0,
        major_flags: JSON.stringify(majorFlags),
        event_path: JSON.stringify(player.eventHistory || []),
        party_outcomes: JSON.stringify(partyOutcomes),
      }),
      applyLegacyRun(existingProfile, result, (temporaryTraits || []).map(trait => trait.id)),
    ]).then(([, updated]) => {
      setLegacyProfile(updated);
      queryClient.setQueryData(["legacyProfile"], updated);
    }).catch(error => setSaveError(error?.message || "Progress could not be synced."));
  }, [player, ending, existingProfile]);

  if (showNarration && ending) {
    const image = sceneAssets.find(asset => asset.key === "endingImage" || asset.key === "act1Image")?.image_url || null;
    return <EndingNarration endingType={ending.ending_type} sceneImage={image} onComplete={() => setShowNarration(false)} />;
  }

  const handleRestart = () => { resetGame(); navigate("/select"); };
  const handleHome = () => { resetGame(); navigate("/home"); };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-5 py-10">
      <div className="max-w-md w-full space-y-5">
        <motion.div initial={{ scale: .9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`rounded-2xl border p-5 text-center ${config.bg}`}>
          <div className="text-5xl">{config.emoji}</div>
          <h1 className={`font-display text-3xl font-bold mt-2 ${config.color}`}>{config.title}</h1>
          <p className={`text-sm italic mt-1 ${config.color} opacity-70`}>{config.subtitle}</p>
          <p className="text-xs text-muted-foreground mt-2">{player?.characterName} · Fear {player?.stats?.fear || 0}{threatType ? ` · ${threatType}` : ""}</p>
        </motion.div>

        <div className="bg-card border border-border rounded-2xl p-5 text-center"><p className="font-display text-sm italic leading-relaxed">{ending?.ending_text}</p></div>

        <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .15 }} className="rounded-3xl border border-fuchsia-300/25 bg-[#11111a] p-5">
          <div className="flex items-center justify-between gap-3">
            <div><div className="flex items-center gap-2 text-fuchsia-300"><Sparkles className="w-4 h-4" /><span className="text-[10px] uppercase tracking-[.25em]">Legacy earned</span></div><p className="text-sm text-muted-foreground mt-1">This progress carries into future runs.</p></div>
            <p className="text-4xl font-black text-cyan-300">+{legacyResult?.legacyEarned ?? "…"}</p>
          </div>
          {legacyResult && <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
            <Reward icon={Users} label={`${survived} survivors`} />
            <Reward icon={BookOpen} label={`${legacyResult.clueIds.length} clues saved`} />
            <Reward icon={Trophy} label={`${legacyResult.completedObjectives} objectives`} />
            <Reward icon={Sparkles} label={`${temporaryTraits?.length || 0} traits retained`} />
          </div>}
          {legacyResult?.isNewEnding && <p className="mt-3 rounded-xl bg-fuchsia-300/10 border border-fuchsia-300/20 p-3 text-sm text-fuchsia-200">New ending archived: {legacyResult.endingId}</p>}
          {legacyResult?.challenge?.active && <p className={`mt-3 rounded-xl p-3 text-sm ${legacyResult.challenge.completed ? "bg-emerald-300/10 text-emerald-200" : "bg-red-300/10 text-red-200"}`}>{legacyResult.challenge.completed ? "Challenge completed — bonus awarded." : "Challenge failed. The run still added to your legacy."}</p>}
          {legacyProfile && <p className="text-center text-xs text-muted-foreground mt-3">Total Legacy: {legacyProfile.legacy_currency}</p>}
          {saveError && <p className="text-center text-xs text-destructive mt-3">{saveError}</p>}
        </motion.div>

        {party.length > 0 && <div className="bg-card border border-border rounded-2xl p-5"><p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground text-center mb-4">{survived}/{total} survived</p><div className="flex justify-center flex-wrap gap-4">{[...party].sort((a, b) => a.isPlayer ? -1 : b.isPlayer ? 1 : 0).map((member, index) => <MemberResult key={member.id} member={member} index={index} assetImage={charImageMap?.[member.id] || null} />)}</div></div>}

        <div className="space-y-3">
          <Button onClick={() => navigate("/legacy")} className="w-full h-12 rounded-2xl gap-2"><Sparkles className="w-4 h-4" /> View Survivor Legacy</Button>
          <Button onClick={handleRestart} variant="outline" className="w-full h-11 rounded-2xl gap-2"><RotateCcw className="w-4 h-4" /> Play Again</Button>
          <div className="grid grid-cols-2 gap-2"><Button onClick={handleHome} variant="ghost" className="rounded-xl gap-2"><Home className="w-4 h-4" /> Main Menu</Button><Button onClick={() => { resetGame(); navigate("/history"); }} variant="ghost" className="rounded-xl gap-2"><Clock className="w-4 h-4" /> History</Button></div>
        </div>
      </div>
    </div>
  );
}

function Reward({ icon: Icon, label }) {
  return <div className="rounded-xl border border-white/10 bg-white/[.035] p-3 flex items-center gap-2"><Icon className="w-4 h-4 text-cyan-300" /><span>{label}</span></div>;
}
