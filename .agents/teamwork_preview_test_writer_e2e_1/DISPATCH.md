# E2E Test Writer Dispatch
Working Directory: c:\Users\ditob\Documents\viper\.agents\teamwork_preview_test_writer_e2e_1
Parent: c:\Users\ditob\Documents\viper\.agents\orchestrator_1
Original Request: c:\Users\ditob\Documents\viper\.agents\ORIGINAL_REQUEST.md
Project Spec: c:\Users\ditob\Documents\viper\PROJECT.md
Test Infra Spec: c:\Users\ditob\Documents\viper\TEST_INFRA.md
Target Files Owned Exclusively:
- tests/chess/chessLogic.test.ts
- tests/chess/chessE2E.test.ts

## 2026-09-20T22:11:07Z
You are the E2E Test Writer on the Viper Chess project.
Your working directory is: c:\Users\ditob\Documents\viper\.agents\teamwork_preview_test_writer_e2e_1
Authoritative User Request: c:\Users\ditob\Documents\viper\.agents\ORIGINAL_REQUEST.md
Project Spec: c:\Users\ditob\Documents\viper\PROJECT.md
Test Infra Spec: c:\Users\ditob\Documents\viper\TEST_INFRA.md
Project Root: c:\Users\ditob\Documents\viper

MISSION:
Implement a comprehensive, opaque-box automated test suite for Viper Chess adhering to TEST_INFRA.md and ORIGINAL_REQUEST.md using Node 24 native test runner (`node:test` and `node:assert/strict`).

TARGET FILES OWNED EXCLUSIVELY:
- tests/chess/chessLogic.test.ts
- tests/chess/chessE2E.test.ts

TASKS:
1. Read c:\Users\ditob\Documents\viper\.agents\ORIGINAL_REQUEST.md completely.
2. Read c:\Users\ditob\Documents\viper\PROJECT.md and c:\Users\ditob\Documents\viper\TEST_INFRA.md to understand the exact contracts, types, and test case requirements.
3. Design and implement the tests in `tests/chess/chessLogic.test.ts`:
   - Tier 1: Feature Coverage (Piece movement, legal moves, castling, en passant, promotion, check, checkmate, stalemate, draws, FEN). At least 5 tests per feature.
   - Tier 2: Boundary & Corner Cases (King in check cannot castle, castling through check forbidden, castling into check forbidden, en passant 1-ply expiration, en passant horizontal pin trap, promotion to Q/R/B/N, absolute pins, stalemate positions, insufficient material draws).
   - Tier 3: Cross-Feature Combinations (Castling with check, promotion with checkmate, en passant check discovery, promotion into stalemate).
4. Design and implement the tests in `tests/chess/chessE2E.test.ts`:
   - Tier 4: Real-World Match Scenarios (Scholar's Mate, Opera Game, Immortal Game, Kasparov's Immortal, Byrne vs Fischer, 50-move draws, full game simulations).
5. Target >= 113 total test cases across all tiers.
6. Create `c:\Users\ditob\Documents\viper\TEST_READY.md` summarizing the test suite coverage matrix when complete.
7. Write your handoff report to `c:\Users\ditob\Documents\viper\.agents\teamwork_preview_test_writer_e2e_1\handoff.md`.

Send a message to parent when complete with details of the test suite and artifact paths.
