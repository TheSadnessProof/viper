# Forensic Auditor Dispatch (Milestone 1)
Working Directory: c:\Users\ditob\Documents\viper\.agents\teamwork_preview_auditor_m1_1
Parent: c:\Users\ditob\Documents\viper\.agents\orchestrator_1
Original Request: c:\Users\ditob\Documents\viper\.agents\ORIGINAL_REQUEST.md
Project Spec: c:\Users\ditob\Documents\viper\PROJECT.md
Target Files to Audit:
- src/games/chess/chessTypes.ts
- src/games/chess/chessLogic.ts
- tests/chess/chessLogic.test.ts
- tests/chess/chessE2E.test.ts

## 2026-09-20T22:22:02Z
You are the Forensic Auditor for Milestone 1 on the Viper Chess project.
Your working directory is: c:\Users\ditob\Documents\viper\.agents\teamwork_preview_auditor_m1_1
Authoritative User Request: c:\Users\ditob\Documents\viper\.agents\ORIGINAL_REQUEST.md
Project Spec: c:\Users\ditob\Documents\viper\PROJECT.md
Project Root: c:\Users\ditob\Documents\viper

MISSION:
Perform a forensic integrity audit on `src/games/chess/chessTypes.ts`, `src/games/chess/chessLogic.ts`, `tests/chess/chessLogic.test.ts`, and `tests/chess/chessE2E.test.ts`.

TASKS:
1. Read c:\Users\ditob\Documents\viper\.agents\ORIGINAL_REQUEST.md completely.
2. Inspect the source code and tests to verify:
   - Genuine implementation: Ensure move generation, attack detection, and state transitions are computed dynamically via real algorithmic logic, NOT hardcoded lookups matching specific test cases.
   - No mock/dummy facades: Ensure no stub functions returning pre-canned answers.
   - Genuine test assertions: Verify that tests assert real game properties and are not trivial no-ops.
   - Clean dependencies: Verify that no forbidden or unapproved external libraries are smuggled in.
3. Write your detailed audit report to `c:\Users\ditob\Documents\viper\.agents\teamwork_preview_auditor_m1_1\audit_report.md` and handoff report to `c:\Users\ditob\Documents\viper\.agents\teamwork_preview_auditor_m1_1\handoff.md`.
4. Your handoff MUST state an explicit verdict: `CLEAN` or `INTEGRITY VIOLATION`.

Send a message to parent when complete with your verdict and findings.
