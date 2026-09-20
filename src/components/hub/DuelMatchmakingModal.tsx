import React, { useState, useEffect } from 'react';
import { useGamePlatform } from '../../context/GamePlatformContext';
import { GameId } from '../../types';
import { Swords, X, Coins, ShieldCheck, Zap } from 'lucide-react';

export const DuelMatchmakingModal: React.FC = () => {
  const { isMatchmakingOpen, setIsMatchmakingOpen, startDuel } = useGamePlatform();
  const [selectedGame, setSelectedGame] = useState<GameId>('domino');
  const [stake, setStake] = useState<number>(250);
  const [isSearching, setIsSearching] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const stakesOptions = [50, 100, 250, 500, 1000];

  const handleStartSearch = () => {
    setIsSearching(true);
    setCountdown(3);
  };

  useEffect(() => {
    if (!isSearching) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 800);
      return () => clearTimeout(timer);
    } else {
      // Found opponent! Transition into the duel arena
      startDuel(selectedGame, stake);
      setIsSearching(false);
    }
  }, [isSearching, countdown, selectedGame, stake, startDuel]);

  if (!isMatchmakingOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl shadow-amber-500/10 overflow-hidden">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-amber-500/10 blur-3xl" />

        {/* Close Button */}
        <button
          onClick={() => {
            setIsMatchmakingOpen(false);
            setIsSearching(false);
          }}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {isSearching ? (
          /* Matchmaking Radar View */
          <div className="py-8 flex flex-col items-center text-center animate-in zoom-in-95">
            <div className="relative flex items-center justify-center mb-6">
              <span className="animate-ping absolute inline-flex h-24 w-24 rounded-full bg-amber-400 opacity-20" />
              <span className="animate-pulse absolute inline-flex h-16 w-16 rounded-full bg-amber-500/30" />
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Swords className="w-8 h-8 text-slate-950 stroke-[2.5]" />
              </div>
            </div>

            <h3 className="text-xl font-extrabold text-white">Searching for Worthy Opponent…</h3>
            <p className="mt-1 text-xs text-slate-400">
              Matching player around your 2,150 Elo rating
            </p>

            <div className="mt-6 flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
              <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
              <span className="text-xs font-mono font-bold text-amber-300">
                Match found in {countdown}s
              </span>
            </div>

            <button
              onClick={() => setIsSearching(false)}
              className="mt-6 text-xs text-slate-400 hover:text-slate-200 underline"
            >
              Cancel Matchmaking
            </button>
          </div>
        ) : (
          /* Setup Duel Options */
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Swords className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-extrabold text-white">Create or Join Duel</h2>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Select game mode and chips wager to enter the ranked 1v1 arena.
            </p>

            {/* Game Selector */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                Choose Game
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'domino' as GameId, name: 'Domino Duel', icon: '🀡' },
                  { id: 'joker' as GameId, name: 'Joker Cards', icon: '🃏' },
                  { id: 'poker' as GameId, name: 'Heads-Up Poker', icon: '♠' },
                ].map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGame(g.id)}
                    className={`flex flex-col items-center p-3 rounded-2xl border transition text-center ${
                      selectedGame === g.id
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-2xl mb-1">{g.icon}</span>
                    <span className="text-xs font-bold leading-tight">{g.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stake Selector */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Select Stake
                </label>
                <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400">
                  <Coins className="w-3.5 h-3.5" />
                  <span>Pot: {(stake * 2).toLocaleString()} Chips</span>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {stakesOptions.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setStake(amount)}
                    className={`py-2 rounded-xl font-mono text-xs font-bold border transition ${
                      stake === amount
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-amber-400 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Duel Guarantee info */}
            <div className="flex items-center gap-2.5 rounded-xl bg-slate-950/70 p-3 border border-slate-800 text-slate-400 text-xs mb-6">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                Authoritative server state prevents client-side tampering and peek cheats.
              </span>
            </div>

            {/* Start CTA */}
            <button
              onClick={handleStartSearch}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 py-3.5 text-sm font-extrabold text-slate-950 shadow-xl shadow-orange-500/20 transition hover:from-amber-400 hover:to-rose-400 hover:scale-[1.01] active:scale-[0.99]"
            >
              <Swords className="w-4 h-4" />
              <span>Find Match (Wager {stake} Chips)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
