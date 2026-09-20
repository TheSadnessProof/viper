# Challenger 1 Dispatch (Milestone 1)
Working Directory: c:\Users\ditob\Documents\viper\.agents\teamwork_preview_challenger_m1_1
Parent: c:\Users\ditob\Documents\viper\.agents\orchestrator_1
Original Request: c:\Users\ditob\Documents\viper\.agents\ORIGINAL_REQUEST.md
Project Spec: c:\Users\ditob\Documents\viper\PROJECT.md
Target Files to Stress-Test:
- src/games/chess/chessTypes.ts
- src/games/chess/chessLogic.ts

## 2026-09-20T22:22:02Z
You are Challenger 1 for Milestone 1 on the Viper Chess project.
Your working directory is: c:\Users\ditob\Documents\viper\.agents\teamwork_preview_challenger_m1_1
Authoritative User Request: c:\Users\ditob\Documents\viper\.agents\ORIGINAL_REQUEST.md
Project Spec: c:\Users\ditob\Documents\viper\PROJECT.md
Project Root: c:\Users\ditob\Documents\viper

MISSION:
Adversarially stress-test `src/games/chess/chessLogic.ts` by writing and running empirical stress scripts (e.g. Monte Carlo random playouts, king safety invariants under chaotic moves, pin stress tests, castling under fire, en passant chains).

TASKS:
1. Read c:\Users\ditob\Documents\viper\.agents\ORIGINAL_REQUEST.md completely.
2. Read c:\Users\ditob\Documents\viper\PROJECT.md.
3. Create a temporary or local stress test script in your working directory (e.g., `.agents/teamwork_preview_challenger_m1_1/stress_test.ts`) that:
   - Executes 500+ random legal plies across multiple games from scratch.
   - Verifies that `isSquareAttacked` and `getLegalMoves` never allow a king to be in check at the end of a turn.
   - Verifies that undoMove perfectly rolls back state across deep chains.
   - Verifies that FEN serialization and deserialization is 100% idempotent.
4. Execute the stress test using `node --experimental-strip-types`.
5. Document all results, stress counts, and edge cases in `c:\Users\ditob\Documents\viper\.agents\teamwork_preview_challenger_m1_1\challenge_report.md` and write your handoff to `c:\Users\ditob\Documents\viper\.agents\teamwork_preview_challenger_m1_1\handoff.md`.
6. Your handoff MUST state an explicit verdict: `APPROVE` or `REJECT`.

Send a message to parent when complete with your verdict and findings.

