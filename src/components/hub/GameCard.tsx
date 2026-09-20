import React from 'react';
import { GameInfo } from '../../types';
import { useGamePlatform } from '../../context/GamePlatformContext';
import { Swords, Star, Clock, Users, Play, Sparkles } from 'lucide-react';

interface GameCardProps {
  game: GameInfo;
}

export const GameCard: React.FC<GameCardProps> = ({ game }) => {
  const { startDuel, setIsMatchmakingOpen } = useGamePlatform();

  const isPlayable = game.status === 'playable';

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-slate-700 hover:shadow-2xl hover:shadow-amber-500/5">
      {/* Background Gradient & Ambient Glow */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${game.bannerGradient} opacity-40 group-hover:opacity-60 transition-opacity`}
      />

      {/* Card Header: Badges */}
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-slate-950/80 px-2.5 py-1 text-[11px] font-semibold text-slate-300 border border-slate-800">
            {game.players}
          </span>
          {game.featured && (
            <span className="flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-400 border border-amber-500/30">
              <Sparkles className="w-3 h-3" />
              HOT DUEL
            </span>
          )}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1 rounded-lg bg-slate-950/80 px-2 py-1 text-[11px] font-bold font-mono text-amber-400 border border-slate-800">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span>{game.rating}</span>
        </div>
      </div>

      {/* Card Body: Title, Tagline, Description */}
      <div className="relative z-10 my-6">
        <h3 className="text-xl font-extrabold text-white tracking-tight group-hover:text-amber-400 transition-colors">
          {game.title}
        </h3>
        <p className="mt-1 text-xs font-semibold text-amber-300/80">{game.tagline}</p>
        <p className="mt-2.5 text-xs text-slate-400 leading-relaxed line-clamp-3">
          {game.description}
        </p>

        {/* Tags */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {game.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-slate-800/70 px-2 py-0.5 text-[10px] font-medium text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Card Footer: Metadata & Action CTA */}
      <div className="relative z-10 border-t border-slate-800/80 pt-4">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{game.matchDuration}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono">{game.activePlayers} in queues</span>
          </div>
        </div>

        {isPlayable ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => startDuel(game.id, 250)}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-md transition hover:from-amber-400 hover:to-orange-400 hover:shadow-amber-500/25 active:scale-[0.98]"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>Play Now</span>
            </button>
            <button
              onClick={() => setIsMatchmakingOpen(true)}
              className="flex items-center justify-center p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700"
              title="Configure Custom Duel Stakes"
            >
              <Swords className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        ) : (
          <button
            disabled
            className="w-full rounded-xl bg-slate-800/60 py-2.5 text-xs font-bold text-slate-500 cursor-not-allowed border border-slate-800"
          >
            Coming Soon to Arena
          </button>
        )}
      </div>
    </div>
  );
};
