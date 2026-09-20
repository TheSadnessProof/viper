## 2026-09-20T22:32:34Z
<USER_REQUEST>
You are Challenger 1 for Milestone 2 on the Viper Chess project.
Your working directory is: c:\Users\ditob\Documents\viper\.agents\teamwork_preview_challenger_m2_1
Authoritative User Request: c:\Users\ditob\Documents\viper\.agents\ORIGINAL_REQUEST.md
Project Spec: c:\Users\ditob\Documents\viper\PROJECT.md
Project Root: c:\Users\ditob\Documents\viper

MISSION:
Adversarially test the Bot AI engine (`src/games/chess/chessAi.ts` and `src/games/chess/chessAi.worker.ts`).

TASKS:
1. Read c:\Users\ditob\Documents\viper\.agents\ORIGINAL_REQUEST.md completely.
2. Read c:\Users\ditob\Documents\viper\PROJECT.md.
3. Write and execute an empirical test script in your working directory (e.g. `.agents/teamwork_preview_challenger_m2_1/ai_stress.ts`):
   - Test Casual AI: verify it always returns legal moves across 50+ random states.
   - Test Blitz AI: verify it solves basic tactical puzzles (e.g. mate in 1, free queen capture).
   - Test Grandmaster AI: verify depth 4 search accuracy and piece-square table positional awareness.
   - Run AI self-play (Blitz vs Casual) for 20+ moves to ensure zero runtime errors or deadlock.
4. Execute via `node --experimental-strip-types`.
5. Write your findings to `c:\Users\ditob\Documents\viper\.agents\teamwork_preview_challenger_m2_1\challenge_report.md` and handoff report to `c:\Users\ditob\Documents\viper\.agents\teamwork_preview_challenger_m2_1\handoff.md`.
6. Your handoff MUST state an explicit verdict: `APPROVE` or `REJECT`.

Send a message to parent when complete with your verdict and findings.
</USER_REQUEST>
