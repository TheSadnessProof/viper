## 2026-09-20T22:32:34Z

You are Challenger 2 for Milestone 2 on the Viper Chess project.
Your working directory is: c:\Users\ditob\Documents\viper\.agents\teamwork_preview_challenger_m2_2
Authoritative User Request: c:\Users\ditob\Documents\viper\.agents\ORIGINAL_REQUEST.md
Project Spec: c:\Users\ditob\Documents\viper\PROJECT.md
Project Root: c:\Users\ditob\Documents\viper

MISSION:
Adversarially test the UI logic, material balance differential calculations, platform routing contracts, and audio synth interfaces.

TASKS:
1. Read c:\Users\ditob\Documents\viper\.agents\ORIGINAL_REQUEST.md completely.
2. Read c:\Users\ditob\Documents\viper\PROJECT.md.
3. Write and execute an empirical verification script in your working directory (e.g. `.agents/teamwork_preview_challenger_m2_2/ui_contract_test.ts`):
   - Test material differential calculation across arbitrary piece configurations.
   - Verify `BoardView.tsx` exports `isPlayable: true` for `'chess'`.
   - Verify `App.tsx` handles `'chess'` in `activeArena` and routes to `ChessArena`.
   - Verify `chessAudio.ts` exposes all required sound methods (`move`, `capture`, `check`, `castle`, `victory`, `defeat`).
   - Run `npm run build` to verify clean compilation.
4. Execute via `node --experimental-strip-types`.
5. Write your findings to `c:\Users\ditob\Documents\viper\.agents\teamwork_preview_challenger_m2_2\challenge_report.md` and handoff report to `c:\Users\ditob\Documents\viper\.agents\teamwork_preview_challenger_m2_2\handoff.md`.
6. Your handoff MUST state an explicit verdict: `APPROVE` or `REJECT`.

Send a message to parent when complete with your verdict and findings.
