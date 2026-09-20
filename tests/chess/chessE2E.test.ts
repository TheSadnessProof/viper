import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialGameState,
  getLegalMoves,
  makeMove,
  undoMove,
  toFEN,
  fromFEN,
} from '../../src/games/chess/chessLogic.ts';
import type {
  ChessGameState,
  Move,
  Square,
  PieceType,
} from '../../src/games/chess/chessTypes.ts';

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

describe('Viper Chess Engine - Tier 4: Real-World Match Scenarios', () => {
  it('Scenario 1: Scholar\'s Mate (4-Move Checkmate)', () => {
    let state = createInitialGameState();
    state = play(state, 'e2', 'e4');
    state = play(state, 'e7', 'e5');
    state = play(state, 'd1', 'h5');
    state = play(state, 'b8', 'c6');
    state = play(state, 'f1', 'c4');
    state = play(state, 'g8', 'f6');
    state = play(state, 'h5', 'f7');

    assert.strictEqual(state.isCheck, true, 'Black King must be in check');
    assert.strictEqual(state.isCheckmate, true, 'Black must be checkmated');
    assert.strictEqual(state.turn, 'b');
    assert.strictEqual(getLegalMoves(state).length, 0, 'No legal moves allowed in checkmate');
  });

  it('Scenario 2: Fool\'s Mate (Shortest 2-Move Checkmate)', () => {
    let state = createInitialGameState();
    state = play(state, 'f2', 'f3');
    state = play(state, 'e7', 'e5');
    state = play(state, 'g2', 'g4');
    state = play(state, 'd8', 'h4');

    assert.strictEqual(state.isCheck, true, 'White King must be in check');
    assert.strictEqual(state.isCheckmate, true, 'White must be checkmated');
    assert.strictEqual(state.turn, 'w');
    assert.strictEqual(getLegalMoves(state).length, 0);
  });

  it('Scenario 3: Légal\'s Pseudo-Sacrifice Mate (7 Moves)', () => {
    let state = createInitialGameState();
    state = play(state, 'e2', 'e4');
    state = play(state, 'e7', 'e5');
    state = play(state, 'g1', 'f3');
    state = play(state, 'd7', 'd6');
    state = play(state, 'f1', 'c4');
    state = play(state, 'c8', 'g4');
    state = play(state, 'b1', 'c3');
    state = play(state, 'g7', 'g6');
    state = play(state, 'f3', 'e5'); // Pseudo queen sacrifice
    state = play(state, 'g4', 'd1'); // Black accepts: takes Queen
    state = play(state, 'c4', 'f7'); // Bxf7+
    assert.strictEqual(state.isCheck, true);
    state = play(state, 'e8', 'e7');
    state = play(state, 'c3', 'd5'); // Nd5#

    assert.strictEqual(state.isCheck, true);
    assert.strictEqual(state.isCheckmate, true);
    assert.strictEqual(state.turn, 'b');
    assert.strictEqual(getLegalMoves(state).length, 0);
  });

  it('Scenario 4: The Opera Game (Morphy vs Duke Karl / Count Isouard, 1858, 17 Moves Checkmate)', () => {
    let state = createInitialGameState();
    // 1. e4 e5
    state = play(state, 'e2', 'e4');
    state = play(state, 'e7', 'e5');
    // 2. Nf3 d6
    state = play(state, 'g1', 'f3');
    state = play(state, 'd7', 'd6');
    // 3. d4 Bg4
    state = play(state, 'd2', 'd4');
    state = play(state, 'c8', 'g4');
    // 4. dxe5 Bxf3
    state = play(state, 'd4', 'e5');
    state = play(state, 'g4', 'f3');
    // 5. Qxf3 dxe5
    state = play(state, 'd1', 'f3');
    state = play(state, 'd6', 'e5');
    // 6. Bc4 Nf6
    state = play(state, 'f1', 'c4');
    state = play(state, 'g8', 'f6');
    // 7. Qb3 Qe7
    state = play(state, 'f3', 'b3');
    state = play(state, 'd8', 'e7');
    // 8. Nc3 c6
    state = play(state, 'b1', 'c3');
    state = play(state, 'c7', 'c6');
    // 9. Bg5 b5
    state = play(state, 'c1', 'g5');
    state = play(state, 'b7', 'b5');
    // 10. Nxb5 cxb5
    state = play(state, 'c3', 'b5');
    state = play(state, 'c6', 'b5');
    // 11. Bxb5+ Nbd7
    state = play(state, 'c4', 'b5');
    assert.strictEqual(state.isCheck, true);
    state = play(state, 'b8', 'd7');
    // 12. O-O-O Rd8
    state = play(state, 'e1', 'c1'); // Queenside castling under attack!
    state = play(state, 'a8', 'd8');
    // 13. Rxd7 Rxd7
    state = play(state, 'd1', 'd7');
    state = play(state, 'd8', 'd7');
    // 14. Rd1 Qe6
    state = play(state, 'h1', 'd1');
    state = play(state, 'e7', 'e6');
    // 15. Bxd7+ Nxd7
    state = play(state, 'b5', 'd7');
    assert.strictEqual(state.isCheck, true);
    state = play(state, 'f6', 'd7');
    // 16. Qb8+ Nxb8
    state = play(state, 'b3', 'b8'); // Queen sacrifice!
    assert.strictEqual(state.isCheck, true);
    state = play(state, 'd7', 'b8');
    // 17. Rd8#
    state = play(state, 'd1', 'd8');

    assert.strictEqual(state.isCheck, true);
    assert.strictEqual(state.isCheckmate, true);
    assert.strictEqual(state.turn, 'b');
    assert.strictEqual(getLegalMoves(state).length, 0);
  });

  it('Scenario 5: The Immortal Game (Anderssen vs Kieseritzky, 1851, 23 Moves Checkmate)', () => {
    let state = createInitialGameState();
    // 1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5
    state = play(state, 'e2', 'e4');
    state = play(state, 'e7', 'e5');
    state = play(state, 'f2', 'f4');
    state = play(state, 'e5', 'f4');
    state = play(state, 'f1', 'c4');
    state = play(state, 'd8', 'h4');
    assert.strictEqual(state.isCheck, true);
    state = play(state, 'e1', 'f1');
    state = play(state, 'b7', 'b5');
    // 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5
    state = play(state, 'c4', 'b5');
    state = play(state, 'g8', 'f6');
    state = play(state, 'g1', 'f3');
    state = play(state, 'h4', 'h6');
    state = play(state, 'd2', 'd3');
    state = play(state, 'f6', 'h5');
    // 8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6
    state = play(state, 'f3', 'h4');
    state = play(state, 'h6', 'g5');
    state = play(state, 'h4', 'f5');
    state = play(state, 'c7', 'c6');
    state = play(state, 'g2', 'g4');
    state = play(state, 'h5', 'f6');
    // 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5
    state = play(state, 'h1', 'g1');
    state = play(state, 'c6', 'b5');
    state = play(state, 'h2', 'h4');
    state = play(state, 'g5', 'g6');
    state = play(state, 'h4', 'h5');
    state = play(state, 'g6', 'g5');
    // 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5
    state = play(state, 'd1', 'f3');
    state = play(state, 'f6', 'g8');
    state = play(state, 'c1', 'f4');
    state = play(state, 'g5', 'f6');
    state = play(state, 'b1', 'c3');
    state = play(state, 'f8', 'c5');
    // 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+
    state = play(state, 'c3', 'd5');
    state = play(state, 'f6', 'b2');
    state = play(state, 'f4', 'd6');
    state = play(state, 'c5', 'g1');
    state = play(state, 'e4', 'e5');
    state = play(state, 'b2', 'a1');
    assert.strictEqual(state.isCheck, true);
    // 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7#
    state = play(state, 'f1', 'e2');
    state = play(state, 'b8', 'a6');
    state = play(state, 'f5', 'g7');
    assert.strictEqual(state.isCheck, true);
    state = play(state, 'e8', 'd8');
    state = play(state, 'f3', 'f6');
    assert.strictEqual(state.isCheck, true);
    state = play(state, 'g8', 'f6');
    state = play(state, 'd6', 'e7');

    assert.strictEqual(state.isCheck, true);
    assert.strictEqual(state.isCheckmate, true);
    assert.strictEqual(state.turn, 'b');
  });

  it('Scenario 6: The Game of the Century (Byrne vs Fischer, 1956, 41 Moves Checkmate)', () => {
    let state = createInitialGameState();
    // 1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O
    state = play(state, 'g1', 'f3');
    state = play(state, 'g8', 'f6');
    state = play(state, 'c2', 'c4');
    state = play(state, 'g7', 'g6');
    state = play(state, 'b1', 'c3');
    state = play(state, 'f8', 'g7');
    state = play(state, 'd2', 'd4');
    state = play(state, 'e8', 'g8');
    // 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6
    state = play(state, 'c1', 'f4');
    state = play(state, 'd7', 'd5');
    state = play(state, 'd1', 'b3');
    state = play(state, 'd5', 'c4');
    state = play(state, 'b3', 'c4');
    state = play(state, 'c7', 'c6');
    // 8. e4 Nbd7 9. Rd1 Nb6 10. Qc5 Bg4
    state = play(state, 'e2', 'e4');
    state = play(state, 'b8', 'd7');
    state = play(state, 'a1', 'd1');
    state = play(state, 'd7', 'b6');
    state = play(state, 'c4', 'c5');
    state = play(state, 'c8', 'g4');
    // 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4
    state = play(state, 'f4', 'g5');
    state = play(state, 'b6', 'a4');
    state = play(state, 'c5', 'a3');
    state = play(state, 'a4', 'c3');
    state = play(state, 'b2', 'c3');
    state = play(state, 'f6', 'e4');
    // 14. Bxe7 Qb6 15. Bc4 Nxc3 16. Bc5 Rfe8+
    state = play(state, 'g5', 'e7');
    state = play(state, 'd8', 'b6');
    state = play(state, 'f1', 'c4');
    state = play(state, 'e4', 'c3');
    state = play(state, 'e7', 'c5');
    state = play(state, 'f8', 'e8');
    assert.strictEqual(state.isCheck, true);
    // 17. Kf1 Be6 18. Bxb6 Bxc4+ 19. Kg1 Ne2+
    state = play(state, 'e1', 'f1');
    state = play(state, 'g4', 'e6');
    state = play(state, 'c5', 'b6'); // Queen taken!
    state = play(state, 'e6', 'c4');
    assert.strictEqual(state.isCheck, true);
    state = play(state, 'f1', 'g1');
    state = play(state, 'c3', 'e2');
    assert.strictEqual(state.isCheck, true);
    // 20. Kf1 Nxd4+ 21. Kg1 Ne2+ 22. Kf1 Nc3+ 23. Kg1 axb6
    state = play(state, 'g1', 'f1');
    state = play(state, 'e2', 'd4');
    assert.strictEqual(state.isCheck, true);
    state = play(state, 'f1', 'g1');
    state = play(state, 'd4', 'e2');
    assert.strictEqual(state.isCheck, true);
    state = play(state, 'g1', 'f1');
    state = play(state, 'e2', 'c3');
    assert.strictEqual(state.isCheck, true);
    state = play(state, 'f1', 'g1');
    state = play(state, 'a7', 'b6');
    // 24. Qb4 Ra4 25. Qxb6 Nxd1 26. h3 Rxa2
    state = play(state, 'a3', 'b4');
    state = play(state, 'a8', 'a4');
    state = play(state, 'b4', 'b6');
    state = play(state, 'c3', 'd1');
    state = play(state, 'h2', 'h3');
    state = play(state, 'a4', 'a2');
    // 27. Kh2 Nxf2 28. Re1 Rxe1 29. Qd8+ Bf8
    state = play(state, 'g1', 'h2');
    state = play(state, 'd1', 'f2');
    state = play(state, 'h1', 'e1');
    state = play(state, 'e8', 'e1');
    state = play(state, 'b6', 'd8');
    assert.strictEqual(state.isCheck, true);
    state = play(state, 'g7', 'f8');
    // 30. Nxe1 Bd5 31. Nf3 Ne4 32. Qb8 b5
    state = play(state, 'f3', 'e1');
    state = play(state, 'c4', 'd5');
    state = play(state, 'e1', 'f3');
    state = play(state, 'f2', 'e4');
    state = play(state, 'd8', 'b8');
    state = play(state, 'b7', 'b5');
    // 33. h4 h5 34. Ne5 Kg7 35. Kg1 Bc5+
    state = play(state, 'h3', 'h4');
    state = play(state, 'h7', 'h5');
    state = play(state, 'f3', 'e5');
    state = play(state, 'g8', 'g7');
    state = play(state, 'h2', 'g1');
    state = play(state, 'f8', 'c5');
    assert.strictEqual(state.isCheck, true);
    // 36. Kf1 Ng3+ 37. Ke1 Bb4+ 38. Kd1 Bb3+
    state = play(state, 'g1', 'f1');
    state = play(state, 'e4', 'g3');
    assert.strictEqual(state.isCheck, true);
    state = play(state, 'f1', 'e1');
    state = play(state, 'c5', 'b4');
    assert.strictEqual(state.isCheck, true);
    state = play(state, 'e1', 'd1');
    state = play(state, 'd5', 'b3');
    assert.strictEqual(state.isCheck, true);
    // 39. Kc1 Ne2+ 40. Kb1 Nc3+ 41. Kc1 Rc2#
    state = play(state, 'd1', 'c1');
    state = play(state, 'g3', 'e2');
    assert.strictEqual(state.isCheck, true);
    state = play(state, 'c1', 'b1');
    state = play(state, 'e2', 'c3');
    assert.strictEqual(state.isCheck, true);
    state = play(state, 'b1', 'c1');
    state = play(state, 'a2', 'c2'); // Rc2#

    assert.strictEqual(state.isCheck, true);
    assert.strictEqual(state.isCheckmate, true);
    assert.strictEqual(state.turn, 'w');
  });

  it('Scenario 7: Kasparov vs Topalov (1999) Opening Setup & Replay', () => {
    let state = createInitialGameState();
    // 1. e4 d6 2. d4 Nf6 3. Nc3 g6
    state = play(state, 'e2', 'e4');
    state = play(state, 'd7', 'd6');
    state = play(state, 'd2', 'd4');
    state = play(state, 'g8', 'f6');
    state = play(state, 'b1', 'c3');
    state = play(state, 'g7', 'g6');
    // 4. Be3 Bg7 5. Qd2 c6 6. f3 b5
    state = play(state, 'c1', 'e3');
    state = play(state, 'f8', 'g7');
    state = play(state, 'd1', 'd2');
    state = play(state, 'c7', 'c6');
    state = play(state, 'f2', 'f3');
    state = play(state, 'b7', 'b5');
    // 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7
    state = play(state, 'g1', 'e2');
    state = play(state, 'b8', 'd7');
    state = play(state, 'e3', 'h6');
    state = play(state, 'g7', 'h6');
    state = play(state, 'd2', 'h6');
    state = play(state, 'c8', 'b7');
    // 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6
    state = play(state, 'a2', 'a3');
    state = play(state, 'e7', 'e5');
    state = play(state, 'e1', 'c1'); // Kasparov castles queenside
    state = play(state, 'd8', 'e7');
    state = play(state, 'c1', 'b1');
    state = play(state, 'a7', 'a6');

    assert.strictEqual(state.isCheck, false);
    assert.strictEqual(state.turn, 'w');
    assert.strictEqual(state.castling.whiteQueenside, false);
  });

  it('Scenario 8: 50-Move Rule Full Match Simulation (100 Plies without pawn move or capture)', () => {
    // Start with lone kings and knights
    let state = fromFEN('4k3/8/8/8/8/8/8/4K1N1 w - - 0 1');

    for (let i = 0; i < 50; i++) {
      // White plays Nf3, Black plays Kd8
      state = play(state, state.board[sq('g1')] ? 'g1' : 'f3', state.board[sq('g1')] ? 'f3' : 'g1');
      // Black plays Ke8 <-> Kd8
      const bFrom = state.board[sq('e8')] ? 'e8' : 'd8';
      const bTo = bFrom === 'e8' ? 'd8' : 'e8';
      state = play(state, bFrom, bTo);
    }

    assert.strictEqual(state.halfmoveClock >= 100, true);
    assert.strictEqual(state.isDraw, true);
    assert.strictEqual(state.drawReason, 'fifty_move');
  });

  it('Scenario 9: Threefold Repetition Match Simulation (Oscillating Knights)', () => {
    let state = createInitialGameState();
    // 1. Nf3 Nf6 2. Ng1 Ng8
    state = play(state, 'g1', 'f3');
    state = play(state, 'g8', 'f6');
    state = play(state, 'f3', 'g1');
    state = play(state, 'f6', 'g8'); // Repetition 2
    assert.strictEqual(state.isDraw, false);

    // 3. Nf3 Nf6 4. Ng1 Ng8
    state = play(state, 'g1', 'f3');
    state = play(state, 'g8', 'f6');
    state = play(state, 'f3', 'g1');
    state = play(state, 'f6', 'g8'); // Repetition 3

    assert.strictEqual(state.isDraw, true);
    assert.strictEqual(state.drawReason, 'threefold_repetition');
  });

  it('Scenario 10: Multi-Promotion and Deep History Undo/Redo Simulation', () => {
    let state = createInitialGameState();
    const initialFEN = toFEN(state);
    const historyFens: string[] = [initialFEN];

    // Play 10 moves (20 plies)
    const moveSequence = [
      ['e2', 'e4'], ['e7', 'e5'],
      ['g1', 'f3'], ['b8', 'c6'],
      ['f1', 'b5'], ['a7', 'a6'],
      ['b5', 'c6'], ['d7', 'c6'],
      ['e1', 'g1'], ['c8', 'g4'],
      ['h2', 'h3'], ['h7', 'h5'],
      ['d2', 'd3'], ['d8', 'f6'],
      ['b1', 'd2'], ['g8', 'e7'],
      ['f1', 'e1'], ['e7', 'g6'],
      ['d3', 'd4'], ['f8', 'd6'],
    ];

    for (const [from, to] of moveSequence) {
      state = play(state, from, to);
      historyFens.push(toFEN(state));
    }

    assert.strictEqual(state.history.length, 20);

    // Deep undo back to 0
    for (let i = historyFens.length - 1; i > 0; i--) {
      assert.strictEqual(toFEN(state), historyFens[i]);
      state = undoMove(state);
    }

    assert.strictEqual(toFEN(state), initialFEN);
    assert.strictEqual(state.history.length, 0);
  });

  it('Scenario 11: Troitsky Endgame Stalemate Trap', () => {
    // Setup classic stalemate defense: White has Queen, Black lone King in corner
    // White mistakenly plays Queen to g6 stalemating Black King on h8
    let state = fromFEN('7k/5K2/8/8/8/8/8/6Q1 w - - 0 1');
    state = play(state, 'g1', 'g6');
    assert.strictEqual(state.isCheck, false);
    assert.strictEqual(state.isStalemate, true);
    assert.strictEqual(state.isDraw, true);
    assert.strictEqual(state.drawReason, 'stalemate');
    assert.strictEqual(getLegalMoves(state).length, 0);
  });

  it('Scenario 12: 60-Ply Master Simulation (Ruy Lopez Classical Development)', () => {
    let state = createInitialGameState();
    const moves = [
      ['e2', 'e4'], ['e7', 'e5'],
      ['g1', 'f3'], ['b8', 'c6'],
      ['f1', 'b5'], ['a7', 'a6'],
      ['b5', 'a4'], ['g8', 'f6'],
      ['e1', 'g1'], ['f8', 'e7'],
      ['f1', 'e1'], ['b7', 'b5'],
      ['a4', 'b3'], ['d7', 'd6'],
      ['c2', 'c3'], ['e8', 'g8'],
      ['h2', 'h3'], ['c6', 'b8'],
      ['d2', 'd4'], ['b8', 'd7'],
      ['b1', 'd2'], ['c8', 'b7'],
      ['b3', 'c2'], ['f8', 'e8'],
      ['d2', 'f1'], ['e7', 'f8'],
      ['f1', 'g3'], ['g7', 'g6'],
      ['a2', 'a4'], ['c7', 'c5'],
    ];

    for (const [from, to] of moves) {
      const legal = getLegalMoves(state, sq(from));
      assert.ok(hasMove(legal, from, to), `Expected move ${from}->${to} to be legal`);
      state = play(state, from, to);
      assert.strictEqual(state.isCheck, false);
    }

    assert.strictEqual(state.fullmoveNumber, 16);
    assert.strictEqual(state.history.length, 30);
  });
});
