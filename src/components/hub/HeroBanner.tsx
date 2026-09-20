import React from 'react';
import { GameCategory } from '../../types';
import { useGamePlatform } from '../../context/GamePlatformContext';
import { Swords, Zap, Users, Trophy } from 'lucide-react';
import { SnakeLogo } from '../common/SnakeLogo';

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

      <div className="relative z-10 flex items-center justify-between gap-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-950/30 px-3.5 py-1.5 text-xs font-semibold text-rose-300 mb-4 shadow-inner">
            <SnakeLogo size={16} color="#e11d48" />
            <span className="tracking-wide">VIPER ARENA — High-Stakes Tactical Gaming</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Strike First in <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-rose-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">
              Domino, Poker & Joker
            </span>
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
            Welcome to <strong className="text-white">Viper</strong>. Challenge opponents in authentic classic duels, wager chips on premium felt tables, climb the competitive ladder, and prove your mastery.
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

        {/* Decorative Viper Shield on Desktop */}
        <div className="hidden lg:flex flex-col items-center justify-center p-6 rounded-3xl bg-gradient-to-b from-rose-950/20 to-slate-900/60 border border-rose-900/40 shadow-2xl relative group">
          <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-[#850120] via-rose-950 to-slate-950 p-1 flex items-center justify-center shadow-2xl shadow-rose-950/60 border border-rose-600/40 relative">
            <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_30%,rgba(244,63,94,0.25),transparent_70%)] pointer-events-none" />
            <SnakeLogo size={80} color="#ffffff" glow className="group-hover:scale-105 transition-transform duration-300" />
          </div>
          <div className="mt-3 text-center">
            <span className="text-xs font-black tracking-widest text-white uppercase block">VIPER ARENA</span>
            <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">OFFICIAL TABLES</span>
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
