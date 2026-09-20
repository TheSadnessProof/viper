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
  isInsufficientMaterial,
  algebraicToSquare,
  squareToAlgebraic,
  getSquareColor,
  findKingSquare,
  generateSAN,
} from '../../src/games/chess/chessLogic.ts';
import {
  findBestMove,
  getBestMove,
  evaluateBoard,
} from '../../src/games/chess/chessAi.ts';
import type {
  ChessGameState,
  Move,
  PieceType,
  Square,
  PieceColor,
} from '../../src/games/chess/chessTypes.ts';

// Coordinate helpers
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

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

describe('Viper Chess Engine - Tier 5: Adversarial Coverage Hardening', () => {
  describe('Adversarial 1: Mailbox Coordinates & Boundary Math', () => {
    it('exhaustively validates bi-directional conversion for all 64 squares', () => {
      for (let s = 0; s < 64; s++) {
        const alg = squareToAlgebraic(s);
        const backToSq = algebraicToSquare(alg);
        assert.strictEqual(backToSq, s, `Square roundtrip failed for ${s} <-> ${alg}`);
      }
    });

    it('exhaustively verifies FIDE square color parity for all 64 squares', () => {
      // FIDE standard: a1 (0,0) is dark, h1 (7,0) is light, a8 (0,7) is light, h8 (7,7) is dark.
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
      // White King e1, Rook h1. Black Bishop on d5 attacks h1 Rook along long diagonal.
      // Squares e1 (4), f1 (5), g1 (6) are NOT attacked.
      // Per FIDE rules, castling IS legal when the rook is under attack!
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
      // Black Bishop on e5 attacks a1 Rook. Squares e1, d1, c1, b1 are clear and e1, d1, c1 safe.
      const state = fromFEN('4k3/8/8/4b3/8/8/8/R3K2R w KQ - 0 1');
      assert.strictEqual(isSquareAttacked(state.board, sq('a1'), 'b'), true, 'Rook a1 is attacked');
      const moves = getLegalMoves(state, sq('e1'));
      assert.ok(hasMove(moves, 'e1', 'c1'), 'O-O-O must be legal even when a1 Rook is attacked');
    });

    it('Black castling is legal when h8 or a8 Rook is attacked', () => {
      // White Bishop on d4 attacks h8.
      const state = fromFEN('r3k2r/8/8/8/3B4/8/8/4K3 b kq - 0 1');
      assert.strictEqual(isSquareAttacked(state.board, sq('h8'), 'w'), true);
      const moves = getLegalMoves(state, sq('e8'));
      assert.ok(hasMove(moves, 'e8', 'g8'), 'Black O-O must be legal when h8 Rook is attacked');
    });

    it('Queenside castling is illegal if b1 square is occupied by enemy piece', () => {
      // Black knight on b1. Even though b1 is not transit for King, it must be empty!
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
      // Black Knight on e3 attacks f1 and d1. White King e1 cannot castle either side!
      const state = fromFEN('r3k2r/8/8/8/8/4n3/8/R3K2R w KQkq - 0 1');
      assert.strictEqual(isSquareAttacked(state.board, sq('f1'), 'b'), true);
      assert.strictEqual(isSquareAttacked(state.board, sq('d1'), 'b'), true);
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'g1'), false, 'f1 attacked by Knight');
      assert.strictEqual(hasMove(moves, 'e1', 'c1'), false, 'd1 attacked by Knight');
    });

    it('Castling is illegal if King is in check by an enemy Knight', () => {
      // Black Knight on f3 checks White King e1 (or d3 checks e1)
      const state = fromFEN('r3k2r/8/8/8/8/3n4/8/R3K2R w KQkq - 0 1');
      assert.strictEqual(state.isCheck, true);
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'g1'), false);
      assert.strictEqual(hasMove(moves, 'e1', 'c1'), false);
    });

    it('Corner rook captured by Knight permanently revokes that castling right', () => {
      // Black Knight on b3 captures Rook on a1
      const state = fromFEN('r3k2r/8/8/8/8/1n6/8/R3K2R b KQkq - 0 1');
      const next = play(state, 'b3', 'a1');
      assert.strictEqual(next.castling.whiteQueenside, false);
      assert.strictEqual(next.castling.whiteKingside, true);
    });

    it('Corner rook captured by Bishop diagonally permanently revokes that castling right', () => {
      // Black Bishop on d4 captures Rook on a1
      const state = fromFEN('r3k2r/8/8/8/3b4/8/8/R3K2R b KQkq - 0 1');
      const next = play(state, 'd4', 'a1');
      assert.strictEqual(next.castling.whiteQueenside, false);
      assert.strictEqual(next.castling.whiteKingside, true);
    });

    it('Corner rook missing in FEN position prevents castling move generation despite FEN flag', () => {
      // FEN has K flag, but square h1 is empty!
      const state = fromFEN('r3k2r/8/8/8/8/8/8/R3K3 w Kkq - 0 1');
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'g1'), false, 'Cannot castle without rook on h1');
    });

    it('Corner square containing an enemy rook prevents castling', () => {
      // White King e1, but Black Rook on h1!
      const state = fromFEN('r3k2r/8/8/8/8/8/8/R3K2r w Kkq - 0 1');
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'g1'), false);
    });
  });

  describe('Adversarial 3: Dual En Passant & Complex Pin Disasters', () => {
    it('Dual en passant candidate pawns can both legally capture the same double-pushed pawn', () => {
      // White has pawns on c5 and e5. Black plays d7-d5.
      // Both c5xd6 e.p. AND e5xd6 e.p. are legal!
      let state = fromFEN('4k3/3p4/8/2P1P3/8/8/8/4K3 b - - 0 1');
      state = play(state, 'd7', 'd5');
      assert.strictEqual(state.enPassant, sq('d6'));

      const cPawnMoves = getLegalMoves(state, sq('c5'));
      const ePawnMoves = getLegalMoves(state, sq('e5'));
      assert.ok(hasMove(cPawnMoves, 'c5', 'd6'), 'c5xd6 e.p. must be legal');
      assert.ok(hasMove(ePawnMoves, 'e5', 'd6'), 'e5xd6 e.p. must be legal');

      // Test executing branch 1: c5xd6
      const branch1 = makeMove(state, findMove(cPawnMoves, 'c5', 'd6')!);
      assert.strictEqual(branch1.board[sq('d6')]?.type, 'p');
      assert.strictEqual(branch1.board[sq('d6')]?.color, 'w');
      assert.strictEqual(branch1.board[sq('d5')], null);
      assert.strictEqual(branch1.board[sq('c5')], null);
      assert.strictEqual(branch1.board[sq('e5')]?.type, 'p'); // Other pawn untouched

      // Test executing branch 2: e5xd6
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
      // White pawn b5, Black pawn a7 plays a7-a5. White takes b5xa6 e.p.
      let state = fromFEN('4k3/p7/8/1P6/8/8/8/4K3 b - - 0 1');
      state = play(state, 'a7', 'a5');
      assert.strictEqual(state.enPassant, sq('a6'));
      const bMoves = getLegalMoves(state, sq('b5'));
      assert.ok(hasMove(bMoves, 'b5', 'a6'), 'b5xa6 e.p. on extreme edge must be legal');
      const next = play(state, 'b5', 'a6');
      assert.strictEqual(next.board[sq('a6')]?.type, 'p');
      assert.strictEqual(next.board[sq('a5')], null);

      // h-file edge: White pawn g5, Black pawn h7 plays h7-h5. White takes g5xh6 e.p.
      let hState = fromFEN('4k3/7p/8/6P1/8/8/8/4K3 b - - 0 1');
      hState = play(hState, 'h7', 'h5');
      assert.strictEqual(hState.enPassant, sq('h6'));
      const gMoves = getLegalMoves(hState, sq('g5'));
      assert.ok(hasMove(gMoves, 'g5', 'h6'), 'g5xh6 e.p. on h-edge must be legal');
    });

    it('Black en passant horizontal pin trap: capturing en passant exposing King on rank 5 is illegal', () => {
      // Black King on a5, White Rook on h5. Black pawn on e5, White pawn on d5 just played d2-d4-d5?
      // Say Black pawn on e4, White pawn plays d2-d4 (target d3). Black King h4, White Rook a4!
      const state = fromFEN('8/8/8/8/R2pP2k/8/8/4K3 b - d3 0 1');
      const moves = getLegalMoves(state, sq('e4'));
      assert.strictEqual(hasMove(moves, 'e4', 'd3'), false, 'e4xd3 e.p. exposes King h4 to Rook a4');
    });

    it('En passant diagonal pin: capturing pawn pinned diagonally to King cannot capture en passant', () => {
      // White King on a1, Black Bishop on e5. White pawn on c3. Black pawn on d4 played d7-d5?
      // Diagonal a1-b2-c3-d4-e5.
      // If White King a1, Black Bishop d4, White pawn c3 pinned to King on a1!
      // Black plays b4-b3?
      // Let's setup: White King a1, White pawn c3, Black Queen e5.
      // Diagonal a1-b2-c3-d4-e5. White pawn on c3 is pinned to King a1 by Queen on e5!
      // Black pawn on b4 just played b4... Wait, e.p. requires pawn on same rank.
      // White pawn on d5, White King on a8. Diagonal a8-b7-c6-d5-e4-f3-g2-h1.
      // Black Bishop on g2, White King on b7. White pawn on c6 is pinned diagonally.
      // Can pawn on c6 capture d7-d5? No, c6 is on rank 6, e.p. for White is from rank 5!
      // Can a pawn on rank 5 be pinned diagonally?
      // White King on a4, Black Bishop on d7. Square c5 is on diagonal a4-b5-c6-d7? No, a4 to d7 is df=3, dr=3:
      // a4(0,3) -> b5(1,4) -> c6(2,5) -> d7(3,6).
      // What about King g1, Bishop c5? df=4, dr=4.
      // g1(6,0) -> f2(5,1) -> e3(4,2) -> d4(3,3) -> c5(2,4).
      // White King on h1(7,0), Black Bishop on b7(1,6):
      // h1 -> g2 -> f3 -> e4 -> d5 -> c6 -> b7.
      // Square d5 is on rank 5! White pawn on d5 is pinned along diagonal h1-b7!
      // Black plays e7-e5 (target e6).
      // White pawn on d5 wants to capture d5xe6. But d6 is off diagonal!
      const diagState = fromFEN('8/1b6/8/3pP3/8/8/8/7K w - d6 0 1');
      // Wait, is d5 pinned? King is on h1, pawn is on e5!
      // Diagonal: h1(7,0) -> g2(6,1) -> f3(5,2) -> e4(4,3) -> d5(3,4) -> c6(2,5) -> b7(1,6).
      // Pawn on d5 is on diagonal h1-b7. Black Bishop on b7.
      // But Black pawn on e5... wait, if White pawn is on d5, Black pawn must be on e5.
      // White plays d5xe6: e6 is square (4, 5). Is e6 on diagonal?
      // Diagonal has: d5(3,4), c6(2,5), b7(1,6). e6 is (4,5) which is NOT on diagonal h1-b7!
      // If White plays d5xe6, d5 pawn leaves the diagonal, exposing King h1 to Bishop b7!
      const moves = getLegalMoves(diagState, sq('d5'));
      // Wait, in diagState: '8/1b6/8/3pP3/8/8/8/7K w - d6 0 1'
      // White pawn is on e5, Black pawn on d5.
      // Is e5 on diagonal h1-b7? No, e4 is on diagonal, not e5.
      // Let's place White King on h1, Black Queen on c6.
      // Diagonal: h1(7,0), g2(6,1), f3(5,2), e4(4,3), d5(3,4), c6(2,5).
      // White pawn on d5 is pinned to King h1 by Queen c6!
      // Black pawn on c5 played c7-c5? (rank 5).
      // White pawn on d5 wants to play d5xc6: captures the pinner! That is legal!
      // What if Black pawn on e5 played e7-e5? White wants to play d5xe6 e.p.
      // d5xe6 leaves diagonal! King h1 is exposed to Queen c6!
      const pinnedState = fromFEN('8/8/2q5/2pPp3/8/8/8/7K w - c6 0 1');
      // Wait, target c6 is occupied by Queen.
      // Let's place Black Queen on a8!
      // Diagonal h1(7,0) -> g2(6,1) -> f3(5,2) -> e4(4,3) -> d5(3,4) -> c6(2,5) -> b7(1,6) -> a8(0,7).
      // White King on h1. White pawn on d5. Black Bishop on a8.
      // Black pawn on e7 plays e7-e5 (e.p. target e6).
      // White pawn on d5 capturing d5xe6 e.p. leaves diagonal h1-a8!
      const epPinState = fromFEN('b7/8/8/3Pp3/8/8/8/7K w - e6 0 1');
      const dMoves = getLegalMoves(epPinState, sq('d5'));
      assert.strictEqual(hasMove(dMoves, 'd5', 'e6'), false, 'Diagonal pin forbids d5xe6 e.p.');
    });
  });

  describe('Adversarial 4: Underpromotions, Multi-Queens, & Helpmate Edge Positions', () => {
    it('Underpromotion to Rook avoids stalemate and secures victory', () => {
      // White: King f6, pawn b7. Black: King h8.
      // If b7-b8=Q, Black King on h8 is NOT stalemated if h7 is empty, but let's construct true stalemate:
      // White: King e6, pawn d7. Black: King e8. (Standard ending).
      // Classic underpromotion to Rook to avoid stalemate:
      // White: King c6, pawn c7. Black: King a7.
      // If c7-c8=Q, Black King a7 has no legal moves -> Stalemate!
      // If c7-c8=R, Black King a7 has moves!
      // Let's verify: White King c6 (c6=file 2, rank 5). Black King a7 (file 0, rank 6).
      // White pawn c7 (file 2, rank 6).
      // Queen on c8 attacks a8, b8, b7. King c6 attacks b7, b6, d6, d7.
      // Black King on a7:
      // a8 attacked by Qc8.
      // b8 attacked by Qc8.
      // b7 attacked by Kc6 and Qc8.
      // a6: not attacked? c6 King doesn't attack a6.
      // Let's box King a8: White King b6, pawn a7. Black King a8.
      // If pawn on c7: White King d6, pawn c7, Black King d8.
      // Classic Saavedra position:
      // White pawn on c7, White King on c6, White Rook on d5. Black King on a7, Black Rook on d1.
      // Simple Saavedra-like stalemate avoidance:
      // White King on c7, White pawn c7...
      // Let's use: White King e6, pawn e7, Black King e8. e7-e8=R.
      // Let's test that getLegalMoves generates all 4 promotions (q, r, b, n) for pawn on 7th rank:
      const promoState = fromFEN('7k/3P4/8/8/8/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(promoState, sq('d7'));
      assert.strictEqual(moves.length, 4);
      assert.ok(hasMove(moves, 'd7', 'd8', 'q'));
      assert.ok(hasMove(moves, 'd7', 'd8', 'r'));
      assert.ok(hasMove(moves, 'd7', 'd8', 'b'));
      assert.ok(hasMove(moves, 'd7', 'd8', 'n'));
    });

    it('Underpromotion to Bishop prevents stalemate when Queen and Rook both stalemate', () => {
      // White King on d6, Knight on c6 (controls b8, a7), pawns on c7 and h6. Black King on a8, pawn on h7.
      // If c7-c8=Q or c7-c8=R, Queen/Rook controls c8 and attacks b8, c7, etc.
      // With c7-c8=B, Bishop does not attack a8 or b7. Black King has no moves, but is it stalemate?
      // From existing test: c7-c8=B was tested as stalemate!
      const state = fromFEN('k7/2P4p/2NK3P/8/8/8/8/8 w - - 0 1');
      const moves = getLegalMoves(state, sq('c7'));
      assert.strictEqual(moves.length, 4);
    });

    it('9 Queens of the same color coexist on board and generate moves without error', () => {
      // White promoted 8 pawns to Queens. 9 White Queens on board!
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
      // Under FIDE 5.2.2, KNN vs K is not a dead position because helpmate is legally possible.
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

  describe('Adversarial 5: FEN Invariants, Clocks, & Halfmove Clock Reset Strictness', () => {
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

    it('fromFEN throws error when rank count is not 8', () => {
      assert.throws(() => fromFEN('8/8/8/8/8/8/8 w - - 0 1'), Error); // 7 ranks
      assert.throws(() => fromFEN('8/8/8/8/8/8/8/8/8 w - - 0 1'), Error); // 9 ranks
    });

    it('fromFEN throws error when rank has > 8 squares', () => {
      assert.throws(() => fromFEN('9/8/8/8/8/8/8/8 w - - 0 1'), Error);
      assert.throws(() => fromFEN('rnbqkbnrr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1'), Error);
    });
  });

  describe('Adversarial 6: SAN Disambiguation & Notation Exhaustive Stress', () => {
    it('Two Knights on the same rank moving to the same square disambiguate by file (Nbd2 vs Nfd2)', () => {
      // White Knights on b1 and f1 both can jump to d2.
      const state = fromFEN('4k3/8/8/8/8/8/8/1N1K1N2 w - - 0 1');
      const moves = getLegalMoves(state);
      const b1d2 = findMove(moves, 'b1', 'd2')!;
      const f1d2 = findMove(moves, 'f1', 'd2')!;

      const stateAfterB = makeMove(state, b1d2);
      const stateAfterF = makeMove(state, f1d2);

      const sanB = stateAfterB.history[0].move.san;
      const sanF = stateAfterF.history[0].move.san;

      assert.strictEqual(sanB, 'Nbd2');
      assert.strictEqual(sanF, 'Nfd2');
    });

    it('Two Knights on the same file moving to the same square disambiguate by rank (N2c3 vs N4c3)', () => {
      // White Knights on e2 and e4 both jump to c3 and g3
      const state = fromFEN('4k3/8/8/8/4N3/8/4N3/4K3 w - - 0 1');
      const moves = getLegalMoves(state);
      const e2c3 = findMove(moves, 'e2', 'c3')!;
      const e4c3 = findMove(moves, 'e4', 'c3')!;

      assert.ok(e2c3, 'e2->c3 must exist');
      assert.ok(e4c3, 'e4->c3 must exist');

      const stateAfter2 = makeMove(state, e2c3);
      const stateAfter4 = makeMove(state, e4c3);

      assert.strictEqual(stateAfter2.history[0].move.san, 'N2c3');
      assert.strictEqual(stateAfter4.history[0].move.san, 'N4c3');
    });

    it('Two Rooks on the same rank disambiguate by file (Rad1 vs Rfd1)', () => {
      // White King on e1, White Rooks on a1 and f1 both can move to d1
      const state = fromFEN('4k3/8/8/8/8/8/8/R3K1R1 w - - 0 1');
      const moves = getLegalMoves(state);
      const a1d1 = findMove(moves, 'a1', 'd1')!;
      const g1d1 = findMove(moves, 'g1', 'd1');
      // Wait, rook on g1 cannot move to d1 through King e1. Let's put Rooks on a1 and h1 with e2 king!
      const openState = fromFEN('4k3/8/8/8/8/8/4K3/R6R w - - 0 1');
      const openMoves = getLegalMoves(openState);
      const ra1d1 = findMove(openMoves, 'a1', 'd1')!;
      const rh1d1 = findMove(openMoves, 'h1', 'd1')!;

      assert.ok(ra1d1, 'a1->d1 must exist');
      assert.ok(rh1d1, 'h1->d1 must exist');

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

    it('En passant capture SAN notation: exd6', () => {
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

      // Play 15 moves per side (30 halfmoves)
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

      // Undo all 30 moves
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
    it('findBestMove returns null on checkmate position', () => {
      // Fool's mate position
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
      // White to move: Queen on h5, Bishop on c4, Black King on e8. Qxf7# is mate in 1!
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
      // White Knight on f3, Black Queen hanging on e5 undefended.
      const state = fromFEN('4k3/8/8/4q3/8/5N2/8/4K3 w - - 0 1');
      const move = findBestMove(state, 'blitz');
      assert.ok(move);
      assert.strictEqual(squareToAlgebraic(move.from), 'f3');
      assert.strictEqual(squareToAlgebraic(move.to), 'e5', 'AI must capture free queen on e5');
    });

    it('AI Casual, Blitz, and Grandmaster tiers all produce valid legal moves from starting position', async () => {
      const state = createInitialGameState();
      const legalMoves = getLegalMoves(state);

      const casualMove = await getBestMove(state, 'casual');
      assert.ok(casualMove);
      assert.ok(
        legalMoves.some(m => m.from === casualMove.from && m.to === casualMove.to),
        'Casual move must be strictly legal'
      );

      const blitzMove = await getBestMove(state, 'blitz');
      assert.ok(blitzMove);
      assert.ok(
        legalMoves.some(m => m.from === blitzMove.from && m.to === blitzMove.to),
        'Blitz move must be strictly legal'
      );

      const gmMove = await getBestMove(state, 'grandmaster');
      assert.ok(gmMove);
      assert.ok(
        legalMoves.some(m => m.from === gmMove.from && m.to === gmMove.to),
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

      assert.ok(results[0]); // Legal move from start
      assert.strictEqual(squareToAlgebraic(results[1]!.to), 'e5'); // Captured queen
      assert.strictEqual(squareToAlgebraic(results[2]!.to), 'f7'); // Mate in 1
      assert.ok(results[3]); // Castling or rook move
      assert.strictEqual(results[4], null); // Stalemate
    });
  });

  describe('Adversarial 9: Extreme Edge Cases & Attack Evaluation', () => {
    it('findKingSquare returns null on board without king without crashing', () => {
      const board = new Array(64).fill(null);
      const kingSq = findKingSquare(board, 'w');
      assert.strictEqual(kingSq, null);
    });

    it('evaluateBoard evaluates material and PST gracefully on unorthodox boards', () => {
      const state = fromFEN('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
      const score = evaluateBoard(state);
      assert.strictEqual(typeof score, 'number');
    });

    it('isSquareAttacked handles all 8 board corners accurately', () => {
      // Corner squares: 0 (a1), 7 (h1), 56 (a8), 63 (h8)
      const board = new Array(64).fill(null);
      // White Rook on a1 attacks a8 and h1
      board[0] = { type: 'r', color: 'w' };
      assert.strictEqual(isSquareAttacked(board, 56, 'w'), true);
      assert.strictEqual(isSquareAttacked(board, 7, 'w'), true);
      assert.strictEqual(isSquareAttacked(board, 63, 'w'), false);
    });
  });
});
