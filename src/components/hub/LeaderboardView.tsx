import React from 'react';
import { Medal, Flame } from 'lucide-react';
import { SnakeLogo } from '../common/SnakeLogo';

interface LeaderboardEntry {
  rank: number;
  name: string;
  elo: number;
  winRate: string;
  chipsWon: string;
  bestGame: string;
  streak: number;
}

const LEADERBOARD_DATA: LeaderboardEntry[] = [
  { rank: 1, name: 'Tornike_King', elo: 2540, winRate: '78%', chipsWon: '420,000', bestGame: 'Joker', streak: 12 },
  { rank: 2, name: 'Dito_Strategist', elo: 2485, winRate: '74%', chipsWon: '385,500', bestGame: 'Domino', streak: 8 },
  { rank: 3, name: 'Elena_Viper', elo: 2420, winRate: '71%', chipsWon: '312,000', bestGame: 'Poker', streak: 5 },
  { rank: 4, name: 'Alex_Champion (You)', elo: 2150, winRate: '79%', chipsWon: '198,000', bestGame: 'Domino', streak: 6 },
  { rank: 5, name: 'Nika_Bluffer', elo: 2110, winRate: '68%', chipsWon: '180,400', bestGame: 'Poker', streak: 3 },
  { rank: 6, name: 'Giga_Master', elo: 2040, winRate: '65%', chipsWon: '142,000', bestGame: 'Joker', streak: 4 },
];

export const LeaderboardView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#850120] to-rose-950 border border-rose-800 flex items-center justify-center p-1.5 shadow-lg shadow-rose-950/40">
          <SnakeLogo size={24} color="#ffffff" glow />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-white">Viper Global Leaderboards</h2>
          <p className="text-xs text-slate-400">Rankings across all official Viper duel arena tables.</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 shadow-xl">
        <div className="grid grid-cols-12 gap-2 px-6 py-3.5 bg-slate-950/70 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <div className="col-span-1">#</div>
          <div className="col-span-5">Player</div>
          <div className="col-span-2 text-right">Rating</div>
          <div className="col-span-2 text-right">Win Rate</div>
          <div className="col-span-2 text-right">Favorite Game</div>
        </div>

        <div className="divide-y divide-slate-800/60">
          {LEADERBOARD_DATA.map((player) => {
            const isUser = player.name.includes('(You)');
            return (
              <div
                key={player.rank}
                className={`grid grid-cols-12 gap-2 px-6 py-4 items-center transition ${
                  isUser ? 'bg-amber-500/10 border-l-4 border-l-amber-500' : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="col-span-1 flex items-center">
                  {player.rank === 1 ? (
                    <Medal className="w-5 h-5 text-amber-400" />
                  ) : player.rank === 2 ? (
                    <Medal className="w-5 h-5 text-slate-300" />
                  ) : player.rank === 3 ? (
                    <Medal className="w-5 h-5 text-amber-700" />
                  ) : (
                    <span className="font-mono font-bold text-slate-500 text-sm">{player.rank}</span>
                  )}
                </div>

                <div className="col-span-5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-300">
                    {player.name.charAt(0)}
                  </div>
                  <div>
                    <span className={`font-bold text-sm ${isUser ? 'text-amber-300' : 'text-slate-200'}`}>
                      {player.name}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-orange-400 font-mono">
                      <Flame className="w-3 h-3" />
                      <span>{player.streak} Win Streak</span>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 text-right font-mono font-bold text-sm text-emerald-400">
                  {player.elo}
                </div>

                <div className="col-span-2 text-right font-mono text-sm text-slate-300">
                  {player.winRate}
                </div>

                <div className="col-span-2 text-right">
                  <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                    {player.bestGame}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
