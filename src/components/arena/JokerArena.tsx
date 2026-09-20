import React, { useState } from 'react';
import { ArrowLeft, Award, HelpCircle, RotateCcw, Trophy } from 'lucide-react';

interface Card {
  id: string;
  suit: '♠' | '♥' | '♦' | '♣' | 'JOKER';
  value: string;
  isJoker?: boolean;
}

const INITIAL_HAND: Card[] = [
  { id: 'c1', suit: 'JOKER', value: 'JOKER', isJoker: true },
  { id: 'c2', suit: '♠', value: 'A' },
  { id: 'c3', suit: '♠', value: 'K' },
  { id: 'c4', suit: '♥', value: '10' },
  { id: 'c5', suit: '♦', value: 'A' },
  { id: 'c6', suit: '♣', value: 'J' },
  { id: 'c7', suit: '♦', value: '9' },
  { id: 'c8', suit: '♥', value: 'K' },
];

export const JokerArena: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [hand, setHand] = useState<Card[]>(INITIAL_HAND);
  const [trickPile, setTrickPile] = useState<Array<{ player: string; card: Card }>>([
    { player: 'Giga (East)', card: { id: 'bot1', suit: '♥', value: 'Q' } },
    { player: 'Nika (North)', card: { id: 'bot2', suit: '♥', value: 'A' } },
  ]);
  const [bid, setBid] = useState<number | null>(3);
  const [tricksWon, setTricksWon] = useState(1);
  const [currentRound] = useState('Round 4 of 8 (8 Cards)');
  const [trumpSuit] = useState<'♠' | '♥' | '♦' | '♣'>('♠');
  const [showRules, setShowRules] = useState(false);

  const playCard = (card: Card) => {
    setHand((prev) => prev.filter((c) => c.id !== card.id));
    setTrickPile((prev) => [...prev, { player: 'You', card }]);
    setTimeout(() => {
      // Simulate trick collection
      setTricksWon((prev) => prev + 1);
      setTrickPile([]);
    }, 1500);
  };

  const resetGame = () => {
    setHand(INITIAL_HAND);
    setTrickPile([]);
    setTricksWon(0);
    setBid(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="h-16 px-6 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={onExit}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Exit to Hub
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h1 className="font-bold text-lg tracking-tight">Joker Duel Arena</h1>
            <span className="px-2 py-0.5 text-xs rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">
              Caucasian Classic
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRules(!showRules)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            How to Play
          </button>
          <button
            onClick={resetGame}
            className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition"
            title="Reset Game"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Arena */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col justify-between relative">
        {/* Top Info Bar: Pulka / Score Board */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">Stage</span>
              <p className="font-bold text-amber-400 text-sm">{currentRound}</p>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">Trump Card</span>
              <div className="flex items-center gap-1 font-bold text-sm text-cyan-400">
                <span>{trumpSuit} Spades</span>
                <span className="text-xs bg-cyan-950 text-cyan-300 px-1.5 rounded border border-cyan-800">Trump</span>
              </div>
            </div>
          </div>

          {/* Player Bid and Tricks Taken */}
          <div className="flex items-center gap-4 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
            <div className="text-center">
              <span className="text-[10px] text-slate-400 uppercase">Your Bid</span>
              <p className="font-bold text-amber-300 font-mono text-base">{bid !== null ? bid : 'Declaring…'}</p>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div className="text-center">
              <span className="text-[10px] text-slate-400 uppercase">Tricks Won</span>
              <p className="font-bold text-emerald-400 font-mono text-base">{tricksWon} / {bid || 0}</p>
            </div>
          </div>
        </div>

        {/* Central Card Table Felt */}
        <div className="my-4 flex-1 min-h-[360px] rounded-3xl game-table-felt border-8 border-[#3b1d06] relative flex flex-col items-center justify-between p-6">
          {/* North Opponent Seat */}
          <div className="flex items-center gap-3 bg-black/40 px-4 py-1.5 rounded-full border border-emerald-500/20">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-amber-500/50 flex items-center justify-center text-xs font-bold text-amber-300">
              N
            </div>
            <div className="text-xs">
              <span className="font-semibold text-slate-200">Nika (Opponent)</span>
              <span className="text-slate-400 ml-2 font-mono">Bid: 2 | Won: 1</span>
            </div>
          </div>

          {/* Central Trick Pile */}
          <div className="relative flex items-center justify-center h-48 w-full">
            {trickPile.length === 0 ? (
              <div className="text-center text-emerald-200/50 text-xs flex flex-col items-center gap-1">
                <Trophy className="w-6 h-6 opacity-40" />
                <span>Trick won! Next lead begins…</span>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                {trickPile.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center animate-in zoom-in-95">
                    <span className="text-[11px] font-semibold text-emerald-300/80 mb-1">{item.player}</span>
                    <div className="w-16 h-24 bg-white rounded-lg shadow-xl border border-stone-300 flex flex-col justify-between p-1.5 text-slate-900 select-none">
                      <div className="font-bold text-xs">
                        {item.card.value} {item.card.suit !== 'JOKER' && item.card.suit}
                      </div>
                      <div className="text-center font-bold text-xl">
                        {item.card.isJoker ? '🃏' : item.card.suit}
                      </div>
                      <div className="font-bold text-xs text-right">
                        {item.card.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bid Selector when declaring */}
          {bid === null && (
            <div className="bg-slate-900/90 border border-amber-500/40 p-4 rounded-2xl shadow-xl flex items-center gap-3">
              <span className="text-xs font-bold text-amber-300">Choose Bid:</span>
              {[0, 1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => setBid(num)}
                  className="w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-sm transition"
                >
                  {num}
                </button>
              ))}
            </div>
          )}

          {/* Rules Overlay Modal */}
          {showRules && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-2xl p-6 flex flex-col justify-between z-30 animate-in fade-in">
              <div>
                <h3 className="text-lg font-bold text-amber-400 mb-2 flex items-center gap-2">
                  <Award className="w-5 h-5" /> Joker Card Game Rules
                </h3>
                <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
                  <li><strong>Exact Bids:</strong> You must declare exactly how many tricks you will win. Making your exact bid awards high bonus points; over-tricks or under-tricks penalize your score.</li>
                  <li><strong>The Joker:</strong> The most powerful card in the game. When led, you can declare "Highest Card" (everyone must play their highest trump or suit) or "Take Trick" unconditionally.</li>
                  <li><strong>Trump Suit:</strong> Trump cards beat any non-trump suit regardless of card rank.</li>
                </ul>
              </div>
              <button
                onClick={() => setShowRules(false)}
                className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl self-end"
              >
                Got It, Back to Table
              </button>
            </div>
          )}
        </div>

        {/* Player's Hand Cards (Bottom) */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your Hand ({hand.length} cards)</span>
            <span className="text-xs text-emerald-400 font-medium animate-pulse">Click any card to play into trick</span>
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            {hand.map((card) => {
              const isRed = card.suit === '♥' || card.suit === '♦';
              return (
                <button
                  key={card.id}
                  onClick={() => playCard(card)}
                  className={`
                    w-14 sm:w-16 h-22 sm:h-24 rounded-lg bg-white border border-stone-300 shadow-lg
                    hover:-translate-y-3 transition-all duration-150 flex flex-col justify-between p-1.5
                    cursor-pointer select-none
                    ${card.isJoker ? 'ring-2 ring-amber-400 bg-amber-50' : ''}
                    ${isRed ? 'text-red-600' : 'text-slate-900'}
                  `}
                >
                  <div className="font-bold text-xs text-left leading-none">
                    {card.isJoker ? '🃏' : `${card.value}${card.suit}`}
                  </div>
                  <div className="text-center font-bold text-2xl">
                    {card.isJoker ? <span className="text-amber-600 font-extrabold text-sm">JOKER</span> : card.suit}
                  </div>
                  <div className="font-bold text-xs text-right leading-none">
                    {card.isJoker ? '🃏' : `${card.value}${card.suit}`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};
