import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  Trophy,
  Swords,
  Users,
  Bot,
  Clock,
  Flag,
  RefreshCw,
} from 'lucide-react';
import { GameWindowControls } from '../../components/arena/GameWindowControls';
import { ChessBoardView } from './ChessBoardView';
import { ChessPieceView } from './ChessPieces';
import {
  createInitialGameState,
  makeMove,
  undoMove,
} from './chessLogic';
import { getBestMove, ChessDifficulty } from './chessAi';
import {
  playChessSound,
  isAudioMuted,
  toggleAudioMuted,
} from './chessAudio';
import type { ChessGameState, Move, Piece, PieceColor, PieceType } from './chessTypes';

interface ChessArenaProps {
  onExit: () => void;
  showNavbar?: boolean;
  onToggleNavbar?: () => void;
}

type GameMode = 'vs_bot' | 'pass_and_play';
type TimerOption = '1m' | '3m' | '5m' | '10m' | 'unlimited';

const TIMER_SECONDS: Record<TimerOption, number | null> = {
  '1m': 60,
  '3m': 180,
  '5m': 300,
  '10m': 600,
  'unlimited': null,
};

const PIECE_SCORES: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export const ChessArena: React.FC<ChessArenaProps> = ({
  onExit,
  showNavbar,
  onToggleNavbar,
}) => {
  // Game Setup State
  const [mode, setMode] = useState<GameMode>('vs_bot');
  const [difficulty, setDifficulty] = useState<ChessDifficulty>('blitz');
  const [timerOption, setTimerOption] = useState<TimerOption>('3m');
  const [playerColor, setPlayerColor] = useState<PieceColor>('w');
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');

  // Core Game State
  const [gameState, setGameState] = useState<ChessGameState>(() => createInitialGameState());
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [soundMuted, setSoundMuted] = useState(isAudioMuted());

  // Clock Timers (in seconds)
  const initialTime = TIMER_SECONDS[timerOption];
  const [whiteTime, setWhiteTime] = useState<number | null>(initialTime);
  const [blackTime, setBlackTime] = useState<number | null>(initialTime);
  const [timeoutLoser, setTimeoutLoser] = useState<PieceColor | null>(null);
  const [resignedColor, setResignedColor] = useState<PieceColor | null>(null);

  // Review Mode (Dismiss game over modal to inspect final board)
  const [isReviewingBoard, setIsReviewingBoard] = useState(false);

  const botThinkingRef = useRef(false);

  const botColor: PieceColor = playerColor === 'w' ? 'b' : 'w';

  // Format seconds into MM:SS (or M:SS.s when under 10 seconds)
  const formatTime = (time: number | null): string => {
    if (time === null) return '∞';
    if (time <= 0) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset / Restart match
  const handleRestartMatch = useCallback(() => {
    const fresh = createInitialGameState();
    setGameState(fresh);
    setLastMove(null);
    setIsBotThinking(false);
    botThinkingRef.current = false;
    setTimeoutLoser(null);
    setResignedColor(null);
    setIsReviewingBoard(false);

    const baseTime = TIMER_SECONDS[timerOption];
    setWhiteTime(baseTime);
    setBlackTime(baseTime);
  }, [timerOption]);

  // Handle timer countdown
  useEffect(() => {
    if (gameState.isCheckmate || gameState.isDraw || timeoutLoser || resignedColor) {
      return;
    }

    if (timerOption === 'unlimited') return;

    const interval = setInterval(() => {
      if (gameState.turn === 'w') {
        setWhiteTime((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            setTimeoutLoser('w');
            playChessSound(playerColor === 'w' && mode === 'vs_bot' ? 'defeat' : 'victory');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            setTimeoutLoser('b');
            playChessSound(playerColor === 'b' && mode === 'vs_bot' ? 'defeat' : 'victory');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState.turn, gameState.isCheckmate, gameState.isDraw, timeoutLoser, resignedColor, timerOption, playerColor, mode]);

  // Execute Move
  const handleMove = useCallback(
    (move: Move) => {
      if (timeoutLoser || resignedColor || gameState.isCheckmate || gameState.isDraw) {
        return;
      }

      try {
        const next = makeMove(gameState, move);
        setGameState(next);
        setLastMove(move);

        // Sound feedback
        if (next.isCheckmate) {
          if (mode === 'vs_bot') {
            const userWon = next.turn !== playerColor;
            playChessSound(userWon ? 'victory' : 'defeat');
            if (userWon) {
              confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 },
              });
            }
          } else {
            playChessSound('victory');
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
            });
          }
        } else if (next.isDraw) {
          playChessSound('defeat');
        } else if (next.isCheck) {
          playChessSound('check');
        } else if (move.isCastling) {
          playChessSound('castle');
        } else if (move.isCapture) {
          playChessSound('capture');
        } else {
          playChessSound('move');
        }
      } catch (err) {
        console.error('Move execution failed:', err);
      }
    },
    [gameState, timeoutLoser, resignedColor, mode, playerColor]
  );

  // Bot Turn Automation
  useEffect(() => {
    if (
      mode !== 'vs_bot' ||
      gameState.turn !== botColor ||
      gameState.isCheckmate ||
      gameState.isDraw ||
      timeoutLoser ||
      resignedColor ||
      botThinkingRef.current
    ) {
      return;
    }

    botThinkingRef.current = true;
    setIsBotThinking(true);

    // Natural delay based on difficulty to avoid instant jarring reply
    const thinkingDelay = difficulty === 'casual' ? 400 : difficulty === 'blitz' ? 500 : 700;

    let isMounted = true;

    const botTimer = setTimeout(async () => {
      try {
        const move = await getBestMove(gameState, difficulty);
        if (isMounted && move) {
          handleMove(move);
        }
      } catch (err) {
        console.error('Bot calculation failed:', err);
      } finally {
        if (isMounted) {
          setIsBotThinking(false);
          botThinkingRef.current = false;
        }
      }
    }, thinkingDelay);

    return () => {
      isMounted = false;
      clearTimeout(botTimer);
      botThinkingRef.current = false;
    };
  }, [gameState, mode, botColor, difficulty, timeoutLoser, resignedColor, handleMove]);

  // Undo Move
  const handleUndo = () => {
    if (gameState.history.length === 0 || timeoutLoser || resignedColor) return;

    if (mode === 'vs_bot') {
      // In vs Bot: undo 2 moves (bot's move + user's move) to return turn to user
      if (gameState.history.length >= 2) {
        const step1 = undoMove(gameState);
        const step2 = undoMove(step1);
        setGameState(step2);
        setLastMove(step2.history.length > 0 ? step2.history[step2.history.length - 1].move : null);
      } else if (gameState.history.length === 1 && gameState.turn === botColor) {
        const step1 = undoMove(gameState);
        setGameState(step1);
        setLastMove(null);
      }
    } else {
      // In Pass-and-Play: undo 1 move
      const prev = undoMove(gameState);
      setGameState(prev);
      setLastMove(prev.history.length > 0 ? prev.history[prev.history.length - 1].move : null);
    }
    setIsReviewingBoard(false);
  };

  // Toggle Sound
  const handleToggleSound = () => {
    const muted = toggleAudioMuted();
    setSoundMuted(muted);
  };

  // Resign match
  const handleResign = () => {
    if (gameState.isCheckmate || gameState.isDraw || timeoutLoser || resignedColor) return;
    const resigning = gameState.turn;
    setResignedColor(resigning);
    playChessSound(mode === 'vs_bot' && resigning === playerColor ? 'defeat' : 'victory');
  };

  // Flip board
  const handleFlipBoard = () => {
    setBoardOrientation((prev) => {
      const next = prev === 'white' ? 'black' : 'white';
      if (mode === 'vs_bot') {
        setPlayerColor(next === 'white' ? 'w' : 'b');
      }
      return next;
    });
  };

  // Calculate captured pieces & material advantage
  const { whiteCaptured, blackCaptured, whiteDiff, blackDiff } = React.useMemo(() => {
    const totalPieces: Record<PieceColor, Record<PieceType, number>> = {
      w: { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 },
      b: { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 },
    };

    const remainingPieces: Record<PieceColor, Record<PieceType, number>> = {
      w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
      b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    };

    for (const piece of gameState.board) {
      if (piece) {
        remainingPieces[piece.color][piece.type]++;
      }
    }

    // Pieces captured BY White (enemy Black pieces lost)
    const whiteCapturedList: Piece[] = [];
    // Pieces captured BY Black (enemy White pieces lost)
    const blackCapturedList: Piece[] = [];

    const pieceOrder: PieceType[] = ['q', 'r', 'b', 'n', 'p'];

    for (const type of pieceOrder) {
      const bLost = Math.max(0, totalPieces.b[type] - remainingPieces.b[type]);
      for (let i = 0; i < bLost; i++) {
        whiteCapturedList.push({ type, color: 'b' });
      }

      const wLost = Math.max(0, totalPieces.w[type] - remainingPieces.w[type]);
      for (let i = 0; i < wLost; i++) {
        blackCapturedList.push({ type, color: 'w' });
      }
    }

    let wScore = 0;
    let bScore = 0;
    for (const type of pieceOrder) {
      wScore += remainingPieces.w[type] * PIECE_SCORES[type];
      bScore += remainingPieces.b[type] * PIECE_SCORES[type];
    }

    const diff = wScore - bScore;

    return {
      whiteCaptured: whiteCapturedList,
      blackCaptured: blackCapturedList,
      whiteDiff: diff > 0 ? diff : 0,
      blackDiff: diff < 0 ? Math.abs(diff) : 0,
    };
  }, [gameState.board]);

  // Game Over Evaluation
  const gameOverOutcome = React.useMemo(() => {
    if (resignedColor) {
      const winner = resignedColor === 'w' ? 'Black' : 'White';
      const isUserWin = mode === 'vs_bot' && resignedColor === botColor;
      return {
        title: isUserWin ? 'VICTORY' : 'DEFEAT',
        subtitle: `${winner} won by resignation`,
        isWin: isUserWin || mode === 'pass_and_play',
      };
    }

    if (timeoutLoser) {
      const winner = timeoutLoser === 'w' ? 'Black' : 'White';
      const isUserWin = mode === 'vs_bot' && timeoutLoser === botColor;
      return {
        title: isUserWin ? 'VICTORY ON TIME' : 'DEFEAT ON TIME',
        subtitle: `${winner} won on time`,
        isWin: isUserWin || mode === 'pass_and_play',
      };
    }

    if (gameState.isCheckmate) {
      const winner = gameState.turn === 'w' ? 'Black' : 'White';
      const isUserWin = mode === 'vs_bot' && gameState.turn === botColor;
      return {
        title: isUserWin ? 'VICTORY BY CHECKMATE' : 'DEFEAT — CHECKMATE',
        subtitle: `${winner} checkmated the opposing king`,
        isWin: isUserWin || mode === 'pass_and_play',
      };
    }

    if (gameState.isDraw) {
      let reason = 'Draw agreed';
      if (gameState.drawReason === 'stalemate') reason = 'Stalemate — No legal moves';
      else if (gameState.drawReason === 'fifty_move') reason = '50-Move Rule draw';
      else if (gameState.drawReason === 'insufficient_material') reason = 'Insufficient material to checkmate';
      else if (gameState.drawReason === 'threefold_repetition') reason = 'Threefold repetition draw';
      return {
        title: 'DRAW',
        subtitle: reason,
        isWin: false,
      };
    }

    return null;
  }, [resignedColor, timeoutLoser, gameState, mode, botColor]);

  // Determine top and bottom player identities based on orientation
  const isWhiteBottom = boardOrientation === 'white';

  const topColor: PieceColor = isWhiteBottom ? 'b' : 'w';
  const bottomColor: PieceColor = isWhiteBottom ? 'w' : 'b';

  const topName =
    mode === 'vs_bot'
      ? topColor === botColor
        ? `Alex (Bot ${difficulty.toUpperCase()})`
        : 'Player'
      : topColor === 'w'
      ? 'White Player'
      : 'Black Player';

  const bottomName =
    mode === 'vs_bot'
      ? bottomColor === botColor
        ? `Alex (Bot ${difficulty.toUpperCase()})`
        : 'Player'
      : bottomColor === 'w'
      ? 'White Player'
      : 'Black Player';

  const topTime = topColor === 'w' ? whiteTime : blackTime;
  const bottomTime = bottomColor === 'w' ? whiteTime : blackTime;

  const topCaptured = topColor === 'w' ? whiteCaptured : blackCaptured;
  const bottomCaptured = bottomColor === 'w' ? whiteCaptured : blackCaptured;

  const topDiff = topColor === 'w' ? whiteDiff : blackDiff;
  const bottomDiff = bottomColor === 'w' ? whiteDiff : blackDiff;

  const isTopTurn = gameState.turn === topColor && !gameOverOutcome;
  const isBottomTurn = gameState.turn === bottomColor && !gameOverOutcome;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between select-none">
      {/* Top Navigation & Window Controls */}
      <GameWindowControls
        gameTitle="Chess"
        gameTag={
          mode === 'vs_bot'
            ? `${difficulty.toUpperCase()} BOT`
            : 'PASS & PLAY'
        }
        onExit={onExit}
        showNavbar={showNavbar}
        onToggleNavbar={onToggleNavbar}
        extraControls={
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Mode Switcher */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => {
                  setMode('vs_bot');
                  handleRestartMatch();
                }}
                className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${
                  mode === 'vs_bot'
                    ? 'bg-slate-800 text-sky-400 border border-sky-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Play against Bot AI"
              >
                <Bot className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Bot</span>
              </button>

              <button
                onClick={() => {
                  setMode('pass_and_play');
                  handleRestartMatch();
                }}
                className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${
                  mode === 'pass_and_play'
                    ? 'bg-slate-800 text-sky-400 border border-sky-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Pass and Play (2 Humans)"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">2P</span>
              </button>
            </div>

            {/* Bot Difficulty Selector (when vs Bot) */}
            {mode === 'vs_bot' && (
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as ChessDifficulty)}
                className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1 outline-none hover:border-slate-700 cursor-pointer"
                title="Bot Difficulty"
              >
                <option value="casual">Casual (900)</option>
                <option value="blitz">Blitz (1500)</option>
                <option value="grandmaster">GM (2100+)</option>
              </select>
            )}

            {/* Timer Selector */}
            <select
              value={timerOption}
              onChange={(e) => {
                const opt = e.target.value as TimerOption;
                setTimerOption(opt);
                const s = TIMER_SECONDS[opt];
                setWhiteTime(s);
                setBlackTime(s);
              }}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1 outline-none hover:border-slate-700 cursor-pointer"
              title="Time Control"
            >
              <option value="1m">1 Min</option>
              <option value="3m">3 Min</option>
              <option value="5m">5 Min</option>
              <option value="10m">10 Min</option>
              <option value="unlimited">Unlimited</option>
            </select>

            {/* Flip Board Button */}
            <button
              onClick={handleFlipBoard}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Flip Board Perspective"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Audio Toggle */}
            <button
              onClick={handleToggleSound}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title={soundMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {soundMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
            </button>

            {/* Undo Move */}
            <button
              onClick={handleUndo}
              disabled={gameState.history.length === 0 || isBotThinking}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Undo Move"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Restart Match */}
            <button
              onClick={handleRestartMatch}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
              title="Restart Match"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Resign Button */}
            <button
              onClick={handleResign}
              disabled={Boolean(gameOverOutcome)}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Resign Match"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      />

      {/* Main Arena Table Canvas */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 py-2 sm:py-4 flex flex-col items-center justify-between gap-2">
        {/* Top Player Status Bar */}
        <div
          className={`w-full max-w-[min(88vw,70vh,620px)] flex items-center justify-between px-3.5 py-2 rounded-xl border transition-all duration-300 ${
            isTopTurn
              ? 'bg-slate-900/90 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
              : 'bg-slate-950/70 border-slate-800/60'
          }`}
        >
          {/* Left: Player Avatar & Name */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border font-bold text-xs ${
                topColor === 'w'
                  ? 'bg-slate-200 text-slate-900 border-white'
                  : 'bg-slate-900 text-sky-400 border-sky-600/40'
              }`}
            >
              {topColor === 'w' ? 'W' : 'B'}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs sm:text-sm text-slate-200">
                  {topName}
                </span>
                {isBotThinking && topColor === botColor && (
                  <span className="text-[10px] font-mono text-cyan-400 animate-pulse">
                    evaluating...
                  </span>
                )}
              </div>

              {/* Captured pieces rack */}
              <div className="flex items-center gap-1 mt-0.5 min-h-[16px]">
                {topCaptured.map((p, idx) => (
                  <div key={idx} className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-80">
                    <ChessPieceView piece={p} />
                  </div>
                ))}
                {topDiff > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-mono font-black text-[10px]">
                    +{topDiff}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Countdown Clock */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-mono text-sm sm:text-base font-black transition ${
              topTime !== null && topTime <= 10
                ? 'bg-red-950/70 border-red-500 text-red-400 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                : topTime !== null && topTime <= 30
                ? 'bg-amber-950/50 border-amber-500/60 text-amber-300'
                : isTopTurn
                ? 'bg-slate-800 border-amber-500/80 text-amber-400 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <Clock className="w-3.5 h-3.5 opacity-70" />
            <span>{formatTime(topTime)}</span>
          </div>
        </div>

        {/* 8x8 Chessboard */}
        <div className="w-full flex items-center justify-center my-auto">
          <ChessBoardView
            gameState={gameState}
            onMove={handleMove}
            orientation={boardOrientation}
            disabled={
              Boolean(gameOverOutcome) ||
              (mode === 'vs_bot' && gameState.turn === botColor) ||
              isBotThinking
            }
            lastMove={lastMove}
          />
        </div>

        {/* Bottom Player Status Bar */}
        <div
          className={`w-full max-w-[min(88vw,70vh,620px)] flex items-center justify-between px-3.5 py-2 rounded-xl border transition-all duration-300 ${
            isBottomTurn
              ? 'bg-slate-900/90 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
              : 'bg-slate-950/70 border-slate-800/60'
          }`}
        >
          {/* Left: Player Avatar & Name */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border font-bold text-xs ${
                bottomColor === 'w'
                  ? 'bg-slate-200 text-slate-900 border-white'
                  : 'bg-slate-900 text-sky-400 border-sky-600/40'
              }`}
            >
              {bottomColor === 'w' ? 'W' : 'B'}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs sm:text-sm text-slate-200">
                  {bottomName}
                </span>
                {isBotThinking && bottomColor === botColor && (
                  <span className="text-[10px] font-mono text-cyan-400 animate-pulse">
                    evaluating...
                  </span>
                )}
              </div>

              {/* Captured pieces rack */}
              <div className="flex items-center gap-1 mt-0.5 min-h-[16px]">
                {bottomCaptured.map((p, idx) => (
                  <div key={idx} className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-80">
                    <ChessPieceView piece={p} />
                  </div>
                ))}
                {bottomDiff > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-mono font-black text-[10px]">
                    +{bottomDiff}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Countdown Clock */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-mono text-sm sm:text-base font-black transition ${
              bottomTime !== null && bottomTime <= 10
                ? 'bg-red-950/70 border-red-500 text-red-400 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                : bottomTime !== null && bottomTime <= 30
                ? 'bg-amber-950/50 border-amber-500/60 text-amber-300'
                : isBottomTurn
                ? 'bg-slate-800 border-amber-500/80 text-amber-400 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <Clock className="w-3.5 h-3.5 opacity-70" />
            <span>{formatTime(bottomTime)}</span>
          </div>
        </div>
      </main>

      {/* Review Floating Bar (if user dismissed game over modal to inspect board) */}
      {gameOverOutcome && isReviewingBoard && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-900/95 border border-slate-700/80 rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-3 backdrop-blur-xl z-40 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wide">
            {gameOverOutcome.title}
          </span>
          <button
            onClick={() => setIsReviewingBoard(false)}
            className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-700 transition"
          >
            Show Results
          </button>
          <button
            onClick={handleRestartMatch}
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition shadow-sm"
          >
            Play Again
          </button>
        </div>
      )}

      {/* Game Over Victory / Defeat Modal */}
      {gameOverOutcome && !isReviewingBoard && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[0_25px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex flex-col items-center text-center">
            {/* Outcome Trophy / Crest Icon */}
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border shadow-lg ${
                gameOverOutcome.isWin
                  ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-400'
                  : 'bg-rose-950/70 border-rose-500/60 text-rose-400'
              }`}
            >
              {gameOverOutcome.isWin ? (
                <Trophy className="w-8 h-8" />
              ) : (
                <Swords className="w-8 h-8" />
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1">
              {gameOverOutcome.title}
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              {gameOverOutcome.subtitle}
            </p>

            {/* Match Telemetry Pills */}
            <div className="grid grid-cols-2 gap-3 w-full mb-6 text-left">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">
                  Total Moves
                </span>
                <span className="text-base font-mono font-extrabold text-slate-200">
                  {gameState.fullmoveNumber}
                </span>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">
                  Game Mode
                </span>
                <span className="text-base font-extrabold text-slate-200">
                  {mode === 'vs_bot' ? `Bot (${difficulty})` : '2P Pass & Play'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
              <button
                onClick={handleRestartMatch}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-md transition hover:scale-[1.02]"
              >
                Play Again
              </button>

              <button
                onClick={() => setIsReviewingBoard(true)}
                className="w-full py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-300 hover:text-white font-bold text-sm transition"
              >
                Review Board
              </button>
            </div>

            <button
              onClick={onExit}
              className="mt-4 text-xs text-slate-500 hover:text-slate-300 transition"
            >
              Return to Catalog
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChessArena;
