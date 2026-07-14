import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Settings, ChevronRight, Moon, Lock, Users, Skull, Clock, LogOut, Trash2, X, Play } from "lucide-react";
import { useGame } from "@/lib/GameContext";
import AtmosphereLayer from "@/components/game/AtmosphereLayer";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

const SPLASH_COLORS = ["#e85a7a", "#7a5ae8", "#5ab8e8", "#5ae87a", "#e8a05a"];

function AccountModal({ onClose }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleLogout = () => base44.auth.logout("/");

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await base44.auth.deleteUser();
      base44.auth.logout("/");
    } catch (e) {
      alert("Failed to delete account: " + e.message);
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.65)" }} onClick={onClose}>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-3xl p-5 space-y-3"
        style={{ background: "hsl(252 12% 13%)", border: "1.5px solid hsl(252 10% 22%)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <p className="font-bold text-sm">Account Settings</p>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "hsl(252 12% 20%)" }}><X className="w-3.5 h-3.5" /></button>
        </div>

        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-muted-foreground transition-colors" style={{ background: "hsl(252 12% 18%)", border: "1px solid hsl(252 10% 24%)" }}>
          <LogOut className="w-4 h-4" /> Log Out
        </button>

        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-colors" style={{ background: "hsl(351 78% 60% / 0.1)", border: "1px solid hsl(351 78% 60% / 0.3)", color: "hsl(351 78% 68%)" }}>
            <Trash2 className="w-4 h-4" /> Delete Account
          </button>
        ) : (
          <div className="rounded-2xl p-4 space-y-3" style={{ background: "hsl(351 78% 55% / 0.12)", border: "1.5px solid hsl(351 78% 60% / 0.4)" }}>
            <p className="text-xs text-foreground font-bold">Are you sure? This is permanent.</p>
            <p className="text-[10px] text-muted-foreground">Your account and all run history will be deleted.</p>
            <div className="flex gap-2">
              <button onClick={handleDeleteAccount} disabled={deleting} className="flex-1 py-2.5 rounded-xl text-xs font-bold" style={{ background: "hsl(351 78% 55%)", color: "white" }}>
                {deleting ? "Deleting..." : "Yes, delete"}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-xl text-xs font-bold" style={{ background: "hsl(252 12% 22%)", color: "hsl(var(--muted-foreground))" }}>Cancel</button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function HomeScreen() {
  const navigate = useNavigate();
  const { hasSavedSession, loadSession } = useGame();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [canResume, setCanResume] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(
    () => sessionStorage.getItem("dga_disclaimer") === "1"
  );

  const handleEnter = () => {
    sessionStorage.setItem("dga_disclaimer", "1");
    setDisclaimerAccepted(true);
  };

  useEffect(() => {
    setCanResume(hasSavedSession());
  }, []);

  const handleResume = () => {
    const ok = loadSession();
    if (ok) navigate("/game");
  };

  useEffect(() => {
    base44.auth.me().then(user => {
      if (user?.role === "admin") setIsAdmin(true);
    }).catch(() => {});
  }, []);

  const { data: sceneAssets } = useQuery({
    queryKey: ["sceneAssets"],
    queryFn: () => base44.entities.SceneAsset.list(),
    initialData: [],
  });

  const { data: recentRuns } = useQuery({
    queryKey: ["runHistory"],
    queryFn: () => base44.entities.RunHistory.list("-created_date", 5),
    initialData: [],
  });

  const { data: dbStories } = useQuery({
    queryKey: ["stories"],
    queryFn: () => base44.entities.Story.list("sort_order"),
    initialData: [],
  });

  const getSceneImage = (key) => key ? sceneAssets.find(a => a.key === key)?.image_url : null;
  const homeHeaderImage = getSceneImage("homeHeaderImage");

  // HARD DEDUPLICATION: Show ONLY canonical stories
  const canonicalIds = ["the_rental", "low_tide", "mardi_gras_curse", "the_lab"];
  const storyCards = dbStories
    .filter(s => canonicalIds.includes(s.story_id))
    .filter(s => s.visible_on_homepage !== false)
    .reduce((acc, story) => {
      const exists = acc.find(s => s.story_id === story.story_id);
      if (!exists) acc.push(story);
      return acc;
    }, [])
    .sort((a, b) => {
      const aIdx = canonicalIds.indexOf(a.story_id);
      const bIdx = canonicalIds.indexOf(b.story_id);
      return aIdx - bIdx;
    });

  if (!disclaimerAccepted) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center text-center px-8"
        style={{ background: "hsl(252 14% 8%)" }}
      >
        <AtmosphereLayer fear={35} />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 space-y-6 max-w-xs"
        >
          {/* Character circle — not story-specific */}
          <motion.div className="flex items-center justify-center mb-2">
            {SPLASH_COLORS.map((color, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 20 }}
                className="w-10 h-10 rounded-full -ml-2 first:ml-0 flex items-center justify-center text-sm font-bold"
                style={{
                  background: `${color}20`,
                  border: `2px solid ${color}55`,
                  boxShadow: `0 0 12px ${color}33`,
                  zIndex: 5 - i,
                  position: "relative",
                  color,
                }}
              >
                &#128100;
              </motion.div>
            ))}
          </motion.div>

          <h1 className="font-display text-4xl text-foreground tracking-widest leading-none">Don't Go Alone</h1>

          {/* Content notice */}
          <div className="rounded-2xl px-4 py-3 space-y-1 text-left" style={{ background: "hsl(252 12% 15%)", border: "1px solid hsl(252 10% 22%)" }}>
            <p className="text-[10px] font-black uppercase tracking-widest text-center" style={{ color: "hsl(351 78% 65%)" }}>
              &#9888; Content Notice
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This experience contains intense horror themes, violence, and psychological distress.
              Designed for mature audiences.
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleEnter}
            className="w-full py-4 rounded-2xl font-display text-lg tracking-wider"
            style={{
              background: "linear-gradient(135deg, hsl(351 78% 45%), hsl(351 78% 35%))",
              color: "white",
              boxShadow: "0 0 32px hsl(351 78% 55% / 0.4), inset 0 1px 0 hsl(351 78% 70% / 0.25)",
              border: "1.5px solid hsl(351 78% 55% / 0.5)",
            }}
          >
            Enter if you dare
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AtmosphereLayer fear={15} />

      {/* Home header image */}
      {homeHeaderImage && (
        <div className="relative w-full h-36 overflow-hidden shrink-0">
          <img src={homeHeaderImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, hsl(252 13% 11%))" }} />
        </div>
      )}

      {/* Header */}
      <div className="px-5 pb-4 relative z-10" style={{ paddingTop: homeHeaderImage ? "1rem" : "calc(env(safe-area-inset-top, 0px) + 3rem)" }}>
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "hsl(252 12% 18%)", boxShadow: "0 0 12px hsl(351 78% 60% / 0.2), inset 0 1px 0 hsl(252 10% 26%)", border: "1px solid hsl(252 10% 24%)" }}
            >
              <Moon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl text-foreground leading-none tracking-wide">Don't Go Alone</h1>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">
                Every choice has consequences.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => setShowAccount(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center border border-border"
              style={{ background: "hsl(252 12% 18%)" }}
            >
              <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
            </motion.button>
            {isAdmin && (
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={() => navigate("/admin")}
                className="w-9 h-9 rounded-xl flex items-center justify-center border border-border"
                style={{ background: "hsl(252 12% 18%)" }}
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>

      <div className="px-5 pb-3 relative z-10">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]"
        >
          Choose Your Fate
        </motion.p>
      </div>

      {/* Resume run banner */}
      {canResume && (
        <div className="px-4 pb-3 relative z-10">
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleResume}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold"
            style={{
              background: "linear-gradient(135deg, hsl(271 87% 55% / 0.25), hsl(351 78% 55% / 0.15))",
              border: "1.5px solid hsl(271 87% 65% / 0.55)",
              boxShadow: "0 0 20px hsl(271 87% 65% / 0.15), inset 0 1px 0 hsl(271 87% 65% / 0.2)",
            }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(271 87% 65% / 0.25)", border: "1px solid hsl(271 87% 65% / 0.4)" }}>
              <Play className="w-3.5 h-3.5" style={{ color: "hsl(271 87% 75%)" }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-black" style={{ color: "hsl(271 87% 78%)" }}>Resume Run</p>
              <p className="text-[9px] text-muted-foreground">You left a run in progress</p>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: "hsl(271 87% 68%)" }} />
          </motion.button>
        </div>
      )}

      {/* Run History utility button */}
      {recentRuns.length > 0 && (
        <div className="px-4 pb-2 relative z-10 flex gap-2">
          <button
            onClick={() => navigate("/history")}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl text-[10px] font-bold"
            style={{ background: "hsl(252 12% 16%)", border: "1px solid hsl(252 10% 22%)" }}
          >
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">History</span>
            <span className="rounded-full px-1.5 text-[8px] font-black" style={{ background: "hsl(271 87% 65% / 0.2)", color: "hsl(271 87% 75%)" }}>
              {recentRuns.length}
            </span>
          </button>
        </div>
      )}

      {/* Account modal */}
      <AnimatePresence>
        {showAccount && <AccountModal onClose={() => setShowAccount(false)} />}
      </AnimatePresence>

      {/* Story cards */}
      <div className="flex-1 px-4 space-y-3 overflow-y-auto relative z-10" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)", overscrollBehavior: "none" }} role="main">
        {storyCards.map((story, i) => {
          const available = story.status === "active";
          const accentColor = story.accent_color || "hsl(271 87% 65%)";
          const coverImage = story.cover_image_url || getSceneImage(story.story_id + "Image");
          return (
            <motion.div
              key={story.id || story.story_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1, duration: 0.3, ease: "easeOut" }}
            >
              <motion.button
                disabled={!available}
                onClick={() => available && navigate("/select?storyId=" + story.story_id)}
                whileTap={available ? { scale: 0.97 } : {}}
                className={`w-full text-left rounded-3xl overflow-hidden transition-all duration-200 ${available ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                style={{
                  background: "hsl(252 12% 15%)",
                  border: `2px solid ${available ? accentColor + "55" : "hsl(252 10% 20%)"}`,
                  boxShadow: available ? `0 4px 28px ${accentColor}28, inset 0 1px 0 hsl(252 10% 22%)` : "none",
                }}
              >
                <div className="h-1 w-full" style={{ background: available ? `linear-gradient(90deg, transparent, ${accentColor}, transparent)` : "transparent" }} />

                {coverImage && (
                  <div className="w-full h-28 relative overflow-hidden">
                    <img src={coverImage} alt="" className="w-full h-full object-cover" style={{ filter: "saturate(0.7) brightness(0.7)" }} />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 30%, hsl(252 12% 15%))` }} />
                    {story.chapter_label && (
                      <span className="absolute top-2.5 left-3 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full" style={{ background: `${accentColor}40`, color: accentColor, border: `1.5px solid ${accentColor}66`, backdropFilter: "blur(4px)" }}>
                        {story.chapter_label}
                      </span>
                    )}
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center"
                      style={{ background: `${accentColor}14`, border: `1.5px solid ${accentColor}30` }}
                    >
                      <span className="text-2xl">{story.emoji || "&#128216;"}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      {!coverImage && story.chapter_label && (
                        <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: accentColor }}>
                          {story.chapter_label}
                        </p>
                      )}
                      <h3 className="font-display text-xl text-foreground tracking-wide">{story.title}</h3>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{story.subtitle}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{story.description}</p>
                    </div>

                    <div className="shrink-0 mt-1">
                      {available ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground/50" />}
                    </div>
                  </div>

                  {!available && story.unlock_requirement && (
                    <div className="mt-3 pt-3 border-t border-border/30">
                      <p className="text-[10px] italic text-muted-foreground">{story.unlock_requirement}</p>
                    </div>
                  )}

                  {!available && story.status === "coming_soon" && !story.unlock_requirement && (
                    <div className="mt-3 pt-3 border-t border-border/30">
                      <p className="text-[10px] italic text-muted-foreground">Coming soon.</p>
                    </div>
                  )}

                  {available && (
                    <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2">
                      <span className="text-[9px] rounded-full px-2.5 py-0.5 font-bold uppercase tracking-wider flex items-center gap-1" style={{ background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44` }}>
                        <Users className="w-2.5 h-2.5" /> {story.survivor_count || 6} survivors
                      </span>
                      <span className="text-[9px] rounded-full px-2.5 py-0.5 font-bold uppercase tracking-wider flex items-center gap-1" style={{ background: "hsl(351 78% 60% / 0.12)", color: "hsl(351 78% 68%)", border: "1px solid hsl(351 78% 60% / 0.25)" }}>
                        <Skull className="w-2.5 h-2.5" /> Deaths possible
                      </span>
                    </div>
                  )}
                </div>
              </motion.button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}