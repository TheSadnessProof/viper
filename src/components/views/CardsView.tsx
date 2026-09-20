import React from 'react';
import { GameVisualCard, GameVisualItem } from './GameVisualCard';
import { Layers, Sparkles } from 'lucide-react';

export const CARD_GAMES: GameVisualItem[] = [
  {
    id: 'joker',
    title: 'Joker',
    subtitle: 'Eastern European / Caucasian Mind Game',
    category: 'cards',
    icon: '🃏',
    players: '4 Players / 1v1',
    duration: '10-15 min',
    rating: 4.9,
    description:
      'The legendary trick-taking card classic with exact bids and trump declarations. Master trump management, calculate trick distributions, and lead the unbeatable Joker card with strategic commands.',
    tags: ['Exact Bidding', 'Trump Suits', 'Joker Commands', 'High Strategy'],
    gradient: 'from-amber-600 via-purple-950 to-slate-950',
    accentBorder: 'border-amber-500/30',
    badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  {
    id: 'poker',
    title: 'Classic Poker',
    subtitle: 'Ordinary 5-Card Draw & Traditional Tables',
    category: 'cards',
    icon: '♠️',
    players: '2-6 Players',
    duration: '5-12 min',
    rating: 4.8,
    description:
      'The timeless standard of traditional poker. Players receive a complete 5-card hand, trade cards in the draw phase, evaluate hand rankings from High Card to Royal Flush, and execute decisive bluffs.',
    tags: ['5-Card Draw', 'Classic Hand Ranks', 'Draw Phase', 'Bluffing'],
    gradient: 'from-rose-700 via-rose-950 to-slate-950',
    accentBorder: 'border-rose-500/30',
    badgeColor: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  },
  {
    id: 'durak',
    title: 'Durak',
    subtitle: 'The Classic Attack & Defense Battle',
    category: 'cards',
    icon: '♦️',
    players: '2-4 Players',
    duration: '8-15 min',
    rating: 4.9,
    description:
      'A deeply tactical battle where the goal is to shed all your cards. Lead attacks with paired ranks, defend with higher suits or trump cards, and force opponents to pick up the pile until one fool remains.',
    tags: ['Attack & Defense', 'Trump Hierarchy', 'Hand Shedding', 'Card Tracking'],
    gradient: 'from-indigo-600 via-indigo-950 to-slate-950',
    accentBorder: 'border-indigo-500/30',
    badgeColor: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
  },
  {
    id: 'blackjack',
    title: 'Blackjack 21',
    subtitle: 'Classic Precision Card Counting & Duel',
    category: 'cards',
    icon: '♣️',
    players: '1v1 Duel / Table',
    duration: '2-5 min',
    rating: 4.7,
    description:
      'The classic card duel against the house or rival. Hit, stand, double down, or split pairs to get as close to 21 as possible without busting. Fast decisions, calculated odds, and high tension.',
    tags: ['Beat the Total', 'Double Down', 'Split Pairs', 'Fast Action'],
    gradient: 'from-emerald-600 via-emerald-950 to-slate-950',
    accentBorder: 'border-emerald-500/30',
    badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  },
];

export const CardsView: React.FC = () => {
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
            Curated traditional and tactical card classics: Joker, Ordinary Poker, Durak, and Blackjack.
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
          <GameVisualCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
};

export default CardsView;
