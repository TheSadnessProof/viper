# E2E Test Infra: Viper Chess

## Test Philosophy
- **Opaque-box & Requirement-Driven**: Tests are designed directly from the user specifications in `ORIGINAL_REQUEST.md` (FIDE rules, castling, en passant, promotion, checkmate, stalemate, draws, AI difficulty, and clock timers).
- **Methodology**: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Testing.
- **Zero-Dependency Native Runner**: Executes via Node 24's built-in test runner with native TypeScript type stripping (`node --experimental-strip-types --test tests/chess/**/*.test.ts`), executing in milliseconds with exit code 0 on pass.

---

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|----------------------|:------:|:------:|:------:|
| 1 | Standard Piece Movement (P, N, B, R, Q, K) | R1, AC (Legal moves) | 6 | 6 | ✓ |
| 2 | Castling (Kingside & Queenside) | R1, AC (Castling) | 5 | 5 | ✓ |
| 3 | En Passant (Trigger & Expiration) | R1, AC (En Passant) | 5 | 5 | ✓ |
| 4 | Pawn Promotion (Q, R, B, N) | R1, AC (Promotion) | 5 | 5 | ✓ |
| 5 | Check & Pin Enforcement | R1, AC (Check detection) | 5 | 5 | ✓ |
| 6 | Checkmate & Stalemate | R1, AC (Terminal states) | 5 | 5 | ✓ |
| 7 | Draw Conditions (50-move, Insufficient Material, Repetition) | R1, AC (Draws) | 5 | 5 | ✓ |
| 8 | FEN Import/Export & History Undo/Redo | R1, R3 (Undo/Restart) | 5 | 5 | ✓ |
| 9 | Bot AI Decisions (Casual, Blitz, GM) | R3, AC (AI settings) | 5 | 5 | ✓ |

---

## Test Architecture
- **Test Runner**: Node.js `v24.21.0` native runner:
  ```powershell
  node --experimental-strip-types --test tests/chess/**/*.test.ts
  ```
- **Assertions**: `node:assert/strict` (`assert.strictEqual`, `assert.deepStrictEqual`, `assert.ok`).
- **Pass/Fail Semantics**: Standard POSIX exit codes (0 = all pass, non-zero = failure).
- **Directory Layout**:
  - `tests/chess/chessLogic.test.ts` — Engine mechanics, move generation, and rule validation (Tiers 1-3).
  - `tests/chess/chessE2E.test.ts` — Full game matches, real-world workloads, and tournament games (Tier 4).

---

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Scholar's Mate (4-Move Checkmate) | E4/e5 opening, bishop/queen battery, f7 checkmate detection | Low |
| 2 | Immortal Game (Anderssen vs Kieseritzky, 1851) | Deep sacrifices, king mobility, double bishop checkmate | High |
| 3 | Opera Game (Morphy vs Duke of Brunswick, 1858) | Development, pins, rook sacrifice, back-rank mate | High |
| 4 | Kasparov vs Topalov (1999) "Kasparov's Immortal" | Complex tactical combinations, rook sacrifice, king hunt | Very High |
| 5 | Lasker vs Bauer (1889) Double Bishop Sacrifice | Double sacrifice breaking pawn shield, king safety check | High |
| 6 | Byrne vs Fischer (1956) "Game of the Century" | Queen sacrifice, discovered check windmill, smothered checkmate | Very High |
| 7 | Famous Stalemate Traps (Troitsky, Evans) | King cornering, forced stalemate defense from lost position | Medium |
| 8 | Complete Grandmaster AI Self-Play Simulation | Non-crashing, 50+ legal plies without invalid state or deadlock | High |

---

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: ≥45 test cases (≥5 per feature).
- **Tier 2 (Boundary & Corner Cases)**: ≥45 test cases (boundary limits, pinned pieces, rare en passant pin, castling through attack, dead position draws).
- **Tier 3 (Cross-Feature Combinations)**: ≥15 test cases (castling with check, promotion with check, en passant check discovery, promotion into stalemate).
- **Tier 4 (Real-World Scenarios)**: ≥8 complete master games and game-flow simulations.
- **Total Minimum Target**: ≥113 rigorous automated test cases.
