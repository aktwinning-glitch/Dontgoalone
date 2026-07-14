import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { createInitialPlayer, applyEffects, clampStat } from "./gameEngine";
import { createRunState, applyChoiceEffect } from "./narrativeMemoryEngine";

const SESSION_KEY = "dont_go_alone_session_v3";
const LEGACY_SESSION_KEYS = ["rental_session_v2"];
const SAVE_VERSION = 3;
import { generateRunVariant } from "./consequenceEngine";
import {
  createPartyMember,
  applyPartyConsequence,
  applyHiddenRisk,
  updateMemberState,
  moveMember,
} from "./partyEngine";
import { initSuspicionScores, applyTrustEffects, selectKiller } from "./trustEngine";

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [player, setPlayer] = useState(null);
  const [party, setParty] = useState([]);
  const [focusedMemberId, setFocusedMemberId] = useState(null);
  const [gamePhase, setGamePhase] = useState("start");
  const [choiceCount, setChoiceCount] = useState(0);
  const [charImageMap, setCharImageMap] = useState({});
  const [suspicionScores, setSuspicionScores] = useState({});
  const [cohesionScore, setCohesionScore] = useState(60);
  const [killerCharacterId, setKillerCharacterId] = useState(null);
  const [threatType, setThreatType] = useState(null);
  const [runState, setRunState] = useState(null);
  const [runSeed, setRunSeed] = useState(null);
  const [activeModifiers, setActiveModifiers] = useState([]);
  const [temporaryTraits, setTemporaryTraits] = useState([]);
  const [discoveredClues, setDiscoveredClues] = useState([]);
  const [objectiveState, setObjectiveState] = useState({});
  const [elapsedTurns, setElapsedTurns] = useState(0);
  const snapshotRef = useRef(null);

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
    setRunSeed(`${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    setActiveModifiers([]);
    setTemporaryTraits([]);
    setDiscoveredClues([]);
    setObjectiveState({});
    setElapsedTurns(0);
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

  const setPartyConsequence = useCallback((memberId, outcome, statusText) => {
    setParty(prev => applyPartyConsequence(prev, memberId, outcome, statusText));
  }, []);

  const applyTrustSuspicion = useCallback((effectPayload) => {
    setParty(currentParty => {
      setSuspicionScores(currentScores => {
        setCohesionScore(currentCohesion => {
          const result = applyTrustEffects(currentParty, currentScores, currentCohesion, effectPayload);
          queueMicrotask(() => {
            setParty(result.party);
            setSuspicionScores(result.suspicionScores);
            setCohesionScore(result.cohesionScore);
          });
          return currentCohesion;
        });
        return currentScores;
      });
      return currentParty;
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
    setElapsedTurns(prev => prev + 1);
  }, []);

  const addTemporaryTrait = useCallback((trait) => {
    if (!trait?.id) return;
    setTemporaryTraits(prev => prev.some(t => t.id === trait.id) ? prev : [...prev, trait]);
  }, []);

  const discoverClue = useCallback((clue) => {
    if (!clue?.id) return;
    setDiscoveredClues(prev => prev.some(c => c.id === clue.id) ? prev : [...prev, clue]);
  }, []);

  const updateObjective = useCallback((objectiveId, changes) => {
    if (!objectiveId) return;
    setObjectiveState(prev => ({
      ...prev,
      [objectiveId]: { ...(prev[objectiveId] || {}), ...changes },
    }));
  }, []);

  const recordChoice = useCallback((eventId, choiceId, choiceText, effect) => {
    setRunState(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      applyChoiceEffect(updated, eventId, choiceId, choiceText, effect);
      return updated;
    });
  }, []);

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
    setRunSeed(null);
    setActiveModifiers([]);
    setTemporaryTraits([]);
    setDiscoveredClues([]);
    setObjectiveState({});
    setElapsedTurns(0);
    try {
      localStorage.removeItem(SESSION_KEY);
      LEGACY_SESSION_KEYS.forEach(key => localStorage.removeItem(key));
    } catch {}
  }, []);

  useEffect(() => {
    snapshotRef.current = {
      version: SAVE_VERSION,
      savedAt: new Date().toISOString(),
      player,
      party,
      focusedMemberId,
      gamePhase,
      choiceCount,
      suspicionScores,
      cohesionScore,
      killerCharacterId,
      threatType,
      runState,
      runSeed,
      activeModifiers,
      temporaryTraits,
      discoveredClues,
      objectiveState,
      elapsedTurns,
    };
  }, [player, party, focusedMemberId, gamePhase, choiceCount, suspicionScores, cohesionScore, killerCharacterId, threatType, runState, runSeed, activeModifiers, temporaryTraits, discoveredClues, objectiveState, elapsedTurns]);

  const saveSession = useCallback(() => {
    const snapshot = snapshotRef.current;
    if (!snapshot?.player) return false;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
      return true;
    } catch {
      return false;
    }
  }, []);

  const migrateSession = useCallback((data) => {
    if (!data?.player) return null;
    const savedParty = data.party || [];
    return {
      version: SAVE_VERSION,
      savedAt: data.savedAt || new Date().toISOString(),
      player: data.player,
      party: savedParty,
      focusedMemberId: data.focusedMemberId || null,
      gamePhase: "playing",
      choiceCount: data.choiceCount || 0,
      suspicionScores: data.suspicionScores || initSuspicionScores(savedParty.map(m => m.id)),
      cohesionScore: Number.isFinite(data.cohesionScore) ? data.cohesionScore : 60,
      killerCharacterId: data.killerCharacterId || selectKiller(savedParty),
      threatType: data.threatType || "spirit",
      runState: data.runState || null,
      runSeed: data.runSeed || `${Date.now()}-migrated`,
      activeModifiers: data.activeModifiers || [],
      temporaryTraits: data.temporaryTraits || [],
      discoveredClues: data.discoveredClues || [],
      objectiveState: data.objectiveState || {},
      elapsedTurns: data.elapsedTurns || data.choiceCount || 0,
    };
  }, []);

  const loadSession = useCallback(() => {
    try {
      let raw = localStorage.getItem(SESSION_KEY);
      if (!raw) {
        for (const key of LEGACY_SESSION_KEYS) {
          raw = localStorage.getItem(key);
          if (raw) break;
        }
      }
      if (!raw) return false;
      const data = migrateSession(JSON.parse(raw));
      if (!data) return false;

      setPlayer(data.player);
      setParty(data.party);
      setFocusedMemberId(data.focusedMemberId);
      setChoiceCount(data.choiceCount);
      setSuspicionScores(data.suspicionScores);
      setCohesionScore(data.cohesionScore);
      setKillerCharacterId(data.killerCharacterId);
      setThreatType(data.threatType);
      setRunState(data.runState);
      setRunSeed(data.runSeed);
      setActiveModifiers(data.activeModifiers);
      setTemporaryTraits(data.temporaryTraits);
      setDiscoveredClues(data.discoveredClues);
      setObjectiveState(data.objectiveState);
      setElapsedTurns(data.elapsedTurns);
      setGamePhase("playing");
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }, [migrateSession]);

  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_KEY);
      LEGACY_SESSION_KEYS.forEach(key => localStorage.removeItem(key));
    } catch {}
  }, []);

  const hasSavedSession = useCallback(() => {
    try {
      return !!localStorage.getItem(SESSION_KEY) || LEGACY_SESSION_KEYS.some(key => !!localStorage.getItem(key));
    } catch {
      return false;
    }
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
      runSeed,
      activeModifiers,
      setActiveModifiers,
      temporaryTraits,
      addTemporaryTrait,
      discoveredClues,
      discoverClue,
      objectiveState,
      updateObjective,
      elapsedTurns,
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
