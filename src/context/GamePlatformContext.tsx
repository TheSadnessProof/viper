import React, { createContext, useContext, useState } from 'react';
import { GameId, UserProfile } from '../types';

export type PlatformView = 'hub' | 'domino' | 'joker' | 'poker' | 'leaderboard';

interface GamePlatformContextType {
  currentView: PlatformView;
  setCurrentView: (view: PlatformView) => void;
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  activeGameId: GameId | null;
  setActiveGameId: (gameId: GameId | null) => void;
  isMatchmakingOpen: boolean;
  setIsMatchmakingOpen: (open: boolean) => void;
  selectedStake: number;
  setSelectedStake: (stake: number) => void;
  startDuel: (gameId: GameId, stake?: number) => void;
}

const DEFAULT_USER: UserProfile = {
  id: 'user-hero',
  username: 'Alex_Champion',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  rankTitle: 'Grandmaster Duellist',
  elo: 2150,
  chips: 28400,
  wins: 142,
  losses: 38,
  winStreak: 6,
};

const GamePlatformContext = createContext<GamePlatformContextType | undefined>(undefined);

export const GamePlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<PlatformView>('hub');
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
  const [activeGameId, setActiveGameId] = useState<GameId | null>(null);
  const [isMatchmakingOpen, setIsMatchmakingOpen] = useState(false);
  const [selectedStake, setSelectedStake] = useState(250);

  const startDuel = (gameId: GameId, stake: number = 250) => {
    setActiveGameId(gameId);
    setSelectedStake(stake);
    setIsMatchmakingOpen(false);

    if (gameId === 'domino') setCurrentView('domino');
    else if (gameId === 'joker') setCurrentView('joker');
    else if (gameId === 'poker') setCurrentView('poker');
  };

  return (
    <GamePlatformContext.Provider
      value={{
        currentView,
        setCurrentView,
        user,
        setUser,
        activeGameId,
        setActiveGameId,
        isMatchmakingOpen,
        setIsMatchmakingOpen,
        selectedStake,
        setSelectedStake,
        startDuel,
      }}
    >
      {children}
    </GamePlatformContext.Provider>
  );
};

export const useGamePlatform = () => {
  const context = useContext(GamePlatformContext);
  if (!context) throw new Error('useGamePlatform must be used within GamePlatformProvider');
  return context;
};
