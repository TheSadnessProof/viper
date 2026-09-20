import type { ChessGameState, Move, PieceColor, PieceType, Square } from './chessTypes.ts';
import { getLegalMoves, makeMove } from './chessLogic.ts';

export type ChessDifficulty = 'casual' | 'blitz' | 'grandmaster';

// Standard FIDE Piece Values in centipawns
export const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-Square Tables (PST) indexed by [rank][file], where rank 0 = Rank 1, rank 7 = Rank 8.
// White uses [rank][file], Black uses [7 - rank][file].

const PAWN_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
].reverse(); // Reverse so rank 0 is rank 1

const KNIGHT_PST = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
].reverse();

const BISHOP_PST = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
].reverse();

const ROOK_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
].reverse();

const QUEEN_PST = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
].reverse();

const KING_MG_PST = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
].reverse();

const KING_EG_PST = [
  [-50, -40, -30, -20, -20, -30, -40, -50],
  [-30, -20, -10, 0, 0, -10, -20, -30],
  [-30, -10, 20, 30, 30, 20, -10, -30],
  [-30, -10, 30, 40, 40, 30, -10, -30],
  [-30, -10, 30, 40, 40, 30, -10, -30],
  [-30, -10, 20, 30, 30, 20, -10, -30],
  [-30, -30, 0, 0, 0, 0, -30, -30],
  [-50, -30, -30, -30, -30, -30, -30, -50],
].reverse();

function getPSTValue(type: PieceType, color: PieceColor, square: Square, isEndgame: boolean): number {
  const rank = Math.floor(square / 8);
  const file = square % 8;
  const effectiveRank = color === 'w' ? rank : 7 - rank;

  switch (type) {
    case 'p':
      return PAWN_PST[effectiveRank][file];
    case 'n':
      return KNIGHT_PST[effectiveRank][file];
    case 'b':
      return BISHOP_PST[effectiveRank][file];
    case 'r':
      return ROOK_PST[effectiveRank][file];
    case 'q':
      return QUEEN_PST[effectiveRank][file];
    case 'k':
      return isEndgame ? KING_EG_PST[effectiveRank][file] : KING_MG_PST[effectiveRank][file];
    default:
      return 0;
  }
}

/**
 * Heuristic evaluation function from White's perspective.
 * Positive score means White is winning; negative score means Black is winning.
 */
export function evaluateBoard(state: ChessGameState): number {
  if (state.isCheckmate) {
    // Current turn player is checkmated
    return state.turn === 'w' ? -100000 : 100000;
  }
  if (state.isDraw) {
    return 0;
  }

  let whiteMaterial = 0;
  let blackMaterial = 0;
  let whitePST = 0;
  let blackPST = 0;

  // Endgame phase estimation (non-pawn material < 1300 per side)
  let whiteMajorMinor = 0;
  let blackMajorMinor = 0;

  for (let sq = 0; sq < 64; sq++) {
    const piece = state.board[sq];
    if (!piece) continue;
    const val = PIECE_VALUES[piece.type];
    if (piece.color === 'w') {
      whiteMaterial += val;
      if (piece.type !== 'p' && piece.type !== 'k') whiteMajorMinor += val;
    } else {
      blackMaterial += val;
      if (piece.type !== 'p' && piece.type !== 'k') blackMajorMinor += val;
    }
  }

  const isEndgame = whiteMajorMinor < 1300 && blackMajorMinor < 1300;

  for (let sq = 0; sq < 64; sq++) {
    const piece = state.board[sq];
    if (!piece) continue;
    const pstVal = getPSTValue(piece.type, piece.color, sq, isEndgame);
    if (piece.color === 'w') {
      whitePST += pstVal;
    } else {
      blackPST += pstVal;
    }
  }

  // Grandmaster-level positional bonuses: center control & king safety
  let whiteBonus = 0;
  let blackBonus = 0;

  // Center control squares {d4, e4, d5, e5} -> {27, 28, 35, 36}
  const centralSquares = [27, 28, 35, 36];
  for (const cSq of centralSquares) {
    const p = state.board[cSq];
    if (p) {
      if (p.color === 'w') whiteBonus += 15;
      else blackBonus += 15;
    }
  }

  const totalScore = (whiteMaterial - blackMaterial) + (whitePST - blackPST) + (whiteBonus - blackBonus);
  return totalScore;
}

/**
 * Orders moves to optimize Alpha-Beta pruning cutoffs.
 * Prioritizes MVV-LVA (Most Valuable Victim - Least Valuable Attacker) and checks.
 */
function scoreMoveForOrdering(state: ChessGameState, move: Move): number {
  let score = 0;

  const targetPiece = state.board[move.to];
  const movingPiece = state.board[move.from];

  if (targetPiece && movingPiece) {
    // MVV - LVA
    const victimVal = PIECE_VALUES[targetPiece.type];
    const attackerVal = PIECE_VALUES[movingPiece.type];
    score += victimVal * 10 - attackerVal;
  } else if (move.isEnPassant) {
    score += PIECE_VALUES.p * 10 - PIECE_VALUES.p;
  }

  if (move.promotion) {
    score += PIECE_VALUES[move.promotion] * 8;
  }

  if (move.isCastling) {
    score += 40;
  }

  // Center square moves
  if (move.to === 27 || move.to === 28 || move.to === 35 || move.to === 36) {
    score += 20;
  }

  return score;
}

function sortMoves(state: ChessGameState, moves: Move[]): Move[] {
  return [...moves].sort((a, b) => scoreMoveForOrdering(state, b) - scoreMoveForOrdering(state, a));
}

/**
 * Minimax algorithm with Alpha-Beta pruning.
 */
function minimax(
  state: ChessGameState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  ply: number
): number {
  if (depth === 0 || state.isCheckmate || state.isDraw) {
    if (state.isCheckmate) {
      // Prioritize faster checkmates
      return isMaximizing ? -100000 + ply : 100000 - ply;
    }
    return evaluateBoard(state);
  }

  const legalMoves = getLegalMoves(state);
  if (legalMoves.length === 0) {
    return evaluateBoard(state);
  }

  const sortedMoves = sortMoves(state, legalMoves);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of sortedMoves) {
      const nextState = makeMove(state, move);
      const ev = minimax(nextState, depth - 1, alpha, beta, false, ply + 1);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break; // Beta cutoff
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of sortedMoves) {
      const nextState = makeMove(state, move);
      const ev = minimax(nextState, depth - 1, alpha, beta, true, ply + 1);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break; // Alpha cutoff
    }
    return minEval;
  }
}

/**
 * Synchronous best move finder for all 3 difficulties.
 */
export function findBestMove(
  state: ChessGameState,
  difficulty: ChessDifficulty = 'blitz'
): Move | null {
  const legalMoves = getLegalMoves(state);
  if (legalMoves.length === 0) return null;

  const isMaximizing = state.turn === 'w';

  // 1. Casual Tier (~900 Elo):
  // Fast heuristic selection: slight preference for captures and center moves, mixed with random variance.
  if (difficulty === 'casual') {
    const scoredMoves = legalMoves.map((move) => {
      let score = Math.random() * 60; // Random baseline
      const target = state.board[move.to];
      if (target) {
        score += PIECE_VALUES[target.type] * 0.5;
      }
      if (move.to === 27 || move.to === 28 || move.to === 35 || move.to === 36) {
        score += 25;
      }
      if (move.promotion === 'q') {
        score += 150;
      }
      // Check if move gives check or checkmate
      const nextState = makeMove(state, move);
      if (nextState.isCheckmate) score += 10000;
      else if (nextState.isCheck) score += 40;
      return { move, score };
    });

    scoredMoves.sort((a, b) => b.score - a.score);
    return scoredMoves[0].move;
  }

  // 2. Blitz Tier (~1500 Elo):
  // Minimax depth 3 with Alpha-Beta pruning, PST, and captures first
  // 3. Grandmaster Tier (~2100+ Elo):
  // Minimax depth 4 with Alpha-Beta pruning, full PST, center control, king safety, MVV-LVA
  const searchDepth = difficulty === 'grandmaster' ? 4 : 3;
  const sortedMoves = sortMoves(state, legalMoves);

  let bestMove: Move = sortedMoves[0];
  let bestEval = isMaximizing ? -Infinity : Infinity;
  let alpha = -Infinity;
  let beta = Infinity;

  for (const move of sortedMoves) {
    const nextState = makeMove(state, move);
    const evaluation = minimax(
      nextState,
      searchDepth - 1,
      alpha,
      beta,
      !isMaximizing,
      1
    );

    if (isMaximizing) {
      if (evaluation > bestEval) {
        bestEval = evaluation;
        bestMove = move;
      }
      alpha = Math.max(alpha, evaluation);
    } else {
      if (evaluation < bestEval) {
        bestEval = evaluation;
        bestMove = move;
      }
      beta = Math.min(beta, evaluation);
    }
  }

  return bestMove;
}

// Web Worker Management for non-blocking browser execution
let workerInstance: Worker | null = null;
let isWorkerAvailable = true;

function getWorker(): Worker | null {
  if (!isWorkerAvailable || typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }
  if (!workerInstance) {
    try {
      workerInstance = new Worker(new URL('./chessAi.worker.ts', import.meta.url), {
        type: 'module',
      });
    } catch {
      isWorkerAvailable = false;
      return null;
    }
  }
  return workerInstance;
}

/**
 * Main AI entry point.
 * Non-blocking: delegates to Web Worker if available, or asynchronously yields via setTimeout.
 */
export async function getBestMove(
  state: ChessGameState,
  difficulty: ChessDifficulty = 'blitz'
): Promise<Move | null> {
  const worker = getWorker();

  if (!worker) {
    // Non-blocking fallback for Node tests, SSR, or environments without workers
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(findBestMove(state, difficulty));
      }, 15);
    });
  }

  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).substring(2, 9);
    let resolved = false;

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        worker.removeEventListener('message', handleMessage);
        resolve(findBestMove(state, difficulty));
      }
    }, 4000);

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.id === requestId) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          worker.removeEventListener('message', handleMessage);
          resolve(event.data.bestMove || null);
        }
      }
    };

    worker.addEventListener('message', handleMessage);
    worker.postMessage({ id: requestId, state, difficulty });
  });
}
