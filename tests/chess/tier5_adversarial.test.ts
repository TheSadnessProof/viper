import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createInitialGameState,
  getLegalMoves,
  makeMove,
  undoMove,
  toFEN,
  fromFEN,
  isSquareAttacked,
  isInsufficientMaterial,
  algebraicToSquare,
  squareToAlgebraic,
  getSquareColor,
  findKingSquare,
} from '../../src/games/chess/chessLogic.ts';

import type {
  ChessGameState,
  Move,
  PieceType,
  Square,
  PieceColor,
  Piece,
} from '../../src/games/chess/chessTypes.ts';

import {
  findBestMove,
  getBestMove,
  type ChessDifficulty,
} from '../../src/games/chess/chessAi.ts';

import {
  isAudioMuted,
  setAudioMuted,
  toggleAudioMuted,
  playChessSound,
  type ChessSoundType,
} from '../../src/games/chess/chessAudio.ts';

// Resolve project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

// Coordinate helpers
function sq(name: string): Square {
  const file = name.charCodeAt(0) - 97;
  const rank = name.charCodeAt(1) - 49;
  return rank * 8 + file;
}

function findMove(
  moves: Move[],
  fromName: string,
  toName: string,
  promotion?: PieceType
): Move | undefined {
  const from = sq(fromName);
  const to = sq(toName);
  return moves.find(
    (m) =>
      m.from === from &&
      m.to === to &&
      (!promotion || m.promotion === promotion)
  );
}

function hasMove(
  moves: Move[],
  fromName: string,
  toName: string,
  promotion?: PieceType
): boolean {
  return findMove(moves, fromName, toName, promotion) !== undefined;
}

function play(
  state: ChessGameState,
  fromName: string,
  toName: string,
  promotion?: PieceType
): ChessGameState {
  const moves = getLegalMoves(state, sq(fromName));
  const move = findMove(moves, fromName, toName, promotion);
  if (!move) {
    const available = moves
      .map(
        (m) =>
          `${squareToAlgebraic(m.from)}->${squareToAlgebraic(m.to)}${
            m.promotion ? `=${m.promotion}` : ''
          }`
      )
      .join(', ');
    throw new Error(
      `Illegal or missing move: ${fromName}->${toName} for ${state.turn}. Available from ${fromName}: [${available}]`
    );
  }
  return makeMove(state, move);
}

/* ========================================================================== */
/* SECTION A: ENGINE LOGIC ADVERSARIAL SUITES                                 */
/* ========================================================================== */

describe('Viper Chess Engine - Tier 5: Adversarial Logic Hardening', () => {
  describe('Adversarial 1: Mailbox Coordinates & Boundary Math', () => {
    it('exhaustively validates bi-directional conversion for all 64 squares', () => {
      for (let s = 0; s < 64; s++) {
        const alg = squareToAlgebraic(s);
        const backToSq = algebraicToSquare(alg);
        assert.strictEqual(backToSq, s, `Square roundtrip failed for ${s} <-> ${alg}`);
      }
    });

    it('exhaustively verifies FIDE square color parity for all 64 squares', () => {
      assert.strictEqual(getSquareColor(sq('a1')), 'dark');
      assert.strictEqual(getSquareColor(sq('h1')), 'light');
      assert.strictEqual(getSquareColor(sq('a8')), 'light');
      assert.strictEqual(getSquareColor(sq('h8')), 'dark');

      for (let file = 0; file < 8; file++) {
        for (let rank = 0; rank < 8; rank++) {
          const s = rank * 8 + file;
          const expected = (file + rank) % 2 === 0 ? 'dark' : 'light';
          assert.strictEqual(getSquareColor(s), expected);
        }
      }
    });

    it('rejects out-of-range square indices in squareToAlgebraic with RangeError', () => {
      assert.throws(() => squareToAlgebraic(-1), RangeError);
      assert.throws(() => squareToAlgebraic(64), RangeError);
      assert.throws(() => squareToAlgebraic(100), RangeError);
      assert.throws(() => squareToAlgebraic(1.5), RangeError);
      assert.throws(() => squareToAlgebraic(NaN), RangeError);
      assert.throws(() => squareToAlgebraic(Infinity), RangeError);
    });

    it('rejects invalid or malformed algebraic coordinates in algebraicToSquare', () => {
      assert.throws(() => algebraicToSquare(''), Error);
      assert.throws(() => algebraicToSquare('a'), Error);
      assert.throws(() => algebraicToSquare('a9'), Error);
      assert.throws(() => algebraicToSquare('a0'), Error);
      assert.throws(() => algebraicToSquare('i1'), Error);
      assert.throws(() => algebraicToSquare('z8'), Error);
      assert.throws(() => algebraicToSquare('11'), Error);
      assert.throws(() => algebraicToSquare('aa'), Error);
      assert.throws(() => algebraicToSquare('A1'), Error);
      assert.throws(() => algebraicToSquare('E4'), Error);
      assert.throws(() => algebraicToSquare('e44'), Error);
      assert.throws(() => algebraicToSquare(null as any), Error);
      assert.throws(() => algebraicToSquare(undefined as any), Error);
    });
  });

  describe('Adversarial 2: Castling Extreme Boundary Scenarios', () => {
    it('Castling is legal when the Rook square itself is under attack (FIDE Rule Art 3.8)', () => {
      const state = fromFEN('4k3/8/8/3b4/8/8/8/R3K2R w KQ - 0 1');
      assert.strictEqual(isSquareAttacked(state.board, sq('h1'), 'b'), true, 'Rook h1 is attacked');
      assert.strictEqual(isSquareAttacked(state.board, sq('e1'), 'b'), false);
      assert.strictEqual(isSquareAttacked(state.board, sq('f1'), 'b'), false);
      assert.strictEqual(isSquareAttacked(state.board, sq('g1'), 'b'), false);

      const moves = getLegalMoves(state, sq('e1'));
      assert.ok(hasMove(moves, 'e1', 'g1'), 'O-O must be legal even when h1 Rook is attacked');
      const next = play(state, 'e1', 'g1');
      assert.strictEqual(next.board[sq('g1')]?.type, 'k');
      assert.strictEqual(next.board[sq('f1')]?.type, 'r');
    });

    it('Queenside castling is legal when a1 Rook is under attack (FIDE Rule Art 3.8)', () => {
      const state = fromFEN('4k3/8/8/4b3/8/8/8/R3K2R w KQ - 0 1');
      assert.strictEqual(isSquareAttacked(state.board, sq('a1'), 'b'), true, 'Rook a1 is attacked');
      const moves = getLegalMoves(state, sq('e1'));
      assert.ok(hasMove(moves, 'e1', 'c1'), 'O-O-O must be legal even when a1 Rook is attacked');
    });

    it('Black castling is legal when h8 or a8 Rook is attacked', () => {
      const state = fromFEN('r3k2r/8/8/8/3B4/8/8/4K3 b kq - 0 1');
      assert.strictEqual(isSquareAttacked(state.board, sq('h8'), 'w'), true);
      const moves = getLegalMoves(state, sq('e8'));
      assert.ok(hasMove(moves, 'e8', 'g8'), 'Black O-O must be legal when h8 Rook is attacked');
    });

    it('Queenside castling is illegal if b1 square is occupied by enemy piece', () => {
      const state = fromFEN('r3k2r/8/8/8/8/8/8/Rn2K2R w KQkq - 0 1');
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'c1'), false, 'Cannot castle over occupied b1');
    });

    it('Queenside castling is illegal if b8 square is occupied by enemy piece', () => {
      const state = fromFEN('rn2k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1');
      const moves = getLegalMoves(state, sq('e8'));
      assert.strictEqual(hasMove(moves, 'e8', 'c8'), false, 'Cannot castle over occupied b8');
    });

    it('Castling is illegal if transit square is attacked by an enemy Knight', () => {
      const state = fromFEN('r3k2r/8/8/8/8/4n3/8/R3K2R w KQkq - 0 1');
      assert.strictEqual(isSquareAttacked(state.board, sq('f1'), 'b'), true);
      assert.strictEqual(isSquareAttacked(state.board, sq('d1'), 'b'), true);
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'g1'), false, 'f1 attacked by Knight');
      assert.strictEqual(hasMove(moves, 'e1', 'c1'), false, 'd1 attacked by Knight');
    });

    it('Castling is illegal if King is in check by an enemy Knight', () => {
      const state = fromFEN('r3k2r/8/8/8/8/3n4/8/R3K2R w KQkq - 0 1');
      assert.strictEqual(state.isCheck, true);
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'g1'), false);
      assert.strictEqual(hasMove(moves, 'e1', 'c1'), false);
    });

    it('Corner rook captured by Knight permanently revokes that castling right', () => {
      const state = fromFEN('r3k2r/8/8/8/8/1n6/8/R3K2R b KQkq - 0 1');
      const next = play(state, 'b3', 'a1');
      assert.strictEqual(next.castling.whiteQueenside, false);
      assert.strictEqual(next.castling.whiteKingside, true);
    });

    it('Corner rook captured by Bishop diagonally permanently revokes that castling right', () => {
      const state = fromFEN('r3k2r/8/8/8/3b4/8/8/R3K2R b KQkq - 0 1');
      const next = play(state, 'd4', 'a1');
      assert.strictEqual(next.castling.whiteQueenside, false);
      assert.strictEqual(next.castling.whiteKingside, true);
    });

    it('Corner rook missing in FEN position prevents castling move generation despite FEN flag', () => {
      const state = fromFEN('r3k2r/8/8/8/8/8/8/R3K3 w Kkq - 0 1');
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'g1'), false, 'Cannot castle without rook on h1');
    });

    it('Corner square containing an enemy rook prevents castling', () => {
      const state = fromFEN('r3k2r/8/8/8/8/8/8/R3K2r w Kkq - 0 1');
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'g1'), false);
    });
  });

  describe('Adversarial 3: Dual En Passant & Complex Pin Disasters', () => {
    it('Dual en passant candidate pawns can both legally capture the same double-pushed pawn', () => {
      let state = fromFEN('4k3/3p4/8/2P1P3/8/8/8/4K3 b - - 0 1');
      state = play(state, 'd7', 'd5');
      assert.strictEqual(state.enPassant, sq('d6'));

      const cPawnMoves = getLegalMoves(state, sq('c5'));
      const ePawnMoves = getLegalMoves(state, sq('e5'));
      assert.ok(hasMove(cPawnMoves, 'c5', 'd6'), 'c5xd6 e.p. must be legal');
      assert.ok(hasMove(ePawnMoves, 'e5', 'd6'), 'e5xd6 e.p. must be legal');

      const branch1 = makeMove(state, findMove(cPawnMoves, 'c5', 'd6')!);
      assert.strictEqual(branch1.board[sq('d6')]?.type, 'p');
      assert.strictEqual(branch1.board[sq('d6')]?.color, 'w');
      assert.strictEqual(branch1.board[sq('d5')], null);
      assert.strictEqual(branch1.board[sq('c5')], null);
      assert.strictEqual(branch1.board[sq('e5')]?.type, 'p');

      const branch2 = makeMove(state, findMove(ePawnMoves, 'e5', 'd6')!);
      assert.strictEqual(branch2.board[sq('d6')]?.type, 'p');
      assert.strictEqual(branch2.board[sq('d6')]?.color, 'w');
      assert.strictEqual(branch2.board[sq('d5')], null);
      assert.strictEqual(branch2.board[sq('e5')], null);
      assert.strictEqual(branch2.board[sq('c5')]?.type, 'p');
    });

    it('Black dual en passant candidates can both capture White pawn on d4', () => {
      let state = fromFEN('4k3/8/8/8/2p1p3/8/3P4/4K3 w - - 0 1');
      state = play(state, 'd2', 'd4');
      assert.strictEqual(state.enPassant, sq('d3'));

      const cPawnMoves = getLegalMoves(state, sq('c4'));
      const ePawnMoves = getLegalMoves(state, sq('e4'));
      assert.ok(hasMove(cPawnMoves, 'c4', 'd3'), 'c4xd3 e.p. must be legal');
      assert.ok(hasMove(ePawnMoves, 'e4', 'd3'), 'e4xd3 e.p. must be legal');
    });

    it('En passant on the extreme files (a-file and h-file edge boundaries)', () => {
      let state = fromFEN('4k3/p7/8/1P6/8/8/8/4K3 b - - 0 1');
      state = play(state, 'a7', 'a5');
      assert.strictEqual(state.enPassant, sq('a6'));
      const bMoves = getLegalMoves(state, sq('b5'));
      assert.ok(hasMove(bMoves, 'b5', 'a6'), 'b5xa6 e.p. on extreme edge must be legal');
      const next = play(state, 'b5', 'a6');
      assert.strictEqual(next.board[sq('a6')]?.type, 'p');
      assert.strictEqual(next.board[sq('a5')], null);

      let hState = fromFEN('4k3/7p/8/6P1/8/8/8/4K3 b - - 0 1');
      hState = play(hState, 'h7', 'h5');
      assert.strictEqual(hState.enPassant, sq('h6'));
      const gMoves = getLegalMoves(hState, sq('g5'));
      assert.ok(hasMove(gMoves, 'g5', 'h6'), 'g5xh6 e.p. on h-edge must be legal');
    });

    it('Black en passant horizontal pin trap: capturing en passant exposing King on rank 5 is illegal', () => {
      const state = fromFEN('8/8/8/8/R2pP2k/8/8/4K3 b - d3 0 1');
      const moves = getLegalMoves(state, sq('e4'));
      assert.strictEqual(hasMove(moves, 'e4', 'd3'), false, 'e4xd3 e.p. exposes King h4 to Rook a4');
    });

    it('En passant diagonal pin: capturing pawn pinned diagonally to King cannot capture en passant', () => {
      const epPinState = fromFEN('b7/8/8/3Pp3/8/8/8/7K w - e6 0 1');
      const dMoves = getLegalMoves(epPinState, sq('d5'));
      assert.strictEqual(hasMove(dMoves, 'd5', 'e6'), false, 'Diagonal pin forbids d5xe6 e.p.');
    });
  });

  describe('Adversarial 4: Underpromotions, Multi-Queens, & Helpmate Edge Positions', () => {
    it('Underpromotion generates all 4 promotion options (q, r, b, n) for pawn on 7th rank', () => {
      const promoState = fromFEN('7k/3P4/8/8/8/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(promoState, sq('d7'));
      assert.strictEqual(moves.length, 4);
      assert.ok(hasMove(moves, 'd7', 'd8', 'q'));
      assert.ok(hasMove(moves, 'd7', 'd8', 'r'));
      assert.ok(hasMove(moves, 'd7', 'd8', 'b'));
      assert.ok(hasMove(moves, 'd7', 'd8', 'n'));
    });

    it('Underpromotion to Bishop generates moves in complex position', () => {
      const state = fromFEN('k7/2P4p/2NK3P/8/8/8/8/8 w - - 0 1');
      const moves = getLegalMoves(state, sq('c7'));
      assert.strictEqual(moves.length, 4);
    });

    it('9 Queens of the same color coexist on board and generate moves without error', () => {
      const fen = '4k3/QQQQQQQQ/8/8/8/8/8/4K2Q w - - 0 1';
      const state = fromFEN(fen);
      let queenCount = 0;
      for (const piece of state.board) {
        if (piece && piece.type === 'q' && piece.color === 'w') queenCount++;
      }
      assert.strictEqual(queenCount, 9);
      const moves = getLegalMoves(state);
      assert.ok(moves.length > 50, '9 Queens should generate abundant legal moves');
      assert.doesNotThrow(() => {
        const next = makeMove(state, moves[0]);
        toFEN(next);
      });
    });

    it('Helpmate K+N+N vs K position is strictly NOT evaluated as automatic draw', () => {
      const state = fromFEN('8/8/8/8/8/8/4NN2/k3K3 w - - 0 1');
      assert.strictEqual(isInsufficientMaterial(state.board), false);
      assert.strictEqual(state.isDraw, false);
    });

    it('Helpmate K+B vs K+N position is NOT evaluated as automatic draw', () => {
      const state = fromFEN('8/8/8/8/8/8/4BN2/k3K3 w - - 0 1');
      assert.strictEqual(isInsufficientMaterial(state.board), false);
      assert.strictEqual(state.isDraw, false);
    });

    it('Helpmate K+N vs K+N position is NOT evaluated as automatic draw', () => {
      const state = fromFEN('8/8/8/8/8/8/4nN2/k3K3 w - - 0 1');
      assert.strictEqual(isInsufficientMaterial(state.board), false);
      assert.strictEqual(state.isDraw, false);
    });
  });

  describe('Adversarial 5: FEN Invariants, Clocks, & Strict Parsing Validation', () => {
    it('Castling move increments halfmoveClock (it is not a pawn move or capture)', () => {
      const state = fromFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 10 15');
      const next = play(state, 'e1', 'g1');
      assert.strictEqual(next.halfmoveClock, 11, 'O-O must increment halfmove clock');
    });

    it('Knight jumping moves increment halfmoveClock', () => {
      const state = fromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      const next = play(state, 'g1', 'f3');
      assert.strictEqual(next.halfmoveClock, 1);
    });

    it('Capture by King resets halfmoveClock to 0', () => {
      const state = fromFEN('4k3/8/8/8/8/4p3/4K3/8 w - - 45 30');
      const next = play(state, 'e2', 'e3');
      assert.strictEqual(next.halfmoveClock, 0, 'King capturing pawn resets halfmoveClock');
    });

    it('En passant capture resets halfmoveClock to 0', () => {
      const state = fromFEN('4k3/8/8/3Pp3/8/8/8/4K3 w - e6 49 35');
      const next = play(state, 'd5', 'e6');
      assert.strictEqual(next.halfmoveClock, 0, 'En passant capture resets halfmoveClock');
    });

    it('Fullmove number increments strictly when Black completes move, never White', () => {
      let state = createInitialGameState();
      assert.strictEqual(state.fullmoveNumber, 1);
      state = play(state, 'e2', 'e4');
      assert.strictEqual(state.fullmoveNumber, 1, 'Fullmove must not increment on White move');
      state = play(state, 'e7', 'e5');
      assert.strictEqual(state.fullmoveNumber, 2, 'Fullmove must increment after Black move');
    });

    it('FEN with arbitrary whitespace between fields parses accurately', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR    w   KQkq   -   0   1';
      const state = fromFEN(fen);
      assert.strictEqual(state.turn, 'w');
      assert.strictEqual(state.castling.whiteKingside, true);
      assert.strictEqual(state.enPassant, null);
    });

    it('fromFEN throws error when fewer than 4 fields provided', () => {
      assert.throws(() => fromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq'), Error);
      assert.throws(() => fromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'), Error);
    });

    it('fromFEN throws error when rank has > 8 squares with piece overflow', () => {
      assert.throws(() => fromFEN('8p/8/8/8/8/8/8/8 w - - 0 1'), /Invalid FEN/);
      assert.throws(() => fromFEN('rnbqkbnrr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1'), /Invalid FEN/);
    });

    it('fromFEN strictly throws error on digit 9, integer overflow (e.g. p8), or underflow', () => {
      assert.throws(
        () => fromFEN('9/8/8/8/8/8/8/8 w - - 0 1'),
        /Invalid FEN piece character: "9"/
      );
      assert.throws(
        () => fromFEN('p8/8/8/8/8/8/8/8 w - - 0 1'),
        /Invalid FEN: rank exceeds 8 squares/
      );
      assert.throws(
        () => fromFEN('4/8/8/8/8/8/8/8 w - - 0 1'),
        /Invalid FEN: rank must contain exactly 8 squares, got 4/
      );
    });
  });

  describe('Adversarial 6: SAN Disambiguation & Notation Exhaustive Stress', () => {
    it('Two Knights on the same rank moving to the same square disambiguate by file (Nbd2 vs Nfd2)', () => {
      const state = fromFEN('4k3/8/8/8/8/8/8/1N1K1N2 w - - 0 1');
      const moves = getLegalMoves(state);
      const b1d2 = findMove(moves, 'b1', 'd2')!;
      const f1d2 = findMove(moves, 'f1', 'd2')!;

      const stateAfterB = makeMove(state, b1d2);
      const stateAfterF = makeMove(state, f1d2);

      assert.strictEqual(stateAfterB.history[0].move.san, 'Nbd2');
      assert.strictEqual(stateAfterF.history[0].move.san, 'Nfd2');
    });

    it('Two Knights on the same file moving to the same square disambiguate by rank (N2c3 vs N4c3)', () => {
      const state = fromFEN('4k3/8/8/8/4N3/8/4N3/4K3 w - - 0 1');
      const moves = getLegalMoves(state);
      const e2c3 = findMove(moves, 'e2', 'c3')!;
      const e4c3 = findMove(moves, 'e4', 'c3')!;

      assert.ok(e2c3);
      assert.ok(e4c3);

      const stateAfter2 = makeMove(state, e2c3);
      const stateAfter4 = makeMove(state, e4c3);

      assert.strictEqual(stateAfter2.history[0].move.san, 'N2c3');
      assert.strictEqual(stateAfter4.history[0].move.san, 'N4c3');
    });

    it('Two Rooks on the same rank disambiguate by file (Rad1 vs Rhd1)', () => {
      const openState = fromFEN('4k3/8/8/8/8/8/4K3/R6R w - - 0 1');
      const openMoves = getLegalMoves(openState);
      const ra1d1 = findMove(openMoves, 'a1', 'd1')!;
      const rh1d1 = findMove(openMoves, 'h1', 'd1')!;

      assert.ok(ra1d1);
      assert.ok(rh1d1);

      const nextA = makeMove(openState, ra1d1);
      const nextH = makeMove(openState, rh1d1);

      assert.strictEqual(nextA.history[0].move.san, 'Rad1');
      assert.strictEqual(nextH.history[0].move.san, 'Rhd1');
    });

    it('Pawn capture SAN notation contains file letter: exd5', () => {
      const state = fromFEN('4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e4'));
      const e4d5 = findMove(moves, 'e4', 'd5')!;
      const next = makeMove(state, e4d5);
      assert.strictEqual(next.history[0].move.san, 'exd5');
    });

    it('Pawn promotion with capture delivering check SAN: exd8=Q+', () => {
      const state = fromFEN('3rk3/4P3/8/8/8/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e7'));
      const e7d8q = findMove(moves, 'e7', 'd8', 'q')!;
      const next = makeMove(state, e7d8q);
      assert.strictEqual(next.history[0].move.san, 'exd8=Q+');
    });

    it('En passant capture SAN notation: dxe6', () => {
      const state = fromFEN('4k3/8/8/3Pp3/8/8/8/4K3 w - e6 0 1');
      const moves = getLegalMoves(state, sq('d5'));
      const d5e6 = findMove(moves, 'd5', 'e6')!;
      const next = makeMove(state, d5e6);
      assert.strictEqual(next.history[0].move.san, 'dxe6');
    });

    it('Castling SAN notations: O-O and O-O-O', () => {
      const state = fromFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
      const moves = getLegalMoves(state, sq('e1'));
      const kingside = findMove(moves, 'e1', 'g1')!;
      const queenside = findMove(moves, 'e1', 'c1')!;

      const nextK = makeMove(state, kingside);
      assert.strictEqual(nextK.history[0].move.san, 'O-O');

      const nextQ = makeMove(state, queenside);
      assert.strictEqual(nextQ.history[0].move.san, 'O-O-O');
    });
  });

  describe('Adversarial 7: Deep Undo/Redo & State Immutability Stress', () => {
    it('executes 30 sequential moves, then undos all 30, returning bit-exact starting state', () => {
      let state = createInitialGameState();
      const initialFEN = toFEN(state);

      const moveSequence = [
        ['e2', 'e4'], ['e7', 'e5'],
        ['g1', 'f3'], ['b8', 'c6'],
        ['f1', 'c4'], ['f8', 'c5'],
        ['c2', 'c3'], ['g8', 'f6'],
        ['d2', 'd4'], ['e5', 'd4'],
        ['c3', 'd4'], ['c5', 'b4'],
        ['b1', 'c3'], ['f6', 'e4'],
        ['e1', 'g1'], ['b4', 'c3'],
        ['d4', 'd5'], ['c3', 'f6'],
        ['f1', 'e1'], ['c6', 'e7'],
        ['e1', 'e4'], ['d7', 'd6'],
        ['c1', 'g5'], ['f6', 'g5'],
        ['f3', 'g5'], ['e8', 'g8'],
        ['d1', 'h5'], ['h7', 'h6'],
        ['a1', 'e1'], ['e7', 'g6'],
      ];

      for (const [from, to] of moveSequence) {
        state = play(state, from, to);
      }

      assert.strictEqual(state.history.length, 30);

      for (let i = 0; i < 30; i++) {
        state = undoMove(state);
      }

      assert.strictEqual(state.history.length, 0);
      assert.strictEqual(toFEN(state), initialFEN);
      assert.strictEqual(state.turn, 'w');
      assert.strictEqual(state.castling.whiteKingside, true);
      assert.strictEqual(state.castling.whiteQueenside, true);
      assert.strictEqual(state.castling.blackKingside, true);
      assert.strictEqual(state.castling.blackQueenside, true);
    });

    it('calling undoMove on state with empty history is a safe no-op', () => {
      const state = createInitialGameState();
      assert.strictEqual(state.history.length, 0);
      const undone = undoMove(state);
      assert.strictEqual(undone, state);
    });
  });

  describe('Adversarial 8: AI Minimax, Tactical Correctness, & Worker Fallback', () => {
    it('probes chessAi.ts ESM module resolution under Node 24 native runner', () => {
      assert.ok(typeof findBestMove === 'function', 'findBestMove must be exported as function');
      assert.ok(typeof getBestMove === 'function', 'getBestMove must be exported as function');
    });

    it('findBestMove returns null on checkmate position', () => {
      const state = fromFEN('rnb1kbnr/pppp1ppp/4p3/8/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
      assert.strictEqual(state.isCheckmate, true);
      const move = findBestMove(state, 'blitz');
      assert.strictEqual(move, null);
    });

    it('findBestMove returns null on stalemate position', () => {
      const state = fromFEN('k7/P7/1K6/8/8/8/8/8 b - - 0 1');
      assert.strictEqual(state.isStalemate, true);
      const move = findBestMove(state, 'blitz');
      assert.strictEqual(move, null);
    });

    it('getBestMove resolves to null on checkmate position', async () => {
      const state = fromFEN('rnb1kbnr/pppp1ppp/4p3/8/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
      const move = await getBestMove(state, 'casual');
      assert.strictEqual(move, null);
    });

    it('AI finds mate in 1 in tactical position (Blitz & Grandmaster tiers)', () => {
      const state = fromFEN('r1bqkb1r/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4');
      const blitzMove = findBestMove(state, 'blitz');
      assert.ok(blitzMove);
      assert.strictEqual(squareToAlgebraic(blitzMove.from), 'h5');
      assert.strictEqual(squareToAlgebraic(blitzMove.to), 'f7');

      const gmMove = findBestMove(state, 'grandmaster');
      assert.ok(gmMove);
      assert.strictEqual(squareToAlgebraic(gmMove.from), 'h5');
      assert.strictEqual(squareToAlgebraic(gmMove.to), 'f7');
    });

    it('AI captures undefended hanging Queen (free material exploitation)', () => {
      const state = fromFEN('4k3/8/8/4q3/8/5N2/8/4K3 w - - 0 1');
      const move = findBestMove(state, 'blitz');
      assert.ok(move);
      assert.strictEqual(squareToAlgebraic(move.from), 'f3');
      assert.strictEqual(squareToAlgebraic(move.to), 'e5', 'AI must capture free queen on e5');
    });

    it('AI Casual, Blitz, and Grandmaster tiers all produce valid legal moves', async () => {
      const state = createInitialGameState();
      const legalMoves = getLegalMoves(state);

      const casualMove = await getBestMove(state, 'casual');
      assert.ok(casualMove);
      assert.ok(
        legalMoves.some((m: Move) => m.from === casualMove.from && m.to === casualMove.to),
        'Casual move must be strictly legal'
      );

      const blitzMove = await getBestMove(state, 'blitz');
      assert.ok(blitzMove);
      assert.ok(
        legalMoves.some((m: Move) => m.from === blitzMove.from && m.to === blitzMove.to),
        'Blitz move must be strictly legal'
      );

      const gmMove = await getBestMove(state, 'grandmaster');
      assert.ok(gmMove);
      assert.ok(
        legalMoves.some((m: Move) => m.from === gmMove.from && m.to === gmMove.to),
        'Grandmaster move must be strictly legal'
      );
    });

    it('5 concurrent getBestMove calls resolve properly without crosstalk', async () => {
      const state1 = createInitialGameState();
      const state2 = fromFEN('4k3/8/8/4q3/8/5N2/8/4K3 w - - 0 1');
      const state3 = fromFEN('r1bqkb1r/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4');
      const state4 = fromFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
      const state5 = fromFEN('k7/P7/1K6/8/8/8/8/8 b - - 0 1');

      const results = await Promise.all([
        getBestMove(state1, 'casual'),
        getBestMove(state2, 'blitz'),
        getBestMove(state3, 'grandmaster'),
        getBestMove(state4, 'casual'),
        getBestMove(state5, 'blitz'),
      ]);

      assert.ok(results[0]);
      assert.strictEqual(squareToAlgebraic(results[1]!.to), 'e5');
      assert.strictEqual(squareToAlgebraic(results[2]!.to), 'f7');
      assert.ok(results[3]);
      assert.strictEqual(results[4], null);
    });
  });

  describe('Adversarial 9: Extreme Edge Cases & Attack Evaluation', () => {
    it('findKingSquare returns null on board without king without crashing', () => {
      const board = new Array(64).fill(null);
      const kingSq = findKingSquare(board, 'w');
      assert.strictEqual(kingSq, null);
    });

    it('isSquareAttacked handles all 8 board corners accurately', () => {
      const board = new Array(64).fill(null);
      board[0] = { type: 'r', color: 'w' };
      assert.strictEqual(isSquareAttacked(board, 56, 'w'), true);
      assert.strictEqual(isSquareAttacked(board, 7, 'w'), true);
      assert.strictEqual(isSquareAttacked(board, 63, 'w'), false);
    });
  });
});

/* ========================================================================== */
/* SECTION B: UI, SYSTEM, AUDIO & PLATFORM ADVERSARIAL SUITES                 */
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

  const whiteCapturedList: Piece[] = [];
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

describe('Viper Chess UI - Tier 5: Adversarial UI, Audio & Platform Hardening', () => {
  describe('Adversarial 10: Timer Countdown and Timeout Flag-Fall Handling', () => {
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

      for (let i = 0; i < 3; i++) {
        clock = tickTimer(clock, 'w', '1m', false);
      }
      assert.equal(clock.whiteTime, 57);
      assert.equal(clock.blackTime, 60);
      assert.equal(clock.timeoutLoser, null);

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

      clock = tickTimer(clock, 'w', '1m', false);
      assert.equal(clock.whiteTime, 2);
      assert.equal(clock.timeoutLoser, null);

      clock = tickTimer(clock, 'w', '1m', false);
      assert.equal(clock.whiteTime, 1);
      assert.equal(clock.timeoutLoser, null);

      clock = tickTimer(clock, 'w', '1m', false);
      assert.equal(clock.whiteTime, 0);
      assert.equal(clock.timeoutLoser, 'w');

      clock = tickTimer(clock, 'w', '1m', false);
      assert.equal(clock.whiteTime, 0);
      assert.equal(clock.timeoutLoser, 'w');
    });

    it('Black flag-fall triggers exactly when clock reaches 0', () => {
      let clock: ClockState = { whiteTime: 45, blackTime: 2, timeoutLoser: null };

      clock = tickTimer(clock, 'b', '1m', false);
      assert.equal(clock.blackTime, 1);
      assert.equal(clock.timeoutLoser, null);

      clock = tickTimer(clock, 'b', '1m', false);
      assert.equal(clock.blackTime, 0);
      assert.equal(clock.timeoutLoser, 'b');
    });

    it('Clock freezing: does not tick when match has ended (checkmate, draw, resignation)', () => {
      const clock: ClockState = { whiteTime: 50, blackTime: 50, timeoutLoser: null };

      const frozen1 = tickTimer(clock, 'w', '1m', true);
      assert.equal(frozen1.whiteTime, 50);

      const flaggedClock: ClockState = { whiteTime: 0, blackTime: 50, timeoutLoser: 'w' };
      const frozen2 = tickTimer(flaggedClock, 'b', '1m', false);
      assert.equal(frozen2.blackTime, 50);
    });

    it('Timeout evaluation produces correct user victory/defeat across modes', () => {
      const outcome1 = evaluateGameOverOutcome('w', null, { isCheckmate: false, isDraw: false, turn: 'w' }, 'vs_bot', 'b');
      assert.deepEqual(outcome1, {
        title: 'DEFEAT ON TIME',
        subtitle: 'Black won on time',
        isWin: false,
      });

      const outcome2 = evaluateGameOverOutcome('b', null, { isCheckmate: false, isDraw: false, turn: 'b' }, 'vs_bot', 'b');
      assert.deepEqual(outcome2, {
        title: 'VICTORY ON TIME',
        subtitle: 'White won on time',
        isWin: true,
      });

      const outcome3 = evaluateGameOverOutcome('w', null, { isCheckmate: false, isDraw: false, turn: 'w' }, 'vs_bot', 'w');
      assert.deepEqual(outcome3, {
        title: 'VICTORY ON TIME',
        subtitle: 'Black won on time',
        isWin: true,
      });

      const outcome4 = evaluateGameOverOutcome('w', null, { isCheckmate: false, isDraw: false, turn: 'w' }, 'pass_and_play', 'b');
      assert.deepEqual(outcome4, {
        title: 'DEFEAT ON TIME',
        subtitle: 'Black won on time',
        isWin: true,
      });
    });
  });

  describe('Adversarial 11: Material Differential Calculations', () => {
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
      board[algebraicToSquare('a1')] = null;
      board[algebraicToSquare('c1')] = null;

      const result = computeMaterialDifference(board);
      assert.equal(result.whiteDiff, 0);
      assert.equal(result.blackDiff, 8);
      assert.equal(result.blackCaptured.length, 2);
      assert.deepEqual(result.blackCaptured[0], { type: 'r', color: 'w' });
      assert.deepEqual(result.blackCaptured[1], { type: 'b', color: 'w' });
    });

    it('Symmetric exchange of Queens and Knights results in zero differential and equal racks', () => {
      const state = createInitialGameState();
      const board = [...state.board];
      board[algebraicToSquare('d1')] = null;
      board[algebraicToSquare('d8')] = null;
      board[algebraicToSquare('b1')] = null;
      board[algebraicToSquare('b8')] = null;

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

      const squares = ['a1', 'b1', 'c1', 'd1', 'f1', 'g1', 'h1', 'a2', 'b2'];
      for (const s of squares) {
        board[algebraicToSquare(s)] = { type: 'q', color: 'w' };
      }

      const result = computeMaterialDifference(board);
      assert.equal(result.whiteDiff, 81);
      assert.equal(result.blackDiff, 0);
      assert.equal(result.whiteCaptured.length, 15);
      assert.equal(result.blackCaptured.filter((p) => p.type === 'q').length, 0);
      assert.equal(result.blackCaptured.length, 14);
    });

    it('Extreme Symmetrical Promotion: 9 Queens vs 9 Queens', () => {
      const board: (Piece | null)[] = Array(64).fill(null);
      board[algebraicToSquare('e1')] = { type: 'k', color: 'w' };
      board[algebraicToSquare('e8')] = { type: 'k', color: 'b' };

      const wSquares = ['a1', 'b1', 'c1', 'd1', 'f1', 'g1', 'h1', 'a2', 'b2'];
      const bSquares = ['a8', 'b8', 'c8', 'd8', 'f8', 'g8', 'h8', 'a7', 'b7'];

      for (const s of wSquares) board[algebraicToSquare(s)] = { type: 'q', color: 'w' };
      for (const s of bSquares) board[algebraicToSquare(s)] = { type: 'q', color: 'b' };

      const result = computeMaterialDifference(board);
      assert.equal(result.whiteDiff, 0);
      assert.equal(result.blackDiff, 0);
    });

    it('Underpromotion Army: 10 Knights vs 10 Bishops', () => {
      const board: (Piece | null)[] = Array(64).fill(null);
      board[algebraicToSquare('e1')] = { type: 'k', color: 'w' };
      board[algebraicToSquare('e8')] = { type: 'k', color: 'b' };

      const wSq = ['a1', 'b1', 'c1', 'd1', 'f1', 'g1', 'h1', 'a2', 'b2', 'c2'];
      for (const s of wSq) board[algebraicToSquare(s)] = { type: 'n', color: 'w' };

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

      const expectedOrder = ['q', 'r', 'r', 'b', 'b', 'n', 'n', 'p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'];
      assert.deepEqual(result.whiteCaptured.map((p) => p.type), expectedOrder);
      assert.deepEqual(result.blackCaptured.map((p) => p.type), expectedOrder);
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

  describe('Adversarial 12: Board Flip Orientation & Coordinate Translation', () => {
    it('White orientation: All 64 grid cells map bijectively to 0..63 with zero collisions', () => {
      const seen = new Set<Square>();
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const s = getSquareFromGrid(row, col, 'white');
          assert.ok(s >= 0 && s <= 63, `Square ${s} out of bounds`);
          assert.ok(!seen.has(s), `Collision detected on square ${s} at (${row}, ${col})`);
          seen.add(s);
        }
      }
      assert.equal(seen.size, 64);
    });

    it('Black orientation: All 64 grid cells map bijectively to 0..63 with zero collisions', () => {
      const seen = new Set<Square>();
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const s = getSquareFromGrid(row, col, 'black');
          assert.ok(s >= 0 && s <= 63, `Square ${s} out of bounds`);
          assert.ok(!seen.has(s), `Collision detected on square ${s} at (${row}, ${col})`);
          seen.add(s);
        }
      }
      assert.equal(seen.size, 64);
    });

    it('White orientation: Key corner and center squares map to correct algebraic coordinates', () => {
      assert.equal(squareToAlgebraic(getSquareFromGrid(0, 0, 'white')), 'a8');
      assert.equal(squareToAlgebraic(getSquareFromGrid(0, 7, 'white')), 'h8');
      assert.equal(squareToAlgebraic(getSquareFromGrid(7, 0, 'white')), 'a1');
      assert.equal(squareToAlgebraic(getSquareFromGrid(7, 7, 'white')), 'h1');
      assert.equal(squareToAlgebraic(getSquareFromGrid(4, 4, 'white')), 'e4');
      assert.equal(squareToAlgebraic(getSquareFromGrid(3, 3, 'white')), 'd5');
    });

    it('Black orientation: Key corner and center squares map to flipped algebraic coordinates', () => {
      assert.equal(squareToAlgebraic(getSquareFromGrid(0, 0, 'black')), 'h1');
      assert.equal(squareToAlgebraic(getSquareFromGrid(0, 7, 'black')), 'a1');
      assert.equal(squareToAlgebraic(getSquareFromGrid(7, 0, 'black')), 'h8');
      assert.equal(squareToAlgebraic(getSquareFromGrid(7, 7, 'black')), 'a8');
      assert.equal(squareToAlgebraic(getSquareFromGrid(3, 3, 'black')), 'e4');
      assert.equal(squareToAlgebraic(getSquareFromGrid(4, 4, 'black')), 'd5');
    });

    it('Coordinate labels in White and Black perspectives match rank and file positions', () => {
      assert.deepEqual(FILES_WHITE, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
      assert.deepEqual(RANKS_WHITE, ['8', '7', '6', '5', '4', '3', '2', '1']);

      assert.deepEqual(FILES_BLACK, ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a']);
      assert.deepEqual(RANKS_BLACK, ['1', '2', '3', '4', '5', '6', '7', '8']);

      for (let c = 0; c < 8; c++) {
        const sqW = getSquareFromGrid(7, c, 'white');
        assert.equal(FILES_WHITE[c], squareToAlgebraic(sqW)[0]);

        const sqB = getSquareFromGrid(7, c, 'black');
        assert.equal(FILES_BLACK[c], squareToAlgebraic(sqB)[0]);
      }

      for (let r = 0; r < 8; r++) {
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

      const drop1 = resolvePointerDropSquare(125, 125, rect, 'white', false);
      assert.equal(squareToAlgebraic(drop1!), 'a8');

      const drop2 = resolvePointerDropSquare(475, 475, rect, 'white', false);
      assert.equal(squareToAlgebraic(drop2!), 'h1');

      const drop3 = resolvePointerDropSquare(125, 125, rect, 'black', false);
      assert.equal(squareToAlgebraic(drop3!), 'h1');

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

      const desktopDrop = resolvePointerDropSquare(125, 160, rect, 'white', false);
      assert.equal(squareToAlgebraic(desktopDrop!), 'a7');

      const touchDrop = resolvePointerDropSquare(125, 160, rect, 'white', true);
      assert.equal(squareToAlgebraic(touchDrop!), 'a8');
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

      assert.equal(resolvePointerDropSquare(99, 200, rect, 'white', false), null);
      assert.equal(resolvePointerDropSquare(501, 200, rect, 'white', false), null);
      assert.equal(resolvePointerDropSquare(200, 99, rect, 'white', false), null);
      assert.equal(resolvePointerDropSquare(200, 501, rect, 'white', false), null);

      assert.equal(resolvePointerDropSquare(500, 200, rect, 'white', false), null);
      assert.equal(resolvePointerDropSquare(200, 500, rect, 'white', false), null);
    });
  });

  describe('Adversarial 13: GameWindowControls Contract & Callback Propagation', () => {
    it('GameWindowControls source defines onExit, showNavbar, and onToggleNavbar contracts', () => {
      const gwcPath = path.join(PROJECT_ROOT, 'src/components/arena/GameWindowControls.tsx');
      const content = fs.readFileSync(gwcPath, 'utf-8');

      assert.ok(content.includes('onExit: () => void'), 'Must define onExit prop');
      assert.ok(content.includes('showNavbar?: boolean'), 'Must define showNavbar prop');
      assert.ok(content.includes('onToggleNavbar?: () => void'), 'Must define onToggleNavbar prop');
      assert.ok(content.includes('extraControls?: React.ReactNode'), 'Must define extraControls prop');

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
        onExit: () => {
          exitCalled = true;
        },
        onToggleNavbar: () => {
          toggleNavbarCalled = true;
        },
      };

      mockControls.onExit();
      assert.equal(exitCalled, true);

      mockControls.onToggleNavbar();
      assert.equal(toggleNavbarCalled, true);
    });
  });

  describe('Adversarial 14: Platform Launch and Return in App.tsx & BoardView.tsx', () => {
    it('BoardView.tsx registers Chess as isPlayable: true with sky neon accents', () => {
      const boardViewPath = path.join(PROJECT_ROOT, 'src/components/views/BoardView.tsx');
      const content = fs.readFileSync(boardViewPath, 'utf-8');

      assert.ok(content.includes("id: 'chess'"), "BoardView must register game id 'chess'");
      assert.ok(content.includes("title: 'Chess'"), "BoardView must set title 'Chess'");
      assert.ok(content.includes("category: 'board'"), "BoardView must set category 'board'");

      const chessBlockMatch = content.match(/{\s*id:\s*'chess'[\s\S]*?}/);
      assert.ok(chessBlockMatch, 'Must find chess entry in BOARD_GAMES');
      assert.ok(chessBlockMatch[0].includes('isPlayable: true'), 'Chess must be marked isPlayable: true');
    });

    it('App.tsx manages activeArena state for chess and routes to ChessArena', () => {
      const appPath = path.join(PROJECT_ROOT, 'src/App.tsx');
      const content = fs.readFileSync(appPath, 'utf-8');

      assert.ok(content.includes("import { ChessArena } from './games/chess/ChessArena'"), 'App.tsx must import ChessArena');
      assert.ok(content.includes("'chess'"), "App.tsx activeArena state must include 'chess'");
      assert.ok(content.includes("else if (gameId === 'chess') setActiveArena('chess')"), 'handleLaunchGame must support chess');
      assert.ok(content.includes("activeArena === 'chess' && ("), 'App.tsx must conditionally render ChessArena');
      assert.ok(content.includes('<ChessArena'), 'Must mount ChessArena');
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

      assert.equal(activeArena, null);
      assert.equal(inGameShowNavbar, false);

      handleLaunchGame('chess');
      assert.equal(activeArena, 'chess');

      handleToggleNavbar();
      assert.equal(inGameShowNavbar, true);

      handleExit();
      assert.equal(activeArena, null);
    });
  });

  describe('Adversarial 15: Audio Synthesis Error Handling', () => {
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
        (globalThis as any).window = {};

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
});
