export type GameId = 'domino' | 'joker' | 'poker' | 'backgammon' | 'chess';

export type GameCategory = 'all' | 'board' | 'card' | 'dice' | 'strategy';

export interface GameInfo {
  id: GameId;
  title: string;
  tagline: string;
  description: string;
  category: GameCategory;
  players: string;
  matchDuration: string;
  rating: number;
  activePlayers: number;
  featured?: boolean;
  status: 'playable' | 'demo' | 'coming_soon';
  tags: string[];
  bannerGradient: string;
  accentColor: string;
}

export interface UserProfile {
  id: string;
  username: string;
  avatarUrl: string;
  rankTitle: string;
  elo: number;
  chips: number;
  wins: number;
  losses: number;
  winStreak: number;
}

export interface DuelRoomConfig {
  gameId: GameId;
  stake: number;
  turnTimeSeconds: number;
  isPrivate: boolean;
  roomCode?: string;
  mode: 'quick' | 'custom' | 'vs_bot';
}

export interface DuelMatchState {
  roomId: string;
  gameId: GameId;
  stake: number;
  player1: UserProfile;
  player2: UserProfile;
  status: 'matching' | 'ready' | 'playing' | 'ended';
  winnerId?: string;
}
