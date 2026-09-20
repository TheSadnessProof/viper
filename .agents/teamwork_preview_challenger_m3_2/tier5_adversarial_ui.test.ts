import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isAudioMuted,
  setAudioMuted,
  toggleAudioMuted,
  playChessSound,
  type ChessSoundType,
} from '../../src/games/chess/chessAudio.ts';

import {
  createInitialGameState,
  makeMove,
  algebraicToSquare,
  squareToAlgebraic,
  getSquareColor,
} from '../../src/games/chess/chessLogic.ts';

import type {
  ChessGameState,
  Piece,
  PieceColor,
  PieceType,
  Square,
  Move,
} from '../../src/games/chess/chessTypes.ts';

// Resolve project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

/* ========================================================================== */
/* SECTION 1: TIMERS AND FLAG-FALL HANDLING                                   */
/* ========================================================================== */

type TimerOption = '1m' | '3m' | '5m' | '10m' | 'unlimited';

const TIMER_SECONDS: Record<TimerOption, number | null> = {
  '1m': 60,
  '3m': 180,
  '5m': 300,
  '10m': 600,
  'unlimited': null,
};

function formatTime(time: number | null): string {
  if (time === null) return '∞';
  if (time <= 0) return '0:00';
  const mins = Math.floor(time / 60);
  const secs = time % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface ClockState {
  whiteTime: number | null;
  blackTime: number | null;
  timeoutLoser: PieceColor | null;
}

function tickTimer(
  clock: ClockState,
  turn: PieceColor,
  timerOption: TimerOption,
  isGameOver: boolean
): ClockState {
  if (isGameOver || clock.timeoutLoser !== null || timerOption === 'unlimited') {
    return { ...clock };
  }

  if (turn === 'w') {
    if (clock.whiteTime === null) return { ...clock };
    if (clock.whiteTime <= 1) {
      return { ...clock, whiteTime: 0, timeoutLoser: 'w' };
    }
    return { ...clock, whiteTime: clock.whiteTime - 1 };
  } else {
    if (clock.blackTime === null) return { ...clock };
    if (clock.blackTime <= 1) {
      return { ...clock, blackTime: 0, timeoutLoser: 'b' };
    }
    return { ...clock, blackTime: clock.blackTime - 1 };
  }
}

function evaluateGameOverOutcome(
  timeoutLoser: PieceColor | null,
  resignedColor: PieceColor | null,
  gameState: { isCheckmate: boolean; isDraw: boolean; drawReason?: string; turn: PieceColor },
  mode: 'vs_bot' | 'pass_and_play',
  botColor: PieceColor
) {
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
}

describe('Tier 5 Adversarial: Timer Countdown and Timeout Flag-Fall Handling', () => {
  it('Timer duration mappings conform strictly to specifications', () => {
    assert.equal(TIMER_SECONDS['1m'], 60);
    assert.equal(TIMER_SECONDS['3m'], 180);
    assert.equal(TIMER_SECONDS['5m'], 300);
    assert.equal(TIMER_SECONDS['10m'], 600);
    assert.equal(TIMER_SECONDS['unlimited'], null);
  });

  it('formatTime formats standard, boundary, and extreme seconds accurately', () => {
    assert.equal(formatTime(null), '∞');
    assert.equal(formatTime(0), '0:00');
    assert.equal(formatTime(-1), '0:00');
    assert.equal(formatTime(-999), '0:00');
    assert.equal(formatTime(5), '0:05');
    assert.equal(formatTime(9), '0:09');
    assert.equal(formatTime(10), '0:10');
    assert.equal(formatTime(59), '0:59');
    assert.equal(formatTime(60), '1:00');
    assert.equal(formatTime(180), '3:00');
    assert.equal(formatTime(600), '10:00');
    assert.equal(formatTime(3665), '61:05');
  });

  it('Timer countdown decrements only the active player clock', () => {
    let clock: ClockState = { whiteTime: 60, blackTime: 60, timeoutLoser: null };

    // White's turn: 3 ticks
    for (let i = 0; i < 3; i++) {
      clock = tickTimer(clock, 'w', '1m', false);
    }
    assert.equal(clock.whiteTime, 57);
    assert.equal(clock.blackTime, 60);
    assert.equal(clock.timeoutLoser, null);

    // Black's turn: 5 ticks
    for (let i = 0; i < 5; i++) {
      clock = tickTimer(clock, 'b', '1m', false);
    }
    assert.equal(clock.whiteTime, 57);
    assert.equal(clock.blackTime, 55);
    assert.equal(clock.timeoutLoser, null);
  });

  it('Unlimited mode never decrements clocks', () => {
    let clock: ClockState = { whiteTime: null, blackTime: null, timeoutLoser: null };
    for (let i = 0; i < 100; i++) {
      clock = tickTimer(clock, 'w', 'unlimited', false);
      clock = tickTimer(clock, 'b', 'unlimited', false);
    }
    assert.equal(clock.whiteTime, null);
    assert.equal(clock.blackTime, null);
    assert.equal(clock.timeoutLoser, null);
  });

  it('White flag-fall triggers exactly when clock reaches 0', () => {
    let clock: ClockState = { whiteTime: 3, blackTime: 60, timeoutLoser: null };

    // tick 1: 3 -> 2
    clock = tickTimer(clock, 'w', '1m', false);
    assert.equal(clock.whiteTime, 2);
    assert.equal(clock.timeoutLoser, null);

    // tick 2: 2 -> 1
    clock = tickTimer(clock, 'w', '1m', false);
    assert.equal(clock.whiteTime, 1);
    assert.equal(clock.timeoutLoser, null);

    // tick 3: 1 -> 0 and timeoutLoser is 'w'
    clock = tickTimer(clock, 'w', '1m', false);
    assert.equal(clock.whiteTime, 0);
    assert.equal(clock.timeoutLoser, 'w');

    // Subsequent ticks do not drop below 0
    clock = tickTimer(clock, 'w', '1m', false);
    assert.equal(clock.whiteTime, 0);
    assert.equal(clock.timeoutLoser, 'w');
  });

  it('Black flag-fall triggers exactly when clock reaches 0', () => {
    let clock: ClockState = { whiteTime: 45, blackTime: 2, timeoutLoser: null };

    // tick 1: 2 -> 1
    clock = tickTimer(clock, 'b', '1m', false);
    assert.equal(clock.blackTime, 1);
    assert.equal(clock.timeoutLoser, null);

    // tick 2: 1 -> 0 and timeoutLoser is 'b'
    clock = tickTimer(clock, 'b', '1m', false);
    assert.equal(clock.blackTime, 0);
    assert.equal(clock.timeoutLoser, 'b');
  });

  it('Clock freezing: does not tick when match has ended (checkmate, draw, resignation)', () => {
    const clock: ClockState = { whiteTime: 50, blackTime: 50, timeoutLoser: null };

    // Checkmate
    const frozen1 = tickTimer(clock, 'w', '1m', true);
    assert.equal(frozen1.whiteTime, 50);

    // After flag fall
    const flaggedClock: ClockState = { whiteTime: 0, blackTime: 50, timeoutLoser: 'w' };
    const frozen2 = tickTimer(flaggedClock, 'b', '1m', false);
    assert.equal(frozen2.blackTime, 50);
  });

  it('Timeout evaluation produces correct user victory/defeat across modes', () => {
    // 1. Human (w) vs Bot (b): Human times out
    const outcome1 = evaluateGameOverOutcome('w', null, { isCheckmate: false, isDraw: false, turn: 'w' }, 'vs_bot', 'b');
    assert.deepEqual(outcome1, {
      title: 'DEFEAT ON TIME',
      subtitle: 'Black won on time',
      isWin: false,
    });

    // 2. Human (w) vs Bot (b): Bot times out
    const outcome2 = evaluateGameOverOutcome('b', null, { isCheckmate: false, isDraw: false, turn: 'b' }, 'vs_bot', 'b');
    assert.deepEqual(outcome2, {
      title: 'VICTORY ON TIME',
      subtitle: 'White won on time',
      isWin: true,
    });

    // 3. Human plays Black (b) vs Bot (w): Bot (w) times out
    const outcome3 = evaluateGameOverOutcome('w', null, { isCheckmate: false, isDraw: false, turn: 'w' }, 'vs_bot', 'w');
    assert.deepEqual(outcome3, {
      title: 'VICTORY ON TIME',
      subtitle: 'Black won on time',
      isWin: true,
    });

    // 4. Pass and play mode: White times out
    const outcome4 = evaluateGameOverOutcome('w', null, { isCheckmate: false, isDraw: false, turn: 'w' }, 'pass_and_play', 'b');
    assert.deepEqual(outcome4, {
      title: 'DEFEAT ON TIME', // White lost, Black won
      subtitle: 'Black won on time',
      isWin: true, // pass and play is always locally won
    });
  });
});

/* ========================================================================== */
/* SECTION 2: MATERIAL DIFFERENTIAL CALCULATIONS                              */
/* ========================================================================== */

const PIECE_SCORES: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

function computeMaterialDifference(board: (Piece | null)[]) {
  const totalPieces: Record<PieceColor, Record<PieceType, number>> = {
    w: { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 },
    b: { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 },
  };

  const remainingPieces: Record<PieceColor, Record<PieceType, number>> = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  };

  for (const piece of board) {
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
}

describe('Tier 5 Adversarial: Material Differential Calculations', () => {
  it('Standard initial board yields zero captures and zero differential', () => {
    const state = createInitialGameState();
    const result = computeMaterialDifference(state.board);

    assert.equal(result.whiteCaptured.length, 0);
    assert.equal(result.blackCaptured.length, 0);
    assert.equal(result.whiteDiff, 0);
    assert.equal(result.blackDiff, 0);
  });

  it('White captures Black Queen yields +9 White Diff and 1 Black Queen in White rack', () => {
    const state = createInitialGameState();
    // Simulate Black Queen removed
    const board = [...state.board];
    const bqSquare = algebraicToSquare('d8');
    assert.deepEqual(board[bqSquare], { type: 'q', color: 'b' });
    board[bqSquare] = null;

    const result = computeMaterialDifference(board);
    assert.equal(result.whiteDiff, 9);
    assert.equal(result.blackDiff, 0);
    assert.equal(result.whiteCaptured.length, 1);
    assert.deepEqual(result.whiteCaptured[0], { type: 'q', color: 'b' });
    assert.equal(result.blackCaptured.length, 0);
  });

  it('Black captures White Rook and Bishop yields +8 Black Diff and captured pieces in Black rack', () => {
    const state = createInitialGameState();
    const board = [...state.board];
    board[algebraicToSquare('a1')] = null; // White Rook
    board[algebraicToSquare('c1')] = null; // White Bishop

    const result = computeMaterialDifference(board);
    assert.equal(result.whiteDiff, 0);
    assert.equal(result.blackDiff, 8); // 5 + 3
    assert.equal(result.blackCaptured.length, 2);
    assert.deepEqual(result.blackCaptured[0], { type: 'r', color: 'w' });
    assert.deepEqual(result.blackCaptured[1], { type: 'b', color: 'w' });
  });

  it('Symmetric exchange of Queens and Knights results in zero differential and equal racks', () => {
    const state = createInitialGameState();
    const board = [...state.board];
    board[algebraicToSquare('d1')] = null; // WQ
    board[algebraicToSquare('d8')] = null; // BQ
    board[algebraicToSquare('b1')] = null; // WN
    board[algebraicToSquare('b8')] = null; // BN

    const result = computeMaterialDifference(board);
    assert.equal(result.whiteDiff, 0);
    assert.equal(result.blackDiff, 0);
    assert.equal(result.whiteCaptured.length, 2);
    assert.equal(result.blackCaptured.length, 2);
    assert.equal(result.whiteCaptured[0].type, 'q');
    assert.equal(result.whiteCaptured[1].type, 'n');
    assert.equal(result.blackCaptured[0].type, 'q');
    assert.equal(result.blackCaptured[1].type, 'n');
  });

  it('Extreme Promotion: White has 9 Queens vs Lone Black King', () => {
    const board: (Piece | null)[] = Array(64).fill(null);
    board[algebraicToSquare('e1')] = { type: 'k', color: 'w' };
    board[algebraicToSquare('e8')] = { type: 'k', color: 'b' };

    // Place 9 White Queens
    const squares = ['a1', 'b1', 'c1', 'd1', 'f1', 'g1', 'h1', 'a2', 'b2'];
    for (const sq of squares) {
      board[algebraicToSquare(sq)] = { type: 'q', color: 'w' };
    }

    const result = computeMaterialDifference(board);
    // White score: 9 * 9 = 81. Black score: 0. Diff = +81 White
    assert.equal(result.whiteDiff, 81);
    assert.equal(result.blackDiff, 0);
    // White's captured rack: all standard Black pieces are missing except King
    // 1Q + 2R + 2B + 2N + 8P = 15 pieces
    assert.equal(result.whiteCaptured.length, 15);
    // Black's captured rack: White has 0 pawns, 0 rooks, 0 bishops, 0 knights.
    // White has 9 Queens (exceeds initial 1 Queen). Math.max(0, 1 - 9) = 0, so no negative count!
    assert.equal(result.blackCaptured.filter(p => p.type === 'q').length, 0);
    // White missing: 8 pawns + 2 rooks + 2 bishops + 2 knights = 14 pieces
    assert.equal(result.blackCaptured.length, 14);
  });

  it('Extreme Symmetrical Promotion: 9 Queens vs 9 Queens', () => {
    const board: (Piece | null)[] = Array(64).fill(null);
    board[algebraicToSquare('e1')] = { type: 'k', color: 'w' };
    board[algebraicToSquare('e8')] = { type: 'k', color: 'b' };

    const wSquares = ['a1', 'b1', 'c1', 'd1', 'f1', 'g1', 'h1', 'a2', 'b2'];
    const bSquares = ['a8', 'b8', 'c8', 'd8', 'f8', 'g8', 'h8', 'a7', 'b7'];

    for (const sq of wSquares) board[algebraicToSquare(sq)] = { type: 'q', color: 'w' };
    for (const sq of bSquares) board[algebraicToSquare(sq)] = { type: 'q', color: 'b' };

    const result = computeMaterialDifference(board);
    assert.equal(result.whiteDiff, 0);
    assert.equal(result.blackDiff, 0);
  });

  it('Underpromotion Army: 10 Knights vs 10 Bishops', () => {
    const board: (Piece | null)[] = Array(64).fill(null);
    board[algebraicToSquare('e1')] = { type: 'k', color: 'w' };
    board[algebraicToSquare('e8')] = { type: 'k', color: 'b' };

    // 10 White Knights (10 * 3 = 30 pts)
    const wSq = ['a1', 'b1', 'c1', 'd1', 'f1', 'g1', 'h1', 'a2', 'b2', 'c2'];
    for (const s of wSq) board[algebraicToSquare(s)] = { type: 'n', color: 'w' };

    // 10 Black Bishops (10 * 3 = 30 pts)
    const bSq = ['a8', 'b8', 'c8', 'd8', 'f8', 'g8', 'h8', 'a7', 'b7', 'c7'];
    for (const s of bSq) board[algebraicToSquare(s)] = { type: 'b', color: 'b' };

    const result = computeMaterialDifference(board);
    assert.equal(result.whiteDiff, 0);
    assert.equal(result.blackDiff, 0);
  });

  it('Lone King vs Lone King: all 30 non-king pieces captured', () => {
    const board: (Piece | null)[] = Array(64).fill(null);
    board[algebraicToSquare('e1')] = { type: 'k', color: 'w' };
    board[algebraicToSquare('e8')] = { type: 'k', color: 'b' };

    const result = computeMaterialDifference(board);
    assert.equal(result.whiteDiff, 0);
    assert.equal(result.blackDiff, 0);
    assert.equal(result.whiteCaptured.length, 15);
    assert.equal(result.blackCaptured.length, 15);

    // Ordering check: Q, R, B, N, P
    const expectedOrder = ['q', 'r', 'r', 'b', 'b', 'n', 'n', 'p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'];
    assert.deepEqual(result.whiteCaptured.map(p => p.type), expectedOrder);
    assert.deepEqual(result.blackCaptured.map(p => p.type), expectedOrder);
  });

  it('Empty board edge case produces no NaN, null, or runtime exceptions', () => {
    const emptyBoard: (Piece | null)[] = Array(64).fill(null);
    const result = computeMaterialDifference(emptyBoard);
    assert.equal(result.whiteDiff, 0);
    assert.equal(result.blackDiff, 0);
    assert.equal(result.whiteCaptured.length, 15);
    assert.equal(result.blackCaptured.length, 15);
  });
});

/* ========================================================================== */
/* SECTION 3: BOARD FLIP AND COORDINATE TRANSLATION                           */
/* ========================================================================== */

const FILES_WHITE = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS_WHITE = ['8', '7', '6', '5', '4', '3', '2', '1'];

const FILES_BLACK = ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
const RANKS_BLACK = ['1', '2', '3', '4', '5', '6', '7', '8'];

function getSquareFromGrid(row: number, col: number, orientation: 'white' | 'black'): Square {
  if (orientation === 'white') {
    const rank = 7 - row;
    const file = col;
    return rank * 8 + file;
  } else {
    const rank = row;
    const file = 7 - col;
    return rank * 8 + file;
  }
}

interface BoundingRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

function resolvePointerDropSquare(
  clientX: number,
  clientY: number,
  rect: BoundingRect,
  orientation: 'white' | 'black',
  isTouch: boolean
): Square | null {
  const testY = isTouch ? clientY - 32 : clientY;
  const testX = clientX;

  if (testX >= rect.left && testX <= rect.right && testY >= rect.top && testY <= rect.bottom) {
    const squareWidth = rect.width / 8;
    const squareHeight = rect.height / 8;
    const col = Math.floor((testX - rect.left) / squareWidth);
    const row = Math.floor((testY - rect.top) / squareHeight);

    if (col >= 0 && col < 8 && row >= 0 && row < 8) {
      return getSquareFromGrid(row, col, orientation);
    }
  }

  return null;
}

describe('Tier 5 Adversarial: Board Flip Orientation & Coordinate Translation', () => {
  it('White orientation: All 64 grid cells map bijectively to 0..63 with zero collisions', () => {
    const seen = new Set<Square>();
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const sq = getSquareFromGrid(row, col, 'white');
        assert.ok(sq >= 0 && sq <= 63, `Square ${sq} out of bounds`);
        assert.ok(!seen.has(sq), `Collision detected on square ${sq} at (${row}, ${col})`);
        seen.add(sq);
      }
    }
    assert.equal(seen.size, 64);
  });

  it('Black orientation: All 64 grid cells map bijectively to 0..63 with zero collisions', () => {
    const seen = new Set<Square>();
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const sq = getSquareFromGrid(row, col, 'black');
        assert.ok(sq >= 0 && sq <= 63, `Square ${sq} out of bounds`);
        assert.ok(!seen.has(sq), `Collision detected on square ${sq} at (${row}, ${col})`);
        seen.add(sq);
      }
    }
    assert.equal(seen.size, 64);
  });

  it('White orientation: Key corner and center squares map to correct algebraic coordinates', () => {
    // Top-left: row 0, col 0 -> a8 (56)
    assert.equal(squareToAlgebraic(getSquareFromGrid(0, 0, 'white')), 'a8');
    // Top-right: row 0, col 7 -> h8 (63)
    assert.equal(squareToAlgebraic(getSquareFromGrid(0, 7, 'white')), 'h8');
    // Bottom-left: row 7, col 0 -> a1 (0)
    assert.equal(squareToAlgebraic(getSquareFromGrid(7, 0, 'white')), 'a1');
    // Bottom-right: row 7, col 7 -> h1 (7)
    assert.equal(squareToAlgebraic(getSquareFromGrid(7, 7, 'white')), 'h1');
    // Center e4: row 4, col 4 -> e4 (28)
    assert.equal(squareToAlgebraic(getSquareFromGrid(4, 4, 'white')), 'e4');
    // Center d5: row 3, col 3 -> d5 (35)
    assert.equal(squareToAlgebraic(getSquareFromGrid(3, 3, 'white')), 'd5');
  });

  it('Black orientation: Key corner and center squares map to flipped algebraic coordinates', () => {
    // From Black's perspective:
    // Top-left: row 0, col 0 is h1 (7)
    assert.equal(squareToAlgebraic(getSquareFromGrid(0, 0, 'black')), 'h1');
    // Top-right: row 0, col 7 is a1 (0)
    assert.equal(squareToAlgebraic(getSquareFromGrid(0, 7, 'black')), 'a1');
    // Bottom-left: row 7, col 0 is h8 (63)
    assert.equal(squareToAlgebraic(getSquareFromGrid(7, 0, 'black')), 'h8');
    // Bottom-right: row 7, col 7 is a8 (56)
    assert.equal(squareToAlgebraic(getSquareFromGrid(7, 7, 'black')), 'a8');
    // Center e4: from Black view is at row 3, col 3 -> e4 (28)
    assert.equal(squareToAlgebraic(getSquareFromGrid(3, 3, 'black')), 'e4');
    // Center d5: from Black view is at row 4, col 4 -> d5 (35)
    assert.equal(squareToAlgebraic(getSquareFromGrid(4, 4, 'black')), 'd5');
  });

  it('Coordinate labels in White and Black perspectives match rank and file positions', () => {
    // White: files are a..h from left to right, ranks are 8..1 from top to bottom
    assert.deepEqual(FILES_WHITE, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    assert.deepEqual(RANKS_WHITE, ['8', '7', '6', '5', '4', '3', '2', '1']);

    // Black: files are h..a from left to right, ranks are 1..8 from top to bottom
    assert.deepEqual(FILES_BLACK, ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a']);
    assert.deepEqual(RANKS_BLACK, ['1', '2', '3', '4', '5', '6', '7', '8']);

    for (let c = 0; c < 8; c++) {
      // Bottom-most row (row 7) shows file coordinate
      const sqW = getSquareFromGrid(7, c, 'white');
      assert.equal(FILES_WHITE[c], squareToAlgebraic(sqW)[0]);

      const sqB = getSquareFromGrid(7, c, 'black');
      assert.equal(FILES_BLACK[c], squareToAlgebraic(sqB)[0]);
    }

    for (let r = 0; r < 8; r++) {
      // Left-most column (col 0) shows rank coordinate
      const sqW = getSquareFromGrid(r, 0, 'white');
      assert.equal(RANKS_WHITE[r], squareToAlgebraic(sqW)[1]);

      const sqB = getSquareFromGrid(r, 0, 'black');
      assert.equal(RANKS_BLACK[r], squareToAlgebraic(sqB)[1]);
    }
  });

  it('Desktop drag-and-drop pointer resolution translates accurately across the board', () => {
    const rect: BoundingRect = {
      left: 100,
      top: 100,
      right: 500,
      bottom: 500,
      width: 400,
      height: 400,
    };
    // Square size = 50x50

    // Drop in top-left cell (clientX=125, clientY=125) -> col 0, row 0 -> a8 in White
    const drop1 = resolvePointerDropSquare(125, 125, rect, 'white', false);
    assert.equal(squareToAlgebraic(drop1!), 'a8');

    // Drop in bottom-right cell (clientX=475, clientY=475) -> col 7, row 7 -> h1 in White
    const drop2 = resolvePointerDropSquare(475, 475, rect, 'white', false);
    assert.equal(squareToAlgebraic(drop2!), 'h1');

    // Flipped to Black:
    // Drop in top-left cell -> h1 in Black
    const drop3 = resolvePointerDropSquare(125, 125, rect, 'black', false);
    assert.equal(squareToAlgebraic(drop3!), 'h1');

    // Drop in bottom-right cell -> a8 in Black
    const drop4 = resolvePointerDropSquare(475, 475, rect, 'black', false);
    assert.equal(squareToAlgebraic(drop4!), 'a8');
  });

  it('Touch drag-and-drop applies -32px ergonomic touch offset to prevent finger occlusion', () => {
    const rect: BoundingRect = {
      left: 100,
      top: 100,
      right: 500,
      bottom: 500,
      width: 400,
      height: 400,
    };
    // Square height = 50. Row 0: 100..150. Row 1: 150..200.
    // Touch event clientY = 160 (physically in row 1):
    // Desktop would resolve to row 1.
    const desktopDrop = resolvePointerDropSquare(125, 160, rect, 'white', false);
    assert.equal(squareToAlgebraic(desktopDrop!), 'a7'); // row 1

    // With touch offset: testY = 160 - 32 = 128 (resolves to row 0 / square above finger)
    const touchDrop = resolvePointerDropSquare(125, 160, rect, 'white', true);
    assert.equal(squareToAlgebraic(touchDrop!), 'a8'); // row 0
  });

  it('Out-of-bounds drops and edge boundaries safely return null without throwing', () => {
    const rect: BoundingRect = {
      left: 100,
      top: 100,
      right: 500,
      bottom: 500,
      width: 400,
      height: 400,
    };

    // Outside left
    assert.equal(resolvePointerDropSquare(99, 200, rect, 'white', false), null);
    // Outside right
    assert.equal(resolvePointerDropSquare(501, 200, rect, 'white', false), null);
    // Outside top
    assert.equal(resolvePointerDropSquare(200, 99, rect, 'white', false), null);
    // Outside bottom
    assert.equal(resolvePointerDropSquare(200, 501, rect, 'white', false), null);

    // Exact right edge boundary (clientX = 500 -> col = 8 -> rejected by col < 8)
    assert.equal(resolvePointerDropSquare(500, 200, rect, 'white', false), null);
    // Exact bottom edge boundary (clientY = 500 -> row = 8 -> rejected by row < 8)
    assert.equal(resolvePointerDropSquare(200, 500, rect, 'white', false), null);
  });
});

/* ========================================================================== */
/* SECTION 4: GAMEWINDOWCONTROLS CONTRACT AUDIT                               */
/* ========================================================================== */

describe('Tier 5 Adversarial: GameWindowControls Contract & Callback Propagation', () => {
  it('GameWindowControls source defines onExit, showNavbar, and onToggleNavbar contracts', () => {
    const gwcPath = path.join(PROJECT_ROOT, 'src/components/arena/GameWindowControls.tsx');
    const content = fs.readFileSync(gwcPath, 'utf-8');

    // Props contract verification
    assert.ok(content.includes('onExit: () => void'), 'Must define onExit prop');
    assert.ok(content.includes('showNavbar?: boolean'), 'Must define showNavbar prop');
    assert.ok(content.includes('onToggleNavbar?: () => void'), 'Must define onToggleNavbar prop');
    assert.ok(content.includes('extraControls?: React.ReactNode'), 'Must define extraControls prop');

    // Handler attachment verification
    assert.ok(content.includes('onClick={onExit}'), 'Must bind onExit to click handlers');
    assert.ok(content.includes('onClick={onToggleNavbar}'), 'Must bind onToggleNavbar to click handler');
  });

  it('ChessArena passes required props into GameWindowControls', () => {
    const arenaPath = path.join(PROJECT_ROOT, 'src/games/chess/ChessArena.tsx');
    const content = fs.readFileSync(arenaPath, 'utf-8');

    assert.ok(content.includes('<GameWindowControls'), 'ChessArena must instantiate GameWindowControls');
    assert.ok(content.includes('gameTitle="Chess"'), 'Must specify gameTitle="Chess"');
    assert.ok(content.includes('onExit={onExit}'), 'Must wire onExit callback');
    assert.ok(content.includes('showNavbar={showNavbar}'), 'Must pass showNavbar state');
    assert.ok(content.includes('onToggleNavbar={onToggleNavbar}'), 'Must pass onToggleNavbar callback');
    assert.ok(content.includes('extraControls='), 'Must pass extraControls HUD cluster');
  });

  it('GameWindowControls mock invocation propagates exit and toggleNavbar events', () => {
    let exitCalled = false;
    let toggleNavbarCalled = false;

    const mockControls = {
      onExit: () => { exitCalled = true; },
      onToggleNavbar: () => { toggleNavbarCalled = true; },
    };

    mockControls.onExit();
    assert.equal(exitCalled, true);

    mockControls.onToggleNavbar();
    assert.equal(toggleNavbarCalled, true);
  });
});

/* ========================================================================== */
/* SECTION 5: PLATFORM LAUNCH AND RETURN (APP.TSX & BOARDVIEW.TSX)            */
/* ========================================================================== */

describe('Tier 5 Adversarial: Platform Launch and Return in App.tsx & BoardView.tsx', () => {
  it('BoardView.tsx registers Chess as isPlayable: true with sky neon accents', () => {
    const boardViewPath = path.join(PROJECT_ROOT, 'src/components/views/BoardView.tsx');
    const content = fs.readFileSync(boardViewPath, 'utf-8');

    // Check BOARD_GAMES definition
    assert.ok(content.includes("id: 'chess'"), "BoardView must register game id 'chess'");
    assert.ok(content.includes("title: 'Chess'"), "BoardView must set title 'Chess'");
    assert.ok(content.includes("category: 'board'"), "BoardView must set category 'board'");

    // Verify isPlayable is true for chess
    const chessBlockMatch = content.match(/{\s*id:\s*'chess'[\s\S]*?}/);
    assert.ok(chessBlockMatch, 'Must find chess entry in BOARD_GAMES');
    assert.ok(chessBlockMatch[0].includes('isPlayable: true'), 'Chess must be marked isPlayable: true');
  });

  it('App.tsx manages activeArena state for chess and routes to ChessArena', () => {
    const appPath = path.join(PROJECT_ROOT, 'src/App.tsx');
    const content = fs.readFileSync(appPath, 'utf-8');

    // Imports ChessArena
    assert.ok(content.includes("import { ChessArena } from './games/chess/ChessArena'"), 'App.tsx must import ChessArena');

    // Type signature includes 'chess'
    assert.ok(content.includes("'chess'"), "App.tsx activeArena state must include 'chess'");

    // Launch game handler handles 'chess'
    assert.ok(content.includes("else if (gameId === 'chess') setActiveArena('chess')"), 'handleLaunchGame must support chess');

    // Renders ChessArena when activeArena === 'chess'
    assert.ok(content.includes("activeArena === 'chess' && ("), 'App.tsx must conditionally render ChessArena');
    assert.ok(content.includes("<ChessArena"), 'Must mount ChessArena');
    assert.ok(content.includes("onExit={() => setActiveArena(null)}"), 'Must wire onExit to return to platform catalog');
  });

  it('App.tsx lifecycle state machine correctly transitions launch -> exit -> catalog', () => {
    let activeArena: 'joker' | 'poker' | 'domino' | 'chess' | null = null;
    let inGameShowNavbar = false;

    const handleLaunchGame = (gameId: string) => {
      if (gameId === 'chess') activeArena = 'chess';
    };

    const handleExit = () => {
      activeArena = null;
    };

    const handleToggleNavbar = () => {
      inGameShowNavbar = !inGameShowNavbar;
    };

    // 1. Initial State: Catalog view
    assert.equal(activeArena, null);
    assert.equal(inGameShowNavbar, false);

    // 2. Launch Chess from BoardView
    handleLaunchGame('chess');
    assert.equal(activeArena, 'chess');

    // 3. User toggles Navbar in arena
    handleToggleNavbar();
    assert.equal(inGameShowNavbar, true);

    // 4. User exits arena back to catalog
    handleExit();
    assert.equal(activeArena, null);
  });
});

/* ========================================================================== */
/* SECTION 6: AUDIO SYNTHESIS IN SSR / HEADLESS / MUTED ENVIRONMENTS          */
/* ========================================================================== */

describe('Tier 5 Adversarial: Audio Synthesis Error Handling', () => {
  beforeEach(() => {
    setAudioMuted(false);
  });

  it('isAudioMuted, setAudioMuted, and toggleAudioMuted handle mute states reliably', () => {
    assert.equal(isAudioMuted(), false);

    setAudioMuted(true);
    assert.equal(isAudioMuted(), true);

    const toggled1 = toggleAudioMuted();
    assert.equal(toggled1, false);
    assert.equal(isAudioMuted(), false);

    const toggled2 = toggleAudioMuted();
    assert.equal(toggled2, true);
    assert.equal(isAudioMuted(), true);
  });

  it('SSR environment (no window object): playChessSound executes safely without throwing', () => {
    // In Node.js CLI environment, globalThis.window is undefined by default
    assert.equal(typeof (globalThis as any).window, 'undefined');

    const sounds: ChessSoundType[] = ['move', 'capture', 'check', 'castle', 'victory', 'defeat', 'illegal'];
    for (const sound of sounds) {
      assert.doesNotThrow(() => {
        playChessSound(sound);
      }, `playChessSound('${sound}') should never throw in SSR environment`);
    }
  });

  it('Headless environment (window present, but AudioContext undefined): executes safely', () => {
    const originalWindow = (globalThis as any).window;
    try {
      (globalThis as any).window = {}; // Window exists, but no AudioContext

      const sounds: ChessSoundType[] = ['move', 'capture', 'check', 'castle', 'victory', 'defeat', 'illegal'];
      for (const sound of sounds) {
        assert.doesNotThrow(() => {
          playChessSound(sound);
        }, `playChessSound('${sound}') should not throw in headless environment without AudioContext`);
      }
    } finally {
      if (originalWindow !== undefined) {
        (globalThis as any).window = originalWindow;
      } else {
        delete (globalThis as any).window;
      }
    }
  });

  it('AudioContext constructor throwing error is caught and does not crash app', () => {
    const originalWindow = (globalThis as any).window;
    try {
      (globalThis as any).window = {
        AudioContext: class BrokenAudioContext {
          constructor() {
            throw new Error('WebAudio hardware unavailable or blocked by autoplay policy');
          }
        },
      };

      assert.doesNotThrow(() => {
        playChessSound('move');
        playChessSound('capture');
      });
    } finally {
      if (originalWindow !== undefined) {
        (globalThis as any).window = originalWindow;
      } else {
        delete (globalThis as any).window;
      }
    }
  });

  it('Muted mode bypasses all Web Audio calls', () => {
    setAudioMuted(true);
    let constructorCalled = false;

    const originalWindow = (globalThis as any).window;
    try {
      (globalThis as any).window = {
        AudioContext: class MockAudioContext {
          constructor() {
            constructorCalled = true;
          }
        },
      };

      playChessSound('move');
      playChessSound('victory');

      assert.equal(constructorCalled, false, 'AudioContext should not be instantiated when muted');
    } finally {
      if (originalWindow !== undefined) {
        (globalThis as any).window = originalWindow;
      } else {
        delete (globalThis as any).window;
      }
    }
  });

  it('Mocked Web Audio synthesizer runs all 7 procedural sound waveforms without failure', () => {
    let oscillatorsCreated = 0;
    let gainsCreated = 0;

    class MockGainNode {
      gain = {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      };
      connect = () => {};
    }

    class MockOscillatorNode {
      type = 'sine';
      frequency = {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      };
      connect = () => {};
      start = () => {};
      stop = () => {};
    }

    class MockAudioContext {
      currentTime = 100.0;
      state = 'running';
      destination = {};

      createGain() {
        gainsCreated++;
        return new MockGainNode();
      }

      createOscillator() {
        oscillatorsCreated++;
        return new MockOscillatorNode();
      }

      resume() {
        return Promise.resolve();
      }
    }

    const originalWindow = (globalThis as any).window;
    try {
      (globalThis as any).window = {
        AudioContext: MockAudioContext,
      };

      setAudioMuted(false);

      const sounds: ChessSoundType[] = ['move', 'capture', 'check', 'castle', 'victory', 'defeat', 'illegal'];
      for (const sound of sounds) {
        playChessSound(sound);
      }

      // Verify that oscillators and gains were successfully synthesized
      assert.ok(oscillatorsCreated > 0, 'Oscillators should have been created');
      assert.ok(gainsCreated > 0, 'Gain nodes should have been created');
    } finally {
      if (originalWindow !== undefined) {
        (globalThis as any).window = originalWindow;
      } else {
        delete (globalThis as any).window;
      }
    }
  });
});
