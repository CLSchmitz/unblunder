import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Blunder, OutcomeType } from '../types/blunder';

interface AppState {
  // Analysis state
  username: string;
  isAnalyzing: boolean;
  analysisError: string | null;
  
  // Blunders
  blunders: Blunder[];
  currentBlunderIndex: number;
  currentBlunder: Blunder | null;
  
  // Player interaction
  playerAttemptedMove: string | null;
  selectedOutcome: OutcomeType | null;
  
  // UI state
  filtersEnabled: boolean;
  blunderDefEnabled: boolean;
}

interface AppContextType extends AppState {
  setUsername: (username: string) => void;
  setAnalyzing: (isAnalyzing: boolean) => void;
  setAnalysisError: (error: string | null) => void;
  setBlunders: (blunders: Blunder[]) => void;
  setCurrentBlunderIndex: (index: number) => void;
  setPlayerAttemptedMove: (move: string | null) => void;
  setSelectedOutcome: (outcome: OutcomeType | null) => void;
  goToNextBlunder: () => void;
  goToPreviousBlunder: () => void;
  resetBlunderState: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialState: AppState = {
  username: '',
  isAnalyzing: false,
  analysisError: null,
  blunders: [],
  currentBlunderIndex: 0,
  currentBlunder: null,
  playerAttemptedMove: null,
  selectedOutcome: null,
  filtersEnabled: false,
  blunderDefEnabled: false,
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

  const setBlunders = useCallback((blunders: Blunder[]) => {
    updateState({ 
      blunders, 
      currentBlunderIndex: 0,
      currentBlunder: blunders.length > 0 ? blunders[0] : null,
    });
  }, [updateState]);

  const setCurrentBlunderIndex = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      currentBlunderIndex: index,
      currentBlunder: prev.blunders[index] || null,
      playerAttemptedMove: null,
      selectedOutcome: null,
    }));
  }, []);

  const setPlayerAttemptedMove = useCallback((move: string | null) => {
    updateState({ playerAttemptedMove: move, selectedOutcome: null });
  }, [updateState]);

  const setSelectedOutcome = useCallback((outcome: OutcomeType | null) => {
    updateState({ selectedOutcome: outcome });
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
        };
      }
      return prev;
    });
  }, []);

  const resetBlunderState = useCallback(() => {
    updateState({
      playerAttemptedMove: null,
      selectedOutcome: null,
    });
  }, [updateState]);

  const value: AppContextType = {
    ...state,
    setUsername,
    setAnalyzing,
    setAnalysisError,
    setBlunders,
    setCurrentBlunderIndex,
    setPlayerAttemptedMove,
    setSelectedOutcome,
    goToNextBlunder,
    goToPreviousBlunder,
    resetBlunderState,
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

