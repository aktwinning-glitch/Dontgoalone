import React, { createContext, useContext, useState, useCallback } from "react";
import { createInitialPlayer, applyEffects, clampStat } from "./gameEngine";
import { createRunState, applyChoiceEffect } from "./narrativeMemoryEngine";

const SESSION_KEY = "rental_session_v2";
import { generateRunVariant } from "./consequenceEngine";
import {
  createPartyMember,
  applyPartyConsequence,
  applyHiddenRisk,
  updateMemberState,
  moveMember,
} from "./partyEngine";
import { initSuspicionScores, applyTrustEffects, selectKiller, applyCohesionDelta } from "./trustEngine";

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [player, setPlayer] = useState(null);
  const [party, setParty] = useState([]);
  const [focusedMemberId, setFocusedMemberId] = useState(null);
  const [gamePhase, setGamePhase] = useState("start");
  const [choiceCount, setChoiceCount] = useState(0);
  // Shared character image map (id → url) set once when assets load
  const [charImageMap, setCharImageMap] = useState({});
  const [suspicionScores, setSuspicionScores] = useState({});
  const [cohesionScore, setCohesionScore] = useState(60);
  const [killerCharacterId, setKillerCharacterId] = useState(null);
  // threatType: "spirit" | "survivor" | "member"
  const [threatType, setThreatType] = useState(null);
  // Narrative memory: persists across all events
  const [runState, setRunState] = useState(null);

  // characters: full list from DB. playerCharacter: the selected one.
  const initPlayer = useCallback((playerCharacter, allCharacters = [], storyId = "the_rental") => {
    const runVariant = generateRunVariant(allCharacters);
    const base = createInitialPlayer(playerCharacter, runVariant);
    setPlayer({ ...base, storyId });
    const partyMembers = allCharacters.map((c, i) =>
      createPartyMember(c, c.id === playerCharacter.id, i)
    );
    const finalParty = partyMembers.length > 0
      ? partyMembers
      : [createPartyMember(playerCharacter, true)];
    setParty(finalParty);
    setSuspicionScores(initSuspicionScores(finalParty.map(m => m.id)));
    setCohesionScore(60);
    setKillerCharacterId(selectKiller(finalParty));
    const threatTypes = ["spirit", "survivor", "member"];
    setThreatType(threatTypes[Math.floor(Math.random() * threatTypes.length)]);
    setFocusedMemberId(null);
    // Initialize narrative memory for this run
    setRunState(createRunState(playerCharacter.name, playerCharacter.id, storyId));
    setGamePhase("playing");
  }, []);

  const updatePlayer = useCallback((effects) => {
    setPlayer(prev => applyEffects(prev, effects));
  }, []);

  const setCurrentEvent = useCallback((eventId) => {
    setPlayer(prev => {
      if (!prev) return prev;
      const history = prev.eventHistory || [];
      return {
        ...prev,
        currentEventId: eventId,
        eventHistory: [...history, eventId].slice(-60),
        choicesMade: (prev.choicesMade || 0) + 1,
      };
    });
  }, []);

  const addJournalEntry = useCallback((entry) => {
    setPlayer(prev => {
      if (!prev) return prev;
      const log = prev.journalLog || [];
      return { ...prev, journalLog: [...log, entry].slice(-80) };
    });
  }, []);

  const advanceNight = useCallback(() => {
    setPlayer(prev => prev ? { ...prev, night: prev.night + 1, nightsSurvived: prev.nightsSurvived + 1 } : prev);
  }, []);

  const setFlag = useCallback((key, value) => {
    setPlayer(prev => prev ? { ...prev, flags: { ...prev.flags, [key]: value } } : prev);
  }, []);

  const incrementFlag = useCallback((key, amount = 1) => {
    setPlayer(prev => {
      if (!prev) return prev;
      return { ...prev, flags: { ...prev.flags, [key]: (prev.flags[key] || 0) + amount } };
    });
  }, []);

  const addInventoryItem = useCallback((item) => {
    setPlayer(prev => {
      if (!prev) return prev;
      const inv = prev.inventory || [];
      if (inv.find(i => i.id === item.id)) return prev;
      return { ...prev, inventory: [...inv, item] };
    });
  }, []);

  const removeInventoryItem = useCallback((itemId) => {
    setPlayer(prev => {
      if (!prev) return prev;
      return { ...prev, inventory: (prev.inventory || []).filter(i => i.id !== itemId) };
    });
  }, []);

  const applyThreatDelta = useCallback((delta) => {
    setPlayer(prev => {
      if (!prev) return prev;
      return { ...prev, threat: clampStat(prev.threat + delta) };
    });
  }, []);

  // ── Party actions ──────────────────────────────────────────────────────────
  const setPartyConsequence = useCallback((memberId, outcome, statusText) => {
    setParty(prev => applyPartyConsequence(prev, memberId, outcome, statusText));
  }, []);

  const applyTrustSuspicion = useCallback((effectPayload) => {
    setParty(prev => {
      setSuspicionScores(scores => {
        setCohesionScore(cohesion => {
          const result = applyTrustEffects(prev, scores, cohesion, effectPayload);
          // side effects from closure — update party + suspicion + cohesion
          setTimeout(() => {
            setParty(result.party);
            setSuspicionScores(result.suspicionScores);
            setCohesionScore(result.cohesionScore);
          }, 0);
          return result.cohesionScore;
        });
        return scores;
      });
      return prev;
    });
  }, []);

  const setPartyHiddenRisk = useCallback((memberId, riskFlags) => {
    setParty(prev => applyHiddenRisk(prev, memberId, riskFlags));
  }, []);

  const setPartyMemberState = useCallback((memberId, changes) => {
    setParty(prev => updateMemberState(prev, memberId, changes));
  }, []);

  const movePartyMember = useCallback((memberId, location) => {
    setParty(prev => moveMember(prev, memberId, location));
  }, []);

  const incrementChoiceCount = useCallback(() => {
    setChoiceCount(prev => prev + 1);
  }, []);

  const recordChoice = useCallback((eventId, choiceId, choiceText, effect) => {
    if (runState) {
      setRunState(prev => {
        const updated = { ...prev };
        applyChoiceEffect(updated, eventId, choiceId, choiceText, effect);
        return updated;
      });
    }
  }, [runState]);

  const resetGame = useCallback(() => {
    setPlayer(null);
    setParty([]);
    setFocusedMemberId(null);
    setGamePhase("home");
    setChoiceCount(0);
    setSuspicionScores({});
    setCohesionScore(60);
    setKillerCharacterId(null);
    setThreatType(null);
    setRunState(null);
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  }, []);

  const saveSession = useCallback(() => {
    setPlayer(currentPlayer => {
      setParty(currentParty => {
        setChoiceCount(currentCount => {
          if (currentPlayer) {
            try {
              localStorage.setItem(SESSION_KEY, JSON.stringify({
                player: currentPlayer,
                party: currentParty,
                choiceCount: currentCount,
                runState: runState,
              }));
            } catch {}
          }
          return currentCount;
        });
        return currentParty;
      });
      return currentPlayer;
    });
  }, [runState]);

  const loadSession = useCallback(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      const { player: p, party: pa, choiceCount: cc, runState: rs } = JSON.parse(raw);
      if (!p) return false;
      setPlayer(p);
      setParty(pa || []);
      setChoiceCount(cc || 0);
      setRunState(rs || null);
      setGamePhase("playing");
      return true;
    } catch { return false; }
  }, []);

  const clearSession = useCallback(() => {
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  }, []);

  const hasSavedSession = useCallback(() => {
    try { return !!localStorage.getItem(SESSION_KEY); } catch { return false; }
  }, []);

  return (
    <GameContext.Provider value={{
      player,
      setPlayer,
      gamePhase,
      setGamePhase,
      initPlayer,
      updatePlayer,
      setCurrentEvent,
      addJournalEntry,
      advanceNight,
      setFlag,
      incrementFlag,
      addInventoryItem,
      removeInventoryItem,
      applyThreatDelta,
      party,
      setParty,
      focusedMemberId,
      setFocusedMemberId,
      setPartyConsequence,
      setPartyHiddenRisk,
      setPartyMemberState,
      resetGame,
      choiceCount,
      incrementChoiceCount,
      charImageMap,
      setCharImageMap,
      suspicionScores,
      setSuspicionScores,
      cohesionScore,
      setCohesionScore,
      killerCharacterId,
      applyTrustSuspicion,
      threatType,
      setThreatType,
      movePartyMember,
      saveSession,
      loadSession,
      clearSession,
      hasSavedSession,
      runState,
      setRunState,
      recordChoice,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}