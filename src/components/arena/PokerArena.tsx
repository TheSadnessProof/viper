import React, { useState } from 'react';
import { RotateCcw, Shield } from 'lucide-react';
import { GameWindowControls } from './GameWindowControls';
import { SnakeLogo } from '../common/SnakeLogo';

interface PlayingCard {
  value: string;
  suit: '♠' | '♥' | '♦' | '♣';
}

interface PokerArenaProps {
  onExit: () => void;
  showNavbar?: boolean;
  onToggleNavbar?: () => void;
}

export const PokerArena: React.FC<PokerArenaProps> = ({
  onExit,
  showNavbar,
  onToggleNavbar,
}) => {
  const [pot, setPot] = useState(300);
  const [playerChips, setPlayerChips] = useState(2450);
  const [opponentChips, setOpponentChips] = useState(2550);
  const [currentRound, setCurrentRound] = useState<'Pre-Flop' | 'Flop' | 'Turn' | 'River'>('Flop');
  const [communityCards, setCommunityCards] = useState<PlayingCard[]>([
    { value: 'A', suit: '♠' },
    { value: 'K', suit: '♦' },
    { value: '7', suit: '♣' },
  ]);
  const [playerHoleCards] = useState<PlayingCard[]>([
    { value: 'A', suit: '♥' },
    { value: 'Q', suit: '♠' },
  ]);
  const [betAmount, setBetAmount] = useState(100);
  const [actionLog, setActionLog] = useState<string[]>([
    'Blinds posted: SB 25 / BB 50.',
    'Pre-flop: Opponent raises to 150. You call 150.',
    'Flop dealt: [A♠ K♦ 7♣]. Pot is 300.',
  ]);

  const handleBetOrRaise = () => {
    if (playerChips < betAmount) return;
    setPlayerChips((prev) => prev - betAmount);
    setPot((prev) => prev + betAmount * 2); // Opponent calls
    setOpponentChips((prev) => prev - betAmount);
    setActionLog((prev) => [
      ...prev,
      `You bet ${betAmount} chips. Opponent calls.`,
    ]);

    // Advance round
    if (currentRound === 'Flop') {
      setCurrentRound('Turn');
      setCommunityCards((prev) => [...prev, { value: '10', suit: '♥' }]);
    } else if (currentRound === 'Turn') {
      setCurrentRound('River');
      setCommunityCards((prev) => [...prev, { value: '2', suit: '♠' }]);
    }
  };

  const handleCheck = () => {
    setActionLog((prev) => [...prev, 'You check. Opponent checks.']);
    if (currentRound === 'Flop') {
      setCurrentRound('Turn');
      setCommunityCards((prev) => [...prev, { value: '10', suit: '♥' }]);
    } else if (currentRound === 'Turn') {
      setCurrentRound('River');
      setCommunityCards((prev) => [...prev, { value: '2', suit: '♠' }]);
    }
  };

  const handleReset = () => {
    setPot(300);
    setCurrentRound('Flop');
    setCommunityCards([
      { value: 'A', suit: '♠' },
      { value: 'K', suit: '♦' },
      { value: '7', suit: '♣' },
    ]);
    setActionLog(['New hand dealt.', 'Flop: [A♠ K♦ 7♣]. Pot: 300.']);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Game Window Controls Bar */}
      <GameWindowControls
        gameTitle="Poker Room"
        gameTag="No-Limit 1v1"
        onExit={onExit}
        showNavbar={showNavbar}
        onToggleNavbar={onToggleNavbar}
        extraControls={
          <>
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-700 text-xs">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span className="text-slate-300 text-[11px]">RNG Verified</span>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-2.5 py-1 text-slate-300 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition text-xs font-semibold"
              title="Deal Next Hand"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Deal Hand</span>
            </button>
          </>
        }
      />

      {/* Arena Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col justify-between">
        {/* Opponent Row */}
        <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-500 to-red-600 p-0.5">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-bold text-red-400">
                OPP
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-200">Viktor “The Shark”</span>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">2,280 Elo</span>
              </div>
              <div className="text-xs text-amber-400 font-mono font-bold">
                🪙 {opponentChips.toLocaleString()} Chips
              </div>
            </div>
          </div>

          {/* Facedown hole cards */}
          <div className="flex gap-2">
            <div className="w-12 h-18 rounded-lg bg-gradient-to-br from-red-900 to-rose-950 border border-red-700 shadow-md flex items-center justify-center text-rose-300 font-bold text-xs">
              🂠
            </div>
            <div className="w-12 h-18 rounded-lg bg-gradient-to-br from-red-900 to-rose-950 border border-red-700 shadow-md flex items-center justify-center text-rose-300 font-bold text-xs">
              🂠
            </div>
          </div>
        </div>

        {/* Poker Felt Table */}
        <div className="my-4 flex-1 min-h-[360px] rounded-3xl game-table-felt border-8 border-[#381a04] relative flex flex-col items-center justify-between p-6 overflow-hidden">
          {/* Felt Watermark: Viper Snake Logo & Poker Crest */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center select-none z-0">
            <SnakeLogo size={190} color="#10b981" opacity={0.12} />
            <span className="font-black text-xl tracking-[0.35em] text-emerald-200 uppercase mt-2 opacity-15">
              VIPER POKER ROOM
            </span>
          </div>

          {/* Pot Display */}
          <div className="bg-black/50 border border-amber-500/40 px-6 py-2 rounded-full flex items-center gap-2 shadow-xl">
            <span className="text-xs uppercase text-amber-400 font-semibold tracking-wider">Total Pot:</span>
            <span className="text-lg font-extrabold text-amber-300 font-mono">🪙 {pot.toLocaleString()}</span>
          </div>

          {/* Community Cards */}
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-widest">{currentRound} Board</span>
            <div className="flex items-center gap-3">
              {communityCards.map((card, idx) => {
                const isRed = card.suit === '♥' || card.suit === '♦';
                return (
                  <div
                    key={idx}
                    className="w-16 sm:w-18 h-24 sm:h-26 bg-white rounded-xl shadow-2xl border border-stone-300 flex flex-col justify-between p-2 select-none animate-in zoom-in-95"
                  >
                    <div className={`font-bold text-sm ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
                      {card.value}{card.suit}
                    </div>
                    <div className={`text-center font-bold text-3xl ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
                      {card.suit}
                    </div>
                    <div className={`font-bold text-sm text-right ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
                      {card.value}{card.suit}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dealer button & Action feed */}
          <div className="w-full flex items-center justify-between text-xs text-emerald-200/80">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white text-slate-950 font-bold flex items-center justify-center shadow">
                D
              </span>
              <span>Dealer: Opponent</span>
            </div>
            <div className="text-right text-xs text-emerald-100/70 font-mono">
              {actionLog[actionLog.length - 1]}
            </div>
          </div>
        </div>

        {/* Player Controls & Hand */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Player Info & Hole Cards */}
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {playerHoleCards.map((card, idx) => {
                const isRed = card.suit === '♥' || card.suit === '♦';
                return (
                  <div
                    key={idx}
                    className="w-14 h-22 bg-white rounded-lg shadow-xl border border-stone-300 flex flex-col justify-between p-1.5 select-none"
                  >
                    <div className={`font-bold text-xs ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
                      {card.value}{card.suit}
                    </div>
                    <div className={`text-center font-bold text-2xl ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
                      {card.suit}
                    </div>
                    <div className={`font-bold text-xs text-right ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
                      {card.value}
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-200">You (Hero)</span>
                <span className="text-xs bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-mono border border-emerald-800">
                  Pair of Aces
                </span>
              </div>
              <div className="text-sm text-amber-400 font-mono font-bold">
                🪙 {playerChips.toLocaleString()} Chips
              </div>
            </div>
          </div>

          {/* Betting Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="range"
                min="50"
                max={Math.min(playerChips, 1000)}
                step="50"
                value={betAmount}
                onChange={(e) => setBetAmount(Number(e.target.value))}
                className="w-32 accent-amber-500"
              />
              <span className="text-xs font-mono text-amber-300 font-bold min-w-14">
                +{betAmount}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setActionLog((prev) => [...prev, 'You folded hand.'])}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold text-xs transition"
              >
                Fold
              </button>
              <button
                onClick={handleCheck}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
              >
                Check
              </button>
              <button
                onClick={handleBetOrRaise}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs shadow-lg transition"
              >
                Bet {betAmount}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
