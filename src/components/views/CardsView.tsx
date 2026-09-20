import React from 'react';
import { GameVisualCard, GameVisualItem } from './GameVisualCard';
import { Layers, Sparkles } from 'lucide-react';

export const CARD_GAMES: GameVisualItem[] = [
  {
    id: 'joker',
    title: 'Joker',
    category: 'cards',
    coverImage: '/covers/joker.jpg',
    isPlayable: true,
    accentBorder: 'border-amber-500/30',
    glowColor: 'from-amber-500/20',
  },
  {
    id: 'poker',
    title: 'Classic Poker',
    category: 'cards',
    coverImage: '/covers/poker.jpg',
    isPlayable: true,
    accentBorder: 'border-rose-500/30',
    glowColor: 'from-rose-500/20',
  },
  {
    id: 'durak',
    title: 'Durak',
    category: 'cards',
    coverImage: '/covers/durak.jpg',
    isPlayable: false,
    accentBorder: 'border-indigo-500/30',
    glowColor: 'from-indigo-500/20',
  },
  {
    id: 'blackjack',
    title: 'Blackjack 21',
    category: 'cards',
    coverImage: '/covers/blackjack.jpg',
    isPlayable: false,
    accentBorder: 'border-emerald-500/30',
    glowColor: 'from-emerald-500/20',
  },
];

interface CardsViewProps {
  onPlay?: (id: string) => void;
}

export const CardsView: React.FC<CardsViewProps> = ({ onPlay }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      {/* Category Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs font-semibold mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>Card Game Arena</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Cards Catalog
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Curated traditional and tactical card classics.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-400 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>4 Games Available</span>
        </div>
      </div>

      {/* 2x2 Grid of Visual Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CARD_GAMES.map((game) => (
          <GameVisualCard key={game.id} game={game} onPlay={onPlay} />
        ))}
      </div>
    </div>
  );
};

export default CardsView;
