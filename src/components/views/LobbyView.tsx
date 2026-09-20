import React from 'react';
import { SnakeLogo } from '../common/SnakeLogo';
import { Layers, LayoutGrid, Swords, ArrowRight, ShieldCheck, Zap, Trophy, Users } from 'lucide-react';
import { NavCategory } from '../hub/Navbar';

interface LobbyViewProps {
  onNavigate: (category: NavCategory) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      {/* Dashboard Welcome Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-950 p-6 sm:p-10 shadow-2xl mb-10">
        <div className="pointer-events-none absolute -top-24 -left-20 h-80 w-80 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="pointer-events-none absolute top-10 -right-20 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-950/30 px-3.5 py-1 text-xs font-semibold text-rose-300 mb-4 shadow-inner">
              <SnakeLogo size={16} color="#e11d48" />
              <span>VIPER GAMING PLATFORM — DASHBOARD LOBBY</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Welcome to <span className="bg-gradient-to-r from-rose-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">Viper</span>
            </h1>

            <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
              Explore competitive tactical mind games, traditional trick-taking card classics, and spatial board showdowns.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => onNavigate('cards')}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#850120] to-rose-700 hover:from-[#9c0227] hover:to-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-950/40 transition hover:scale-[1.02] active:scale-[0.98]"
              >
                <Layers className="w-4 h-4" />
                <span>Explore Cards (4)</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>

              <button
                onClick={() => onNavigate('board')}
                className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-5 py-2.5 text-xs font-bold transition hover:scale-[1.02] active:scale-[0.98]"
              >
                <LayoutGrid className="w-4 h-4 text-emerald-400" />
                <span>Explore Board (4)</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          </div>

          {/* Decorative Emblem Badge */}
          <div className="hidden lg:flex flex-col items-center justify-center p-6 rounded-3xl bg-gradient-to-b from-rose-950/20 to-slate-900/60 border border-rose-900/40 shadow-2xl">
            <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-[#850120] via-rose-950 to-slate-950 p-1 flex items-center justify-center shadow-2xl shadow-rose-950/60 border border-rose-600/40">
              <SnakeLogo size={70} color="#ffffff" glow />
            </div>
            <span className="mt-3 text-xs font-black tracking-widest text-white uppercase">VIPER LOBBY</span>
            <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">OFFICIAL REPOSITORY</span>
          </div>
        </div>
      </div>

      {/* Categories Overview Cards */}
      <div className="mb-10">
        <h2 className="text-xl font-extrabold text-white mb-4 flex items-center gap-2">
          <span>Game Categories</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cards Category Card */}
          <div
            onClick={() => onNavigate('cards')}
            className="group cursor-pointer rounded-3xl border border-rose-900/40 bg-slate-900/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-rose-700/60 hover:shadow-xl relative overflow-hidden"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-rose-700/10 to-transparent" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/40 flex items-center justify-center text-rose-300">
                  <Layers className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30">
                  4 Games
                </span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-rose-300 transition-colors">
                Cards Arena
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Joker, Classic 5-Card Draw Poker, Durak, and Blackjack 21.
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs font-bold text-rose-400 group-hover:translate-x-1 transition-transform">
                <span>View Cards Collection</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Board Category Card */}
          <div
            onClick={() => onNavigate('board')}
            className="group cursor-pointer rounded-3xl border border-emerald-900/40 bg-slate-900/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-700/60 hover:shadow-xl relative overflow-hidden"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-700/10 to-transparent" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-300">
                  <LayoutGrid className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  4 Games
                </span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                Board Games
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Classic Dominoes, Chess, Backgammon (Nardi), and Checkers.
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                <span>View Board Collection</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Combat Category Card */}
          <div
            onClick={() => onNavigate('combat')}
            className="group cursor-pointer rounded-3xl border border-slate-800 bg-slate-900/40 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:shadow-xl relative overflow-hidden opacity-85 hover:opacity-100"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-700/10 to-transparent" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-400">
                  <Swords className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  Empty
                </span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                Combat
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Category space reserved for upcoming shooting, boxing, and fighting titles.
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs font-bold text-slate-400 group-hover:translate-x-1 transition-transform">
                <span>Category Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Features / Stats Footer Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 text-xs text-slate-400">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>8 Visualized Titles</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Curated Classics</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Users className="w-4 h-4 text-cyan-400" />
          <span>Multi-Format Rules</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-rose-400" />
          <span>Viper Architecture</span>
        </div>
      </div>
    </div>
  );
};

export default LobbyView;
