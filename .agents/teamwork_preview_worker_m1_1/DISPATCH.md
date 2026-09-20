## 2026-09-20T22:11:07Z

You are the Milestone 1 Worker on the Viper Chess project.
Your working directory is: c:\Users\ditob\Documents\viper\.agents\teamwork_preview_worker_m1_1
Authoritative User Request: c:\Users\ditob\Documents\viper\.agents\ORIGINAL_REQUEST.md
Project Spec: c:\Users\ditob\Documents\viper\PROJECT.md
Spec Miner Report: c:\Users\ditob\Documents\viper\.agents\teamwork_preview_spec_miner_survey_2\survey_report.md
Project Root: c:\Users\ditob\Documents\viper

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

TARGET FILES OWNED EXCLUSIVELY:
- src/games/chess/chessTypes.ts
- src/games/chess/chessLogic.ts

MISSION:
Implement the complete, pure TypeScript FIDE chess engine adhering to PROJECT.md and the Spec Miner report.

TASKS:
1. Read c:\Users\ditob\Documents\viper\.agents\ORIGINAL_REQUEST.md completely.
2. Read c:\Users\ditob\Documents\viper\PROJECT.md § Interface Contracts.
3. Read c:\Users\ditob\Documents\viper\.agents\teamwork_preview_spec_miner_survey_2\survey_report.md for exact algorithms, invariants, and edge cases.
4. Implement `src/games/chess/chessTypes.ts` with all required interfaces and types.
5. Implement `src/games/chess/chessLogic.ts`:
   - Mailbox 0..63 coordinate model, algebraic notation conversions (e.g., 'e4' <-> 28, index = rank * 8 + file).
   - `createInitialGameState()`
   - Piece move generators for all 6 piece types.
   - `isSquareAttacked(board, square, byColor)` checking pawns, knights, kings, and ray sliders (bishops, rooks, queens).
   - Candidate pseudo-legal move generation filtered by king safety (`getLegalMoves(state, fromSquare?)`).
   - Special moves:
     * Castling (O-O and O-O-O): check rights, intermediate squares empty, king not in check, king transit square not attacked, king destination not attacked. Update castling rights when king moves or rooks move/are captured.
     * En Passant: set target square on 2-square pawn push, reset on any other move. Capture removes enemy pawn on adjacent square. Handle horizontal pin trap correctly.
     * Pawn Promotion: detect rank 8 (white) or rank 1 (black). Default promotion to 'q' if not specified, support 'q', 'r', 'b', 'n'.
   - Terminal conditions:
     * `isCheck`: king square attacked.
     * `isCheckmate`: `isCheck && legalMoves.length === 0`.
     * `isStalemate`: `!isCheck && legalMoves.length === 0`.
     * `isDraw`: stalemate, insufficient material, 50-move rule (`halfmoveClock >= 100`), or threefold repetition.
     * Insufficient material: K vs K, K+B vs K, K+N vs K, K+B vs K+B (same-colored bishops).
   - `makeMove(state, move)` returning a new immutable state object.
   - `undoMove(state)` returning the previous state from `state.history`.
   - `toFEN(state)` and `fromFEN(fen)` supporting standard FEN notation.
6. Verify your implementation by running:
   - `npm run build` to ensure 0 TypeScript compilation errors.
   - `node --experimental-strip-types --test tests/chess/**/*.test.ts` to run automated tests.
7. Write your change summary to `c:\Users\ditob\Documents\viper\.agents\teamwork_preview_worker_m1_1\changes.md` and formal handoff report to `c:\Users\ditob\Documents\viper\.agents\teamwork_preview_worker_m1_1\handoff.md`.

Send a message to parent when complete with test results and artifact paths.
