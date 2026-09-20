# Milestone 3 Remediation Changes

## Summary of Modifications

### 1. `tsconfig.app.json`
- Changed `"allowImportingTsExtensions": false` to `"allowImportingTsExtensions": true`.
- Combined with `"noEmit": true`, this permits source files to declare explicit `.ts` relative imports required by Node.js native ESM loader (`node --experimental-strip-types`) while preserving full Vite bundler compatibility.

### 2. `src/games/chess/chessAi.ts`
- Updated relative imports to include explicit `.ts` extensions:
  ```typescript
  import type { ChessGameState, Move, PieceColor, PieceType, Square } from './chessTypes.ts';
  import { getLegalMoves, makeMove } from './chessLogic.ts';
  ```
- This allows Node 24 native ESM module resolution to directly import `chessAi.ts` without custom loaders.

### 3. `src/games/chess/chessAi.worker.ts`
- Updated relative imports to include explicit `.ts` extensions:
  ```typescript
  import { findBestMove, ChessDifficulty } from './chessAi.ts';
  import type { ChessGameState } from './chessTypes.ts';
  ```

### 4. `src/games/chess/chessLogic.ts`
- Hardened `fromFEN` rank parser:
  - Validates that numeric digits are strictly `'1'..'8'` and increments `file += parseInt(char, 10)`. Checks `if (file > 8) throw new Error('Invalid FEN: rank exceeds 8 squares')`.
  - Validates that non-numeric characters match `/^[pnbrqkPNBRQK]$/`. Validates `if (file >= 8) throw new Error('Invalid FEN: rank exceeds 8 squares')`.
  - If a character is neither a valid digit nor a valid piece character, throws `Invalid FEN piece character: "${char}"`.
  - Checks rank completeness after loop: `if (file !== 8) throw new Error('Invalid FEN: rank must contain exactly 8 squares, got ' + file)`.
  - Completely prevents phantom piece injection (e.g. `'9'`) and rank overflow/underflow (e.g. `'p8'`, `'4'`).

### 5. `tests/chess/tier5_adversarial.test.ts`
- Created unified Tier 5 adversarial test suite integrating:
  - Challenger 1 Logic Adversarial Tests (Mailbox math, extreme castling boundaries, dual en passant & complex pins, underpromotions, 9 queens, helpmate evaluation, FEN strict parsing validation, SAN disambiguation, 30-ply undo/redo, AI minimax mate-in-1, free piece capture, multi-tier legal move generation, concurrent AI calls, corner square attack detection).
  - Challenger 2 UI Adversarial Tests (Timer countdowns & flag fall across game modes, material differential calculations with promotions/underpromotions, board flip orientation & drag-and-drop pointer calculations with mobile touch offsets, GameWindowControls contracts & propagation, catalog launch & lifecycle state machine, Web Audio synthesis under SSR/headless/muted/throwing conditions).
- 0 tests skipped, 0 failures across all 243 project tests.
