# Gap Report: Milestone 3 Tier 5 Adversarial Coverage Audit

**Auditor / Role**: Challenger 1 (critic, specialist)  
**Target Files**:
- `src/games/chess/chessLogic.ts`
- `src/games/chess/chessTypes.ts`
- `src/games/chess/chessAi.ts`
- `src/games/chess/chessAi.worker.ts`
- `tests/chess/chessLogic.test.ts`
- `tests/chess/chessE2E.test.ts`
- `.agents/teamwork_preview_challenger_m3_1/tier5_adversarial_logic.test.ts`

**Date**: 2026-09-20 / 2026-09-21  
**Verdict**: **`GAPS_FOUND`**

---

## Executive Summary

A comprehensive white-box code path audit and adversarial stress testing of the Viper Chess engine was executed. While core FIDE movement rules, pin restrictions, castling invariants, en passant logic, promotion handling, and threefold repetition are implemented with remarkable mathematical elegance in `chessLogic.ts`, **four significant gaps and logic flaws were empirically discovered and verified**.

Most prominently:
1. **ESM Import Path Incompatibility (`chessAi.ts` & `chessAi.worker.ts`)**: Node 24 native test runner (`node --experimental-strip-types --test`) crashes when importing `chessAi.ts` due to extensionless relative imports (`from './chessLogic'`), while `tsconfig.app.json` prohibits `.ts` extensions (`allowImportingTsExtensions: false`). Consequently, the AI module had zero automated test coverage in the project's native test runner.
2. **Logic Flaw in `fromFEN` (Rank Overflow & Invalid Character Ingestion)**: `fromFEN` fails to validate rank widths properly, allowing ranks with > 8 squares (e.g. `'p8'`, `'45'`) and non-standard tokens like `'9'` to be silently parsed. The token `'9'` creates a phantom piece `{ color: 'w', type: '9' }`, which causes `chessAi.ts` `evaluateBoard` to compute `NaN`, collapsing minimax alpha-beta pruning.
3. **`makeMove` Unchecked Move Legality**: `makeMove` does not verify move legality against king safety or piece movement rules, assuming caller pre-validation.
4. **Untested Web Worker Boundary**: `chessAi.worker.ts` has zero automated test coverage due to reliance on browser Web Worker primitives.

---

## Detailed Gap Analysis

### Gap 1: Node Native Test Runner Incompatibility in `chessAi.ts` and `chessAi.worker.ts` (HIGH RISK)

- **Source Location**:
  - `src/games/chess/chessAi.ts:2`:
    ```typescript
    import { getLegalMoves, makeMove } from './chessLogic';
    ```
  - `src/games/chess/chessAi.worker.ts:1`:
    ```typescript
    import { findBestMove, ChessDifficulty } from './chessAi';
    ```
  - `tsconfig.app.json:11`:
    ```json
    "allowImportingTsExtensions": false
    ```
- **Empirical Observation**:
  Executing `node --experimental-strip-types --test` on any test that imports `chessAi.ts` results in:
  ```
  Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Users\ditob\Documents\viper\src\games\chess\chessLogic' imported from C:\Users\ditob\Documents\viper\src\games\chess\chessAi.ts
    code: 'ERR_MODULE_NOT_FOUND',
    url: 'file:///C:/Users/ditob/Documents/viper/src/games/chess/chessLogic'
  ```
- **Root Cause**:
  Node.js native ESM module resolution strictly requires explicit file extensions for relative imports (`./chessLogic.ts` or `./chessLogic.js`). However, `tsconfig.app.json` has `"allowImportingTsExtensions": false` for bundler compatibility with Vite.
  In existing test files (`tests/chess/chessLogic.test.ts` and `tests/chess/chessE2E.test.ts`), the author imported `../../src/games/chess/chessLogic.ts` directly, but never imported `chessAi.ts` or `chessAi.worker.ts`. Thus, the AI engine was never tested in Node's test runner.
- **Blast Radius**:
  Zero unit test coverage for `chessAi.ts` or `chessAi.worker.ts` under `node --experimental-strip-types --test`. Developers cannot run native unit tests against AI functions without a custom ESM loader or bundler.
- **Recommended Mitigation**:
  Either:
  1. Add an ESM loader hook (e.g. via `--import` or loader module) for the test runner script in `package.json`, OR
  2. Set `"allowImportingTsExtensions": true` in `tsconfig.app.json` (and `noEmit: true`) so source files can write `from './chessLogic.ts'`.

---

### Gap 2: FEN Parser Silent Acceptance of Rank Overflows & Illegal Piece Ingestion (MEDIUM RISK)

- **Source Location**:
  - `src/games/chess/chessLogic.ts:950-965`:
    ```typescript
    for (let r = 0; r < 8; r++) {
      const rankIndex = 7 - r;
      let file = 0;
      for (const char of ranks[r]) {
        if (file > 7) {
          throw new Error(`Invalid FEN: rank exceeds 8 squares`);
        }
        if (char >= '1' && char <= '8') {
          file += parseInt(char, 10);
        } else {
          const color: PieceColor = char === char.toUpperCase() ? 'w' : 'b';
          const type = char.toLowerCase() as PieceType;
          board[rankIndex * 8 + file] = { color, type };
          file++;
        }
      }
    }
    ```
- **Empirical Observation**:
  1. **Rank Overflow via Integer Step**:
     For FEN `'p8/8/8/8/8/8/8/8 w - - 0 1'`:
     - `char = 'p'`: `file` becomes 1.
     - `char = '8'`: `file` becomes 1 + 8 = 9.
     - Inner loop terminates. `file > 7` was checked at the *top* of the loop, so it is never checked after the final increment.
     - The parser does NOT check `if (file !== 8)` at the end of rank parsing. Result: accepted silently with 9 squares on rank 8.
  2. **Digit '9' Ingestion**:
     For FEN `'9/8/8/8/8/8/8/8 w - - 0 1'`:
     - `'9' >= '1' && '9' <= '8'` is `false`.
     - The parser falls into the `else` block and creates a piece `{ color: 'w', type: '9' }` at square 56.
     - When `evaluateBoard(state)` runs:
       `PIECE_VALUES['9']` is `undefined`.
       `whiteMaterial += undefined` -> `whiteMaterial` becomes `NaN`.
       `evaluateBoard` returns `NaN`.
       `minimax` cutoffs fail because all comparisons with `NaN` (`Math.max(eval, maxEval)`) return `NaN`.
  3. **Underflow Acceptance**:
     For FEN `'4/8/8/8/8/8/8/8 w - - 0 1'`, rank 8 has only 4 squares. The parser does not verify that `file === 8` upon exiting the rank loop; it silently leaves trailing squares as `null`.
- **Blast Radius**:
  Loading malformed FEN strings from user input or external databases causes silent board corruption or unhandled `NaN` calculations in AI evaluation.
- **Recommended Mitigation**:
  In `fromFEN`:
  ```typescript
  if (char >= '1' && char <= '8') {
    file += parseInt(char, 10);
    if (file > 8) throw new Error(`Invalid FEN: rank exceeds 8 squares`);
  } else if (/^[pnbrqkPNBRQK]$/.test(char)) {
    if (file >= 8) throw new Error(`Invalid FEN: rank exceeds 8 squares`);
    const color: PieceColor = char === char.toUpperCase() ? 'w' : 'b';
    const type = char.toLowerCase() as PieceType;
    board[rankIndex * 8 + file] = { color, type };
    file++;
  } else {
    throw new Error(`Invalid FEN piece character: "${char}"`);
  }
  ```
  And after the inner loop:
  ```typescript
  if (file !== 8) throw new Error(`Invalid FEN: rank must contain exactly 8 squares, got ${file}`);
  ```

---

### Gap 3: `makeMove` Assumes Pre-Validated Moves and Omits King Safety Filter (LOW RISK / ARCHITECTURAL)

- **Source Location**:
  - `src/games/chess/chessLogic.ts:719-729`:
    ```typescript
    export function makeMove(state: ChessGameState, move: Move): ChessGameState {
      const movingPiece = state.board[move.from];
      if (!movingPiece) {
        throw new Error(`No piece at source square ${squareToAlgebraic(move.from)}`);
      }
      if (movingPiece.color !== state.turn) {
        throw new Error(
          `Piece color ${movingPiece.color} does not match active turn ${state.turn}`
        );
      }
    ```
- **Empirical Observation**:
  `makeMove` does not check `getLegalMoves(state)`. If called directly with an illegal move (e.g. moving pinned piece or king into check), it executes the move, updates `turn` to opponent, and evaluates `isCheck` on the *opponent*, effectively masking the illegal move.
- **Blast Radius**:
  Safe for internal UI/AI use since both call `getLegalMoves` prior to calling `makeMove`. However, public API consumers calling `makeMove` directly without checking `getLegalMoves` may corrupt game state.
- **Recommended Mitigation**:
  Add an optional boolean validation parameter or export a dedicated `makeLegalMove(state, move)` that verifies `getLegalMoves(state).some(...)`.

---

### Gap 4: `chessAi.worker.ts` Untested in Automated Test Suite (LOW RISK)

- **Source Location**:
  - `src/games/chess/chessAi.worker.ts:10-18`
- **Empirical Observation**:
  Because `chessAi.worker.ts` relies on `self.onmessage` and browser Web Worker globals, it is completely skipped in Node.js test runs. Although `chessAi.ts` has a timeout fallback to `findBestMove`, the message passing contract (`WorkerRequest`, `WorkerResponse`) is never exercised in CI/CLI testing.
- **Recommended Mitigation**:
  Add a mock worker test harness or E2E browser test (Playwright/Puppeteer) verifying the Web Worker round-trip.

---

## Tier 5 Adversarial Test Harness Summary

A new adversarial test suite was authored and verified in `.agents/teamwork_preview_challenger_m3_1/tier5_adversarial_logic.test.ts`:

- **Total Test Cases**: 54 test cases across 10 adversarial suites.
- **Results under Native Node Test Runner (`node --experimental-strip-types --test`)**:
  - **Passed**: 47
  - **Failed**: 0
  - **Skipped**: 7 (Gracefully isolates and asserts `ERR_MODULE_NOT_FOUND` on `chessAi.ts`)
  - **Execution Time**: ~30ms
- **Results under Custom TS Loader (`ts_loader.mjs`)**:
  - **Passed**: 54
  - **Failed**: 0
  - **Skipped**: 0
  - **Execution Time**: ~790ms (exercises full depth 3-4 minimax, mate in 1, capture exploitation, concurrent AI calls)
- **Combined Platform Test Results** (`tests/chess/chessLogic.test.ts` + `tests/chess/chessE2E.test.ts` + `tier5_adversarial_logic.test.ts`):
  - **Total Tests**: 206
  - **Passed**: 199
  - **Failed**: 0
  - **Skipped**: 7
  - **Duration**: ~247ms

---

## Conclusion

The core chess engine (`chessLogic.ts`) is robust against complex FIDE corner cases including absolute pins, double checks, dual en passant branches, castling through attack restrictions, and Saavedra-style underpromotions. However, **`GAPS_FOUND`** is asserted due to:
1. `chessAi.ts` ESM resolution failure under native Node execution.
2. `fromFEN` rank overflow and illegal token ingestion bugs that can inject `NaN` into AI evaluation.
