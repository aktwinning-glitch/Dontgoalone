import React, { useMemo, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/lib/GameContext";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw, Home, Clock } from "lucide-react";
import { getMemberStatus, MEMBER_STATUS } from "@/lib/partyEngine";
import CharacterPortrait, { CHARACTER_PRESETS, getExpressionForMember } from "@/components/game/CharacterPortrait";
import EndingNarration from "@/components/game/EndingNarration";
import { validateEndingType, generateEndingSummary } from "@/lib/endingValidator";

// Expanded ending types matching directive §15
const ENDING_CONFIG = {
  good:            { emoji: "🌅", title: "Clean Escape",      subtitle: "Everyone you could save — saved.",          color: "text-success",     bg: "bg-success/10 border-success/30"       },
  mixed:           { emoji: "🌫️", title: "Survivor's Guilt",   subtitle: "You made it. Not everyone did.",            color: "text-warning",     bg: "bg-warning/10 border-warning/30"       },
  bad:             { emoji: "💀", title: "Total Loss",          subtitle: "The cabin remembers everything.",           color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
  bad_call:        { emoji: "❌", title: "Bad Call",            subtitle: "The wrong choice at the wrong moment.",     color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
  paranoia:        { emoji: "👁️", title: "Paranoia",            subtitle: "You suspected everyone. You were right.",   color: "text-warning",     bg: "bg-warning/10 border-warning/30"       },
  traitor_success: { emoji: "🗡️", title: "Traitor's Victory",   subtitle: "They were always one step ahead.",         color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
};

function getEndingType(player, party, endEvent) {
  const survived = (party || []).filter(m => m.isAlive && !m.isMissing).length;
  const total = (party || []).length;
  const explicitType = endEvent?.ending_type;
  if (explicitType && ENDING_CONFIG[explicitType]) return explicitType;
  if (player?.threat >= 100) return "bad";
  if (survived === 0) return "bad";
  if (survived === total) return "good";
  if (player?.flags?.betrayed_ally) return "bad_call";
  if (player?.flags?.suspect_trapped) return "paranoia";
  if (survived >= total * 0.5) return "mixed";
  return "bad";
}

function MemberResult({ member, index, assetImage }) {
  const status = getMemberStatus(member);
  const preset = CHARACTER_PRESETS[index % CHARACTER_PRESETS.length];
  const isDead = status === MEMBER_STATUS.DEAD;
  const isMissing = status === MEMBER_STATUS.MISSING;
  const isInjured = status === MEMBER_STATUS.INJURED;

  const statusLabel = {
    [MEMBER_STATUS.NORMAL]:  { label: "Survived",  color: "text-success" },
    [MEMBER_STATUS.NERVOUS]: { label: "Survived",  color: "text-success" },
    [MEMBER_STATUS.INJURED]: { label: "Injured",   color: "text-warning" },
    [MEMBER_STATUS.MISSING]: { label: "Missing",   color: "text-muted-foreground" },
    [MEMBER_STATUS.DEAD]:    { label: "Gone",       color: "text-destructive" },
  }[status] || { label: "?", color: "text-muted-foreground" };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.4 + index * 0.08, type: "spring", stiffness: 280, damping: 22 }}
      className="flex flex-col items-center gap-1.5"
    >
      <div
        className={`rounded-full overflow-hidden ring-2 shadow-sm ${
          isDead ? "ring-destructive/30 opacity-40 grayscale" :
          isMissing ? "ring-border/30 opacity-55 grayscale" :
          isInjured ? "ring-warning/60" :
          member.isPlayer ? "ring-primary" :
          "ring-border/50"
        }`}
        style={{ width: 48, height: 48 }}
      >
        <CharacterPortrait
          {...preset}
          expression={getExpressionForMember(member)}
          size={48}
          assetImage={assetImage}
        />
      </div>
      <p className={`text-[9px] font-bold uppercase tracking-wide ${statusLabel.color}`}>
        {statusLabel.label}
      </p>
      <p className="text-[8px] text-muted-foreground truncate max-w-[52px] text-center">
        {member.isPlayer ? "You" : member.name?.split(" ")[0]}
      </p>
    </motion.div>
  );
}

// Notable flags to record in history
const NOTABLE_FLAGS = [
  "chose_self","chose_group","chose_one","self_sacrifice","betrayed_ally",
  "truth_spoken","lie_protected","basement_entered","photo_revealed",
  "old_secret_revealed","sender_named","suspect_trapped","trusted_unlikely","used_bait","held_ground",
];

export default function SummaryScreen() {
  const navigate = useNavigate();
  const { player, party, resetGame, charImageMap, killerCharacterId, threatType } = useGame();
  const savedRef = useRef(false);
  const [showNarration, setShowNarration] = useState(true);

  const { data: sceneAssets } = useQuery({
    queryKey: ["sceneAssets"],
    queryFn: () => base44.entities.SceneAsset.list(),
    initialData: [],
  });

  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.GameEvent.list(),
    initialData: [],
  });

  const ending = useMemo(() => {
    if (!player) return null;
    const endEvent = events.find(e => e.event_id === player.currentEventId && e.is_ending);
    // Use validator to ensure ending matches reality
    const validatedType = validateEndingType(player, party);
    const summary = generateEndingSummary(player, party);
    if (endEvent) return { ...endEvent, ending_type: validatedType, ending_text: summary || endEvent.ending_text };
    return { ending_type: validatedType, ending_text: summary };
  }, [player, party, events]);

  const config = ENDING_CONFIG[ending?.ending_type] || ENDING_CONFIG.mixed;

  const survived = party?.filter(m => m.isAlive && !m.isMissing).length ?? 0;
  const total = party?.length ?? 0;

  // Save run to history once
  useEffect(() => {
    if (!player || !ending || savedRef.current) return;
    savedRef.current = true;
    const killerMember = party?.find(m => m.id === killerCharacterId);
    const partyOutcomes = (party || []).map(m => ({
      name: m.name,
      status: !m.isAlive ? "Gone" : m.isMissing ? "Missing" : m.isInjured ? "Injured" : "Survived",
    }));
    const majorFlags = Object.keys(player.flags || {}).filter(k => NOTABLE_FLAGS.includes(k) && player.flags[k]);
    const eventPath = player.eventHistory || [];
    base44.entities.RunHistory.create({
      story_id: player.storyId || "story_1",
      story_title: player.storyTitle || "The Rental",
      character_name: player.characterName || "Unknown",
      character_id: player.characterId || "",
      killer_character_id: killerCharacterId || "",
      killer_character_name: killerMember?.name || "",
      survivors_count: survived,
      total_party: (party || []).length,
      ending_type: ending?.ending_type || "",
      final_fear: player.stats?.fear || 0,
      final_threat: player.threat || 0,
      nights_survived: player.nightsSurvived || 1,
      choices_made: player.choicesMade || 0,
      major_flags: JSON.stringify(majorFlags),
      event_path: JSON.stringify(eventPath),
      party_outcomes: JSON.stringify(partyOutcomes),
    }).catch(() => {});
  }, [player, ending]);

  const handleRestart = () => { resetGame(); navigate("/select"); };
  const handleHome    = () => { resetGame(); navigate("/home"); };

  const endingSceneImage = sceneAssets.find(a => a.key === "endingImage" || a.key === "act1Image")?.image_url || null;

  if (showNarration && ending) {
    return (
      <EndingNarration
        endingType={ending.ending_type}
        sceneImage={endingSceneImage}
        onComplete={() => setShowNarration(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="max-w-sm w-full space-y-6"
      >
        {/* Ending header */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 20 }}
          className={`rounded-2xl border p-5 text-center space-y-2 ${config.bg}`}
        >
          <div className="text-5xl">{config.emoji}</div>
          <h1 className={`font-display text-3xl font-bold ${config.color}`}>{config.title}</h1>
          <p className={`text-sm italic font-display ${config.color} opacity-70`}>{config.subtitle}</p>
          {player && (
            <p className="text-xs text-muted-foreground pt-1">
              {player.characterName} · Fear {player.stats.fear}
              {threatType && <span> · Threat: {threatType === "spirit" ? "👻 Spirit" : threatType === "survivor" ? "👤 Survivor" : "🗡️ One of You"}</span>}
            </p>
          )}
        </motion.div>

        {/* Ending text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card border border-border rounded-2xl p-5"
        >
          <p className="font-display text-sm italic leading-relaxed text-foreground text-center">
            {ending?.ending_text || "The night is over."}
          </p>
        </motion.div>

        {/* Party result grid */}
        {party && party.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-2xl p-5"
          >
            <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground text-center mb-4">
              {survived}/{total} survived
            </p>
            <div className="flex justify-center flex-wrap gap-4">
              {[...party]
                .sort((a, b) => (a.isPlayer ? -1 : b.isPlayer ? 1 : 0))
                .map((member, i) => (
                  <MemberResult key={member.id} member={member} index={party.indexOf(member)} assetImage={charImageMap?.[member.id] || null} />
                ))}
            </div>
          </motion.div>
        )}

        {/* Stats */}
        {player && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="grid grid-cols-3 gap-2"
          >
            {[
              { label: "Fear",   value: player.stats.fear,       color: "text-destructive" },
              { label: "Threat", value: player.threat,           color: "text-warning" },
              { label: "Nights", value: player.nightsSurvived,   color: "text-primary" },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="space-y-3"
        >
          <Button onClick={handleRestart} className="w-full h-13 rounded-2xl gap-2 text-base" size="lg">
            <RotateCcw className="w-4 h-4" />
            Play Again
          </Button>
          <Button onClick={handleHome} variant="outline" className="w-full h-11 rounded-2xl gap-2">
            <Home className="w-4 h-4" />
            Main Menu
          </Button>
          <Button onClick={() => { resetGame(); navigate("/history"); }} variant="ghost" className="w-full h-9 rounded-2xl gap-2 text-muted-foreground text-xs">
            <Clock className="w-3.5 h-3.5" />
            View Run History
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}