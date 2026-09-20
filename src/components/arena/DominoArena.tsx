import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  DominoGameState,
  DominoTile,
  initDominoGame,
  getValidPlacements,
  placeTileOnBoard,
  drawTileFromBoneyard,
  getBotMove,
} from '../../games/domino/dominoLogic';
import { DominoTileView } from './DominoTileView';
import { RotateCcw, Volume2, VolumeX, ShieldAlert, Award, Sparkles } from 'lucide-react';
import { GameWindowControls } from './GameWindowControls';
import { SnakeLogo } from '../common/SnakeLogo';

interface DominoArenaProps {
  stake?: number;
  onExit: () => void;
  showNavbar?: boolean;
  onToggleNavbar?: () => void;
}

export const DominoArena: React.FC<DominoArenaProps> = ({
  stake = 250,
  onExit,
  showNavbar,
  onToggleNavbar,
}) => {
  const [gameState, setGameState] = useState<DominoGameState>(() => initDominoGame());
  const [selectedTile, setSelectedTile] = useState<DominoTile | null>(null);
  const [targetPlacement, setTargetPlacement] = useState<{ canLeft: boolean; canRight: boolean } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isBotThinking, setIsBotThinking] = useState(false);

  // Restart match
  const handleRestart = () => {
    setGameState(initDominoGame());
    setSelectedTile(null);
    setTargetPlacement(null);
    setIsBotThinking(false);
  };

  // Bot Turn Effect
  useEffect(() => {
    if (gameState.status !== 'playing' || gameState.currentTurn !== 'opponent') return;

    setIsBotThinking(true);
    const timer = setTimeout(() => {
      const botMove = getBotMove(gameState);

      if (botMove) {
        setGameState((prev) =>
          placeTileOnBoard(prev, botMove.tile, botMove.targetSide, 'opponent')
        );
        setIsBotThinking(false);
      } else {
        // Bot must draw or pass
        if (gameState.boneyard.length > 0) {
          const { state: updatedState } = drawTileFromBoneyard(gameState, 'opponent');
          setGameState(updatedState);
          // Try again in next cycle
          setIsBotThinking(false);
        } else {
          // Pass turn to player
          setGameState((prev) => ({
            ...prev,
            currentTurn: 'player',
            historyLog: [...prev.historyLog, 'Opponent had no move and passed.'].slice(-15),
          }));
          setIsBotThinking(false);
        }
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [gameState]);

  // Trigger celebration on player win
  useEffect(() => {
    if (gameState.status === 'player_won') {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10b981', '#f59e0b', '#3b82f6', '#ec4899'],
      });
    }
  }, [gameState.status]);

  // Handle selecting a tile from player's hand
  const handleSelectTile = (tile: DominoTile) => {
    if (gameState.currentTurn !== 'player' || gameState.status !== 'playing') return;

    const { canPlayLeft, canPlayRight } = getValidPlacements(
      tile,
      gameState.leftEndNumber,
      gameState.rightEndNumber
    );

    if (!canPlayLeft && !canPlayRight) return;

    // If only one side is valid, immediately play it for smooth UX
    if (canPlayLeft && !canPlayRight) {
      setGameState((prev) => placeTileOnBoard(prev, tile, 'left', 'player'));
      setSelectedTile(null);
      setTargetPlacement(null);
    } else if (!canPlayLeft && canPlayRight) {
      setGameState((prev) => placeTileOnBoard(prev, tile, 'right', 'player'));
      setSelectedTile(null);
      setTargetPlacement(null);
    } else {
      // Can play both left and right: let user choose
      setSelectedTile(tile);
      setTargetPlacement({ canLeft: true, canRight: true });
    }
  };

  const executeChoice = (side: 'left' | 'right') => {
    if (!selectedTile) return;
    setGameState((prev) => placeTileOnBoard(prev, selectedTile, side, 'player'));
    setSelectedTile(null);
    setTargetPlacement(null);
  };

  const handlePlayerDraw = () => {
    if (gameState.currentTurn !== 'player' || gameState.boneyard.length === 0) return;
    const { state: updatedState } = drawTileFromBoneyard(gameState, 'player');
    setGameState(updatedState);
  };

  const handlePlayerPass = () => {
    if (gameState.currentTurn !== 'player') return;
    setGameState((prev) => ({
      ...prev,
      currentTurn: 'opponent',
      historyLog: [...prev.historyLog, 'You passed the turn.'].slice(-15),
    }));
  };

  const playerCanPlayAny = gameState.playerHand.some((tile) => {
    const { canPlayLeft, canPlayRight } = getValidPlacements(
      tile,
      gameState.leftEndNumber,
      gameState.rightEndNumber
    );
    return canPlayLeft || canPlayRight;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Game Window Controls Bar */}
      <GameWindowControls
        gameTitle="Domino Arena"
        gameTag="1v1 Ranked"
        onExit={onExit}
        showNavbar={showNavbar}
        onToggleNavbar={onToggleNavbar}
        extraControls={
          <>
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-full border border-amber-500/30 text-xs">
              <span className="text-amber-400 font-semibold uppercase text-[10px]">Pot:</span>
              <span className="text-amber-300 font-bold font-mono text-xs">🪙 {stake * 2}</span>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition"
              title={soundEnabled ? 'Mute SFX' : 'Enable SFX'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleRestart}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition"
              title="Restart Match"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </>
        }
      />

      {/* Duel Layout */}
      <main className="flex-1 flex flex-col p-4 md:p-6 max-w-7xl w-full mx-auto justify-between relative">
        {/* Opponent Row (Top) */}
        <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 p-0.5 shadow-md">
                <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center font-bold text-lg text-rose-300">
                  AI
                </div>
              </div>
              {gameState.currentTurn === 'opponent' && (
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-200">Alex “The Tactician”</span>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">1,840 Elo</span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>{gameState.opponentHandCount} tiles remaining</span>
                {isBotThinking && <span className="text-amber-400 animate-pulse font-medium">Thinking move…</span>}
              </div>
            </div>
          </div>

          {/* Opponent Hidden Hand preview */}
          <div className="flex gap-1">
            {Array.from({ length: gameState.opponentHandCount }).map((_, i) => (
              <div
                key={i}
                className="w-6 h-10 rounded bg-gradient-to-b from-stone-200 to-stone-400 border border-stone-500 shadow-sm opacity-80"
              />
            ))}
          </div>
        </div>

        {/* Central Domino Table */}
        <div className="my-4 flex-1 min-h-[360px] rounded-3xl game-table-felt border-8 border-[#2d1706] relative flex flex-col justify-between p-6 overflow-hidden">
          {/* Felt Watermark: Viper Snake Logo & Club Crest */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center select-none z-0">
            <SnakeLogo size={180} color="#10b981" opacity={0.12} />
            <span className="font-black text-xl tracking-[0.35em] text-emerald-300 uppercase mt-2 opacity-15">
              VIPER CLUB
            </span>
          </div>

          {/* Table Header: Open Ends Indicator */}
          <div className="flex items-center justify-between text-xs text-emerald-200/80 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-xl border border-emerald-500/20">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-emerald-300">Open Left:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-400 font-mono font-bold text-white">
                {gameState.leftEndNumber !== null ? gameState.leftEndNumber : 'Any'}
              </span>
            </div>
            <div className="text-emerald-100/60 font-medium hidden sm:block">
              Double-Six Traditional Match
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-emerald-300">Open Right:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-400 font-mono font-bold text-white">
                {gameState.rightEndNumber !== null ? gameState.rightEndNumber : 'Any'}
              </span>
            </div>
          </div>

          {/* Board Dominoes Chain */}
          <div className="flex-1 flex items-center justify-center overflow-x-auto py-6 px-4 scrollbar-thin">
            {gameState.board.length === 0 ? (
              <div className="text-center">
                <div className="inline-flex p-4 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 mb-2">
                  <Sparkles className="w-8 h-8 animate-pulse" />
                </div>
                <h3 className="text-lg font-bold text-emerald-100">Table Ready</h3>
                <p className="text-xs text-emerald-200/70 max-w-sm">
                  {gameState.currentTurn === 'player'
                    ? 'Play any tile from your hand to open the match chain.'
                    : 'Opponent is making the opening placement…'}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 flex-nowrap min-w-max">
                {gameState.board.map((placed, idx) => (
                  <DominoTileView
                    key={`${placed.tile.id}-${idx}`}
                    tile={placed.tile}
                    orientation="horizontal"
                    isFlipped={placed.isFlipped}
                    size="sm"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Choose Side Prompt when tile matches both ends */}
          {targetPlacement && selectedTile && (
            <div className="absolute inset-x-0 bottom-6 flex justify-center z-10 animate-in fade-in zoom-in-95">
              <div className="bg-slate-900/95 border border-amber-500/50 p-4 rounded-2xl shadow-2xl flex items-center gap-4">
                <span className="text-sm font-semibold text-amber-300">Play Tile on which side?</span>
                <button
                  onClick={() => executeChoice('left')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm transition shadow"
                >
                  ◀ Left End ({gameState.leftEndNumber})
                </button>
                <button
                  onClick={() => executeChoice('right')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm transition shadow"
                >
                  Right End ({gameState.rightEndNumber}) ▶
                </button>
                <button
                  onClick={() => {
                    setSelectedTile(null);
                    setTargetPlacement(null);
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Table Footer: Boneyard status & action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-emerald-900/40">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlayerDraw}
                disabled={gameState.currentTurn !== 'player' || gameState.boneyard.length === 0}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition"
              >
                <span>Draw Tile ({gameState.boneyard.length} in Boneyard)</span>
              </button>

              {!playerCanPlayAny && gameState.boneyard.length === 0 && (
                <button
                  onClick={handlePlayerPass}
                  disabled={gameState.currentTurn !== 'player'}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs flex items-center gap-1.5 transition border border-amber-500/30"
                >
                  <ShieldAlert className="w-4 h-4" />
                  Pass Turn
                </button>
              )}
            </div>

            {/* Victory banner inside table */}
            {gameState.status !== 'playing' && (
              <div className="flex items-center gap-3 bg-black/60 px-4 py-2 rounded-xl border border-amber-500/40">
                <Award className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-bold text-amber-300">
                  {gameState.status === 'player_won'
                    ? '🎉 You Won the Duel!'
                    : gameState.status === 'opponent_won'
                    ? 'Opponent Won the Duel'
                    : 'Match Locked — Draw!'}
                </span>
                <button
                  onClick={handleRestart}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition"
                >
                  Rematch
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Player Row (Bottom) */}
        <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-0.5">
                <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center font-bold text-emerald-400">
                  ME
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200">You</span>
                  <span className="text-xs bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-mono border border-emerald-800">
                    2,150 Elo
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  {gameState.currentTurn === 'player' ? (
                    <span className="text-emerald-400 font-semibold animate-pulse">Your Turn — Pick a tile to play</span>
                  ) : (
                    <span>Waiting for opponent move…</span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-400">
              Hand: <span className="font-bold text-white font-mono">{gameState.playerHand.length}</span> tiles
            </div>
          </div>

          {/* Player Hand Tiles */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap pt-2">
            {gameState.playerHand.map((tile) => {
              const { canPlayLeft, canPlayRight } = getValidPlacements(
                tile,
                gameState.leftEndNumber,
                gameState.rightEndNumber
              );
              const isPlayable = (canPlayLeft || canPlayRight) && gameState.currentTurn === 'player' && gameState.status === 'playing';

              return (
                <DominoTileView
                  key={tile.id}
                  tile={tile}
                  orientation="vertical"
                  isPlayable={isPlayable}
                  isSelected={selectedTile?.id === tile.id}
                  onClick={isPlayable ? () => handleSelectTile(tile) : undefined}
                  size="md"
                />
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};
