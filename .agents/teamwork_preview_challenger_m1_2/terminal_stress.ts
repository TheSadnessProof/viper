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
  getSquareColor,
  algebraicToSquare,
  squareToAlgebraic,
} from '../../src/games/chess/chessLogic.ts';
import type {
  ChessGameState,
  Move,
  Piece,
  Square,
  PieceColor,
  PieceType,
} from '../../src/games/chess/chessTypes.ts';

function sq(name: string): Square {
  return algebraicToSquare(name);
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
    m => m.from === from && m.to === to && (!promotion || m.promotion === promotion)
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
        m =>
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

describe('Adversarial Stress Test: FIDE Terminal Conditions & Edge Cases', () => {
  // =========================================================================
  // 1. Fifty-Move Rule Exact Boundary & Resets
  // =========================================================================
  describe('Suite 1: Fifty-Move Rule Exact Boundary & Reset Mechanics', () => {
    it('1.1: halfmoveClock at 98 increments to 99 without triggering draw', () => {
      // White King on e1, Rook on a1; Black King on e8, Rook on a8
      const state = fromFEN('r3k3/8/8/8/8/8/8/R3K3 w - - 98 50');
      assert.strictEqual(state.halfmoveClock, 98);
      assert.strictEqual(state.isDraw, false);
      assert.strictEqual(state.drawReason, undefined);

      const next = play(state, 'a1', 'b1');
      assert.strictEqual(next.halfmoveClock, 99, 'halfmoveClock should be 99');
      assert.strictEqual(next.isDraw, false, 'halfmoveClock 99 must NOT be a draw');
      assert.strictEqual(next.drawReason, undefined);
    });

    it('1.2: halfmoveClock triggers fifty_move draw exactly on the 100th halfmove', () => {
      const state = fromFEN('r3k3/8/8/8/8/8/8/1R2K3 b - - 99 50');
      assert.strictEqual(state.halfmoveClock, 99);
      assert.strictEqual(state.isDraw, false);

      const next = play(state, 'a8', 'b8');
      assert.strictEqual(next.halfmoveClock, 100, 'halfmoveClock should reach 100');
      assert.strictEqual(next.isDraw, true, 'halfmoveClock 100 MUST trigger isDraw = true');
      assert.strictEqual(next.drawReason, 'fifty_move');
    });

    it('1.3: halfmoveClock resets to 0 on pawn move even at ply 99', () => {
      const state = fromFEN('4k3/8/8/8/8/8/4P3/4K3 w - - 99 50');
      assert.strictEqual(state.halfmoveClock, 99);

      const next = play(state, 'e2', 'e3');
      assert.strictEqual(next.halfmoveClock, 0, 'Pawn move must reset halfmoveClock to 0');
      assert.strictEqual(next.isDraw, false, 'Pawn move at 99 plies must avert draw');
      assert.strictEqual(next.drawReason, undefined);
    });

    it('1.4: halfmoveClock resets to 0 on regular capture even at ply 99', () => {
      // White Rook on g1, Black Knight on g4 along the open g-file
      const state = fromFEN('4k3/8/8/8/6n1/8/8/4K1R1 w - - 99 50');
      assert.strictEqual(state.halfmoveClock, 99);

      const next = play(state, 'g1', 'g4');
      assert.strictEqual(next.halfmoveClock, 0, 'Piece capture must reset halfmoveClock to 0');
      assert.strictEqual(next.isDraw, false, 'Capture at 99 plies must avert draw');
      assert.strictEqual(next.drawReason, undefined);
    });

    it('1.5: halfmoveClock resets to 0 on en passant capture at ply 99', () => {
      // White pawn on e5, Black pawn just played d7-d5 (enPassant = d6)
      const state = fromFEN('4k3/8/8/3pP3/8/8/8/4K3 w - d6 99 50');
      assert.strictEqual(state.halfmoveClock, 99);

      const next = play(state, 'e5', 'd6');
      assert.strictEqual(next.halfmoveClock, 0, 'En passant capture must reset halfmoveClock to 0');
      assert.strictEqual(next.isDraw, false, 'En passant at 99 plies must avert draw');
      assert.strictEqual(next.drawReason, undefined);
      assert.strictEqual(next.board[sq('d5')], null, 'Captured pawn must be removed');
    });

    it('1.6: Checkmate on the 100th halfmove supersedes fifty-move draw', () => {
      // Black King on h8, White Queen on g6, White King on h6
      // White plays Qg6-g7# on ply 99 -> resulting in checkmate at halfmoveClock 100
      const state = fromFEN('7k/8/6QK/8/8/8/8/8 w - - 99 50');
      assert.strictEqual(state.halfmoveClock, 99);

      const next = play(state, 'g6', 'g7');
      assert.strictEqual(next.halfmoveClock, 100);
      assert.strictEqual(next.isCheckmate, true, 'Must detect checkmate');
      assert.strictEqual(next.isDraw, false, 'Checkmate must take precedence over fifty-move draw');
      assert.strictEqual(next.drawReason, undefined);
      assert.strictEqual(next.history[next.history.length - 1].move.san, 'Qg7#');
    });

    it('1.7: undoMove cleanly unwinds 100-halfmove draw back to 99', () => {
      const state = fromFEN('r3k3/8/8/8/8/8/8/1R2K3 b - - 99 50');
      const next = play(state, 'a8', 'b8');
      assert.strictEqual(next.isDraw, true);
      assert.strictEqual(next.drawReason, 'fifty_move');

      const undone = undoMove(next);
      assert.strictEqual(undone.halfmoveClock, 99);
      assert.strictEqual(undone.isDraw, false, 'Undoing move 100 must un-draw the game');
      assert.strictEqual(undone.drawReason, undefined);
      assert.strictEqual(undone.turn, 'b');
    });

    it('1.8: Continuous simulation verifies exact boundary from ply 80 to 100', () => {
      // White King on e1, Rook on a1; Black King on e8, Rook on h8. Sufficient material (K+R vs K+R).
      // Start at halfmoveClock 80 (40 full moves completed).
      let state = fromFEN('r3k2r/8/8/8/8/8/8/R3K2R w - - 80 41');

      // 10 non-repeating 1-step moves each for White and Black rooks (20 plies total):
      const whiteMoves = [
        ['a1', 'a2'], ['a2', 'a3'], ['a3', 'a4'], ['a4', 'a5'], ['a5', 'b5'],
        ['b5', 'b4'], ['b4', 'b3'], ['b3', 'b2'], ['b2', 'b1'], ['b1', 'c1'],
      ];
      const blackMoves = [
        ['h8', 'h7'], ['h7', 'h6'], ['h6', 'h5'], ['h5', 'h4'], ['h4', 'g4'],
        ['g4', 'g5'], ['g5', 'g6'], ['g6', 'g7'], ['g7', 'g8'], ['g8', 'f8'],
      ];

      for (let i = 0; i < 10; i++) {
        const plyW = 80 + i * 2;
        assert.strictEqual(state.halfmoveClock, plyW);
        assert.strictEqual(state.isDraw, false, `Must not be draw at ply ${plyW}`);
        assert.strictEqual(state.drawReason, undefined);
        state = play(state, whiteMoves[i][0], whiteMoves[i][1]);

        const plyB = plyW + 1;
        assert.strictEqual(state.halfmoveClock, plyB);
        assert.strictEqual(state.isDraw, false, `Must not be draw at ply ${plyB}`);
        assert.strictEqual(state.drawReason, undefined);
        state = play(state, blackMoves[i][0], blackMoves[i][1]);
      }

      assert.strictEqual(state.halfmoveClock, 100);
      assert.strictEqual(state.isDraw, true, 'Must trigger fifty_move draw at exactly ply 100');
      assert.strictEqual(state.drawReason, 'fifty_move');
    });
  });

  // =========================================================================
  // 2. Threefold Repetition with Non-Consecutive Transpositions
  // =========================================================================
  describe('Suite 2: Threefold Repetition with Non-Consecutive Transpositions', () => {
    it('2.1: Transpositions occurring 12+ moves apart trigger threefold repetition', () => {
      let state = createInitialGameState();

      // Occurrence 1: Initial position (Move 0)

      // Maneuver A (12 plies): Knights circle via center and return
      // 1. Nf3 Nf6 2. Nd4 Nd5 3. Nb3 Nb6 4. Nd4 Nd5 5. Nf3 Nf6 6. Ng1 Ng8
      const seqA = [
        ['g1', 'f3'], ['g8', 'f6'],
        ['f3', 'd4'], ['f6', 'd5'],
        ['d4', 'b3'], ['d5', 'b6'],
        ['b3', 'd4'], ['b6', 'd5'],
        ['d4', 'f3'], ['d5', 'f6'],
        ['f3', 'g1'], ['f6', 'g8'],
      ];

      for (const [from, to] of seqA) {
        state = play(state, from, to);
      }

      // Occurrence 2: Starting position reached again after 12 plies
      assert.strictEqual(state.isDraw, false, 'Second occurrence must NOT trigger draw');
      assert.strictEqual(state.drawReason, undefined);

      // Maneuver B (16 plies): Knights maneuver via rim and return
      // 7. Nh3 Nh6 8. Nf4 Nf5 9. Nd5 Nd4 10. Ne3 Ne6 11. Nd5 Nd4 12. Nf4 Nf5 13. Nh3 Nh6 14. Ng1 Ng8
      const seqB = [
        ['g1', 'h3'], ['g8', 'h6'],
        ['h3', 'f4'], ['h6', 'f5'],
        ['f4', 'd5'], ['f5', 'd4'],
        ['d5', 'e3'], ['d4', 'e6'],
        ['e3', 'd5'], ['e6', 'd4'],
        ['d5', 'f4'], ['d4', 'f5'],
        ['f4', 'h3'], ['f5', 'h6'],
        ['h3', 'g1'], ['h6', 'g8'],
      ];

      for (let i = 0; i < seqB.length; i++) {
        const [from, to] = seqB[i];
        state = play(state, from, to);

        // Before the final move, isDraw must still be false
        if (i < seqB.length - 1) {
          assert.strictEqual(state.isDraw, false, `Move ${i} of seqB should not be draw`);
        }
      }

      // Occurrence 3: Starting position reached third time via completely different transposition!
      assert.strictEqual(state.isDraw, true, 'Third occurrence 16 plies later MUST trigger draw');
      assert.strictEqual(state.drawReason, 'threefold_repetition');
    });

    it('2.2: Lost castling rights prevent false threefold repetition match with starting state', () => {
      // Board with open rank 1 and 8: Rooks on corners, Kings on e1 and e8, castling rights KQkq
      let state = fromFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
      // Occurrence 1: position has castling rights KQkq

      // White Ke1-e2, Black Ke8-e7, White Ke2-e1, Black Ke7-e8
      // Kings return to original squares, BUT both lost castling rights!
      state = play(state, 'e1', 'e2');
      state = play(state, 'e8', 'e7');
      state = play(state, 'e2', 'e1');
      state = play(state, 'e7', 'e8');

      // Now on e1 and e8, but castling rights are '-'
      assert.strictEqual(state.castling.whiteKingside, false);
      assert.strictEqual(state.castling.whiteQueenside, false);
      assert.strictEqual(state.castling.blackKingside, false);
      assert.strictEqual(state.castling.blackQueenside, false);
      assert.strictEqual(state.isDraw, false, 'Must not be draw: castling rights changed from KQkq to -');

      // Now repeat the king dance twice more with castling rights '-'
      // Cycle 2:
      state = play(state, 'e1', 'e2');
      state = play(state, 'e8', 'e7');
      state = play(state, 'e2', 'e1');
      state = play(state, 'e7', 'e8');
      assert.strictEqual(state.isDraw, false, 'Second occurrence of no-castle position');

      // Cycle 3:
      state = play(state, 'e1', 'e2');
      state = play(state, 'e8', 'e7');
      state = play(state, 'e2', 'e1');
      state = play(state, 'e7', 'e8');

      // Now the no-castle position has occurred 3 times!
      assert.strictEqual(state.isDraw, true, 'Third occurrence of no-castle position must trigger draw');
      assert.strictEqual(state.drawReason, 'threefold_repetition');
    });

    it('2.3: Rook moving and returning permanently revokes castling rights and does not repeat initial position', () => {
      let state = fromFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
      // White Ra1-b1, Black Ra8-b8
      state = play(state, 'a1', 'b1');
      state = play(state, 'a8', 'b8');
      state = play(state, 'b1', 'a1');
      state = play(state, 'b8', 'a8');

      // White lost whiteQueenside castling; Black lost blackQueenside castling!
      assert.strictEqual(state.castling.whiteQueenside, false);
      assert.strictEqual(state.castling.whiteKingside, true);
      assert.strictEqual(state.castling.blackQueenside, false);
      assert.strictEqual(state.castling.blackKingside, true);
      assert.strictEqual(state.isDraw, false, 'Must not be draw because castling rights changed');

      // Kingside castling still legal!
      const whiteKingMoves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(whiteKingMoves, 'e1', 'g1'), true, 'White can still castle kingside');
    });

    it('2.4: undoMove cleanly rolls back a threefold repetition draw', () => {
      let state = createInitialGameState();
      const moves = [
        ['g1', 'f3'], ['g8', 'f6'],
        ['f3', 'g1'], ['f6', 'g8'], // 2nd occurrence of start
        ['g1', 'f3'], ['g8', 'f6'],
        ['f3', 'g1'], ['f6', 'g8'], // 3rd occurrence of start
      ];

      for (const [from, to] of moves) {
        state = play(state, from, to);
      }

      assert.strictEqual(state.isDraw, true);
      assert.strictEqual(state.drawReason, 'threefold_repetition');

      const undone = undoMove(state);
      assert.strictEqual(undone.isDraw, false, 'Undoing the move must revert draw');
      assert.strictEqual(undone.drawReason, undefined);
    });
  });

  // =========================================================================
  // 3. Insufficient Material Variations & Bishop Square Parity
  // =========================================================================
  describe('Suite 3: Insufficient Material Variations & Bishop Square Parity', () => {
    it('3.1: K vs K is insufficient material', () => {
      const state = fromFEN('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
      assert.strictEqual(isInsufficientMaterial(state.board), true);
      assert.strictEqual(state.isDraw, true);
      assert.strictEqual(state.drawReason, 'insufficient_material');
    });

    it('3.2: K+B vs K is insufficient material (both white and black bishops)', () => {
      // White bishop on light square
      const state1 = fromFEN('4k3/8/8/8/8/2B5/8/4K3 w - - 0 1');
      assert.strictEqual(isInsufficientMaterial(state1.board), true);
      assert.strictEqual(state1.isDraw, true);
      assert.strictEqual(state1.drawReason, 'insufficient_material');

      // White bishop on dark square
      const state2 = fromFEN('4k3/8/8/8/8/8/8/2B1K3 w - - 0 1');
      assert.strictEqual(isInsufficientMaterial(state2.board), true);

      // Black bishop on light square
      const state3 = fromFEN('4k3/5b2/8/8/8/8/8/4K3 w - - 0 1');
      assert.strictEqual(isInsufficientMaterial(state3.board), true);

      // Black bishop on dark square
      const state4 = fromFEN('4kb2/8/8/8/8/8/8/4K3 w - - 0 1');
      assert.strictEqual(isInsufficientMaterial(state4.board), true);
    });

    it('3.3: K+N vs K is insufficient material', () => {
      // White knight
      const state1 = fromFEN('4k3/8/8/8/4N3/8/8/4K3 w - - 0 1');
      assert.strictEqual(isInsufficientMaterial(state1.board), true);
      assert.strictEqual(state1.isDraw, true);
      assert.strictEqual(state1.drawReason, 'insufficient_material');

      // Black knight
      const state2 = fromFEN('4k3/8/8/8/4n3/8/8/4K3 w - - 0 1');
      assert.strictEqual(isInsufficientMaterial(state2.board), true);
    });

    it('3.4: K+B vs K+B on SAME color squares is insufficient material (both light squares)', () => {
      // c4 (file 2, rank 3 -> light: sum 5) and f5 (file 5, rank 4 -> light: sum 9)
      const whiteSq = sq('c4');
      const blackSq = sq('f5');
      assert.strictEqual(getSquareColor(whiteSq), 'light');
      assert.strictEqual(getSquareColor(blackSq), 'light');

      const state = fromFEN('4k3/8/8/5b2/2B5/8/8/4K3 w - - 0 1');
      assert.strictEqual(isInsufficientMaterial(state.board), true, 'Same light squares must be draw');
      assert.strictEqual(state.isDraw, true);
      assert.strictEqual(state.drawReason, 'insufficient_material');
    });

    it('3.5: K+B vs K+B on SAME color squares is insufficient material (both dark squares)', () => {
      // c1 (file 2, rank 0 -> dark: sum 2) and f8 (file 5, rank 7 -> dark: sum 12)
      const whiteSq = sq('c1');
      const blackSq = sq('f8');
      assert.strictEqual(getSquareColor(whiteSq), 'dark');
      assert.strictEqual(getSquareColor(blackSq), 'dark');

      const state = fromFEN('5b1k/8/8/8/8/8/8/2B1K3 w - - 0 1');
      assert.strictEqual(isInsufficientMaterial(state.board), true, 'Same dark squares must be draw');
      assert.strictEqual(state.isDraw, true);
      assert.strictEqual(state.drawReason, 'insufficient_material');
    });

    it('3.6: K+B vs K+B on OPPOSITE color squares is NOT insufficient material under FIDE', () => {
      // White bishop on c1 (dark), Black bishop on c8 (file 2, rank 7 -> light: sum 9)
      const whiteSq = sq('c1');
      const blackSq = sq('c8');
      assert.strictEqual(getSquareColor(whiteSq), 'dark');
      assert.strictEqual(getSquareColor(blackSq), 'light');

      const state = fromFEN('2b1k3/8/8/8/8/8/8/2B1K3 w - - 0 1');
      assert.strictEqual(
        isInsufficientMaterial(state.board),
        false,
        'Opposite color bishops CAN deliver mate (helpmate), so NOT insufficient material'
      );
      assert.strictEqual(state.isDraw, false);
      assert.strictEqual(state.drawReason, undefined);
    });

    it('3.7: K+N+N vs lone King is NOT insufficient material under FIDE rules', () => {
      const state = fromFEN('8/8/8/8/8/8/4NN2/k3K3 w - - 0 1');
      assert.strictEqual(
        isInsufficientMaterial(state.board),
        false,
        'Two knights vs lone king is not a dead position per FIDE'
      );
      assert.strictEqual(state.isDraw, false);
    });

    it('3.8: King + Pawn vs lone King is NOT insufficient material', () => {
      const state = fromFEN('4k3/8/8/8/4P3/8/8/4K3 w - - 0 1');
      assert.strictEqual(isInsufficientMaterial(state.board), false);
      assert.strictEqual(state.isDraw, false);
    });

    it('3.9: Lone King vs King + Queen is NOT insufficient material', () => {
      const state = fromFEN('4k3/8/8/8/4Q3/8/8/4K3 w - - 0 1');
      assert.strictEqual(isInsufficientMaterial(state.board), false);
      assert.strictEqual(state.isDraw, false);
    });

    it('3.10: Lone King vs King + Rook is NOT insufficient material', () => {
      const state = fromFEN('4k3/8/8/8/4R3/8/8/4K3 w - - 0 1');
      assert.strictEqual(isInsufficientMaterial(state.board), false);
      assert.strictEqual(state.isDraw, false);
    });

    it('3.11: Capturing the final pawn transitions state into insufficient material draw immediately', () => {
      // White King on e1, Bishop on c1. Black King on e8, Pawn on g5 (on diagonal c1-g5).
      // White plays Bc1xg5, leaving K+B vs K.
      const state = fromFEN('4k3/8/8/6p1/8/8/8/2B1K3 w - - 0 1');
      assert.strictEqual(state.isDraw, false);

      const next = play(state, 'c1', 'g5');
      assert.strictEqual(next.board[sq('g5')]?.type, 'b');
      assert.strictEqual(
        isInsufficientMaterial(next.board),
        true,
        'Material should now be insufficient (K+B vs K)'
      );
      assert.strictEqual(next.isDraw, true);
      assert.strictEqual(next.drawReason, 'insufficient_material');
    });
  });

  // =========================================================================
  // 4. King in Check Cannot Castle Under Any Circumstance
  // =========================================================================
  describe('Suite 4: King in Check Cannot Castle Under Any Circumstance', () => {
    it('4.1: White King in check along e-file by Rook cannot castle kingside or queenside', () => {
      const state = fromFEN('r3k2r/8/8/8/4r3/8/8/R3K2R w KQkq - 0 1');
      assert.strictEqual(state.isCheck, true);
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'g1'), false, 'Cannot castle kingside while in check');
      assert.strictEqual(hasMove(moves, 'e1', 'c1'), false, 'Cannot castle queenside while in check');
    });

    it('4.2: White King in check along diagonal by Bishop cannot castle', () => {
      const state = fromFEN('r3k2r/8/8/8/1b6/8/8/R3K2R w KQkq - 0 1');
      assert.strictEqual(state.isCheck, true);
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'g1'), false, 'Cannot castle kingside while in check');
      assert.strictEqual(hasMove(moves, 'e1', 'c1'), false, 'Cannot castle queenside while in check');
    });

    it('4.3: White King in check by Knight cannot castle', () => {
      const state = fromFEN('r3k2r/8/8/8/8/3n4/8/R3K2R w KQkq - 0 1');
      assert.strictEqual(state.isCheck, true);
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'g1'), false, 'Cannot castle kingside when checked by knight');
      assert.strictEqual(hasMove(moves, 'e1', 'c1'), false, 'Cannot castle queenside when checked by knight');
    });

    it('4.4: White King in check by Pawn cannot castle', () => {
      const state = fromFEN('r3k2r/8/8/8/8/8/3p4/R3K2R w KQkq - 0 1');
      assert.strictEqual(state.isCheck, true);
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'g1'), false, 'Cannot castle kingside when checked by pawn');
      assert.strictEqual(hasMove(moves, 'e1', 'c1'), false, 'Cannot castle queenside when checked by pawn');
    });

    it('4.5: Black King in check along e-file cannot castle kingside or queenside', () => {
      const state = fromFEN('r3k2r/8/8/4R3/8/8/8/R3K2R b KQkq - 0 1');
      assert.strictEqual(state.isCheck, true);
      const moves = getLegalMoves(state, sq('e8'));
      assert.strictEqual(hasMove(moves, 'e8', 'g8'), false, 'Black cannot castle O-O in check');
      assert.strictEqual(hasMove(moves, 'e8', 'c8'), false, 'Black cannot castle O-O-O in check');
    });

    it('4.6: Black King in check by Knight cannot castle', () => {
      const state = fromFEN('r3k2r/8/3N4/8/8/8/8/R3K2R b KQkq - 0 1');
      assert.strictEqual(state.isCheck, true);
      const moves = getLegalMoves(state, sq('e8'));
      assert.strictEqual(hasMove(moves, 'e8', 'g8'), false, 'Black cannot castle O-O checked by knight');
      assert.strictEqual(hasMove(moves, 'e8', 'c8'), false, 'Black cannot castle O-O-O checked by knight');
    });

    it('4.7: Castling forbidden even if the checking piece is pinned to opponent king', () => {
      // White King on e1. Black Rook on e3 gives check to White King on e1.
      // But Black Rook on e3 is pinned to Black King on e8 by White Queen on e7!
      // Per FIDE Art 3.9, check still counts, so White King cannot castle!
      const state = fromFEN('4k3/4Q3/8/8/8/4r3/8/R3K2R w KQ - 0 1');
      assert.strictEqual(state.isCheck, true);
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'g1'), false, 'Cannot castle even if checker is pinned');
      assert.strictEqual(hasMove(moves, 'e1', 'c1'), false, 'Cannot castle even if checker is pinned');
    });

    it('4.8: Castling cannot be used to escape check even if castling rook would attack checking piece', () => {
      // Black Bishop on a5 checks White King on e1.
      // If White could castle queenside e1-c1, Rook on d1 would attack the checking Bishop!
      // But castling out of check is completely illegal under FIDE!
      const state = fromFEN('4k3/8/8/b7/8/8/8/R3K2R w KQ - 0 1');
      assert.strictEqual(state.isCheck, true);
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'c1'), false, 'Cannot castle out of check even if rook counter-attacks');
    });

    it('4.9: Transit square attacked prevents castling', () => {
      // f1 attacked by Black Bishop on a6
      const state = fromFEN('r3k2r/8/b7/8/8/8/8/R3K2R w KQkq - 0 1');
      assert.strictEqual(isSquareAttacked(state.board, sq('f1'), 'b'), true);
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'g1'), false, 'Cannot castle O-O through attacked f1');
      assert.strictEqual(hasMove(moves, 'e1', 'c1'), true, 'Queenside should still be legal if path clear');
    });

    it('4.10: Landing square attacked prevents castling', () => {
      // g1 attacked by Black Bishop on c5
      const state = fromFEN('r3k2r/8/8/2b5/8/8/8/R3K2R w KQkq - 0 1');
      assert.strictEqual(isSquareAttacked(state.board, sq('g1'), 'b'), true);
      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(hasMove(moves, 'e1', 'g1'), false, 'Cannot castle O-O into attacked g1');
    });

    it('4.11: Non-transit b1 square attacked DOES NOT prevent queenside castling', () => {
      // Black Bishop on f5 attacks b1 (file 1, rank 0).
      // Kingside path is e1(4)->d1(3)->c1(2). b1 is only passed by the Rook.
      // Under FIDE rules, Rook passing through attacked square is 100% legal!
      const state = fromFEN('r3k2r/8/8/5b2/8/8/8/R3K2R w KQkq - 0 1');
      assert.strictEqual(isSquareAttacked(state.board, sq('b1'), 'b'), true);
      assert.strictEqual(isSquareAttacked(state.board, sq('c1'), 'b'), false);
      assert.strictEqual(isSquareAttacked(state.board, sq('d1'), 'b'), false);
      assert.strictEqual(isSquareAttacked(state.board, sq('e1'), 'b'), false);

      const moves = getLegalMoves(state, sq('e1'));
      assert.strictEqual(
        hasMove(moves, 'e1', 'c1'),
        true,
        'Queenside castling MUST be legal when only b1 is attacked'
      );
    });
  });

  // =========================================================================
  // 5. En Passant Horizontal Pin Trap & Pin Variants
  // =========================================================================
  describe('Suite 5: En Passant Horizontal Pin Trap & Non-Standard Pins', () => {
    it('5.1: White en passant horizontal pin trap: capture is strictly illegal', () => {
      // Rank 5: Ra5, d5 (black pawn), e5 (white pawn), Kh5.
      // Black just played d7-d5 (enPassant = d6).
      // If White plays e5xd6 e.p., both d5 and e5 vanish from rank 5, exposing Kh5 to Ra5!
      // Also place Black Knight on e6 to block pawn push e5-e6.
      const state = fromFEN('8/8/4n3/r2pP2K/8/8/8/8 w - d6 0 1');
      assert.strictEqual(state.enPassant, sq('d6'));
      assert.strictEqual(state.isCheck, false);

      const moves = getLegalMoves(state, sq('e5'));
      assert.strictEqual(
        hasMove(moves, 'e5', 'd6'),
        false,
        'e5xd6 e.p. must be forbidden because it leaves White King in check from Ra5'
      );
      assert.strictEqual(moves.length, 0, 'Fully pinned pawn on e5 has 0 legal moves');
    });

    it('5.2: Black en passant horizontal pin trap: capture is strictly illegal', () => {
      // Rank 4: Ra4, d4 (white pawn), e4 (black pawn), Kh4.
      // White just played d2-d4 (enPassant = d3).
      // If Black plays e4xd3 e.p., both d4 and e4 vanish from rank 4, exposing Kh4 to Ra4!
      // Also place White Knight on e3 to block pawn push e4-e3.
      const state = fromFEN('8/8/8/8/R2Pp2k/4N3/8/8 b - d3 0 1');
      assert.strictEqual(state.enPassant, sq('d3'));
      assert.strictEqual(state.isCheck, false);

      const moves = getLegalMoves(state, sq('e4'));
      assert.strictEqual(
        hasMove(moves, 'e4', 'd3'),
        false,
        'e4xd3 e.p. must be forbidden because it leaves Black King in check from Ra4'
      );
      assert.strictEqual(moves.length, 0, 'Fully pinned pawn on e4 has 0 legal moves');
    });

    it('5.3: Horizontal pin with Queen instead of Rook forbids en passant', () => {
      // Rank 5: Qa5, g5 (black pawn), f5 (white pawn), Kh5.
      // Black just played g7-g5 (enPassant = g6).
      const state = fromFEN('8/8/8/q4p1K/8/8/8/8 w - g6 0 1');
      state.board[sq('g5')] = { color: 'b', type: 'p' };
      state.enPassant = sq('g6');

      const moves = getLegalMoves(state, sq('f5'));
      assert.strictEqual(
        hasMove(moves, 'f5', 'g6'),
        false,
        'f5xg6 e.p. must be forbidden because Queen on a5 pins horizontally'
      );
    });

    it('5.4: Non-sliding piece on pin rank DOES NOT forbid en passant', () => {
      // Replace Rook on a5 with Knight on a5: Knight does not slide along rank!
      const state = fromFEN('8/8/8/n2pP2K/8/8/8/8 w - d6 0 1');
      const moves = getLegalMoves(state, sq('e5'));
      assert.strictEqual(
        hasMove(moves, 'e5', 'd6'),
        true,
        'e5xd6 e.p. must be legal when attacker is a Knight'
      );
    });

    it('5.5: King on a different rank DOES NOT trigger pin trap', () => {
      // King on h6 instead of h5: King is not on rank 5!
      const state = fromFEN('8/8/7K/r2pP3/8/8/8/8 w - d6 0 1');
      const moves = getLegalMoves(state, sq('e5'));
      assert.strictEqual(
        hasMove(moves, 'e5', 'd6'),
        true,
        'e5xd6 e.p. must be legal when King is on rank 6'
      );
    });

    it('5.6: En passant vertical pin forbids capture', () => {
      // White King on e1, Black Queen on e8. White Pawn on e5.
      // Black Pawn moves d7-d5. If White plays e5xd6 e.p., White pawn vacates e-file!
      const state = fromFEN('4q3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
      const moves = getLegalMoves(state, sq('e5'));
      assert.strictEqual(
        hasMove(moves, 'e5', 'd6'),
        false,
        'e5xd6 e.p. must be forbidden because pawn is vertically pinned along e-file'
      );
    });

    it('5.7: En passant diagonal pin forbids capture', () => {
      // White King on g1 (6,0), Black Bishop on a7 (0,6).
      // Ray from g1 to a7: (6,0)->(5,1)->(4,2)->(3,3)=d4.
      // White Pawn on d4 (3,3) is pinned to Kg1 along the diagonal.
      // Black Pawn on e5 just played e7-e5 (enPassant = e6, at 4,5).
      // Pushing d4xe6 e.p. to (4,5) moves off the diagonal ray!
      const diagState = fromFEN('8/b7/8/4p3/3P4/8/8/6K1 w - e6 0 1');
      diagState.enPassant = sq('e6');
      const diagMoves = getLegalMoves(diagState, sq('d4'));
      assert.strictEqual(
        hasMove(diagMoves, 'd4', 'e6'),
        false,
        'd4xe6 e.p. off diagonal pin ray is illegal'
      );
    });
  });

  // =========================================================================
  // 6. Pawn Promotion Variations (Check, Checkmate, Stalemate)
  // =========================================================================
  describe('Suite 6: Pawn Promotion Variations (Check, Checkmate, Stalemate)', () => {
    it('6.1: Promotion to Queen delivering check adds + suffix and sets isCheck = true', () => {
      // White King on e1, Pawn on e7. Black King on d8.
      // White plays e7-e8=Q+. Queen on e8 checks King on d8.
      const state = fromFEN('3k4/4P3/8/8/8/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e7'));
      assert.strictEqual(hasMove(moves, 'e7', 'e8', 'q'), true);

      const next = play(state, 'e7', 'e8', 'q');
      assert.strictEqual(next.isCheck, true);
      assert.strictEqual(next.isCheckmate, false);
      assert.strictEqual(next.history[next.history.length - 1].move.san, 'e8=Q+');
    });

    it('6.2: Underpromotion to Knight delivering check adds + suffix', () => {
      // Black King on c7. White Pawn on e7.
      // e7-e8=N checks c7 (e8 to c7 is knight hop: df=-2, dr=-1).
      const state = fromFEN('8/2k1P3/8/8/8/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e7'));
      assert.strictEqual(hasMove(moves, 'e7', 'e8', 'n'), true);

      const next = play(state, 'e7', 'e8', 'n');
      assert.strictEqual(next.isCheck, true);
      assert.strictEqual(next.history[next.history.length - 1].move.san, 'e8=N+');
    });

    it('6.3: Promotion to Queen delivering checkmate adds # suffix and sets isCheckmate = true', () => {
      // Black King on h8, pawns on g7, h7. White Queen on e7, Pawn on f7.
      // White plays f7-f8=Q#.
      const state = fromFEN('7k/4QPpp/8/8/8/8/8/4K3 w - - 0 1');
      const next = play(state, 'f7', 'f8', 'q');
      assert.strictEqual(next.isCheckmate, true);
      assert.strictEqual(next.isCheck, true);
      assert.strictEqual(next.history[next.history.length - 1].move.san, 'f8=Q#');
    });

    it('6.4: Underpromotion to Knight delivering smothered checkmate', () => {
      // Black King on c7 completely boxed in by friendly pieces.
      // Rank 8: 1brn4 (b8=b, c8=r, d8=n)
      // Rank 7: 1pkpP3 (b7=p, c7=k, d7=p, e7=P)
      // Rank 6: 1ppp4 (b6=p, c6=p, d6=p)
      // White plays e7-e8=N# -> Knight on e8 delivers smothered mate to c7!
      const state = fromFEN('1brn4/1pkpP3/1ppp4/8/8/8/8/K7 w - - 0 1');
      const moves = getLegalMoves(state, sq('e7'));
      assert.strictEqual(hasMove(moves, 'e7', 'e8', 'n'), true);

      const next = play(state, 'e7', 'e8', 'n');
      assert.strictEqual(next.isCheckmate, true, 'e8=N# must be checkmate');
      assert.strictEqual(next.isCheck, true);
      assert.strictEqual(next.history[next.history.length - 1].move.san, 'e8=N#');
    });

    it('6.5: Underpromotion to Bishop causing stalemate evaluates to draw and stalemate', () => {
      // White King on f7, White Pawn on g7. Black King on h8.
      // White plays g7-g8=B.
      // Bishop on g8 is protected by Kf7.
      // Bishop on g8 does NOT check h8 (not on diagonal).
      // King on h8 has no legal moves (g8 protected, g7 covered by Kf7, h7 covered by Bg8).
      // Stalemate!
      const state = fromFEN('7k/5KP1/8/8/8/8/8/8 w - - 0 1');
      const next = play(state, 'g7', 'g8', 'b');
      assert.strictEqual(next.isCheck, false, 'Bishop on g8 does not attack h8');
      assert.strictEqual(next.isStalemate, true, 'Opponent king has 0 moves and not in check');
      assert.strictEqual(next.isDraw, true);
      assert.strictEqual(next.drawReason, 'stalemate');
      assert.strictEqual(next.history[next.history.length - 1].move.san, 'g8=B');
    });

    it('6.6: Promotion to Queen causing stalemate on cornered opponent King', () => {
      // Black King on a1, Black Pawn on a2 blocked by White Pawn on a3.
      // White King on c2 controls b1, b2.
      // White Pawn on e7 promotes to e8=Q.
      // Queen on e8 does NOT check King on a1.
      // Black has 0 legal moves and is not in check -> Stalemate!
      const qStalemate = fromFEN('8/4P3/8/8/8/P7/p1K5/k7 w - - 0 1');
      const nextQ = play(qStalemate, 'e7', 'e8', 'q');
      assert.strictEqual(nextQ.isCheck, false, 'Queen on e8 does not check King on a1');
      assert.strictEqual(nextQ.isStalemate, true, 'Black King on a1 is stalemated');
      assert.strictEqual(nextQ.isDraw, true);
      assert.strictEqual(nextQ.drawReason, 'stalemate');
      assert.strictEqual(nextQ.history[nextQ.history.length - 1].move.san, 'e8=Q');
    });

    it('6.7: Pinned pawn on 7th rank cannot promote if exposing friendly King to check', () => {
      // White King on e1, White Pawn on e7, Black Rook on e8.
      // Pawn on e7 is pinned along e-file to King on e1!
      // Capturing e7xd8 if d8 has a piece leaves the e-file and exposes King on e1 to Rook on e8.
      const state = fromFEN('3nr3/4P3/8/8/8/8/8/4K3 w - - 0 1');
      const moves = getLegalMoves(state, sq('e7'));
      assert.strictEqual(moves.length, 0, 'Pinned pawn on e7 cannot promote off the pin line');
    });
  });
});
