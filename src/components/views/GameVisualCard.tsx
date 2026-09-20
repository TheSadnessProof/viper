import React from 'react';
import { Play } from 'lucide-react';

export interface GameVisualItem {
  id: string;
  title: string;
  category: 'cards' | 'board' | 'combat';
  coverImage: string;
  isPlayable?: boolean;
  accentBorder?: string;
  glowColor?: string;
}

interface GameVisualCardProps {
  game: GameVisualItem;
  onPlay?: (id: string) => void;
}

export const GameVisualCard: React.FC<GameVisualCardProps> = ({ game, onPlay }) => {
  return (
    <div
      onClick={() => {
        if (game.isPlayable && onPlay) {
          onPlay(game.id);
        }
      }}
      className={`group relative aspect-[16/10] overflow-hidden rounded-3xl border ${
        game.accentBorder || 'border-slate-800'
      } bg-slate-950 shadow-xl transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-amber-500/10 ${
        game.isPlayable ? 'cursor-pointer' : ''
      }`}
    >
      {/* Game Visual Cover Image */}
      <img
        src={game.coverImage}
        alt={game.title}
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        loading="lazy"
      />

      {/* Cinematic Gradient Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

      {/* Ambient Color Glow on Hover */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${
          game.glowColor || 'from-amber-500/10'
        } to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
      />

      {/* Bottom Bar: Game Title & Play CTA */}
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 flex items-center justify-between gap-4 z-10">
        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md group-hover:text-amber-300 transition-colors">
          {game.title}
        </h3>

        {game.isPlayable ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay?.(game.id);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            <span>Play</span>
          </button>
        ) : (
          <span className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-400 text-xs font-semibold backdrop-blur-md">
            Coming Soon
          </span>
        )}
      </div>
    </div>
  );
};

export default GameVisualCard;
