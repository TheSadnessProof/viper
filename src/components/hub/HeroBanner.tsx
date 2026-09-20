import React from 'react';
import { GameCategory } from '../../types';
import { useGamePlatform } from '../../context/GamePlatformContext';
import { Swords, Zap, Users, Trophy } from 'lucide-react';

interface HeroBannerProps {
  selectedCategory: GameCategory;
  onSelectCategory: (category: GameCategory) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const { setIsMatchmakingOpen } = useGamePlatform();

  const categories: { id: GameCategory; label: string }[] = [
    { id: 'all', label: 'All Games' },
    { id: 'board', label: 'Board & Tiles' },
    { id: 'card', label: 'Card Battles' },
    { id: 'dice', label: 'Dice & Classics' },
    { id: 'strategy', label: 'Tactical Mind' },
  ];

  return (
    <div className="relative mb-10 overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-950 p-6 sm:p-10 shadow-2xl">
      {/* Background ambient glowing orbs */}
      <div className="pointer-events-none absolute -top-24 -left-20 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute top-10 -right-20 h-80 w-80 rounded-full bg-rose-500/10 blur-3xl" />

      <div className="relative z-10 max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 mb-4">
          <Zap className="h-3.5 w-3.5" />
          <span>Real-Time 1v1 Skill Duels & Tournaments</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Challenge Opponents in <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">
            Domino, Joker, and Poker
          </span>
        </h1>

        <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
          The ultimate gaming hub for classical mind games and high-stakes duels. Wager chips, climb the Elo ladder, or host private tables with friends.
        </p>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsMatchmakingOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:from-amber-400 hover:to-orange-400 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Swords className="h-4 w-4" />
            <span>Find Instant Duel</span>
          </button>
        </div>

        {/* Platform Live Stats */}
        <div className="mt-8 grid grid-cols-3 gap-4 border-t border-slate-800/80 pt-6">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Users className="h-3.5 w-3.5 text-emerald-400" />
              <span>Online Duellists</span>
            </div>
            <p className="mt-1 font-mono text-lg sm:text-xl font-bold text-white">2,488</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span>Daily Prize Pool</span>
            </div>
            <p className="mt-1 font-mono text-lg sm:text-xl font-bold text-amber-400">🪙 145,000</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Zap className="h-3.5 w-3.5 text-cyan-400" />
              <span>Matchmaking</span>
            </div>
            <p className="mt-1 font-mono text-lg sm:text-xl font-bold text-cyan-400">&lt; 3.2s Avg</p>
          </div>
        </div>
      </div>

      {/* Category Tabs / Filters */}
      <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-t border-slate-800/60 pt-6">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition ${
              selectedCategory === cat.id
                ? 'bg-slate-100 text-slate-950 shadow'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800/80'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
};
