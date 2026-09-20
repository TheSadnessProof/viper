import React from 'react';
import { Swords, Sparkles, Shield } from 'lucide-react';
import { SnakeLogo } from '../common/SnakeLogo';

export const CombatView: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-in fade-in duration-300">
      <div className="max-w-xl mx-auto text-center flex flex-col items-center">
        {/* Emblem badge */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#850120] via-rose-950 to-slate-900 border border-rose-800/50 flex items-center justify-center p-3.5 shadow-2xl shadow-rose-950/50">
            <SnakeLogo size={44} color="#ffffff" glow />
          </div>
          <span className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-amber-500 text-slate-950 shadow-md">
            <Swords className="w-4 h-4 stroke-[2.5]" />
          </span>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Category Space Reserved</span>
        </div>

        <h1 className="text-3xl font-black text-white tracking-tight mb-3">
          Combat Arena
        </h1>

        <p className="text-sm text-slate-400 leading-relaxed mb-8 max-w-md">
          This category is currently empty. Action, shooting, boxing, and fighting titles will be introduced here once designed.
        </p>

        <div className="flex items-center gap-6 text-xs text-slate-500 border-t border-slate-800/80 pt-6">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-rose-500/60" />
            <span>Shooting & Fighting</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Swords className="w-4 h-4 text-amber-500/60" />
            <span>Reflex Duels</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CombatView;
