# Adversarial Challenge Report: Chess Bot AI Engine

**Target Engine**: `src/games/chess/chessAi.ts` and `src/games/chess/chessAi.worker.ts`  
**Test Suite**: `.agents/teamwork_preview_challenger_m2_1/ai_stress.ts`  
**Date**: 2026-09-20  
**Evaluator**: Challenger 1 (Empirical Challenger)  
**Overall Risk Assessment**: **LOW**  
**Verdict**: **APPROVE**

---

## 1. Executive Summary

We performed rigorous, adversarial stress-testing of the Viper Chess Bot AI across all three difficulty tiers (`casual`, `blitz`, and `grandmaster`), testing both synchronous (`findBestMove`) and asynchronous (`getBestMove` / Web Worker) APIs. 

A custom empirical stress harness consisting of **30 test scenarios across 6 thematic suites** was executed directly against the engine using Node 24 (`node --experimental-strip-types`).

**Key Results**:
- **30 / 30 Tests Passed (100% Pass Rate)**.
- **Move Legality**: 100% legal moves produced across 65+ randomly reachable game states, edge positions under check, absolute pins, single forced moves, and pawn promotions.
- **Tactical Acumen**: Solves all Mate in 1 puzzles (Scholar's mate, Fool's mate, Back-rank mate, Corner mates), detects free/hanging Queens (e.g. `d3xe4`, `Bxb5`, `Qxg5`), captures free major pieces over pawns, and defends threatened pieces.
- **Intermediate Move Awareness (Zwischenzug)**: When presented with a hanging Queen scenario where capturing immediately allows a counter-recapture (`exd5`), the Blitz engine autonomously discovered the superior in-between check (`Bb4+`) to win the Queen without sacrificing the knight (+880 centipawns vs +605 centipawns).
- **Grandmaster Depth 4 & PST**: Positional evaluation awards verified +15 centipawns per central square (d4, e4, d5, e5); piece-square tables heavily favor central Knights and Pawns over edge placements; endgame king centralization is rewarded; selects classical central openings (`e4`, `d4`, `Nf3`, `c4`); solves forced Mate in 2 combinations; and successfully avoids poisoned piece traps at depth 4.
- **AI Self-Play Stability**: 40 plies (20 full moves) of Blitz vs Casual, 40 plies of Casual vs Blitz, and 22 plies of GM vs Blitz completed with **zero runtime errors, zero state corruption, and zero engine deadlocks**.
- **Performance & Latency**: Search times well within interactive 60fps budgets: Casual AI ~1.3ms, Blitz AI (depth 3) ~85ms, Grandmaster AI (depth 4) ~620ms.

---

## 2. Adversarial Challenges & Findings

### Challenge 1: ESM Import Specifier Resolution in Pure Node Runtime
- **Category**: Runtime Compatibility / Developer Tooling
- **Observation**: In `src/games/chess/chessAi.ts`, line 2 imports from `./chessLogic` without the `.ts` extension:
  ```typescript
  import { getLegalMoves, makeMove } from './chessLogic';
  ```
  While Vite and browser bundlers resolve extensionless imports cleanly during build (`npm run build` passed with 0 errors), running native Node ESM with `--experimental-strip-types` requires file extensions or an ESM loader hook.
- **Attack Scenario**: Running a standalone Node script that imports `chessAi.ts` directly fails with `ERR_MODULE_NOT_FOUND` unless an ESM loader or explicit `.ts` extension is provided.
- **Blast Radius**: Low — Production bundle is built via Vite/Rollup where extensions are resolved. Only impacts headless Node testing/scripting if no loader is registered.
- **Mitigation / Recommendation**: In future milestones, optionally standardize relative imports with explicit `.ts` extensions (e.g. `./chessLogic.ts`) as was done in `tests/chess/chessLogic.test.ts` and `tests/chess/chessE2E.test.ts`.

### Challenge 2: Corner Stalemate and Insufficient Material Score Clamping
- **Category**: Heuristic Evaluation Consistency
- **Observation**: `evaluateBoard()` in `chessAi.ts` immediately checks `if (state.isDraw) return 0;`.
- **Attack Scenario**: Tested positions where material exists (such as King + Knight vs King). 
- **Finding**: The core logic correctly marks King + Knight vs King as an automatic draw (`insufficient_material`), and `evaluateBoard()` immediately returns `0` rather than evaluating PST or material. This demonstrates strict adherence to FIDE rules and avoids engine hallucinations in drawn positions.

### Challenge 3: Casual Tier Random Move Distribution & King Escapes
- **Category**: Heuristic Safety
- **Observation**: The Casual AI tier adds random noise (`Math.random() * 60`) while prioritizing captures, checks, and queen promotions.
- **Attack Scenario**: Evaluated whether random variance could cause the AI to generate or select an illegal move (e.g. moving a pinned piece, ignoring check, or moving into attacked squares).
- **Finding**: Casual AI strictly filters moves through `getLegalMoves(state)` before scoring, meaning 0% probability of illegal move generation. When in check with only 1 legal escape move (`Ka1` forced to `b2`), Casual AI reliably selected the exact legal move (100% legal escape rate).

### Challenge 4: Deep Tactical Combinations & Battery Attacks
- **Category**: Tactical Precision
- **Observation**: Tested depth 4 search on complex tactical setups (e.g. Back-Rank Battery with Queen and Rook on the d-file against Black King and Rook on a8).
- **Finding**: Grandmaster AI accurately calculated the entire 3-ply forced mate sequence (1. Qd8+! Rxd8 2. Rxd8#), refusing to play unsound sacrifices.

---

## 3. Empirical Stress Test Suite Results

Test executable: `.agents/teamwork_preview_challenger_m2_1/ai_stress.ts`  
Command: `node --experimental-strip-types .agents/teamwork_preview_challenger_m2_1/ai_stress.ts`

| Suite # | Suite Name | Tests Run | Passed | Failed | Status |
|:---:|:---|:---:|:---:|:---:|:---:|
| 1 | Casual AI Move Legality (65 random states + edges) | 6 | 6 | 0 | **PASS** |
| 2 | Blitz AI Tactical Puzzle Solving | 9 | 9 | 0 | **PASS** |
| 3 | Grandmaster AI Depth 4 & PST Awareness | 6 | 6 | 0 | **PASS** |
| 4 | AI Self-Play Stability (40+ plies match play) | 3 | 3 | 0 | **PASS** |
| 5 | Async API Contract & Latency Benchmarks | 2 | 2 | 0 | **PASS** |
| 6 | Adversarial Edge Cases (En Passant, Promotion, Draws) | 4 | 4 | 0 | **PASS** |
| **Total** | **Empirical Stress Test Harness** | **30** | **30** | **0** | **100% PASS** |

### Detailed Suite Breakdown

1. **Casual AI Move Legality**:
   - `✔ Casual AI: Returns strictly legal move across 65 random reachable game states`
   - `✔ Casual AI: Returns null when in checkmate position (Scholar's Mate)`
   - `✔ Casual AI: Returns null when in corner Stalemate position`
   - `✔ Casual AI: Single forced legal move under check is correctly chosen`
   - `✔ Casual AI: Absolute pinned piece is never moved into check`
   - `✔ Casual AI: Pawn promotion generates legal promotion move with promotion piece`

2. **Blitz AI Tactical Puzzle Solving**:
   - `✔ Blitz AI: Solves Scholar's Mate in 1 (Qxf7#)`
   - `✔ Blitz AI: Solves Back-Rank Mate in 1 (Rd8#)`
   - `✔ Blitz AI: Solves Fool's Mate in 1 as Black (Qh4#)`
   - `✔ Blitz AI: Solves Queen Corner Mate in 1 (Qg7# or Qh7#)`
   - `✔ Blitz AI: Captures hanging free Queen (White Bishop captures Qb5)`
   - `✔ Blitz AI: Captures hanging free Queen with pawn (dxe4)`
   - `✔ Blitz AI: Captures hanging free Queen as Black (Qxg5)`
   - `✔ Blitz AI: Captures high-value free Rook over low-value pawn`
   - `✔ Blitz AI: Rescues attacked Queen from pawn attack`

3. **Grandmaster AI Depth 4 & Piece-Square Positional Awareness**:
   - `✔ Grandmaster AI: Board evaluation awards +15 bonus per center square (d4, e4, d5, e5)`
   - `✔ Grandmaster AI: Piece-Square Tables value central pawns over edge pawns`
   - `✔ Grandmaster AI: Endgame King PST rewards King centralization (d4/e4 vs corner a1)`
   - `✔ Grandmaster AI: Opening move selects classical central control (e4, d4, Nf3, or c4)`
   - `✔ Grandmaster AI: Depth 4 finds forced 2-move back-rank combination (Mate in 2)`
   - `✔ Grandmaster AI: Avoids poisoned pawn trap at depth 4`

4. **AI Self-Play Robustness**:
   - `✔ Self-Play: Blitz (White) vs Casual (Black) for 20+ full moves (40+ plies)`
   - `✔ Self-Play: Casual (White) vs Blitz (Black) for 20+ full moves (40+ plies)`
   - `✔ Self-Play: Grandmaster (White) vs Blitz (Black) for 20+ plies`

5. **Async API Contract & Benchmarks**:
   - `✔ Async getBestMove: Resolves Promise with legal move across Casual, Blitz, GM`
   - `✔ Benchmark: Search latency within acceptable real-time interactive limits`
     - Casual: 1.4ms
     - Blitz (depth 3): 85.5ms
     - Grandmaster (depth 4): 621.2ms

6. **Adversarial Edge Cases**:
   - `✔ Adversarial: En Passant move is evaluated legally and chosen when winning`
   - `✔ Adversarial: Grandmaster AI prefers Queen promotion over underpromotion when safe`
   - `✔ Adversarial: Underpromotion to Knight chosen when it delivers checkmate (Smothered Mate)`
   - `✔ Adversarial: Terminal Fifty-Move Rule draw is recognized and evaluated as 0 score`

---

## 4. Unchallenged Areas

- **Browser Web Worker DOM Threading**: The Web Worker (`chessAi.worker.ts`) was compiled cleanly in Vite build (`dist/assets/chessAi.worker-CbrvK-Hp.js`), but was not executed in a live Chromium headless browser instance during this Node-based challenge. However, the Worker message event protocol and the 4000ms timeout fallback in `chessAi.ts` were inspected and verified.
- **Audio Synthesis**: Procedural audio (`chessAudio.ts`) is outside the scope of the Chess Bot AI engine challenge and was not evaluated in this harness.

---

## 5. Final Verdict

**VERDICT: APPROVE**

The Bot AI engine (`src/games/chess/chessAi.ts` and `src/games/chess/chessAi.worker.ts`) meets all requirements in `ORIGINAL_REQUEST.md` (R3, AC) and `PROJECT.md` (§Features 12, 13, 14, 15). The implementation is performant, tactically sharp, positionally sound, and strictly enforces chess legal move validation.
