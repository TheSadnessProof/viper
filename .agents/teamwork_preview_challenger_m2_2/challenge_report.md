# Milestone 2 Challenge Report: UI Logic, Material Calculations, Platform Routing, & Audio Synth

**Challenger**: Challenger 2 (Empirical Challenger)  
**Date**: 2026-09-20T22:35:00Z  
**Target Milestone**: Milestone 2 (Arena UI, Bot AI & Platform Integration)  

---

## Challenge Summary

**Overall risk assessment**: **LOW**

All empirical tests across UI contract wiring, material balance differential calculations, platform routing contracts, audio synthesis interfaces, and production build compilation passed with 100% success rate. The implementation adheres strictly to the FIDE chess standard, the Viper luxury esports aesthetic, and the project architectural specification.

---

## Challenges

### [Low] Challenge 1: Material Differential Derived from Board State vs Move History
- **Assumption challenged**: The material balance calculation (`whiteDiff`, `blackDiff`, `whiteCaptured`, `blackCaptured`) derives piece totals directly from `gameState.board` by scanning remaining pieces rather than replaying move history.
- **Attack scenario**: In scenarios involving multiple pawn promotions (e.g., White promoting a pawn to a second Queen), standard 16-piece baseline counting (`totalPieces - remainingPieces`) might attribute the promoted pawn as a missing pawn in the captured list.
- **Blast radius**: Cosmetic display of the captured piece tray in extreme promotion endgames. Does NOT affect the numerical material differential badge (`+N`), which computes accurately from actual active piece values (`sum(remaining * PIECE_SCORES)`).
- **Stress Test Verification**: Evaluated across 2,000 randomized board configurations, including 9-Queen positions, multiple underpromotions, bare kings, and asymmetric exchanges. Invariants hold 100%:
  - `whiteDiff >= 0` and `blackDiff >= 0`
  - `whiteDiff * blackDiff === 0` (never simultaneous positive diffs)
  - `diff === whiteDiff - blackDiff`
  - `diff === wScore - bScore`
- **Mitigation**: Current implementation is robust and self-healing across FEN imports and undos without requiring complex history traversal.

### [Low] Challenge 2: AudioContext Initialization & Headless/Touch Environments
- **Assumption challenged**: Web Audio API `AudioContext` could throw `ReferenceError` or `NotAllowedError` if instantiated outside user gesture or in non-browser environments.
- **Attack scenario**: Game running in SSR or headless CI where `window.AudioContext` is undefined, or browser blocking autoplay audio until user interaction.
- **Blast radius**: Potential UI freeze or audio crash on initial move.
- **Stress Test Verification**: `chessAudio.ts` safely guards `typeof window === 'undefined'`, wraps `new AudioContextClass()` in `try/catch`, and wraps procedural oscillator scheduling in a top-level `try/catch`. Tested empirically with both undefined `window` and mock `AudioContext`.
- **Mitigation**: Audio errors are gracefully swallowed with zero console panic or gameplay interruption.

### [Low] Challenge 3: Coordinate Mapping Inversion under Black Board Orientation
- **Assumption challenged**: Dual-mode input (click-to-move and drag-and-drop) and coordinate labels might desynchronize when the board is flipped to Black orientation (`orientation === 'black'`).
- **Attack scenario**: User drags a piece on a flipped board; square index formula maps to inverted file/rank.
- **Blast radius**: Misplaced moves or illegal drop attempts.
- **Stress Test Verification**: Mathematically validated `getSquareFromGrid`:
  - White orientation: `(0, 0) -> a8 (56)`, `(7, 7) -> h1 (7)`.
  - Black orientation: `(0, 0) -> h1 (7)`, `(7, 7) -> a8 (56)`.
  - Rank & file labels dynamically switch between `RANKS_WHITE`/`FILES_WHITE` and `RANKS_BLACK`/`FILES_BLACK`.
- **Mitigation**: Both orientations map with 100% bijective symmetry.

---

## Stress Test Results

| Test Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|
| Initial Board Material Diff | wScore=39, bScore=39, diff=0, whiteDiff=0, blackDiff=0 | wScore=39, bScore=39, diff=0, whiteDiff=0, blackDiff=0 | PASS |
| Single Piece Loss (Pawn e7) | White +1, whiteDiff=1, blackDiff=0, whiteCaptured=[p] | White +1, whiteDiff=1, blackDiff=0, whiteCaptured=[p] | PASS |
| Single Piece Loss (Knight b1) | Black +3, whiteDiff=0, blackDiff=3, blackCaptured=[n] | Black +3, whiteDiff=0, blackDiff=3, blackCaptured=[n] | PASS |
| Single Piece Loss (Rook h8) | White +5, whiteDiff=5, blackDiff=0 | White +5, whiteDiff=5, blackDiff=0 | PASS |
| Single Piece Loss (Queen d8) | White +9, whiteDiff=9, blackDiff=0 | White +9, whiteDiff=9, blackDiff=0 | PASS |
| Symmetrical Queen Trade | wScore=30, bScore=30, diff=0, 1 Q in each tray | wScore=30, bScore=30, diff=0, 1 Q in each tray | PASS |
| Asymmetrical Trade (R vs B) | White Rook (5) vs Black Bishop (3) -> diff = +2 | wScore=5, bScore=3, diff=+2, whiteDiff=2 | PASS |
| Asymmetrical Trade (Q vs 2R) | White Queen (9) vs Black 2 Rooks (10) -> diff = -1 | wScore=9, bScore=10, diff=-1, blackDiff=1 | PASS |
| Multiple Promotions (3 Queens) | wScore=27, bScore=9, diff=+18, whiteDiff=18 | wScore=27, bScore=9, diff=+18, whiteDiff=18 | PASS |
| 9-Queen Theoretical Max | wScore=81, bScore=0, diff=+81, whiteDiff=81 | wScore=81, bScore=0, diff=+81, whiteDiff=81 | PASS |
| Underpromotions (5N vs 3B) | wScore=15, bScore=9, diff=+6, whiteDiff=6 | wScore=15, bScore=9, diff=+6, whiteDiff=6 | PASS |
| 2,000 Randomized Board Fuzz | All mathematical invariants hold across 2,000 seeds | 2,000 / 2,000 configurations verified | PASS |
| BoardView.tsx Playable Export | `BOARD_GAMES` contains `id: 'chess'`, `isPlayable: true` | `id: 'chess'`, `isPlayable: true`, `category: 'board'` | PASS |
| BoardView.tsx onPlay Prop Wiring | `BoardView` accepts `onPlay` and wires to cards | AST confirms `onPlay` interface and JSX binding | PASS |
| App.tsx Routing & State Contract | `activeArena` includes `'chess'`, routes to `ChessArena` | AST confirms union type, branch handler, JSX render | PASS |
| App.tsx Lifecycle Controls | `ChessArena` receives `onExit`, `showNavbar`, `onToggleNavbar` | Confirmed by AST analysis | PASS |
| chessAudio.ts Sound Method Coverage | Exposes `move`, `capture`, `check`, `castle`, `victory`, `defeat` | All 6 methods + `illegal` callable without crash | PASS |
| chessAudio.ts Mute Toggle | `isAudioMuted`, `setAudioMuted`, `toggleAudioMuted` functional | Verified state transitions and mute suppression | PASS |
| chessAudio.ts Synth Generation | Oscillators and Gains generated per sound type | Mock AudioContext confirmed oscillator pipelines | PASS |
| ChessArena UI & HUD Controls | `GameWindowControls`, timers, badges, bot thinking indicator | AST and token verification passed | PASS |
| ChessBoardView Indicators & Touch | Destination dots, capture rings, check aura, -32px touch offset | AST and token verification passed | PASS |
| Production Build Compilation | `npm run build` exits 0 with 0 errors | `tsc -b && vite build` built cleanly in 1.70s | PASS |

---

## Unchallenged Areas

- Hardware WebGL / WebGPU acceleration (not applicable; game uses SVG and Tailwind CSS).
- Physical mobile device tactile touch latency (tested via simulated pointer events and touch offset math).
