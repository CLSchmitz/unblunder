import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Blunder, OutcomeType } from '../types/blunder';

interface AppState {
  // Analysis state
  username: string;
  isAnalyzing: boolean;
  analysisError: string | null;
  analysisProgress: {
    gamesAnalyzed: number;
    totalGames: number;
  } | null;
  
  // Blunders
  blunders: Blunder[];
  currentBlunderIndex: number;
  currentBlunder: Blunder | null;
  
  // Player interaction
  playerAttemptedMove: string | null;
  selectedOutcome: OutcomeType | null;
  
  // Move evaluations (in centipawns, from player's perspective)
  bestMoveEvaluation: number | null;
  blunderEvaluation: number | null;
  playerMoveEvaluation: number | null;
  isEvaluating: boolean;
  
  // UI state
  filtersEnabled: boolean;
  blunderDefEnabled: boolean;
  
  // Settings
  showEvalBarDuringGame: boolean;
  showEvaluationsPaneDuringGame: boolean;
  showBlunderAfterGame: boolean;
  showBestBlunderDuringPlay: boolean;
}

interface AppContextType extends AppState {
  setUsername: (username: string) => void;
  setAnalyzing: (isAnalyzing: boolean) => void;
  setAnalysisError: (error: string | null) => void;
  setAnalysisProgress: (progress: { gamesAnalyzed: number; totalGames: number } | null) => void;
  setBlunders: (blunders: Blunder[]) => void;
  appendBlunder: (blunder: Blunder) => void;
  setCurrentBlunderIndex: (index: number) => void;
  setPlayerAttemptedMove: (move: string | null) => void;
  setSelectedOutcome: (outcome: OutcomeType | null) => void;
  setBestMoveEvaluation: (evaluation: number | null) => void;
  setBlunderEvaluation: (evaluation: number | null) => void;
  setPlayerMoveEvaluation: (evaluation: number | null) => void;
  setIsEvaluating: (isEvaluating: boolean) => void;
  resetEvaluations: () => void;
  goToNextBlunder: () => void;
  goToPreviousBlunder: () => void;
  replayBlunder: () => void;
  resetBlunderState: () => void;
  setShowEvalBarDuringGame: (show: boolean) => void;
  setShowEvaluationsPaneDuringGame: (show: boolean) => void;
  setShowBlunderAfterGame: (show: boolean) => void;
  setShowBestBlunderDuringPlay: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialState: AppState = {
  username: '',
  isAnalyzing: false,
  analysisError: null,
  analysisProgress: null,
  blunders: [],
  currentBlunderIndex: 0,
  currentBlunder: null,
  playerAttemptedMove: null,
  selectedOutcome: null,
  bestMoveEvaluation: null,
  blunderEvaluation: null,
  playerMoveEvaluation: null,
  isEvaluating: false,
  filtersEnabled: false,
  blunderDefEnabled: false,
  showEvalBarDuringGame: true,
  showEvaluationsPaneDuringGame: true,
  showBlunderAfterGame: true,
  showBestBlunderDuringPlay: false,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);

  const updateState = useCallback((updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const setUsername = useCallback((username: string) => {
    updateState({ username });
  }, [updateState]);

  const setAnalyzing = useCallback((isAnalyzing: boolean) => {
    updateState({ isAnalyzing });
  }, [updateState]);

  const setAnalysisError = useCallback((error: string | null) => {
    updateState({ analysisError: error });
  }, [updateState]);

  const setAnalysisProgress = useCallback((progress: { gamesAnalyzed: number; totalGames: number } | null) => {
    updateState({ analysisProgress: progress });
  }, [updateState]);

  const setBlunders = useCallback((blunders: Blunder[]) => {
    updateState({ 
      blunders, 
      currentBlunderIndex: 0,
      currentBlunder: blunders.length > 0 ? blunders[0] : null,
    });
  }, [updateState]);

  const appendBlunder = useCallback((blunder: Blunder) => {
    setState(prev => {
      const newBlunders = [...prev.blunders, blunder];
      return {
        ...prev,
        blunders: newBlunders,
        // If this is the first blunder, set it as current
        currentBlunderIndex: prev.blunders.length === 0 ? 0 : prev.currentBlunderIndex,
        currentBlunder: prev.blunders.length === 0 ? blunder : prev.currentBlunder,
      };
    });
  }, []);

  const setCurrentBlunderIndex = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      currentBlunderIndex: index,
      currentBlunder: prev.blunders[index] || null,
      playerAttemptedMove: null,
      selectedOutcome: null,
      bestMoveEvaluation: null,
      blunderEvaluation: null,
      playerMoveEvaluation: null,
      isEvaluating: false,
    }));
  }, []);

  const setPlayerAttemptedMove = useCallback((move: string | null) => {
    updateState({ playerAttemptedMove: move, selectedOutcome: null });
  }, [updateState]);

  const setSelectedOutcome = useCallback((outcome: OutcomeType | null) => {
    updateState({ selectedOutcome: outcome });
  }, [updateState]);

  const setBestMoveEvaluation = useCallback((evaluation: number | null) => {
    updateState({ bestMoveEvaluation: evaluation });
  }, [updateState]);

  const setBlunderEvaluation = useCallback((evaluation: number | null) => {
    updateState({ blunderEvaluation: evaluation });
  }, [updateState]);

  const setPlayerMoveEvaluation = useCallback((evaluation: number | null) => {
    updateState({ playerMoveEvaluation: evaluation });
  }, [updateState]);

  const setIsEvaluating = useCallback((isEvaluating: boolean) => {
    updateState({ isEvaluating });
  }, [updateState]);

  const resetEvaluations = useCallback(() => {
    updateState({
      bestMoveEvaluation: null,
      blunderEvaluation: null,
      playerMoveEvaluation: null,
      isEvaluating: false,
    });
  }, [updateState]);

  const goToNextBlunder = useCallback(() => {
    setState(prev => {
      if (prev.currentBlunderIndex < prev.blunders.length - 1) {
        const newIndex = prev.currentBlunderIndex + 1;
        return {
          ...prev,
          currentBlunderIndex: newIndex,
          currentBlunder: prev.blunders[newIndex],
          playerAttemptedMove: null,
          selectedOutcome: null,
          bestMoveEvaluation: null,
          blunderEvaluation: null,
          playerMoveEvaluation: null,
          isEvaluating: false,
        };
      }
      return prev;
    });
  }, []);

  const goToPreviousBlunder = useCallback(() => {
    setState(prev => {
      if (prev.currentBlunderIndex > 0) {
        const newIndex = prev.currentBlunderIndex - 1;
        return {
          ...prev,
          currentBlunderIndex: newIndex,
          currentBlunder: prev.blunders[newIndex],
          playerAttemptedMove: null,
          selectedOutcome: null,
          bestMoveEvaluation: null,
          blunderEvaluation: null,
          playerMoveEvaluation: null,
          isEvaluating: false,
        };
      }
      return prev;
    });
  }, []);

  const replayBlunder = useCallback(() => {
    updateState({
      playerAttemptedMove: null,
      selectedOutcome: null,
      playerMoveEvaluation: null,
      isEvaluating: false,
    });
  }, [updateState]);

  const resetBlunderState = useCallback(() => {
    updateState({
      playerAttemptedMove: null,
      selectedOutcome: null,
      bestMoveEvaluation: null,
      blunderEvaluation: null,
      playerMoveEvaluation: null,
      isEvaluating: false,
    });
  }, [updateState]);

  const setShowEvalBarDuringGame = useCallback((show: boolean) => {
    updateState({ showEvalBarDuringGame: show });
  }, [updateState]);

  const setShowEvaluationsPaneDuringGame = useCallback((show: boolean) => {
    updateState({ showEvaluationsPaneDuringGame: show });
  }, [updateState]);

  const setShowBlunderAfterGame = useCallback((show: boolean) => {
    updateState({ showBlunderAfterGame: show });
  }, [updateState]);

  const setShowBestBlunderDuringPlay = useCallback((show: boolean) => {
    updateState({ showBestBlunderDuringPlay: show });
  }, [updateState]);

  const value: AppContextType = {
    ...state,
    setUsername,
    setAnalyzing,
    setAnalysisError,
    setAnalysisProgress,
    setBlunders,
    appendBlunder,
    setCurrentBlunderIndex,
    setPlayerAttemptedMove,
    setSelectedOutcome,
    setBestMoveEvaluation,
    setBlunderEvaluation,
    setPlayerMoveEvaluation,
    setIsEvaluating,
    resetEvaluations,
    goToNextBlunder,
    goToPreviousBlunder,
    replayBlunder,
    resetBlunderState,
    setShowEvalBarDuringGame,
    setShowEvaluationsPaneDuringGame,
    setShowBlunderAfterGame,
    setShowBestBlunderDuringPlay,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
}

