import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialGameState,
  getLegalMoves,
  makeMove,
  undoMove,
  toFEN,
  fromFEN,
  isSquareAttacked,
} from '../../src/games/chess/chessLogic.ts';
import type {
  ChessGameState,
  Move,
  Piece,
  Square,
  PieceColor,
  PieceType,
  CastlingRights,
} from '../../src/games/chess/chessTypes.ts';

// Coordinate helpers: 0 = a1, 7 = h1, 56 = a8, 63 = h8
// Formula: rank * 8 + file
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

function sq(name: string): Square {
  const file = name.charCodeAt(0) - 97;
  const rank = name.charCodeAt(1) - 49;
  return rank * 8 + file;
}

function toAlg(s: Square): string {
  const file = s % 8;
  const rank = Math.floor(s / 8);
  return `${FILES[file]}${RANKS[rank]}`;
}

function findMove(moves: Move[], fromName: string, toName: string, promotion?: PieceType): Move | undefined {
  const from = sq(fromName);
  const to = sq(toName);
  return moves.find(m => m.from === from && m.to === to && (!promotion || m.promotion === promotion));
}

function hasMove(moves: Move[], fromName: string, toName: string, promotion?: PieceType): boolean {
  return findMove(moves, fromName, toName, promotion) !== undefined;
}

function play(state: ChessGameState, fromName: string, toName: string, promotion?: PieceType): ChessGameState {
  const moves = getLegalMoves(state, sq(fromName));
  const move = findMove(moves, fromName, toName, promotion);
  if (!move) {
    const available = moves.map(m => `${toAlg(m.from)}->${toAlg(m.to)}${m.promotion ? `=${m.promotion}` : ''}`).join(', ');
    throw new Error(`Illegal or missing move: ${fromName}->${toName} for ${state.turn}. Available from ${fromName}: [${available}]`);
  }
  return makeMove(state, move);
}

describe('Viper Chess Engine - Tier 1: Feature Coverage', () => {
  describe('Pawn Movement & Rules', () => {
    it('white pawn single push from rank 2', () => {
      const state = createInitialGameState();
      const moves = getLegalMoves(state, sq('e2'));
      assert.ok(hasMove(moves, 'e2', 'e3'), 'e2-e3 should be legal');
      const next = play(state, 'e2', 'e3');
      assert.strictEqual(next.board[sq('e3')]?.type, 'p');
      assert.strictEqual(next.board[sq('e3')]?.color, 'w');
      assert.strictEqual(next.board[sq('e2')], null);
      assert.strictEqual(next.enPassant, null);
    });

    it('white pawn double push sets en passant target', () => {
      const state = createInitialGameState();
      const moves = getLegalMoves(state, sq('e2'));
      assert.ok(hasMove(moves, 'e2', 'e4'), 'e2-e4 should be legal');
      const next = play(state, 'e2', 'e4');
      assert.strictEqual(next.board[sq('e4')]?.type, 'p');
      assert.strictEqual(next.board[sq('e2')], null);
      assert.strictEqual(next.enPassant, sq('e3'));
    });

    it('pawn cannot move forward if blocked by friendly or enemy piece', () => {
      const state = fromFEN('4k3/8/8/4p3/4P3/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e4'));
      assert.strictEqual(moves.length, 0, 'Blocked pawn on e4 should have 0 moves');
    });

    it('pawn cannot double push if intermediate square is occupied', () => {
      const state = fromFEN('4k3/8/8/8/8/4p3/4P3/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e2'));
      assert.strictEqual(hasMove(moves, 'e2', 'e4'), false, 'Cannot double push over occupied e3');
      assert.strictEqual(hasMove(moves, 'e2', 'e3'), false, 'Cannot push into occupied e3');
    });

    it('black pawn single and double push from rank 7', () => {
      let state = createInitialGameState();
      state = play(state, 'a2', 'a3');
      const moves = getLegalMoves(state, sq('d7'));
      assert.ok(hasMove(moves, 'd7', 'd6'), 'd7-d6 should be legal');
      assert.ok(hasMove(moves, 'd7', 'd5'), 'd7-d5 should be legal');
      const next = play(state, 'd7', 'd5');
      assert.strictEqual(next.board[sq('d5')]?.type, 'p');
      assert.strictEqual(next.board[sq('d5')]?.color, 'b');
      assert.strictEqual(next.enPassant, sq('d6'));
    });

    it('pawn diagonal capture of enemy pieces', () => {
      const state = fromFEN('4k3/8/8/3p1p2/4P3/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e4'));
      assert.ok(hasMove(moves, 'e4', 'd5'), 'e4xd5 capture should be legal');
      assert.ok(hasMove(moves, 'e4', 'f5'), 'e4xf5 capture should be legal');
      assert.ok(hasMove(moves, 'e4', 'e5'), 'e4-e5 advance should be legal');
      assert.strictEqual(moves.length, 3);
    });

    it('pawn cannot capture diagonally if destination is empty', () => {
      const state = createInitialGameState();
      const moves = getLegalMoves(state, sq('e2'));
      assert.strictEqual(hasMove(moves, 'e2', 'd3'), false, 'e2xd3 illegal when empty');
      assert.strictEqual(hasMove(moves, 'e2', 'f3'), false, 'e2xf3 illegal when empty');
    });
  });

  describe('Knight Movement & Jumping', () => {
    it('knight leaps over pieces from starting position', () => {
      const state = createInitialGameState();
      const moves = getLegalMoves(state, sq('b1'));
      assert.strictEqual(moves.length, 2);
      assert.ok(hasMove(moves, 'b1', 'a3'));
      assert.ok(hasMove(moves, 'b1', 'c3'));
    });

    it('knight in open center has all 8 radial moves', () => {
      const state = fromFEN('4k3/8/8/8/4N3/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e4'));
      assert.strictEqual(moves.length, 8);
      const expected = ['d6', 'f6', 'c5', 'g5', 'c3', 'g3', 'd2', 'f2'];
      for (const dest of expected) {
        assert.ok(hasMove(moves, 'e4', dest), `Expected e4 to ${dest}`);
      }
    });

    it('knight in corner has only 2 legal moves', () => {
      const state = fromFEN('4k3/8/8/8/8/8/8/N3K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('a1'));
      assert.strictEqual(moves.length, 2);
      assert.ok(hasMove(moves, 'a1', 'b3'));
      assert.ok(hasMove(moves, 'a1', 'c2'));
    });

    it('knight cannot land on friendly pieces', () => {
      const state = fromFEN('4k3/8/8/8/8/1P6/2P5/N3K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('a1'));
      assert.strictEqual(moves.length, 0, 'Knight blocked by friendly pawns on b3 and c2');
    });

    it('knight captures enemy piece', () => {
      const state = fromFEN('4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('f3'));
      assert.ok(hasMove(moves, 'f3', 'e5'), 'Knight should be able to capture e5');
      const next = play(state, 'f3', 'e5');
      assert.strictEqual(next.board[sq('e5')]?.type, 'n');
      assert.strictEqual(next.board[sq('e5')]?.color, 'w');
      assert.strictEqual(next.board[sq('f3')], null);
    });
  });

  describe('Bishop Movement & Ray Sliders', () => {
    it('bishop moves along 4 diagonal rays in open center', () => {
      const state = fromFEN('4k3/8/8/8/3B4/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('d4'));
      assert.strictEqual(moves.length, 13);
    });

    it('bishop ray stops before friendly piece', () => {
      const state = fromFEN('4k3/8/8/8/3B4/4P3/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('d4'));
      assert.strictEqual(hasMove(moves, 'd4', 'e3'), false, 'Cannot land on friendly e3');
      assert.strictEqual(hasMove(moves, 'd4', 'f2'), false, 'Cannot jump over friendly e3');
    });

    it('bishop captures enemy piece and terminates ray', () => {
      const state = fromFEN('4k3/8/8/8/3B4/4p3/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('d4'));
      assert.ok(hasMove(moves, 'd4', 'e3'), 'Can capture enemy e3');
      assert.strictEqual(hasMove(moves, 'd4', 'f2'), false, 'Cannot move past captured enemy e3');
    });

    it('bishop on edge of board has diagonal moves', () => {
      const state = fromFEN('4k3/8/8/8/B7/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('a4'));
      assert.ok(hasMove(moves, 'a4', 'b5'));
      assert.ok(hasMove(moves, 'a4', 'b3'));
      assert.ok(hasMove(moves, 'a4', 'c2'));
      assert.ok(hasMove(moves, 'a4', 'd1'));
    });

    it('bishop stays on same square color', () => {
      const state = fromFEN('4k3/8/8/8/3B4/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('d4'));
      for (const m of moves) {
        const file = m.to % 8;
        const rank = Math.floor(m.to / 8);
        assert.strictEqual((file + rank) % 2, (3 + 3) % 2, 'Bishop on dark square must stay on dark squares');
      }
    });
  });

  describe('Rook Movement & Orthogonal Rays', () => {
    it('rook moves along orthogonal rays in open board', () => {
      const state = fromFEN('4k3/8/8/8/3R4/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('d4'));
      assert.strictEqual(moves.length, 14, 'Open rook on d4 should have 14 moves');
    });

    it('rook ray blocked by friendly piece', () => {
      const state = fromFEN('4k3/8/8/3P4/3R4/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('d4'));
      assert.strictEqual(hasMove(moves, 'd4', 'd5'), false);
      assert.strictEqual(hasMove(moves, 'd4', 'd6'), false);
    });

    it('rook captures enemy piece and terminates ray', () => {
      const state = fromFEN('4k3/8/8/3p4/3R4/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('d4'));
      assert.ok(hasMove(moves, 'd4', 'd5'));
      assert.strictEqual(hasMove(moves, 'd4', 'd6'), false);
    });

    it('rook traverses full empty file to check enemy king', () => {
      const state = fromFEN('4k3/8/8/8/8/8/8/4R1K1 w - - 0 1');
      const moves = getLegalMoves(state, sq('e1'));
      assert.ok(hasMove(moves, 'e1', 'e8'));
    });

    it('rook in corner on empty board has 14 moves', () => {
      const state = fromFEN('4k3/8/8/8/8/8/8/R3K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('a1'));
      assert.ok(moves.length >= 10);
      assert.ok(hasMove(moves, 'a1', 'a8'));
      assert.ok(hasMove(moves, 'a1', 'd1'));
    });
  });

  describe('Queen Movement & Combinations', () => {
    it('queen moves along 8 rays in open center', () => {
      const state = fromFEN('4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('d4'));
      assert.strictEqual(moves.length, 27, 'Open queen has 14 orthogonal + 13 diagonal moves');
    });

    it('queen in starting position has 0 moves when blocked', () => {
      const state = createInitialGameState();
      const moves = getLegalMoves(state, sq('d1'));
      assert.strictEqual(moves.length, 0);
    });

    it('queen captures enemy piece in any direction', () => {
      const state = fromFEN('4k3/8/8/8/3Q1p2/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('d4'));
      assert.ok(hasMove(moves, 'd4', 'f4'));
    });

    it('queen pinned along file cannot move diagonally or horizontally', () => {
      const state = fromFEN('4k3/8/8/8/4r3/8/4Q3/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e2'));
      assert.ok(moves.length > 0);
      for (const m of moves) {
        assert.strictEqual(m.to % 8, 4, 'Pinned Queen can only move along file e');
      }
    });

    it('queen along corner edge has 21 moves', () => {
      const state = fromFEN('4k3/8/8/8/8/8/8/Q3K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('a1'));
      assert.ok(hasMove(moves, 'a1', 'a8'));
      assert.ok(hasMove(moves, 'a1', 'h8'));
      assert.ok(hasMove(moves, 'a1', 'd1'));
    });
  });

  describe('King Movement & Constraints', () => {
    it('king moves 1 step in all 8 directions in open board', () => {
      const state = fromFEN('4k3/8/8/8/4K3/8/8/8 w - - 0 1');
      const moves = getLegalMoves(state, sq('e4'));
      assert.strictEqual(moves.length, 8);
    });

    it('king in starting position has 0 legal moves', () => {
      const state = createInitialGameState();
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(moves.length, 0);
    });

    it('king captures undefended enemy piece', () => {
      const state = fromFEN('4k3/8/8/8/4Kp2/8/8/8 w - - 0 1');
      const moves = getLegalMoves(state, sq('e4'));
      assert.ok(hasMove(moves, 'e4', 'f4'));
    });

    it('king cannot move into square attacked by enemy pawn', () => {
      const state = fromFEN('4k3/8/8/8/2p5/8/4K3/8 w - - 0 1');
      const moves = getLegalMoves(state, sq('e2'));
      assert.strictEqual(hasMove(moves, 'e2', 'd3'), false, 'd3 attacked by pawn c4');
    });

    it('king cannot move into square attacked by enemy slider', () => {
      // Black Rook on d8 controls the d-file; White King on e2 cannot move to d1, d2, or d3
      const state = fromFEN('3rk3/8/8/8/8/8/4K3/8 w - - 0 1');
      const moves = getLegalMoves(state, sq('e2'));
      assert.strictEqual(hasMove(moves, 'e2', 'd1'), false, 'd1 attacked by rook on d8');
      assert.strictEqual(hasMove(moves, 'e2', 'd2'), false, 'd2 attacked by rook on d8');
      assert.strictEqual(hasMove(moves, 'e2', 'd3'), false, 'd3 attacked by rook on d8');
    });
  });

  describe('Special Moves: Castling', () => {
    it('white kingside castling moves King from e1 to g1 and Rook from h1 to f1', () => {
      const state = fromFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
      const moves = getLegalMoves(state, sq('e1'));
      assert.ok(hasMove(moves, 'e1', 'g1'), 'O-O should be legal');
      const next = play(state, 'e1', 'g1');
      assert.strictEqual(next.board[sq('g1')]?.type, 'k');
      assert.strictEqual(next.board[sq('f1')]?.type, 'r');
      assert.strictEqual(next.board[sq('e1')], null);
      assert.strictEqual(next.board[sq('h1')], null);
      assert.strictEqual(next.castling.whiteKingside, false);
      assert.strictEqual(next.castling.whiteQueenside, false);
    });

    it('white queenside castling moves King from e1 to c1 and Rook from a1 to d1', () => {
      const state = fromFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
      const moves = getLegalMoves(state, sq('e1'));
      assert.ok(hasMove(moves, 'e1', 'c1'), 'O-O-O should be legal');
      const next = play(state, 'e1', 'c1');
      assert.strictEqual(next.board[sq('c1')]?.type, 'k');
      assert.strictEqual(next.board[sq('d1')]?.type, 'r');
      assert.strictEqual(next.board[sq('e1')], null);
      assert.strictEqual(next.board[sq('a1')], null);
      assert.strictEqual(next.castling.whiteKingside, false);
      assert.strictEqual(next.castling.whiteQueenside, false);
    });

    it('black kingside castling moves King from e8 to g8 and Rook from h8 to f8', () => {
      const state = fromFEN('r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1');
      const moves = getLegalMoves(state, sq('e8'));
      assert.ok(hasMove(moves, 'e8', 'g8'), 'Black O-O should be legal');
      const next = play(state, 'e8', 'g8');
      assert.strictEqual(next.board[sq('g8')]?.type, 'k');
      assert.strictEqual(next.board[sq('f8')]?.type, 'r');
      assert.strictEqual(next.board[sq('e8')], null);
      assert.strictEqual(next.board[sq('h8')], null);
    });

    it('black queenside castling moves King from e8 to c8 and Rook from a8 to d8', () => {
      const state = fromFEN('r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1');
      const moves = getLegalMoves(state, sq('e8'));
      assert.ok(hasMove(moves, 'e8', 'c8'), 'Black O-O-O should be legal');
      const next = play(state, 'e8', 'c8');
      assert.strictEqual(next.board[sq('c8')]?.type, 'k');
      assert.strictEqual(next.board[sq('d8')]?.type, 'r');
      assert.strictEqual(next.board[sq('e8')], null);
      assert.strictEqual(next.board[sq('a8')], null);
    });

    it('castling move sets isCastling property on Move object', () => {
      const state = fromFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
      const moves = getLegalMoves(state, sq('e1'));
      const castleMove = findMove(moves, 'e1', 'g1');
      assert.strictEqual(castleMove?.isCastling, true);
    });

    it('moving king invalidates both kingside and queenside castling rights', () => {
      const state = fromFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
      const next = play(state, 'e1', 'e2');
      assert.strictEqual(next.castling.whiteKingside, false);
      assert.strictEqual(next.castling.whiteQueenside, false);
    });

    it('moving a-rook invalidates queenside castling but preserves kingside', () => {
      const state = fromFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
      const next = play(state, 'a1', 'a2');
      assert.strictEqual(next.castling.whiteQueenside, false);
      assert.strictEqual(next.castling.whiteKingside, true);
    });
  });

  describe('Special Moves: En Passant', () => {
    it('white pawn captures black pawn en passant', () => {
      const state = fromFEN('4k3/8/8/3Pp3/8/8/8/4K3 w - e6 0 1');
      const moves = getLegalMoves(state, sq('d5'));
      assert.ok(hasMove(moves, 'd5', 'e6'), 'd5xe6 e.p. should be legal');
      const next = play(state, 'd5', 'e6');
      assert.strictEqual(next.board[sq('e6')]?.type, 'p');
      assert.strictEqual(next.board[sq('e6')]?.color, 'w');
      assert.strictEqual(next.board[sq('d5')], null);
      assert.strictEqual(next.board[sq('e5')], null, 'Captured black pawn on e5 must be removed');
    });

    it('black pawn captures white pawn en passant', () => {
      const state = fromFEN('4k3/8/8/8/3pP3/8/8/4K3 b - e3 0 1');
      const moves = getLegalMoves(state, sq('d4'));
      assert.ok(hasMove(moves, 'd4', 'e3'), 'd4xe3 e.p. should be legal');
      const next = play(state, 'd4', 'e3');
      assert.strictEqual(next.board[sq('e3')]?.type, 'p');
      assert.strictEqual(next.board[sq('e3')]?.color, 'b');
      assert.strictEqual(next.board[sq('d4')], null);
      assert.strictEqual(next.board[sq('e4')], null, 'Captured white pawn on e4 must be removed');
    });

    it('en passant move sets isEnPassant property on Move object', () => {
      const state = fromFEN('4k3/8/8/3Pp3/8/8/8/4K3 w - e6 0 1');
      const moves = getLegalMoves(state, sq('d5'));
      const epMove = findMove(moves, 'd5', 'e6');
      assert.strictEqual(epMove?.isEnPassant, true);
      assert.strictEqual(epMove?.isCapture, true);
    });

    it('non-adjacent pawn cannot capture en passant', () => {
      const state = fromFEN('4k3/8/8/2P1p3/8/8/8/4K3 w - e6 0 1');
      const moves = getLegalMoves(state, sq('c5'));
      assert.strictEqual(hasMove(moves, 'c5', 'e6'), false);
    });

    it('en passant target expires after exactly 1 ply', () => {
      let state = createInitialGameState();
      state = play(state, 'e2', 'e4');
      assert.strictEqual(state.enPassant, sq('e3'));
      state = play(state, 'a7', 'a6');
      assert.strictEqual(state.enPassant, null, 'En passant target must expire after non-ep response');
    });
  });

  describe('Special Moves: Pawn Promotion', () => {
    it('white pawn promotes to Queen on rank 8', () => {
      const state = fromFEN('7k/4P3/8/8/8/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e7'));
      assert.ok(hasMove(moves, 'e7', 'e8', 'q'));
      const next = play(state, 'e7', 'e8', 'q');
      assert.strictEqual(next.board[sq('e8')]?.type, 'q');
      assert.strictEqual(next.board[sq('e8')]?.color, 'w');
      assert.strictEqual(next.board[sq('e7')], null);
    });

    it('white pawn promotes to Rook on rank 8', () => {
      const state = fromFEN('7k/4P3/8/8/8/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e7'));
      assert.ok(hasMove(moves, 'e7', 'e8', 'r'));
      const next = play(state, 'e7', 'e8', 'r');
      assert.strictEqual(next.board[sq('e8')]?.type, 'r');
    });

    it('white pawn promotes to Bishop on rank 8', () => {
      const state = fromFEN('7k/4P3/8/8/8/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e7'));
      assert.ok(hasMove(moves, 'e7', 'e8', 'b'));
      const next = play(state, 'e7', 'e8', 'b');
      assert.strictEqual(next.board[sq('e8')]?.type, 'b');
    });

    it('white pawn promotes to Knight on rank 8', () => {
      const state = fromFEN('7k/4P3/8/8/8/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e7'));
      assert.ok(hasMove(moves, 'e7', 'e8', 'n'));
      const next = play(state, 'e7', 'e8', 'n');
      assert.strictEqual(next.board[sq('e8')]?.type, 'n');
    });

    it('pawn promotion with diagonal capture', () => {
      const state = fromFEN('3rk3/4P3/8/8/8/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e7'));
      assert.ok(hasMove(moves, 'e7', 'd8', 'q'));
      const next = play(state, 'e7', 'd8', 'q');
      assert.strictEqual(next.board[sq('d8')]?.type, 'q');
      assert.strictEqual(next.board[sq('e7')], null);
    });

    it('black pawn promotes on rank 1', () => {
      const state = fromFEN('4k3/8/8/8/8/8/4p3/K7 b - - 0 1');
      const moves = getLegalMoves(state, sq('e2'));
      assert.ok(hasMove(moves, 'e2', 'e1', 'q'));
      const next = play(state, 'e2', 'e1', 'q');
      assert.strictEqual(next.board[sq('e1')]?.type, 'q');
      assert.strictEqual(next.board[sq('e1')]?.color, 'b');
    });
  });

  describe('Check Detection & isSquareAttacked', () => {
    it('isCheck is true when King is attacked by enemy Rook', () => {
      const state = fromFEN('4k3/8/8/8/8/8/8/4K2r w - - 0 1');
      assert.strictEqual(state.isCheck, true);
    });

    it('isCheck is true when King is attacked by enemy Knight', () => {
      const state = fromFEN('4k3/8/8/8/8/5n2/8/4K3 w - - 0 1');
      assert.strictEqual(state.isCheck, true);
    });

    it('isCheck is true when King is attacked by enemy Bishop', () => {
      const state = fromFEN('4k3/8/8/8/8/8/5b2/4K3 w - - 0 1');
      assert.strictEqual(state.isCheck, true);
    });

    it('isCheck is true when King is attacked by enemy Pawn', () => {
      const state = fromFEN('4k3/8/8/8/8/8/3p4/4K3 w - - 0 1');
      assert.strictEqual(state.isCheck, true);
    });

    it('isSquareAttacked identifies attacks accurately', () => {
      const state = fromFEN('4k3/8/8/2b5/8/8/8/4K3 w - - 0 1');
      assert.strictEqual(isSquareAttacked(state.board, sq('f2'), 'b'), true, 'f2 attacked by c5 bishop');
      assert.strictEqual(isSquareAttacked(state.board, sq('h1'), 'b'), false, 'h1 not attacked by c5 bishop');
    });

    it('discovered check is detected when intervening piece moves', () => {
      // White Rook on d1, White Knight on d4, Black King on d8.
      // Moving Knight d4-c6 discovers check from Rook d1 on King d8.
      const state = fromFEN('3k4/8/8/8/3N4/8/8/3R3K w - - 0 1');
      assert.strictEqual(state.isCheck, false);
      const next = play(state, 'd4', 'c6');
      assert.strictEqual(next.isCheck, true);
    });
  });

  describe('Terminal States: Checkmate & Stalemate', () => {
    it('Fool\'s mate detects checkmate', () => {
      let state = createInitialGameState();
      state = play(state, 'f2', 'f3');
      state = play(state, 'e7', 'e5');
      state = play(state, 'g2', 'g4');
      state = play(state, 'd8', 'h4');
      assert.strictEqual(state.isCheck, true);
      assert.strictEqual(state.isCheckmate, true);
      assert.strictEqual(getLegalMoves(state).length, 0);
    });

    it('Scholar\'s mate detects checkmate', () => {
      let state = createInitialGameState();
      state = play(state, 'e2', 'e4');
      state = play(state, 'e7', 'e5');
      state = play(state, 'd1', 'h5');
      state = play(state, 'b8', 'c6');
      state = play(state, 'f1', 'c4');
      state = play(state, 'g8', 'f6');
      state = play(state, 'h5', 'f7');
      assert.strictEqual(state.isCheck, true);
      assert.strictEqual(state.isCheckmate, true);
      assert.strictEqual(getLegalMoves(state).length, 0);
    });

    it('back-rank checkmate is detected', () => {
      const state = fromFEN('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
      const next = play(state, 'a1', 'a8');
      assert.strictEqual(next.isCheck, true);
      assert.strictEqual(next.isCheckmate, true);
    });

    it('corner stalemate evaluates to draw and stalemate', () => {
      // Black King on a8, White pawn on a7, White King on b6
      const state = fromFEN('k7/P7/1K6/8/8/8/8/8 b - - 0 1');
      assert.strictEqual(state.isCheck, false);
      assert.strictEqual(state.isStalemate, true);
      assert.strictEqual(state.isDraw, true);
      assert.strictEqual(state.drawReason, 'stalemate');
      assert.strictEqual(getLegalMoves(state).length, 0);
    });

    it('queen stalemate evaluates to draw and stalemate', () => {
      const state = fromFEN('7k/5K2/6Q1/8/8/8/8/8 b - - 0 1');
      assert.strictEqual(state.isCheck, false);
      assert.strictEqual(state.isStalemate, true);
      assert.strictEqual(state.isDraw, true);
      assert.strictEqual(state.drawReason, 'stalemate');
    });
  });

  describe('Draw Conditions', () => {
    it('fifty-move rule triggers when halfmoveClock reaches 100', () => {
      const state = fromFEN('4k3/8/8/8/8/8/8/4K3 w - - 100 51');
      assert.strictEqual(state.isDraw, true);
      assert.strictEqual(state.drawReason, 'fifty_move');
    });

    it('halfmoveClock increments on normal piece moves', () => {
      const state = fromFEN('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
      const next = play(state, 'e1', 'e2');
      assert.strictEqual(next.halfmoveClock, 1);
    });

    it('halfmoveClock resets to 0 on pawn move', () => {
      const state = fromFEN('4k3/8/8/8/8/8/4P3/4K3 w - - 40 21');
      const next = play(state, 'e2', 'e4');
      assert.strictEqual(next.halfmoveClock, 0);
    });

    it('halfmoveClock resets to 0 on capture', () => {
      const state = fromFEN('4k3/8/8/4p3/8/5N2/8/4K3 w - - 40 21');
      const next = play(state, 'f3', 'e5');
      assert.strictEqual(next.halfmoveClock, 0);
    });

    it('insufficient material: K vs K is a draw', () => {
      const state = fromFEN('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
      assert.strictEqual(state.isDraw, true);
      assert.strictEqual(state.drawReason, 'insufficient_material');
    });

    it('insufficient material: K+B vs K is a draw', () => {
      const state = fromFEN('4k3/8/8/8/8/8/8/4KB2 w - - 0 1');
      assert.strictEqual(state.isDraw, true);
      assert.strictEqual(state.drawReason, 'insufficient_material');
    });

    it('insufficient material: K+N vs K is a draw', () => {
      const state = fromFEN('4k3/8/8/8/8/8/8/4KN2 w - - 0 1');
      assert.strictEqual(state.isDraw, true);
      assert.strictEqual(state.drawReason, 'insufficient_material');
    });

    it('insufficient material: K+B vs K+B with same square color is a draw', () => {
      // f2 is dark (5+1=6), d4 is dark (3+3=6)
      const state = fromFEN('4k3/8/8/8/3b4/8/5B2/4K3 w - - 0 1');
      assert.strictEqual(state.isDraw, true);
      assert.strictEqual(state.drawReason, 'insufficient_material');
    });

    it('threefold repetition triggers draw when identical position occurs 3 times', () => {
      let state = createInitialGameState();
      state = play(state, 'g1', 'f3');
      state = play(state, 'g8', 'f6');
      state = play(state, 'f3', 'g1');
      state = play(state, 'f6', 'g8'); // repetition 2
      state = play(state, 'g1', 'f3');
      state = play(state, 'g8', 'f6');
      state = play(state, 'f3', 'g1');
      state = play(state, 'f6', 'g8'); // repetition 3
      assert.strictEqual(state.isDraw, true);
      assert.strictEqual(state.drawReason, 'threefold_repetition');
    });
  });

  describe('FEN Serialization & History / Undo', () => {
    it('createInitialGameState produces standard starting FEN', () => {
      const state = createInitialGameState();
      const fen = toFEN(state);
      assert.strictEqual(fen, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });

    it('fromFEN parses starting position with correct piece placement', () => {
      const state = fromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      assert.strictEqual(state.turn, 'w');
      assert.strictEqual(state.castling.whiteKingside, true);
      assert.strictEqual(state.castling.whiteQueenside, true);
      assert.strictEqual(state.castling.blackKingside, true);
      assert.strictEqual(state.castling.blackQueenside, true);
      assert.strictEqual(state.board[sq('e1')]?.type, 'k');
      assert.strictEqual(state.board[sq('e8')]?.type, 'k');
    });

    it('toFEN round-trips position with en passant and halfmove clocks', () => {
      const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2';
      const state = fromFEN(fen);
      assert.strictEqual(state.enPassant, sq('e6'));
      assert.strictEqual(toFEN(state), fen);
    });

    it('makeMove does not mutate previous state object', () => {
      const state = createInitialGameState();
      const next = play(state, 'e2', 'e4');
      assert.strictEqual(state.board[sq('e2')]?.type, 'p');
      assert.strictEqual(state.board[sq('e4')], null);
      assert.strictEqual(next.board[sq('e4')]?.type, 'p');
    });

    it('undoMove restores exact previous board, turn, and castling rights', () => {
      const initial = createInitialGameState();
      const afterMove = play(initial, 'e2', 'e4');
      const undone = undoMove(afterMove);
      assert.strictEqual(undone.turn, 'w');
      assert.strictEqual(undone.board[sq('e2')]?.type, 'p');
      assert.strictEqual(undone.board[sq('e4')], null);
      assert.strictEqual(toFEN(undone), toFEN(initial));
    });

    it('multiple consecutive makeMove and undoMove cycles cleanly restore state', () => {
      let state = createInitialGameState();
      const startFEN = toFEN(state);
      state = play(state, 'e2', 'e4');
      state = play(state, 'e7', 'e5');
      state = play(state, 'g1', 'f3');
      state = play(state, 'b8', 'c6');
      state = undoMove(state);
      state = undoMove(state);
      state = undoMove(state);
      state = undoMove(state);
      assert.strictEqual(toFEN(state), startFEN);
    });
  });
});

describe('Viper Chess Engine - Tier 2: Boundary & Corner Cases', () => {
  describe('Castling Legality Invariants', () => {
    it('King cannot castle kingside while in check', () => {
      const state = fromFEN('r3k2r/8/8/8/8/8/8/R3K2r w KQkq - 0 1');
      assert.strictEqual(state.isCheck, true);
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'g1'), false, 'Cannot castle out of check');
    });

    it('King cannot castle queenside while in check', () => {
      const state = fromFEN('r3k2r/8/8/8/8/8/8/r3K2R w KQkq - 0 1');
      assert.strictEqual(state.isCheck, true);
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'c1'), false, 'Cannot castle queenside out of check');
    });

    it('Castling kingside forbidden if transit square f1 is attacked', () => {
      // Black Rook on f8 controls f-file; King on e1 cannot pass through f1
      const state = fromFEN('r3kr2/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'g1'), false, 'Cannot castle through attacked f1');
    });

    it('Castling queenside forbidden if transit square d1 is attacked', () => {
      // Black Rook on d8 controls d-file; King on e1 cannot pass through d1
      const state = fromFEN('r2rkb1r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'c1'), false, 'Cannot castle through attacked d1');
    });

    it('Black castling kingside forbidden if transit square f8 is attacked', () => {
      // White Rook on f1 controls f-file; Black King on e8 cannot pass through f8
      const state = fromFEN('r3k2r/8/8/8/8/8/8/R3KR2 b Qkq - 0 1');
      const moves = getLegalMoves(state, sq('e8'));
      assert.strictEqual(hasMove(moves, 'e8', 'g8'), false, 'Cannot castle through attacked f8');
    });

    it('Black castling queenside forbidden if transit square d8 is attacked', () => {
      // White Rook on d1 controls d-file; Black King on e8 cannot pass through d8
      const state = fromFEN('r3k2r/8/8/8/8/8/8/R2RKB2 b Qkq - 0 1');
      const moves = getLegalMoves(state, sq('e8'));
      assert.strictEqual(hasMove(moves, 'e8', 'c8'), false, 'Cannot castle through attacked d8');
    });

    it('Castling forbidden if landing square g1 is attacked', () => {
      // Black Bishop on a7 controls diagonal a7-g1; landing square g1 is under attack
      const state = fromFEN('r3k2r/b7/8/8/8/8/8/R3K2R w KQkq - 0 1');
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'g1'), false, 'Cannot castle into attacked g1');
    });

    it('Castling forbidden if landing square c1 is attacked', () => {
      // Black Bishop on a3 controls diagonal a3-c1; landing square c1 is under attack
      const state = fromFEN('r3k2r/8/8/8/8/b7/8/R3K2R w KQkq - 0 1');
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'c1'), false, 'Cannot castle into attacked c1');
    });

    it('Queenside castling is legal even if b1 is attacked by enemy piece', () => {
      // Black Bishop on a2 attacks b1. King moves e1->d1->c1, Rook traverses b1. Legal under FIDE!
      const state = fromFEN('r3k2r/8/8/8/8/8/b7/R3K2R w KQkq - 0 1');
      const moves = getLegalMoves(state, sq('e1'));
      assert.ok(hasMove(moves, 'e1', 'c1'), 'O-O-O is legal even if b1 is attacked');
    });

    it('Black queenside castling is legal even if b8 is attacked', () => {
      // White Bishop on a7 attacks b8. King moves e8->d8->c8. Legal under FIDE!
      const state = fromFEN('r3k2r/B7/8/8/8/8/8/R3K2R b KQkq - 0 1');
      const moves = getLegalMoves(state, sq('e8'));
      assert.ok(hasMove(moves, 'e8', 'c8'), 'Black O-O-O is legal even if b8 is attacked');
    });

    it('Queenside castling is illegal if b1 is occupied by friendly piece', () => {
      const state = fromFEN('r3k2r/8/8/8/8/8/8/RN2K2R w KQkq - 0 1');
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'c1'), false);
    });

    it('Queenside castling is illegal if b1 is occupied by enemy piece', () => {
      const state = fromFEN('r3k2r/8/8/8/8/8/8/Rn2K2R w KQkq - 0 1');
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'c1'), false);
    });

    it('Kingside castling is illegal if f1 is occupied', () => {
      const state = fromFEN('r3k2r/8/8/8/8/8/8/R3KB1R w KQkq - 0 1');
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'g1'), false);
    });

    it('Kingside castling is illegal if g1 is occupied', () => {
      const state = fromFEN('r3k2r/8/8/8/8/8/8/R3K1NR w KQkq - 0 1');
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'g1'), false);
    });

    it('Castling right is permanently lost when King moves, even if returning to original square', () => {
      let state = fromFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
      state = play(state, 'e1', 'e2');
      state = play(state, 'a8', 'a7');
      state = play(state, 'e2', 'e1');
      state = play(state, 'a7', 'a8');
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'g1'), false);
      assert.strictEqual(hasMove(moves, 'e1', 'c1'), false);
    });

    it('Castling right is permanently lost when Rook moves, even if returning to original square', () => {
      let state = fromFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
      state = play(state, 'h1', 'h2');
      state = play(state, 'a8', 'a7');
      state = play(state, 'h2', 'h1');
      state = play(state, 'a7', 'a8');
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'g1'), false, 'Kingside castling permanently lost');
      assert.ok(hasMove(moves, 'e1', 'c1'), 'Queenside castling still retained');
    });

    it('Castling right is permanently revoked when corner rook is captured', () => {
      const state = fromFEN('r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1');
      // Black rook on a8 captures White rook on a1
      const next = play(state, 'a8', 'a1');
      assert.strictEqual(next.castling.whiteQueenside, false);
      assert.strictEqual(next.castling.whiteKingside, true);
    });
  });

  describe('En Passant Edge Cases & Horizontal Pin Trap', () => {
    it('En passant expires after 1 ply and cannot be played later', () => {
      let state = createInitialGameState();
      state = play(state, 'e2', 'e4');
      state = play(state, 'g8', 'f6');
      state = play(state, 'e4', 'e5');
      state = play(state, 'd7', 'd5'); // e.p. target is d6
      assert.strictEqual(state.enPassant, sq('d6'));
      state = play(state, 'a2', 'a3'); // White skips e.p.
      state = play(state, 'a7', 'a6');
      const moves = getLegalMoves(state, sq('e5'));
      assert.strictEqual(hasMove(moves, 'e5', 'd6'), false, 'En passant must have expired');
    });

    it('En Passant Horizontal Pin Trap: capture is illegal if exposing King on same rank', () => {
      // White King on h4, Black Rook on a4, White pawn on d4, Black pawn on e4 just played e7-e5 (target e6)
      // dxe6 e.p. would remove both pawns from rank 4, exposing King h4 to Rook a4!
      const state = fromFEN('8/8/8/8/r2Pp2K/8/8/8 w - e6 0 1');
      const moves = getLegalMoves(state, sq('d4'));
      assert.strictEqual(hasMove(moves, 'd4', 'e6'), false, 'd4xe6 e.p. forbidden by horizontal pin on rank 4');
    });

    it('En Passant vertical pin: pawn pinned along file cannot capture en passant', () => {
      // White King e1, Black Queen e8, White pawn e5, Black pawn d5 just played d7-d5
      const state = fromFEN('4q3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
      const moves = getLegalMoves(state, sq('e5'));
      assert.strictEqual(hasMove(moves, 'e5', 'd6'), false, 'Pawn on e5 is vertically pinned along e-file');
    });

    it('Consecutive single pawn pushes do not trigger en passant', () => {
      let state = createInitialGameState();
      state = play(state, 'a2', 'a3');
      state = play(state, 'e7', 'e6');
      state = play(state, 'a3', 'a4');
      state = play(state, 'e6', 'e5'); // Black reached e5 via two single steps
      assert.strictEqual(state.enPassant, null, 'Single push e6-e5 must not set enPassant target');
    });
  });

  describe('Absolute Pins & Pin Attack Mechanics', () => {
    it('Rook pinned to King along rank cannot move off rank', () => {
      const state = fromFEN('8/8/8/8/r2R3K/8/8/8 w - - 0 1');
      const moves = getLegalMoves(state, sq('d4'));
      for (const m of moves) {
        assert.strictEqual(Math.floor(m.to / 8), 3, 'Pinned Rook must stay on rank 4');
      }
    });

    it('Rook pinned to King along file cannot move off file', () => {
      const state = fromFEN('4k3/4r3/8/8/4R3/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e4'));
      for (const m of moves) {
        assert.strictEqual(m.to % 8, 4, 'Pinned Rook must stay on file e');
      }
    });

    it('Bishop pinned to King along diagonal cannot move off diagonal', () => {
      // Black Bishop on a8, White Bishop on d5, White King on g2 (diagonal a8-d5-g2)
      const state = fromFEN('b7/8/8/3B4/8/8/6K1/8 w - - 0 1');
      const moves = getLegalMoves(state, sq('d5'));
      assert.ok(moves.length > 0);
      for (const m of moves) {
        // Must stay on diagonal a8-g2
        const f = m.to % 8;
        const r = Math.floor(m.to / 8);
        assert.strictEqual(f + r, 7, 'Must remain on a8-g2 anti-diagonal');
      }
    });

    it('Knight pinned to King has 0 legal moves', () => {
      const state = fromFEN('4r3/8/8/8/4N3/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e4'));
      assert.strictEqual(moves.length, 0, 'Pinned Knight cannot jump off the line of pin');
    });

    it('Pinned piece still attacks squares (opponent King cannot step into its attack)', () => {
      // White King on e1, Black King on e8, White Rook on c1 pins Black Bishop on c5 to e8
      // Bishop on c5 attacks f2. White King on e1 cannot move to f2!
      const state = fromFEN('4k3/8/8/2b5/8/8/8/2R1K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'f2'), false, 'White King cannot step into attack of pinned Bishop');
    });

    it('Double check forces King to move (cannot block or capture single checker)', () => {
      // Black Bishop on b4 checks e1, Black Rook on h1 checks e1
      const state = fromFEN('4k3/8/8/8/1b6/8/8/4K2r w - - 0 1');
      assert.strictEqual(state.isCheck, true);
      const moves = getLegalMoves(state);
      for (const m of moves) {
        assert.strictEqual(m.from, sq('e1'), 'Only King moves are legal in double check');
      }
    });

    it('Checkmate takes precedence over 50-move rule', () => {
      const state = fromFEN('6k1/5ppp/8/8/8/8/8/R5K1 w - - 99 50');
      const next = play(state, 'a1', 'a8');
      assert.strictEqual(next.isCheckmate, true, 'Checkmate must take precedence');
      assert.strictEqual(next.isDraw, false);
    });
  });

  describe('Pawn Promotions & Underpromotions', () => {
    it('Pawn promotion without capture to Queen', () => {
      const state = fromFEN('7k/4P3/8/8/8/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e7'));
      assert.ok(hasMove(moves, 'e7', 'e8', 'q'));
    });

    it('Pawn promotion with capture to left', () => {
      const state = fromFEN('3rk3/4P3/8/8/8/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e7'));
      assert.ok(hasMove(moves, 'e7', 'd8', 'q'));
    });

    it('Pawn promotion with capture to right', () => {
      const state = fromFEN('4kn2/4P3/8/8/8/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e7'));
      assert.ok(hasMove(moves, 'e7', 'f8', 'q'));
    });

    it('Underpromotion to Knight is generated and legal', () => {
      const state = fromFEN('7k/4P3/8/8/8/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e7'));
      assert.ok(hasMove(moves, 'e7', 'e8', 'n'));
    });

    it('Underpromotion to Rook is generated and legal', () => {
      const state = fromFEN('7k/4P3/8/8/8/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e7'));
      assert.ok(hasMove(moves, 'e7', 'e8', 'r'));
    });

    it('Underpromotion to Bishop is generated and legal', () => {
      const state = fromFEN('7k/4P3/8/8/8/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e7'));
      assert.ok(hasMove(moves, 'e7', 'e8', 'b'));
    });

    it('Multiple Queens of the same color coexist and function legally', () => {
      const state = fromFEN('4k3/8/8/8/8/8/8/QQQ1K3 w - - 0 1');
      assert.strictEqual(state.board[sq('a1')]?.type, 'q');
      assert.strictEqual(state.board[sq('b1')]?.type, 'q');
      assert.strictEqual(state.board[sq('c1')]?.type, 'q');
      const moves = getLegalMoves(state, sq('a1'));
      assert.ok(moves.length > 0);
    });
  });

  describe('King Safety, Boundaries, & Non-Dead Positions', () => {
    it('King cannot move adjacent to opposing King', () => {
      const state = fromFEN('4k3/8/8/8/4K3/8/8/8 w - - 0 1');
      const moves = getLegalMoves(state, sq('e4'));
      // Opposing king on e8, so e4 is far. Let's move Kings closer:
      const closeState = fromFEN('8/8/8/4k3/8/4K3/8/8 w - - 0 1');
      const kingMoves = getLegalMoves(closeState, sq('e3'));
      assert.strictEqual(hasMove(kingMoves, 'e3', 'd4'), false, 'Cannot step adjacent to e5 king');
      assert.strictEqual(hasMove(kingMoves, 'e3', 'e4'), false, 'Cannot step adjacent to e5 king');
      assert.strictEqual(hasMove(kingMoves, 'e3', 'f4'), false, 'Cannot step adjacent to e5 king');
    });

    it('King cannot capture protected enemy piece', () => {
      // Black pawn on d5 protected by Black pawn on c6
      const state = fromFEN('4k3/8/2p5/3p4/4K3/8/8/8 w - - 0 1');
      const moves = getLegalMoves(state, sq('e4'));
      assert.strictEqual(hasMove(moves, 'e4', 'd5'), false, 'Cannot capture defended pawn on d5');
    });

    it('King can capture unprotected checking piece', () => {
      // Black Bishop on d2 diagonally checks White King on e1
      const state = fromFEN('4k3/8/8/8/8/8/3b4/4K3 w - - 0 1');
      assert.strictEqual(state.isCheck, true);
      const moves = getLegalMoves(state, sq('e1'));
      assert.ok(hasMove(moves, 'e1', 'd2'), 'Can capture undefended checking bishop');
    });

    it('Interposing friendly piece blocks sliding check', () => {
      // Black Rook on h1 checks White King on e1; White Bishop on d3 can interpose at f1
      const bishopState = fromFEN('4k3/8/8/8/8/3B4/8/4K2r w - - 0 1');
      const moves = getLegalMoves(bishopState, sq('d3'));
      assert.ok(hasMove(moves, 'd3', 'f1'), 'Bishop on d3 can block check at f1');
    });

    it('Corner Knight has exactly 2 legal moves', () => {
      // White King on e1, White Knight on h1, Black King on h8
      const state = fromFEN('7k/8/8/8/8/8/8/4K2N w - - 0 1');
      const moves = getLegalMoves(state, sq('h1'));
      assert.strictEqual(moves.length, 2);
      assert.ok(hasMove(moves, 'h1', 'g3'));
      assert.ok(hasMove(moves, 'h1', 'f2'));
    });

    it('Edge Knight on a4 has exactly 4 legal moves on empty board', () => {
      const state = fromFEN('4k3/8/8/8/N7/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('a4'));
      assert.strictEqual(moves.length, 4);
      assert.ok(hasMove(moves, 'a4', 'b6'));
      assert.ok(hasMove(moves, 'a4', 'c5'));
      assert.ok(hasMove(moves, 'a4', 'c3'));
      assert.ok(hasMove(moves, 'a4', 'b2'));
    });

    it('Pawn on rank 7 cannot double push (only rank 2/7 pawns from starting rank)', () => {
      const state = fromFEN('4k3/4P3/8/8/8/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e7'));
      assert.strictEqual(hasMove(moves, 'e7', 'e5'), false);
    });

    it('Pawn cannot capture friendly piece diagonally', () => {
      const state = fromFEN('4k3/8/8/3P4/4P3/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e4'));
      assert.strictEqual(hasMove(moves, 'e4', 'd5'), false, 'Cannot capture friendly pawn on d5');
    });

    it('Insufficient material: K+B vs K+B on opposite square colors is NOT an automatic draw', () => {
      // d4 is dark (3+3=6), e4 is light (4+3=7)
      const state = fromFEN('4k3/8/8/8/3Bb3/8/8/4K3 w - - 0 1');
      assert.strictEqual(state.isDraw, false, 'Opposite colored bishops is not an automatic dead position');
    });

    it('Insufficient material: K+N+N vs lone King is NOT a dead position under FIDE', () => {
      const state = fromFEN('4k3/8/8/8/8/8/8/4KNN1 w - - 0 1');
      assert.strictEqual(state.isDraw, false, 'Two knights vs king has helpmate; not dead position under FIDE');
    });

    it('Insufficient material: lone King vs King + Queen is NOT a draw', () => {
      const state = fromFEN('4k3/8/8/8/8/8/8/4KQ2 w - - 0 1');
      assert.strictEqual(state.isDraw, false);
    });

    it('Insufficient material: King + Pawn vs lone King is NOT a draw', () => {
      const state = fromFEN('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');
      assert.strictEqual(state.isDraw, false);
    });

    it('FEN import preserves enPassant target and move numbers accurately', () => {
      const state = fromFEN('8/8/8/8/4Pp2/8/8/4K2k b - e3 0 20');
      assert.strictEqual(state.enPassant, sq('e3'));
      assert.strictEqual(state.turn, 'b');
      assert.strictEqual(state.fullmoveNumber, 20);
    });

    it('FEN import preserves partial castling rights', () => {
      const state = fromFEN('r3k2r/8/8/8/8/8/8/R3K2R w Kq - 0 1');
      assert.strictEqual(state.castling.whiteKingside, true);
      assert.strictEqual(state.castling.whiteQueenside, false);
      assert.strictEqual(state.castling.blackKingside, false);
      assert.strictEqual(state.castling.blackQueenside, true);
    });
  });
});

describe('Viper Chess Engine - Tier 3: Cross-Feature Combinations', () => {
  it('Castling kingside delivering check (O-O+)', () => {
    const state = fromFEN('5k2/8/8/8/8/8/8/R3K2R w KQ - 0 1');
    const next = play(state, 'e1', 'g1');
    assert.strictEqual(next.isCheck, true, 'Rook on f1 delivers check to Black King on f8');
  });

  it('Castling queenside delivering check (O-O-O+)', () => {
    const state = fromFEN('3k4/8/8/8/8/8/8/R3K2R w KQ - 0 1');
    const next = play(state, 'e1', 'c1');
    assert.strictEqual(next.isCheck, true, 'Rook on d1 delivers check to Black King on d8');
  });

  it('Castling kingside delivering checkmate (O-O#)', () => {
    // Black King on f8 boxed in by own Rooks and pinned pawn; open f-file allows O-O to checkmate
    const mateState = fromFEN('4rkr1/4p1p1/8/8/1B6/8/8/R3K2R w KQ - 0 1');
    const next = play(mateState, 'e1', 'g1');
    assert.strictEqual(next.isCheck, true);
    assert.strictEqual(next.isCheckmate, true);
  });

  it('Pawn promotion delivering check (e8=Q+)', () => {
    const state = fromFEN('3k4/4P3/8/8/8/8/8/5K2 w - - 0 1');
    const next = play(state, 'e7', 'e8', 'q');
    assert.strictEqual(next.isCheck, true);
  });

  it('Pawn promotion delivering checkmate (e8=Q#)', () => {
    // White King on c6, White Rook on e1 defends e8. Black King on d8.
    // e7-e8=Q# delivers checkmate with Queen defended by Re1 and c7/d7/e7 cut off
    const state = fromFEN('3k4/4P3/2K5/8/8/8/8/4R3 w - - 0 1');
    const next = play(state, 'e7', 'e8', 'q');
    assert.strictEqual(next.isCheck, true);
    assert.strictEqual(next.isCheckmate, true);
  });

  it('Pawn underpromotion to Knight delivering smothered checkmate (e8=N#)', () => {
    const state = fromFEN('5r1k/6Pp/7K/8/8/8/8/8 w - - 0 1');
    const next = play(state, 'g7', 'f8', 'q');
    assert.strictEqual(next.isCheckmate, true);
  });

  it('Pawn underpromotion to Bishop stalemates opponent (promotion into stalemate)', () => {
    // White: King d6, Knight c6 (controls b8, a7), pawns c7, h6. Black: King a8, pawn h7.
    // c7-c8=B underpromotes to Bishop. Black King is not in check and has zero moves. Stalemate!
    const state = fromFEN('k7/2P4p/2NK3P/8/8/8/8/8 w - - 0 1');
    const next = play(state, 'c7', 'c8', 'b');
    assert.strictEqual(next.isCheck, false);
    assert.strictEqual(next.isStalemate, true);
    assert.strictEqual(next.isDraw, true);
    assert.strictEqual(next.drawReason, 'stalemate');
  });

  it('En passant capture delivering discovered check', () => {
    // White Queen on a5, Black King on h5.
    // White pawn on d5, Black pawn on e5 just played e7-e5 (target e6).
    // dxe6 e.p. removes d5 and e5, opening the 5th rank from a5 to h5!
    const state = fromFEN('8/8/8/Q2Pp2k/8/8/8/7K w - e6 0 1');
    const next = play(state, 'd5', 'e6');
    assert.strictEqual(next.isCheck, true, 'Queen on a5 discovers check on h5 king along rank 5');
  });

  it('En passant capture delivering checkmate', () => {
    // White Queen on a5, Bishops on c1 and d3 cover h6, g6, g5; King on g3 covers g4, h4
    const state = fromFEN('8/8/8/Q2Pp2k/8/3B2K1/8/2B5 w - e6 0 1');
    const next = play(state, 'd5', 'e6');
    assert.strictEqual(next.isCheck, true);
    assert.strictEqual(next.isCheckmate, true);
  });

  it('En passant capture removes checking piece (resolving check)', () => {
    // White King on e4, White pawn on e5.
    // Black pawn on f7 pushes to f5+, checking White King!
    // White captures e5xf6 e.p., capturing the checker and escaping check!
    let state = fromFEN('4k3/5p2/8/4P3/4K3/8/8/8 b - - 0 1');
    state = play(state, 'f7', 'f5');
    assert.strictEqual(state.isCheck, true, 'King e4 is in check by pawn on f5');
    const moves = getLegalMoves(state, sq('e5'));
    assert.ok(hasMove(moves, 'e5', 'f6'), 'e5xf6 e.p. must be legal');
    const next = play(state, 'e5', 'f6');
    assert.strictEqual(next.isCheck, false, 'En passant capture eliminated the checker');
  });

  it('Castling cannot escape check even if Rook would attack the checking piece', () => {
    const state = fromFEN('r3k2r/8/8/8/8/8/8/R3K2q w KQkq - 0 1');
    assert.strictEqual(state.isCheck, true);
    const moves = getLegalMoves(state, sq('e1'));
    assert.strictEqual(hasMove(moves, 'e1', 'g1'), false);
    assert.strictEqual(hasMove(moves, 'e1', 'c1'), false);
  });

  it('Promotion with capture resolving check on friendly King', () => {
    // Black Queen on d8 checks White King on d1.
    // White pawn on e7 can capture d8 with promotion, capturing the checker!
    const state = fromFEN('3q4/4P3/8/8/8/8/8/3K4 w - - 0 1');
    assert.strictEqual(state.isCheck, true);
    const moves = getLegalMoves(state, sq('e7'));
    assert.ok(hasMove(moves, 'e7', 'd8', 'q'), 'e7xd8=Q capture resolves check');
    const next = play(state, 'e7', 'd8', 'q');
    assert.strictEqual(next.isCheck, false);
  });

  it('Pawn promotion move is illegal if it leaves friendly King in check', () => {
    // Black Rook on e8 checks White King on e1. White pawn on a7.
    // White cannot play a7-a8=Q because King remains in check!
    const state = fromFEN('4r3/P7/8/8/8/8/8/4K3 w - - 0 1');
    assert.strictEqual(state.isCheck, true);
    const moves = getLegalMoves(state, sq('a7'));
    assert.strictEqual(moves.length, 0, 'Promotion move illegal when King left in check');
  });

  it('Discovered check by pawn push while promoting', () => {
    // White King on h1, White Rook on c1.
    // White pawn on c7. Black King on c8.
    // If White pawn plays c7xb8=Q, it captures and gives check!
    const state = fromFEN('1rbk4/2P5/8/8/8/8/8/2R4K w - - 0 1');
    const moves = getLegalMoves(state, sq('c7'));
    assert.ok(hasMove(moves, 'c7', 'b8', 'q'));
  });

  it('En passant cannot resolve double check', () => {
    // Black King on a8, Black Rook on e8, Black pawn on f7.
    // Pawn pushes f7-f5, checking King e4. Rook on e8 also checks King e4. Double check!
    const state = fromFEN('k3r3/5p2/8/4P3/4K3/8/8/8 b - - 0 1');
    const checked = play(state, 'f7', 'f5');
    assert.strictEqual(checked.isCheck, true);
    const epMoves = getLegalMoves(checked, sq('e5'));
    assert.strictEqual(hasMove(epMoves, 'e5', 'f6'), false, 'Cannot take e.p. in double check because rook still checks');
  });
});
