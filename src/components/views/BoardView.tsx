import React from 'react';
import { GameVisualCard, GameVisualItem } from './GameVisualCard';
import { LayoutGrid, Sparkles } from 'lucide-react';

export const BOARD_GAMES: GameVisualItem[] = [
  {
    id: 'dominoes',
    title: 'Dominoes',
    subtitle: 'Double-Six & Double-Nine Block / Draw',
    category: 'board',
    icon: '🀡',
    players: '1v1 / 2-4 Players',
    duration: '3-8 min',
    rating: 4.9,
    description:
      'The classic tile duel of matching ends, chain tactical blockage, and hand pip management. Match double tiles, control open branch numbers, and trap rivals when the boneboard locks.',
    tags: ['Double-Six Chain', 'Block & Draw', 'Pip Counting', 'Tile Strategy'],
    gradient: 'from-emerald-700 via-teal-950 to-slate-950',
    accentBorder: 'border-emerald-500/30',
    badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'chess',
    title: 'Chess',
    subtitle: 'The Timeless Game of Kings & Grandmasters',
    category: 'board',
    icon: '♟️',
    players: '1v1 Duel',
    duration: '3-15 min',
    rating: 4.95,
    description:
      'Pure deterministic strategy with no randomness. Out-calculate opponents across 64 squares with openings, pawn structures, tactical sacrifices, positional play, and endgame checkmates.',
    tags: ['Standard & Blitz', 'Elo Rated', 'Opening Books', 'Tactical calculation'],
    gradient: 'from-sky-700 via-blue-950 to-slate-950',
    accentBorder: 'border-sky-500/30',
    badgeColor: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  },
  {
    id: 'backgammon',
    title: 'Backgammon / Nardi',
    subtitle: 'Ancient Strategic Race & Doubling Cube',
    category: 'board',
    icon: '🎲',
    players: '1v1 Match',
    duration: '6-12 min',
    rating: 4.85,
    description:
      'Race checkers across 24 points to bear off before your rival. Features traditional Long and Short Nardi rules, strategic prime blockades, anchor points, and the high-tension doubling cube.',
    tags: ['Long & Short Nardi', 'Doubling Cube', 'Prime Blockades', 'Pip Race'],
    gradient: 'from-amber-700 via-orange-950 to-slate-950',
    accentBorder: 'border-amber-500/30',
    badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  {
    id: 'checkers',
    title: 'Checkers / Draughts',
    subtitle: 'Classic Diagonal Jumps & King Promotions',
    category: 'board',
    icon: '⚪',
    players: '1v1 Duel',
    duration: '4-8 min',
    rating: 4.75,
    description:
      'Fast-paced tactical piece jumping and forced-capture traps. Advance your pieces diagonally across the dark squares, crown flying Kings on the final rank, and wipe the board clean.',
    tags: ['Diagonal Jumps', 'King Crowns', 'Forced Captures', 'Classic 8x8'],
    gradient: 'from-purple-700 via-indigo-950 to-slate-950',
    accentBorder: 'border-purple-500/30',
    badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  },
];

export const BoardView: React.FC = () => {
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
            Classic strategy and spatial mastery: Dominoes, Chess, Backgammon (Nardi), and Checkers.
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
          <GameVisualCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
};

export default BoardView;
