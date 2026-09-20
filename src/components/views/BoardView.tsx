import React from 'react';
import { GameVisualCard, GameVisualItem } from './GameVisualCard';
import { LayoutGrid, Sparkles } from 'lucide-react';

export const BOARD_GAMES: GameVisualItem[] = [
  {
    id: 'domino',
    title: 'Dominoes',
    category: 'board',
    coverImage: '/covers/dominoes.jpg',
    isPlayable: true,
    accentBorder: 'border-emerald-500/30',
    glowColor: 'from-emerald-500/20',
  },
  {
    id: 'chess',
    title: 'Chess',
    category: 'board',
    coverImage: '/covers/chess.jpg',
    isPlayable: true,
    accentBorder: 'border-sky-500/30',
    glowColor: 'from-sky-500/20',
  },
  {
    id: 'backgammon',
    title: 'Backgammon / Nardi',
    category: 'board',
    coverImage: '/covers/backgammon.jpg',
    isPlayable: false,
    accentBorder: 'border-amber-500/30',
    glowColor: 'from-amber-500/20',
  },
  {
    id: 'checkers',
    title: 'Checkers',
    category: 'board',
    coverImage: '/covers/checkers.jpg',
    isPlayable: false,
    accentBorder: 'border-purple-500/30',
    glowColor: 'from-purple-500/20',
  },
];

interface BoardViewProps {
  onPlay?: (id: string) => void;
}

export const BoardView: React.FC<BoardViewProps> = ({ onPlay }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      {/* Category Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs font-semibold mb-3">
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Board & Tile Arena</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Board Games Catalog
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Classic strategy and spatial mastery games.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-400 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>4 Games Available</span>
        </div>
      </div>

      {/* 2x2 Grid of Visual Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {BOARD_GAMES.map((game) => (
          <GameVisualCard key={game.id} game={game} onPlay={onPlay} />
        ))}
      </div>
    </div>
  );
};

export default BoardView;
