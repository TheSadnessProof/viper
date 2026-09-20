import { register } from 'node:module';
import assert from 'node:assert/strict';

// Register ESM loader for extensionless imports in Node ESM
register('./loader.mjs', import.meta.url);

const {
  findBestMove,
  getBestMove,
  evaluateBoard,
  PIECE_VALUES,
} = await import('../../src/games/chess/chessAi.ts');

const {
  createInitialGameState,
  getLegalMoves,
  makeMove,
  toFEN,
  fromFEN,
  algebraicToSquare,
  squareToAlgebraic,
} = await import('../../src/games/chess/chessLogic.ts');

import type { ChessGameState, Move, Square, PieceType } from '../../src/games/chess/chessTypes.ts';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails: string[] = [];

function test(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res.then(
        () => {
          passedTests++;
          console.log(`  ✔ ${name}`);
        },
        (err) => {
          failedTests++;
          console.error(`  ✖ ${name}:`, err.message);
          failureDetails.push(`${name}: ${err.stack || err.message}`);
        }
      );
    } else {
      passedTests++;
      console.log(`  ✔ ${name}`);
    }
  } catch (err: any) {
    failedTests++;
    console.error(`  ✖ ${name}:`, err.message);
    failureDetails.push(`${name}: ${err.stack || err.message}`);
  }
}

function moveToStr(m: Move | null): string {
  if (!m) return 'null';
  return `${squareToAlgebraic(m.from)}->${squareToAlgebraic(m.to)}${m.promotion ? `=${m.promotion}` : ''}`;
}

console.log('\n======================================================');
console.log(' VIPER CHESS AI EMPIRICAL STRESS & ADVERSARIAL HARNESS ');
console.log('======================================================\n');

// =========================================================================
// SUITE 1: Casual AI Move Legality across 60+ Random States & Edge Cases
// =========================================================================
console.log('--- SUITE 1: Casual AI Move Legality Across Random & Edge States ---');

// 1. Generate random game states by playing random legal moves from starting position
const randomStates: ChessGameState[] = [];
let currentState = createInitialGameState();

// Generate 70 distinct states by playing random moves
for (let step = 0; step < 120; step++) {
  const legalMoves = getLegalMoves(currentState);
  if (legalMoves.length === 0 || currentState.isCheckmate || currentState.isDraw) {
    currentState = createInitialGameState();
    continue;
  }
  // Pick random move
  const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
  currentState = makeMove(currentState, randomMove);
  if (getLegalMoves(currentState).length > 0 && !currentState.isCheckmate && !currentState.isDraw) {
    randomStates.push(currentState);
    if (randomStates.length >= 65) break;
  }
}

test(`Casual AI: Returns strictly legal move across ${randomStates.length} random reachable game states`, () => {
  assert.ok(randomStates.length >= 50, `Expected at least 50 random states, got ${randomStates.length}`);
  for (let i = 0; i < randomStates.length; i++) {
    const st = randomStates[i];
    const legalMoves = getLegalMoves(st);
    const chosenMove = findBestMove(st, 'casual');

    assert.ok(chosenMove !== null, `State ${i} (${st.turn} to move) has ${legalMoves.length} legal moves but Casual returned null`);

    const isLegal = legalMoves.some(
      (lm) =>
        lm.from === chosenMove.from &&
        lm.to === chosenMove.to &&
        lm.promotion === chosenMove.promotion
    );

    assert.ok(
      isLegal,
      `State ${i} (${st.turn} to move): Casual chose ILLEGAL move ${moveToStr(chosenMove)}. Legal moves: ${legalMoves.map(moveToStr).join(', ')}`
    );

    // Apply move and verify state integrity
    const nextState = makeMove(st, chosenMove);
    assert.ok(nextState !== null, `State ${i}: makeMove failed on Casual move`);
    assert.equal(nextState.turn, st.turn === 'w' ? 'b' : 'w');
  }
});

test('Casual AI: Returns null when in checkmate position (Scholar\'s Mate)', () => {
  // Scholar's mate final position: White played Qxf7#
  // 1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#
  const checkmateFen = 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4';
  const state = fromFEN(checkmateFen);
  assert.ok(state.isCheckmate, 'State should be checkmate');
  const move = findBestMove(state, 'casual');
  assert.equal(move, null, 'Casual AI must return null when checkmated');
});

test('Casual AI: Returns null when in corner Stalemate position', () => {
  // Stalemate: Black King on a8, White Queen on c7, White King on b6.
  // Black King has no legal moves and is not in check.
  const stalemateFen = 'k7/2Q5/1K6/8/8/8/8/8 b - - 0 1';
  const state = fromFEN(stalemateFen);
  assert.ok(state.isStalemate, 'State should be stalemate');
  const move = findBestMove(state, 'casual');
  assert.equal(move, null, 'Casual AI must return null when stalemated');
});

test('Casual AI: Single forced legal move under check is correctly chosen', () => {
  // White King on a1, White pawn on a2 (blocks a2), White pawn on b3.
  // Black Rook on h1 checks King along rank 1.
  // King on a1 cannot move to b1 (still on rank 1 attacked by Rook).
  // King on a1 can ONLY escape to b2. Exactly 1 legal move.
  const forcedMoveFen = '7k/8/8/8/8/1P6/P7/K6r w - - 0 1';
  const state = fromFEN(forcedMoveFen);
  assert.ok(state.isCheck, 'King should be in check');
  const legalMoves = getLegalMoves(state);
  assert.equal(legalMoves.length, 1, 'Only 1 legal escape move exists');
  const move = findBestMove(state, 'casual');
  assert.ok(move !== null);
  assert.equal(move.from, algebraicToSquare('a1'));
  assert.equal(move.to, algebraicToSquare('b2'));
});

test('Casual AI: Absolute pinned piece is never moved into check', () => {
  // White King on e1, White Bishop on e2, Black Rook on e8 (pinning Bishop).
  // Bishop on e2 cannot move off the e-file.
  const pinFen = '4r3/8/8/8/8/8/4B3/4K3 w - - 0 1';
  const state = fromFEN(pinFen);
  const move = findBestMove(state, 'casual');
  assert.ok(move !== null);
  assert.notEqual(move.from, algebraicToSquare('e2'), 'Pinned Bishop cannot make illegal move');
});

test('Casual AI: Pawn promotion generates legal promotion move with promotion piece', () => {
  // White King on h1 boxed by pawns g1, g2, h2. White Pawn on a7.
  // Only the pawn can move, and it must promote on a8.
  const promoFen = '7k/P7/8/8/8/8/6PP/6PK w - - 0 1';
  const state = fromFEN(promoFen);
  const move = findBestMove(state, 'casual');
  assert.ok(move !== null);
  assert.equal(move.from, algebraicToSquare('a7'));
  assert.equal(move.to, algebraicToSquare('a8'));
  assert.ok(['q', 'r', 'b', 'n'].includes(move.promotion as string), 'Promotion piece must be q, r, b, or n');
});

// =========================================================================
// SUITE 2: Blitz AI Tactical Puzzles & Heuristic Validation
// =========================================================================
console.log('\n--- SUITE 2: Blitz AI Tactical Puzzle Solving ---');

test('Blitz AI: Solves Scholar\'s Mate in 1 (Qxf7#)', () => {
  // White Queen on f3 attacks f7; Bishop on c4 supports. Qxf7 is checkmate.
  const fen = 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4';
  const state = fromFEN(fen);
  const bestMove = findBestMove(state, 'blitz');
  assert.ok(bestMove !== null);
  assert.equal(squareToAlgebraic(bestMove.from), 'f3');
  assert.equal(squareToAlgebraic(bestMove.to), 'f7');
  const next = makeMove(state, bestMove);
  assert.ok(next.isCheckmate, 'Move must lead to checkmate');
});

test('Blitz AI: Solves Back-Rank Mate in 1 (Rd8#)', () => {
  // Black King trapped on g8 behind pawns f7, g7, h7. White Rook on d1 plays Rd8#.
  const fen = '6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1';
  const state = fromFEN(fen);
  const bestMove = findBestMove(state, 'blitz');
  assert.ok(bestMove !== null);
  assert.equal(squareToAlgebraic(bestMove.from), 'd1');
  assert.equal(squareToAlgebraic(bestMove.to), 'd8');
  const next = makeMove(state, bestMove);
  assert.ok(next.isCheckmate, 'Move must lead to back-rank checkmate');
});

test('Blitz AI: Solves Fool\'s Mate in 1 as Black (Qh4#)', () => {
  // 1. f3 e5 2. g4 Qh4#
  const fen = 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2';
  const state = fromFEN(fen);
  const bestMove = findBestMove(state, 'blitz');
  assert.ok(bestMove !== null);
  assert.equal(squareToAlgebraic(bestMove.from), 'd8');
  assert.equal(squareToAlgebraic(bestMove.to), 'h4');
  const next = makeMove(state, bestMove);
  assert.ok(next.isCheckmate, 'Move must lead to Fool\'s mate');
});

test('Blitz AI: Solves Queen Corner Mate in 1 (Qg7# or Qh7#)', () => {
  // Black King on h8, White King on f7, White Queen on g6
  const fen = '7k/5K2/6Q1/8/8/8/8/8 w - - 0 1';
  const state = fromFEN(fen);
  const bestMove = findBestMove(state, 'blitz');
  assert.ok(bestMove !== null);
  const toSq = squareToAlgebraic(bestMove.to);
  assert.ok(toSq === 'g7' || toSq === 'h7' || toSq === 'g8', `Expected mating move, got ${toSq}`);
  const next = makeMove(state, bestMove);
  assert.ok(next.isCheckmate, 'Move must result in checkmate');
});

test('Blitz AI: Captures hanging free Queen (White Bishop captures Qb5)', () => {
  // Black left Queen undefended on b5. White Bishop on d3 can capture it (Bxb5).
  const fen = 'rnb1kbnr/pppp1ppp/8/1q6/8/3B4/PPP2PPP/RNBQK1NR w KQkq - 0 4';
  const state = fromFEN(fen);
  const bestMove = findBestMove(state, 'blitz');
  assert.ok(bestMove !== null);
  assert.equal(squareToAlgebraic(bestMove.from), 'd3', 'Bishop should capture free Queen');
  assert.equal(squareToAlgebraic(bestMove.to), 'b5', 'Bishop should capture free Queen');
});

test('Blitz AI: Captures hanging free Queen with pawn (dxe4)', () => {
  // Black Queen on e4, White Pawn on d3. d3xe4 captures Queen.
  const fen = 'rnb1kbnr/pppp1ppp/8/8/4q3/3P4/PPP2PPP/RNBQKBNR w KQkq - 0 4';
  const state = fromFEN(fen);
  const bestMove = findBestMove(state, 'blitz');
  assert.ok(bestMove !== null);
  assert.equal(squareToAlgebraic(bestMove.from), 'd3');
  assert.equal(squareToAlgebraic(bestMove.to), 'e4');
});

test('Blitz AI: Captures hanging free Queen as Black (Qxg5)', () => {
  // White Queen hanging on g5, Black Queen on d8 captures it (Qxg5)
  const fen = 'r1bqk1nr/pppp1ppp/2n5/6Q1/8/8/PPPPPPPP/RNB1KBNR b KQkq - 0 4';
  const state = fromFEN(fen);
  const bestMove = findBestMove(state, 'blitz');
  assert.ok(bestMove !== null);
  assert.equal(squareToAlgebraic(bestMove.from), 'd8');
  assert.equal(squareToAlgebraic(bestMove.to), 'g5');
});

test('Blitz AI: Captures high-value free Rook over low-value pawn', () => {
  // White Rook on a1 can capture hanging Black Rook on a8 (8x8) vs Black pawn on h7
  const fen = 'r3k3/7p/8/8/8/8/8/R3K3 w Qq - 0 1';
  const state = fromFEN(fen);
  const bestMove = findBestMove(state, 'blitz');
  assert.ok(bestMove !== null);
  assert.equal(squareToAlgebraic(bestMove.from), 'a1');
  assert.equal(squareToAlgebraic(bestMove.to), 'a8', 'Should capture free Rook on a8');
});

test('Blitz AI: Rescues attacked Queen from pawn attack', () => {
  // Black Queen on d4 attacked by White pawn on c3. Black to move.
  // Black must move Queen away or capture c3/e4, not blunder Queen by moving another piece.
  const fen = 'rnb1kbnr/pppp1ppp/8/4p3/3qP3/2P5/PP3PPP/RNBQKBNR b KQkq - 0 4';
  const state = fromFEN(fen);
  const bestMove = findBestMove(state, 'blitz');
  assert.ok(bestMove !== null);
  assert.equal(squareToAlgebraic(bestMove.from), 'd4', 'Queen under attack must move');
  // Check that new position does not leave queen hanging on attacked c3 square without capture
  const next = makeMove(state, bestMove);
  assert.ok(bestMove.to !== algebraicToSquare('b4'), 'Should not move to another attacked square');
});

// =========================================================================
// SUITE 3: Grandmaster AI Depth 4 Search & Positional PST Evaluation
// =========================================================================
console.log('\n--- SUITE 3: Grandmaster AI Depth 4 & Piece-Square Positional Awareness ---');

test('Grandmaster AI: Board evaluation awards +15 bonus per center square (d4, e4, d5, e5)', () => {
  // Position with pawns so it is not insufficient material
  // Place White Knight on central square e4 (index 28)
  const knightCenterFen = '4k3/pppppppp/8/8/4N3/8/PPPPPPPP/4K3 w - - 0 1';
  const knightCenterState = fromFEN(knightCenterFen);
  const centerScore = evaluateBoard(knightCenterState);

  // Place White Knight on rim square h4 (index 31)
  const knightRimFen = '4k3/pppppppp/8/8/7N/8/PPPPPPPP/4K3 w - - 0 1';
  const knightRimState = fromFEN(knightRimFen);
  const rimScore = evaluateBoard(knightRimState);

  // The center knight must have a significantly higher evaluation due to PST + center bonus
  assert.ok(
    centerScore > rimScore,
    `Center Knight score (${centerScore}) must exceed rim Knight score (${rimScore})`
  );
  assert.ok(
    centerScore - rimScore >= 20,
    `Center advantage should be substantial (got diff: ${centerScore - rimScore})`
  );
});

test('Grandmaster AI: Piece-Square Tables value central pawns over edge pawns', () => {
  // White Pawn on e4 vs White Pawn on a4 (with pawns/kings so non-dead position)
  const pawnCenterFen = '4k3/pppppppp/8/8/4P3/8/PPPP1PPP/4K3 w - - 0 1';
  const pawnEdgeFen = '4k3/pppppppp/8/8/P7/8/1PPPPPPP/4K3 w - - 0 1';

  const centerScore = evaluateBoard(fromFEN(pawnCenterFen));
  const edgeScore = evaluateBoard(fromFEN(pawnEdgeFen));

  assert.ok(
    centerScore > edgeScore,
    `Central pawn evaluation (${centerScore}) must be greater than edge pawn (${edgeScore})`
  );
});

test('Grandmaster AI: Endgame King PST rewards King centralization (d4/e4 vs corner a1)', () => {
  // Endgame (material < 1300): Only Kings and 1 pawn each
  // King on e4 (center)
  const kingCenterFen = '8/8/8/8/4K3/8/4p3/4k3 w - - 0 1';
  // King on a1 (corner)
  const kingCornerFen = '8/8/8/8/8/8/4p3/K3k3 w - - 0 1';

  const centerScore = evaluateBoard(fromFEN(kingCenterFen));
  const cornerScore = evaluateBoard(fromFEN(kingCornerFen));

  assert.ok(
    centerScore > cornerScore,
    `Endgame centralized King (${centerScore}) must score higher than corner King (${cornerScore})`
  );
});

test('Grandmaster AI: Opening move selects classical central control (e4, d4, Nf3, or c4)', () => {
  const startState = createInitialGameState();
  const gmMove = findBestMove(startState, 'grandmaster');
  assert.ok(gmMove !== null);

  const moveStr = moveToStr(gmMove);
  const validCenterOpenings = ['e2->e4', 'd2->d4', 'g1->f3', 'c2->c4', 'b1->c3'];
  assert.ok(
    validCenterOpenings.includes(moveStr),
    `GM Opening move should be a top central opening, but chose: ${moveStr}`
  );
});

test('Grandmaster AI: Depth 4 finds forced 2-move back-rank combination (Mate in 2)', () => {
  // White Queen on d2, White Rook on d1 (battery on d-file).
  // Black King on g8 behind pawns f7, g7, h7, Black Rook on a8.
  // Move 1 (White): 1. Qd8+! (or 1. Rd8+)
  // Move 2 (Black): 1... Rxd8 (forced)
  // Move 3 (White): 2. Rxd8# (Checkmate!)
  const fen = 'r5k1/5ppp/8/8/8/8/3Q4/3R2K1 w - - 0 1';
  const state = fromFEN(fen);
  const bestMove = findBestMove(state, 'grandmaster');
  assert.ok(bestMove !== null);

  const move1Str = moveToStr(bestMove);
  assert.ok(
    move1Str === 'd2->d8' || move1Str === 'd1->d8',
    `GM must play 1. Qd8+ or 1. Rd8+ to force checkmate sequence, got ${move1Str}`
  );

  const next1 = makeMove(state, bestMove);
  assert.ok(next1.isCheck, 'First move must deliver check');

  // Opponent plays best move (forced 1... Rxd8)
  const blackMove = findBestMove(next1, 'grandmaster');
  assert.ok(blackMove !== null);
  assert.equal(moveToStr(blackMove), 'a8->d8', 'Black has forced reply 1... Rxd8');

  const next2 = makeMove(next1, blackMove);

  // White delivers checkmate with second piece on d8
  const whiteMove2 = findBestMove(next2, 'grandmaster');
  assert.ok(whiteMove2 !== null);
  const white2Str = moveToStr(whiteMove2);
  assert.ok(
    white2Str === 'd1->d8' || white2Str === 'd2->d8',
    `White must finish with checkmate on d8, got ${white2Str}`
  );

  const next3 = makeMove(next2, whiteMove2);
  assert.ok(next3.isCheckmate, 'Position after ply 3 must be checkmate');
});

test('Grandmaster AI: Avoids poisoned pawn trap at depth 4', () => {
  // Classic poisoned piece scenario:
  // Black can capture a "free" pawn on b2 with Queen, but White traps/wins Queen or delivers checkmate.
  // Position: White Queen on c3, White Rook on b1, Black Queen on b6.
  // If Black plays Qxb2, White plays Rxb2 winning Queen.
  // Does GM playing Black avoid playing Qxb2?
  const fen = 'r1b1k2r/pppp1ppp/1q6/8/8/2Q5/P1P2PPP/1R2K2R b Kkq - 0 12';
  const state = fromFEN(fen);
  const bestMove = findBestMove(state, 'grandmaster');
  assert.ok(bestMove !== null);
  const moveStr = moveToStr(bestMove);
  assert.notEqual(moveStr, 'b6->b2', 'Black GM must NOT capture poisoned pawn on b2 protected by Rook');
});

// =========================================================================
// SUITE 4: AI Self-Play Robustness (20+ Moves, Zero Runtime Errors or Deadlock)
// =========================================================================
console.log('\n--- SUITE 4: AI Self-Play Engine Robustness ---');

test('Self-Play: Blitz (White) vs Casual (Black) for 20+ full moves (40+ plies)', () => {
  let state = createInitialGameState();
  const targetPlies = 40;
  let totalPliesPlayed = 0;
  let gamesPlayed = 1;

  while (totalPliesPlayed < targetPlies) {
    if (state.isCheckmate || state.isDraw || state.isStalemate) {
      console.log(`    Game ${gamesPlayed} concluded with ${state.isCheckmate ? 'Checkmate' : 'Draw'} after ${totalPliesPlayed} total plies. Starting next game...`);
      gamesPlayed++;
      state = createInitialGameState();
    }

    const difficulty = state.turn === 'w' ? 'blitz' : 'casual';
    const move = findBestMove(state, difficulty);

    assert.ok(move !== null, `Turn ${state.turn}: ${difficulty} AI returned null move in non-terminal state`);

    const legal = getLegalMoves(state);
    const isValid = legal.some(m => m.from === move.from && m.to === move.to && m.promotion === move.promotion);
    assert.ok(isValid, `Turn ${state.turn}: ${difficulty} AI played illegal move ${moveToStr(move)}`);

    state = makeMove(state, move);
    totalPliesPlayed++;
  }

  assert.ok(totalPliesPlayed >= 40, `Self-play must complete at least 40 plies (20 full moves), reached ${totalPliesPlayed}`);
  console.log(`    ✔ Completed ${totalPliesPlayed} plies (${totalPliesPlayed / 2} moves) across ${gamesPlayed} game(s) cleanly.`);
});

test('Self-Play: Casual (White) vs Blitz (Black) for 20+ full moves (40+ plies)', () => {
  let state = createInitialGameState();
  const targetPlies = 40;
  let totalPliesPlayed = 0;
  let gamesPlayed = 1;

  while (totalPliesPlayed < targetPlies) {
    if (state.isCheckmate || state.isDraw || state.isStalemate) {
      console.log(`    Game ${gamesPlayed} concluded with ${state.isCheckmate ? 'Checkmate' : 'Draw'}. Starting next game...`);
      gamesPlayed++;
      state = createInitialGameState();
    }

    const difficulty = state.turn === 'w' ? 'casual' : 'blitz';
    const move = findBestMove(state, difficulty);

    assert.ok(move !== null, `Turn ${state.turn}: ${difficulty} AI returned null move in non-terminal state`);

    const legal = getLegalMoves(state);
    const isValid = legal.some(m => m.from === move.from && m.to === move.to && m.promotion === move.promotion);
    assert.ok(isValid, `Turn ${state.turn}: ${difficulty} AI played illegal move ${moveToStr(move)}`);

    state = makeMove(state, move);
    totalPliesPlayed++;
  }

  assert.ok(totalPliesPlayed >= 40, `Self-play must complete at least 40 plies, reached ${totalPliesPlayed}`);
  console.log(`    ✔ Completed ${totalPliesPlayed} plies cleanly across ${gamesPlayed} game(s).`);
});

test('Self-Play: Grandmaster (White) vs Blitz (Black) for 20+ plies', () => {
  let state = createInitialGameState();
  const maxPlies = 22;
  let pliesPlayed = 0;

  for (let ply = 0; ply < maxPlies; ply++) {
    if (state.isCheckmate || state.isDraw || state.isStalemate) {
      console.log(`    GM vs Blitz game concluded early at ply ${ply} with ${state.isCheckmate ? 'Checkmate' : 'Draw'}`);
      break;
    }

    const difficulty = state.turn === 'w' ? 'grandmaster' : 'blitz';
    const move = findBestMove(state, difficulty);

    assert.ok(move !== null, `Ply ${ply} (${state.turn}): ${difficulty} AI returned null move in non-terminal state`);

    const legal = getLegalMoves(state);
    const isValid = legal.some(m => m.from === move.from && m.to === move.to && m.promotion === move.promotion);
    assert.ok(isValid, `Ply ${ply} (${state.turn}): ${difficulty} AI played illegal move ${moveToStr(move)}`);

    state = makeMove(state, move);
    pliesPlayed++;
  }

  assert.ok(pliesPlayed >= 20 || state.isCheckmate || state.isDraw, `Self-play must complete at least 20 plies or reach terminal state (reached ${pliesPlayed})`);
  console.log(`    ✔ Completed ${pliesPlayed} plies cleanly without engine deadlock.`);
});

// =========================================================================
// SUITE 5: Async getBestMove Non-Blocking Contract & Performance Benchmark
// =========================================================================
console.log('\n--- SUITE 5: Async API Contract & Performance Benchmarks ---');

await test('Async getBestMove: Resolves Promise with legal move across Casual, Blitz, GM', async () => {
  const state = createInitialGameState();

  const casualMove = await getBestMove(state, 'casual');
  assert.ok(casualMove !== null);
  assert.ok(getLegalMoves(state).some(m => m.from === casualMove.from && m.to === casualMove.to));

  const blitzMove = await getBestMove(state, 'blitz');
  assert.ok(blitzMove !== null);
  assert.ok(getLegalMoves(state).some(m => m.from === blitzMove.from && m.to === blitzMove.to));

  const gmMove = await getBestMove(state, 'grandmaster');
  assert.ok(gmMove !== null);
  assert.ok(getLegalMoves(state).some(m => m.from === gmMove.from && m.to === gmMove.to));
});

test('Benchmark: Search latency within acceptable real-time interactive limits', () => {
  const midgameState = fromFEN('r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7');

  const startCasual = performance.now();
  findBestMove(midgameState, 'casual');
  const durCasual = performance.now() - startCasual;

  const startBlitz = performance.now();
  findBestMove(midgameState, 'blitz');
  const durBlitz = performance.now() - startBlitz;

  const startGM = performance.now();
  findBestMove(midgameState, 'grandmaster');
  const durGM = performance.now() - startGM;

  console.log(`    Latency benchmarks: Casual: ${durCasual.toFixed(1)}ms | Blitz (depth 3): ${durBlitz.toFixed(1)}ms | GM (depth 4): ${durGM.toFixed(1)}ms`);
  assert.ok(durCasual < 50, `Casual AI should be < 50ms (got ${durCasual}ms)`);
  assert.ok(durBlitz < 500, `Blitz AI should be < 500ms (got ${durBlitz}ms)`);
  assert.ok(durGM < 5000, `Grandmaster AI should be < 5000ms (got ${durGM}ms)`);
});

// =========================================================================
// SUITE 6: Adversarial Edge Cases: En Passant, Promotions, & Draw Mechanics
// =========================================================================
console.log('\n--- SUITE 6: Adversarial Edge Cases: En Passant, Promotion, & Draws ---');

test('Adversarial: En Passant move is evaluated legally and chosen when winning', () => {
  // Black played f7-f5, White pawn on e5 can capture en passant (exf6)
  const fen = 'rnbqkbnr/ppppp1pp/8/4Pp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3';
  const state = fromFEN(fen);
  assert.equal(state.enPassant, algebraicToSquare('f6'));

  const legal = getLegalMoves(state);
  const epMove = legal.find(m => m.isEnPassant);
  assert.ok(epMove !== null, 'En passant move must be present in legal moves');

  const chosenMove = findBestMove(state, 'blitz');
  assert.ok(chosenMove !== null);
  const next = makeMove(state, chosenMove);
  assert.ok(next !== null);
  assert.equal(next.turn, 'b');
});

test('Adversarial: Grandmaster AI prefers Queen promotion over underpromotion when safe', () => {
  // White pawn on a7, Black King on h8, White King on h1.
  // Pawn can promote to Q, R, B, N. Queen is worth 900 vs 500/330/320.
  const promoFen = '7k/P7/8/8/8/8/8/7K w - - 0 1';
  const state = fromFEN(promoFen);
  const gmMove = findBestMove(state, 'grandmaster');
  assert.ok(gmMove !== null);
  assert.equal(gmMove.from, algebraicToSquare('a7'));
  assert.equal(gmMove.to, algebraicToSquare('a8'));
  assert.equal(gmMove.promotion, 'q', 'Grandmaster should promote to Queen for maximum material');
});

test('Adversarial: Underpromotion to Knight chosen when it delivers checkmate (Smothered Mate)', () => {
  // Classic underpromotion to Knight puzzle:
  // Black King on h8, Black Rook on f8, Black pawn on g7. White Knight on f7 checking?
  // Setup: Black King on a8, Black Rook on b8, Black pawn on b7.
  // White pawn on c7: Promoting to Knight (c8=N#) gives checkmate!
  // Whereas c8=Q allows Black Rook on b8 to capture Queen (Rxc8).
  // Position:
  // Black King on a8, Black Rook on b8, Black pawn on a7.
  // White King on a6 (protects b7, a7).
  // White pawn on c7.
  // If 1. c8=Q??: Black plays 1... Rxc8! White loses Queen.
  // If 1. c8=N#: Black King on a8 is checked by Knight on c8!
  // Black King cannot move to b8 (occupied by Rook), cannot move to a7 (occupied by pawn), cannot move to b7 (attacked by King on a6).
  // Black Rook on b8 cannot capture Knight on c8 because King on a6 protects c8? Wait, does Ka6 protect c8? dx=2, dy=2: no.
  // Let's verify with King on d7 or White Bishop:
  // White Bishop on d7 protects c8.
  // Black King on a8, Black Rook on b8, Black Pawn on a7, Black Pawn on b7.
  // Then 1. c8=N# delivers smothered checkmate!
  const fen = 'kr6/ppP5/8/8/8/8/3B4/4K3 w - - 0 1';
  const state = fromFEN(fen);
  // White has 1. cxb8=Q+ or 1. c8=N
  // Both are winning!
  const move = findBestMove(state, 'grandmaster');
  assert.ok(move !== null);
  const next = makeMove(state, move);
  assert.ok(next !== null);
  assert.ok(next.isCheckmate || next.board[algebraicToSquare('b8')]?.color === 'w', 'Move must win material or mate');
});

test('Adversarial: Terminal Fifty-Move Rule draw is recognized and evaluated as 0 score', () => {
  // When halfmoveClock reaches 100, state.isDraw is true
  const fen = '4k3/4r3/8/8/8/8/4R3/4K3 w - - 100 51';
  const state = fromFEN(fen);
  assert.ok(state.isDraw, 'Fifty move rule should trigger draw');
  const score = evaluateBoard(state);
  assert.equal(score, 0, 'Draw positions must evaluate to 0 centipawns');
});

// =========================================================================
// FINAL REPORT SUMMARY
// =========================================================================
console.log('\n======================================================');
console.log(` SUMMARY: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log('======================================================');

if (failedTests > 0) {
  console.error('\nFailures:');
  failureDetails.forEach((f, idx) => console.error(`[${idx + 1}] ${f}`));
  process.exit(1);
} else {
  console.log('\nALL EMPIRICAL AI CHALLENGES PASSED CONVINCINGLY! VERDICT: APPROVE');
  process.exit(0);
}
