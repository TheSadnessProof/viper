## 2026-09-20T22:46:04Z

<USER_REQUEST>
You are the Milestone 3 Remediation Worker on the Viper Chess project.
Your working directory is: c:\Users\ditob\Documents\viper\.agents\teamwork_preview_worker_m3_1
Authoritative User Request: c:\Users\ditob\Documents\viper\.agents\ORIGINAL_REQUEST.md
Project Spec: c:\Users\ditob\Documents\viper\PROJECT.md
Gap Report: c:\Users\ditob\Documents\viper\.agents\teamwork_preview_challenger_m3_1\gap_report.md
Project Root: c:\Users\ditob\Documents\viper

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

TARGET FILES OWNED EXCLUSIVELY:
- src/games/chess/chessLogic.ts
- src/games/chess/chessAi.ts
- src/games/chess/chessAi.worker.ts
- tsconfig.app.json
- tests/chess/tier5_adversarial.test.ts

MISSION:
Remediate the issues discovered in Challenger 1's gap report, integrate Tier 5 adversarial tests, and verify complete test suite and build passing.

TASKS:
1. Read c:\Users\ditob\Documents\viper\.agents\teamwork_preview_challenger_m3_1\gap_report.md completely.
2. In `tsconfig.app.json`:
   - Set `"allowImportingTsExtensions": true` (note that `"noEmit": true` is already set).
3. In `src/games/chess/chessAi.ts` and `src/games/chess/chessAi.worker.ts`:
   - Update relative imports to include `.ts` extensions:
     `from './chessLogic.ts'`, `from './chessTypes.ts'`, `from './chessAi.ts'`.
   - This allows Node 24's native ESM test runner to resolve imports directly.
4. In `src/games/chess/chessLogic.ts`:
   - Strengthen `fromFEN`:
     * Strictly validate character is in `1..8` or matches `/^[pnbrqkPNBRQK]$/`. If not, throw an error `Invalid FEN piece character: "${char}"`.
     * Check that `file <= 8` after integer increments.
     * Check that `file === 8` at the end of each rank parsing. If not, throw an error.
5. Create `tests/chess/tier5_adversarial.test.ts`:
   - Integrate the adversarial tests from `.agents/teamwork_preview_challenger_m3_1/tier5_adversarial_logic.test.ts` and `.agents/teamwork_preview_challenger_m3_2/tier5_adversarial_ui.test.ts`.
   - Ensure all tests import cleanly and execute via `node --experimental-strip-types --test`.
6. Run verification commands:
   - `npm run build` (must compile with 0 TypeScript/Vite errors).
   - `node --experimental-strip-types --test tests/chess/**/*.test.ts` (all tests across all suites must pass with 0 failures and 0 skipped).
7. Write your changes to `c:\Users\ditob\Documents\viper\.agents\teamwork_preview_worker_m3_1\changes.md` and handoff report to `c:\Users\ditob\Documents\viper\.agents\teamwork_preview_worker_m3_1\handoff.md`.

Send a message to parent when complete with verification results.
</USER_REQUEST>
