import React from 'react';
import { Star, Users, Clock, ShieldCheck } from 'lucide-react';

export interface GameVisualItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'cards' | 'board' | 'combat';
  icon: string;
  players: string;
  duration: string;
  rating: number;
  description: string;
  tags: string[];
  gradient: string;
  accentBorder: string;
  badgeColor: string;
}

interface GameVisualCardProps {
  game: GameVisualItem;
}

export const GameVisualCard: React.FC<GameVisualCardProps> = ({ game }) => {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border ${game.accentBorder} bg-slate-900/60 p-6 sm:p-7 shadow-xl backdrop-blur-sm transition-all duration-300 hover:shadow-2xl flex flex-col justify-between`}
    >
      {/* Background Ambience Gradient */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-25`}
      />

      {/* Card Header */}
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-center text-2xl shadow-inner">
              {game.icon}
            </div>
            <div>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${game.badgeColor} border`}>
                {game.category}
              </span>
              <h3 className="text-xl font-extrabold text-white tracking-tight mt-1">
                {game.title}
              </h3>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800 text-xs font-mono font-bold text-amber-400">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{game.rating.toFixed(1)}</span>
          </div>
        </div>

        <p className="text-xs font-semibold text-amber-300/80 mb-2">
          {game.subtitle}
        </p>
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          {game.description}
        </p>

        {/* Feature Tags */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {game.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] font-medium text-slate-300 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800/80"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Card Footer: Metadata */}
      <div className="relative z-10 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span>{game.players}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{game.duration}</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Ranked Ready</span>
        </div>
      </div>
    </div>
  );
};

export default GameVisualCard;
