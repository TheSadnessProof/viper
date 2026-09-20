import React from 'react';
import { useGamePlatform } from '../../context/GamePlatformContext';
import { Swords, Flame, Trophy, Coins, Plus } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentView, setCurrentView, user, setIsMatchmakingOpen } = useGamePlatform();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => setCurrentView('hub')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform duration-200">
            <Swords className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                DUEL<span className="text-amber-500">ARENA</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                BETA
              </span>
            </div>
            <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Classic & Tactical Gaming Hub</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setCurrentView('hub')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              currentView === 'hub'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Game Library
          </button>
          <button
            onClick={() => setCurrentView('leaderboard')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              currentView === 'leaderboard'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Rankings
          </button>
        </nav>

        {/* User Status & Quick Duel Action */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Chip Balance */}
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 shadow-inner">
            <Coins className="w-4 h-4 text-amber-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 leading-none">Chips</span>
              <span className="text-xs font-mono font-bold text-amber-300">
                {user.chips.toLocaleString()}
              </span>
            </div>
            <button
              onClick={() => alert('Chips replenished! +1,000 added.')}
              className="ml-1 w-5 h-5 rounded-md bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 flex items-center justify-center transition"
              title="Add Free Test Chips"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Win Streak Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 bg-gradient-to-r from-orange-950/40 to-amber-950/40 px-2.5 py-1.5 rounded-xl border border-orange-500/30">
            <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
            <span className="text-xs font-bold text-orange-300 font-mono">{user.winStreak} Streak</span>
          </div>

          {/* Quick Duel Button */}
          <button
            onClick={() => setIsMatchmakingOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-orange-500/20 transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <Swords className="w-4 h-4" />
            <span>Start Duel</span>
          </button>
        </div>
      </div>
    </header>
  );
};
