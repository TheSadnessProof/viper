## 2026-09-20T22:27:32Z
You are the Milestone 2 Worker on the Viper Chess project.
Your working directory is: c:\Users\ditob\Documents\viper\.agents\teamwork_preview_worker_m2_1
Authoritative User Request: c:\Users\ditob\Documents\viper\.agents\ORIGINAL_REQUEST.md
Project Spec: c:\Users\ditob\Documents\viper\PROJECT.md
Explorer 1 Report: c:\Users\ditob\Documents\viper\.agents\teamwork_preview_explorer_survey_1\survey_report.md
Explorer 3 Report: c:\Users\ditob\Documents\viper\.agents\teamwork_preview_explorer_survey_3\survey_report.md
Project Root: c:\Users\ditob\Documents\viper

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

TARGET FILES OWNED EXCLUSIVELY:
- src/games/chess/chessAi.ts
- src/games/chess/chessAi.worker.ts
- src/games/chess/chessAudio.ts
- src/games/chess/ChessPieces.tsx
- src/games/chess/ChessBoardView.tsx
- src/games/chess/ChessArena.tsx
- src/components/views/BoardView.tsx
- src/App.tsx

MISSION:
Implement the complete interactive Viper Chess Arena, Bot AI engine with 3 tiers, procedural Web Audio sound synthesizer, sleek obsidian/crystal board UI with 5 visual move indicators, captured pieces rack with material differential, clocks, game over modal with confetti, and platform integration in BoardView and App.tsx.

TASKS:
1. Read c:\Users\ditob\Documents\viper\.agents\ORIGINAL_REQUEST.md completely.
2. Read c:\Users\ditob\Documents\viper\PROJECT.md.
3. Read Explorer 1 and Explorer 3 survey reports for exact component patterns, GameWindowControls props, and visual designs.
4. Implement `src/games/chess/chessAi.ts` and `src/games/chess/chessAi.worker.ts`:
   - 3 distinct AI tiers:
     * Casual: fast randomized selection among legal moves with slight preference for captures and center moves.
     * Blitz: Minimax depth 3 with alpha-beta pruning, piece-square tables, material balance.
     * Grandmaster: Minimax depth 4 (or 4-5 with iterative deepening), piece-square tables, center control, king safety, MVV-LVA move ordering.
   - Non-blocking execution: Use Web Worker (`chessAi.worker.ts`) when available in browser, with an async fallback so UI never freezes and Node tests run cleanly.
5. Implement `src/games/chess/chessAudio.ts`:
   - Procedural Web Audio API sound synthesizer: move, capture, check, castle, victory fanfare, defeat. Zero external audio file assets needed.
6. Implement `src/games/chess/ChessPieces.tsx`:
   - High-contrast SVG pieces for White (crisp ivory/silver) and Black (obsidian/slate with cyan/sky glow).
7. Implement `src/games/chess/ChessBoardView.tsx`:
   - 8x8 chessboard rendering: Obsidian glass (`bg-slate-800/90`) and crystal (`bg-slate-200/90`) squares with coordinates (a-h, 1-8).
   - 5 Visual Move Indicators: cyan destination dots, rose capture rings, crimson check danger aura, selected piece highlight, last move trail.
   - Dual input: Click-to-move and Drag-and-Drop using Pointer Events (`onPointerDown`, `onPointerMove`, `onPointerUp`) with `setPointerCapture` and a -32px touch offset for mobile.
   - Orientation: White or Black at bottom (flippable for Pass-and-Play or playing as Black).
   - Promotion Modal: Clean floating modal over board for Q, R, B, N choice.
8. Implement `src/games/chess/ChessArena.tsx`:
   - Fullscreen arena layout with `GameWindowControls`:
     * `gameTitle="Chess"`, `gameTag="3-Minute Blitz Showdown"`, `onExit`.
     * `extraControls`: Difficulty selector (Casual, Blitz, Grandmaster), Timer selector (1m, 3m, 5m, 10m, Unlimited), Mode (vs Bot, Pass-and-Play), Sound toggle (mute/unmute), Restart match, Flip board.
     * HUD: Zero text clutter! Player trays with username/bot badge, active turn indicator, countdown clock, captured pieces tray with live material differential counter (`+N`).
     * Game over modal: Non-intrusive victory/draw modal with `canvas-confetti` celebration on win.
9. Wire platform integration:
   - `src/components/views/BoardView.tsx`: Set `id: 'chess'` to `isPlayable: true`.
   - `src/App.tsx`: Add `'chess'` to `activeArena` type union, add `'chess'` branch to `handleLaunchGame`, and render `<ChessArena>` when `activeArena === 'chess'` with clean `onExit={() => setActiveArena(null)}`.
10. Verify:
   - `npm run build` must compile with 0 TypeScript/Vite errors.
   - `node --experimental-strip-types --test tests/chess/**/*.test.ts` must pass all tests.
11. Write your changes to `c:\Users\ditob\Documents\viper\.agents\teamwork_preview_worker_m2_1\changes.md` and handoff report to `c:\Users\ditob\Documents\viper\.agents\teamwork_preview_worker_m2_1\handoff.md`.

Send a message to parent when complete with build and test results.
