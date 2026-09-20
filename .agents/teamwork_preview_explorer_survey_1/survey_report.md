# Viper Platform & Chess Arena Architectural Survey Report

**Date**: 2026-09-20  
**Author**: Explorer 1 (Viper Chess Survey Team)  
**Integrity Mode**: Development / Read-Only Survey  
**Target Project**: Viper Gaming Platform (`c:\Users\ditob\Documents\viper`)  

---

## Executive Summary

This report delivers an exhaustive architectural survey of the Viper gaming platform codebase to prepare for the implementation of the new **Chess Arena**. The investigation encompassed platform routing, full-screen arena lifecycle management, component hierarchies, visual design systems, audio infrastructure, package dependencies, build mechanics, and test execution capabilities.

### Key Takeaways
1. **Seamless Arena Lifecycle**: The platform manages arenas in `src/App.tsx` via state variable `activeArena: 'joker' | 'poker' | 'domino' | null`. When set, the arena renders full screen with an optional toggleable navigation bar (`inGameShowNavbar`).
2. **Catalog Contract**: `src/components/views/BoardView.tsx` defines `BOARD_GAMES`. The Chess item (`id: 'chess'`) already exists with artwork (`/covers/chess.jpg`), but is currently flagged with `isPlayable: false`. Flipping this to `true` and delegating `onPlay(game.id)` connects directly to `handleLaunchGame` in `App.tsx`.
3. **Window Control Standard**: All arenas embed `GameWindowControls.tsx`, providing brand indicators, customizable header action slots (`extraControls`), navigation drawer toggling, fullscreen mode management (using the HTML5 Fullscreen API), minimize, and exit buttons.
4. **Zero Audio Debt / Web Audio Solution**: No sound manager or audio assets currently exist anywhere in `src/` or `public/`. A lightweight, zero-dependency Web Audio API procedural sound synthesizer should be implemented for Chess move, capture, check, checkmate, defeat, and illegal move events.
5. **Ultra-Fast Zero-Dependency Testing**: The system runs Node.js `v24.21.0`. Node 24 natively supports `node --test` with `--experimental-strip-types`, executing native TypeScript tests in under 10ms with zero extra npm dependencies. Vitest can optionally be added if desired.
6. **Clean Build Health**: `npm run build` (`tsc -b && vite build`) executes cleanly with zero errors in ~1.62 seconds.

---

## 1. Codebase Architecture & Tech Stack

### Dependencies & Tooling
From `package.json`:
- **Framework**: React 19.0.0 (`react`, `react-dom`)
- **Bundler & Dev Server**: Vite 6.2.0 (`@vitejs/plugin-react: ^4.3.4`)
- **Styling**: Tailwind CSS v4.0.9 (`@tailwindcss/vite: ^4.0.9`, `tailwindcss: ^4.0.9`)
- **Utility Libraries**:
  - `lucide-react: ^1.16.0` (Comprehensive iconography)
  - `canvas-confetti: ^1.9.4` & `@types/canvas-confetti: ^1.9.0` (Victory celebrations)
  - `clsx: ^2.1.1` & `tailwind-merge: ^3.0.2` (Class name resolution)
- **TypeScript**: TypeScript ~5.7.2 (`target: ES2022`, strict mode enabled, `@/*` aliases mapping to `./src/*`)
- **Scripts**:
  ```json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }
  ```

---

## 2. Platform Navigation & Arena Lifecycle (`App.tsx`)

### Architecture & Routing
`src/App.tsx` controls platform routing and arena display:
1. **URL Synchronization**:
   - `getCategoryFromLocation()` parses path (`/lobby`, `/cards`, `/board`, `/combat`) and hash fallbacks (`#board`).
   - `navigateTo(cat)` updates `currentCategory` and calls `window.history.pushState`.
   - `popstate` event listener synchronizes browser back/forward navigation.

2. **Arena Launch & Full-Screen Mode**:
   - State in `App.tsx` (lines 31–32):
     ```typescript
     const [activeArena, setActiveArena] = useState<'joker' | 'poker' | 'domino' | null>(null);
     const [inGameShowNavbar, setInGameShowNavbar] = useState(false);
     ```
   - Launch dispatcher (lines 42–46):
     ```typescript
     const handleLaunchGame = (gameId: string) => {
       if (gameId === 'joker') setActiveArena('joker');
       else if (gameId === 'poker') setActiveArena('poker');
       else if (gameId === 'domino') setActiveArena('domino');
     };
     ```
   - Fullscreen Arena Container (lines 58–95):
     ```tsx
     if (activeArena) {
       return (
         <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
           {inGameShowNavbar && (
             <Navbar
               activeCategory={currentCategory}
               onSelectCategory={(cat) => {
                 setActiveArena(null);
                 navigateTo(cat);
               }}
             />
           )}
           <div className="flex-1 w-full flex flex-col">
             {activeArena === 'joker' && (
               <JokerArena
                 onExit={() => setActiveArena(null)}
                 showNavbar={inGameShowNavbar}
                 onToggleNavbar={() => setInGameShowNavbar((prev) => !prev)}
               />
             )}
             {/* poker and domino arenas ... */}
           </div>
         </div>
       );
     }
     ```

### Integration Requirement for Chess
- Expand `activeArena` type: `'joker' | 'poker' | 'domino' | 'chess' | null`.
- Add `else if (gameId === 'chess') setActiveArena('chess');` in `handleLaunchGame`.
- Render `<ChessArena onExit={() => setActiveArena(null)} showNavbar={inGameShowNavbar} onToggleNavbar={() => setInGameShowNavbar((prev) => !prev)} />`.

---

## 3. Board Games Catalog (`BoardView.tsx` & `GameVisualCard.tsx`)

### Board Catalog Definition
Located at `src/components/views/BoardView.tsx`:
```typescript
export const BOARD_GAMES: GameVisualItem[] = [
  {
    id: 'domino',
    title: 'Dominoes',
    category: 'board',
    coverImage: '/covers/dominoes.jpg',
    isPlayable: true,
    accentBorder: 'border-emerald-500/30',
    glowColor: 'from-emerald-500/20',
  },
  {
    id: 'chess',
    title: 'Chess',
    category: 'board',
    coverImage: '/covers/chess.jpg',
    isPlayable: false, // <-- MUST BE CHANGED TO true
    accentBorder: 'border-sky-500/30',
    glowColor: 'from-sky-500/20',
  },
  {
    id: 'backgammon',
    ...
  },
  {
    id: 'checkers',
    ...
  },
];
```

### Card Interaction Mechanics (`GameVisualCard.tsx`)
1. If `game.isPlayable === true`:
   - Whole card is `cursor-pointer` and triggers `onPlay(game.id)`.
   - Renders a prominent, glowing "Play" button with a `Play` icon from `lucide-react`.
   - Stop-propagation prevents double event bubbling.
2. If `game.isPlayable === false`:
   - Renders "Coming Soon" badge.
   - Click events do not fire.
3. Once `isPlayable: true` is set on Chess, clicking either the card or the "Play" button invokes `onPlay('chess')`, which bubbles through `BoardView` directly into `handleLaunchGame('chess')` in `App.tsx`.

---

## 4. Arena Window Controls Protocol (`GameWindowControls.tsx`)

### Interface Specification
Located at `src/components/arena/GameWindowControls.tsx`:
```typescript
interface GameWindowControlsProps {
  gameTitle: string;
  gameTag?: string;
  onExit: () => void;
  showNavbar?: boolean;
  onToggleNavbar?: () => void;
  extraControls?: React.ReactNode;
}
```

### Functional Breakdown
1. **Left Header**:
   - `SnakeLogo` (size 18, color `#ffffff`, glow).
   - `gameTitle` (e.g. `"Chess Arena"`).
   - `gameTag` badge (e.g. `"Esports 1v1"` or `"Blitz Tactical"`).
2. **Center/Right Action Slots (`extraControls`)**:
   - Slot for game-specific headers: Mode switcher (Bot vs Pass & Play), Difficulty selector, Move Timer / Clocks, SFX mute/unmute toggle, Restart match, and Undo move.
3. **Nav Toggle (`onToggleNavbar`)**:
   - Renders a compact button (`Menu` icon) that toggles platform navigation without exiting the match.
4. **Window Actions Cluster**:
   - **Minimize** (`Minus` icon): Calls `onExit()`, returning smoothly to the catalog view.
   - **Fullscreen** (`Maximize2` / `Minimize2` icon): Uses HTML5 standard `document.documentElement.requestFullscreen()` and `document.exitFullscreen()`, tracking status through the `fullscreenchange` event.
   - **Exit** (`X` icon): Calls `onExit()`.

---

## 5. Existing Game Implementations Analysis

### Domino Arena Pattern (`DominoArena.tsx` & `dominoLogic.ts`)
- **State Management**: Pure functional state stored in `DominoGameState`, updated via pure transition functions (`placeTileOnBoard`, `drawTileFromBoneyard`, `getBotMove`).
- **Bot Coordination**:
  - `useEffect` monitors `gameState.currentTurn === 'opponent'`.
  - Non-blocking `setTimeout` (1200ms) prevents UI lock-up and gives visual cadence ("Thinking move...").
  - Clear-on-unmount ensures no state updates on exited games.
- **Visuals**:
  - Felt background styling (`game-table-felt`), ambient shadows (`card-shadow`, `glow-gold`), player avatar cards with active turn glow rings and pulsing pings.
- **Celebration**:
  - Fires `confetti()` when match status transitions to player win.

---

## 6. Sound & Audio System Investigation

### Current State
- A comprehensive search across `src/` and `public/` revealed **zero** audio files (`.mp3`, `.wav`, `.ogg`) and **zero** sound utilities.
- In `DominoArena.tsx`, a sound toggle state (`soundEnabled`) exists as UI only.

### Recommended Web Audio API Architecture for Chess
Instead of relying on external audio assets (which risk 404 errors, CDN latency, and browser asset loading bottlenecks), Chess should incorporate a dedicated procedural audio synthesizer: `src/games/chess/chessAudio.ts`.

#### Audio Synthesizer Design
Using `window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext`:
1. **Piece Move** (`playMoveSound()`):
   - Short percussive wood snap: Sine + triangle wave frequency drop (360Hz → 140Hz) with exponential gain decay (0.04s).
2. **Piece Capture** (`playCaptureSound()`):
   - Solid, tactile impact: Dual oscillator thud (180Hz → 60Hz) mixed with a low-pass filtered burst of white noise for texture (0.08s decay).
3. **Check Warning** (`playCheckSound()`):
   - Crystalline harmonic chime: Dual high sine waves (587.33Hz D5 + 1174.66Hz D6) with gentle vibrato and shimmer (0.35s decay).
4. **Victory / Checkmate** (`playVictorySound()`):
   - Ascending major arpeggio fanfare (C5, E5, G5, C6) with soft reverberant tail (0.8s).
5. **Draw / Defeat** (`playDefeatSound()`):
   - Muted, descending dual-tone cadence (G4 → Eb4) (0.5s).
6. **Illegal Move** (`playIllegalSound()`):
   - Soft, muted low buzz (110Hz square wave with steep lowpass filter, 0.08s).
7. **Global Volume & Mute**:
   - `setAudioMuted(boolean)` & `setAudioVolume(number)`.
   - AudioContext lazily initialized on user interaction to comply with browser autoplay policies.

---

## 7. Test Infrastructure & Execution

### Test Tooling Status
- `package.json` currently has no `vitest` or `jest` dependencies.
- Node.js runtime is **v24.21.0**.
- Node 24 natively features `--test` and `--experimental-strip-types`, enabling out-of-the-box execution of TypeScript test files without transpilation, build steps, or external dependencies.

### Verified Test Runner
We verified executing native TypeScript tests directly on this system:
```bash
node --experimental-strip-types --test-reporter=spec -e "import { test } from 'node:test'; import assert from 'node:assert'; test('sample', () => { assert.strictEqual(1 + 1, 2); });"
```
**Result**:
- Output: `✔ sample (0.75ms)`
- Suite duration: `5.74ms`
- Zero external dependencies required.

Furthermore, we verified that `node --experimental-strip-types` can import local TypeScript files directly:
```bash
node --experimental-strip-types -e "import { generateDoubleSixSet } from './src/games/domino/dominoLogic.ts'; console.log('Tiles count:', generateDoubleSixSet().length);"
```
**Result**: `Tiles count: 28`.

### Test Setup Recommendations
Add to `package.json` scripts:
```json
"test": "node --experimental-strip-types --test tests/**/*.test.ts"
```
Or optionally install Vitest if preferred by the team:
```bash
npm install -D vitest
```
Automated tests should cover:
- Standard piece movement (Pawn, Knight, Bishop, Rook, Queen, King).
- Pawn double push, en passant trigger, and immediate expiration.
- Kingside and queenside castling, including attacked transit squares and in-check prevention.
- Pawn promotion to Queen, Rook, Bishop, Knight.
- In-check detection, Checkmate resolution, and Stalemate validation.
- Fifty-move rule and insufficient material draws.

---

## 8. Concrete File Map for Chess Implementation

### New Files to Create

| File Path | Purpose | Key Details |
|---|---|---|
| `src/games/chess/chessTypes.ts` | Type definitions | Piece types (`'p' \| 'n' \| 'b' \| 'r' \| 'q' \| 'k'`), colors (`'w' \| 'b'`), Board square coordinates (row/col 0–7 & algebraic `'e4'`), Move structure, Game status (`'active'`, `'checkmate'`, `'stalemate'`, `'draw_fifty_moves'`, `'draw_insufficient_material'`), Game modes (`'vs_bot'`, `'pass_and_play'`), Bot difficulty (`'casual'`, `'blitz'`, `'grandmaster'`). |
| `src/games/chess/chessLogic.ts` | Complete FIDE engine | 100% legal move generation, pin/check validation, attack raycasting, En Passant tracking, Castling eligibility and path check, Promotion handling, Draw conditions (50-move rule, insufficient material), move application. |
| `src/games/chess/chessBot.ts` | Multi-tier Bot AI | Material scoring + Piece-Square Tables (PST) + Minimax algorithm with Alpha-Beta pruning. Three tiers: Casual (fast heuristic with small random variance), Blitz (depth 2–3 tactical search), Grandmaster (depth 3–4 with quiescence search for captures). Asynchronous/chunked execution to maintain 60 FPS UI. |
| `src/games/chess/chessAudio.ts` | Web Audio synthesizer | Zero-asset procedural audio generator for move, capture, check, checkmate, defeat, and illegal move feedback. |
| `src/components/arena/ChessPieces.tsx` | Vector piece visuals | Precision inline SVG components for King, Queen, Rook, Bishop, Knight, Pawn with metallic/crystal gradients for White and obsidian/ruby accents for Black, drop-shadows, and subtle esports glow. |
| `src/components/arena/ChessBoardView.tsx` | Board UI component | 8x8 grid with dark obsidian & smoky crystal squares, file/rank indicators, drag-and-drop & click-to-move handlers, destination dots, capture rings, king-in-check danger aura, and last-move highlights. |
| `src/components/arena/ChessArena.tsx` | Main arena view | Wraps `GameWindowControls`, top/bottom player cards with Elo badges, blitz clocks, captured pieces racks with material differential, promotion modal, and animated victory modal with confetti. |
| `tests/chess/chessLogic.test.ts` | Test suite | Comprehensive unit tests for piece movement, castling, en passant, promotion, checkmate, stalemate, and draw conditions. |

### Existing Files to Modify

| File Path | Lines | Required Change |
|---|---|---|
| `src/components/views/BoardView.tsx` | Lines 16–23 | Change `isPlayable: false` to `isPlayable: true` for the Chess card. |
| `src/App.tsx` | Lines 1–10 | Import `ChessArena`. |
| `src/App.tsx` | Line 31 | Extend `activeArena` type to `'joker' \| 'poker' \| 'domino' \| 'chess' \| null`. |
| `src/App.tsx` | Lines 42–46 | Add `else if (gameId === 'chess') setActiveArena('chess');`. |
| `src/App.tsx` | Lines 71–93 | Add JSX block to render `ChessArena` when `activeArena === 'chess'`. |
| `src/data/games.ts` | Line 77 | Change `status: 'coming_soon'` to `status: 'playable'` for Chess. |
| `src/context/GamePlatformContext.tsx` | Lines 4 & 48 | Add `'chess'` to `PlatformView` union and in `startDuel`. |
| `package.json` | Line 6–10 | Add `"test": "node --experimental-strip-types --test tests/**/*.test.ts"` to `scripts`. |

---

## 9. Architectural Risk & Quality Assurance Guidelines

1. **Minimax UI Freezing Prevention**:
   - High depth minimax searches can block the JavaScript event loop if executed synchronously.
   - *Mitigation*: Run bot calculation inside a `setTimeout(..., 50)` tick or Web Worker, and enforce search depth limits (Casual: depth 1, Blitz: depth 2-3, GM: depth 3-4 with quiescence capped at 4-5 plies).
2. **Move Validation Invariants**:
   - In chess, a move is legal IF AND ONLY IF the king is not in check after the move is executed.
   - *Mitigation*: All move generators must test candidate moves on a cloned board to verify king safety, and all castling paths must verify that neither the king's current square, intermediate square, nor destination square is under enemy attack.
3. **Responsive Glass Board Layout**:
   - The board must maintain a strict 1:1 aspect ratio across mobile, tablet, and desktop screens without clipping or horizontal overflow.
   - *Mitigation*: Use responsive `max-w-[min(85vw,70vh)] aspect-square` container sizing.
4. **Touch & Drag-and-Drop Parity**:
   - Drag-and-drop on mobile can trigger screen scrolls if pointer events are not properly managed.
   - *Mitigation*: Support both single-click/tap-to-select-and-tap-to-move as primary, with optional HTML5/pointer drag-and-drop with `touch-action: none`.

---

*Report compiled and verified by Explorer 1.*
