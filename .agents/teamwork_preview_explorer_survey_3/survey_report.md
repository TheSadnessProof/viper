# Viper Chess Arena — UX, Visual Design, Bot AI & Game Modes Survey

**Surveyor**: Explorer 3 (Teamwork Survey Phase)  
**Date**: September 21, 2026  
**Project Root**: `c:\Users\ditob\Documents\viper`  
**Target Milestone**: Architecture Mapping & System Design Specification  

---

## 1. Executive Summary

This report establishes the complete specification for the user experience, visual design language, interaction models, bot AI engine tiers, and game modes for the **Viper Chess Arena**. 

The Viper gaming platform embodies a luxury dark esports aesthetic: deep obsidian backgrounds (`slate-950`), smoked glassmorphic panels with subtle borders (`slate-800/80`), vivid neon accents (cyan/sky signature for Chess, alongside emerald, amber, and rose alerts), and clean typography (`Plus Jakarta Sans` and `JetBrains Mono`). 

In strict compliance with **R2 (Sophisticated, Visual-First Chess Arena UI)**, **R3 (Multiple Game Modes & Bot AI)**, and the zero-text-clutter mandate of `ORIGINAL_REQUEST.md`, this design delivers:
1. **Zero Text Clutter**: Eliminates verbose in-game instructions, banners, or tutorials. Game status is conveyed 100% visually through luminous glowing destination dots, pulsed danger rings, king-in-check danger auras, and tactile sound effects.
2. **Obsidian & Crystal Aesthetic**: High-contrast, tournament-grade board squares featuring smoky obsidian dark squares and frosted crystal light squares, framed by an elegant metallic bezel.
3. **Dual-Input Interaction**: Seamless support for both **Click-to-Move** and silky-smooth **Drag-and-Drop** with touch-offset compensation on mobile/tablet devices.
4. **Three-Tier Non-Blocking Bot AI**: Casual (~900 Elo), Blitz (~1500 Elo), and Grandmaster (~2100+ Elo) operating on a dedicated Web Worker thread (`chessAi.worker.ts`) to ensure the main UI thread never drops below 60fps.
5. **Esports Clocks & Modes**: Local Pass-and-Play with optional 180° auto-flip, Human vs AI (White/Black/Random), Blitz move clocks (1m, 3m, 5m, 10m, Unlimited), captured material racks with dynamic differential badges (`+3`), and Web Audio API synthesized sound feedback.

---

## 2. Visual & Aesthetic Architecture

### 2.1 Color Palette & Theme Tokens
Aligning with Viper's design language in `index.css`, `GameVisualCard.tsx`, and `Navbar.tsx`:

| Element | Color / Tailwind Tokens | Visual Role |
|---------|-------------------------|-------------|
| **App Canvas / Arena Background** | `bg-slate-950` (`#020617`) | Deep dark esports environment |
| **Arena Bezel / Frame** | `bg-slate-900/90 border border-slate-800/80 shadow-2xl backdrop-blur-xl` | High-tech gaming chassis |
| **Light Squares (Crystal)** | `bg-slate-200/90 text-slate-800 hover:bg-slate-100` | Frosted titanium / crystal tile |
| **Dark Squares (Obsidian)** | `bg-slate-800/90 text-slate-300 hover:bg-slate-700/90` | Deep smoky obsidian glass tile |
| **Primary Accent (Chess Signature)** | `sky-500` / `cyan-400` (`#06b6d4`, `#38bdf8`) | Active selections, destination dots, move trails |
| **Capture & Threat Accent** | `rose-500` / `red-500` (`#f43f5e`, `#ef4444`) | Capture rings, king-in-check aura, resign button |
| **Turn & Clock Accent** | `amber-400` (`#f59e0b`) | Active player turn indicator, selected piece ring |
| **Success & Advantage Accent** | `emerald-400` (`#10b981`) | Material differential badge, victory modal, play CTA |

### 2.2 Board Styling & Coordinates
- **Aspect Ratio & Sizing**: The board occupies an exact `aspect-square` with responsive sizing `w-full max-w-[min(84vw,84vh,640px)]`. On desktop, it centers majestically alongside player cards and move logs; on mobile, it scales to fill the width while maintaining square proportions.
- **Square Grid**: An 8x8 CSS Grid (`grid-cols-8 grid-rows-8`) with zero internal grid gap, ensuring uninterrupted piece sliding and snapping.
- **Coordinate Markings**:
  - Ranks `1-8` and Files `a-h`.
  - Positioned unobtrusively inside the outer edges of perimeter squares:
    * Files `a-h` sit at the bottom-right corner of rank 1 squares.
    * Ranks `1-8` sit at the top-left corner of file `a` squares.
  - Font: `font-mono text-[10px] sm:text-xs font-bold select-none pointer-events-none`.
  - Contrast adaptive: Light squares display `text-slate-500/80`; Dark squares display `text-slate-400/80`.
  - When the board is flipped (Black perspective), coordinates automatically invert (`8-1` top-to-bottom, `h-a` left-to-right).

### 2.3 Visual Move Indicators (Pure Visual Feedback)
To uphold the zero-text-clutter requirement, all navigational cues are purely visual:

1. **Selected Piece Glow**:
   - The square containing the currently selected piece displays an inset amber-gold aura:
   - CSS: `bg-amber-400/25 ring-2 ring-inset ring-amber-400/80 shadow-[0_0_16px_rgba(245,158,11,0.4)]`.
2. **Valid Destination Dot (Quiet Moves)**:
   - Displayed in the exact center of each legal unoccupied target square.
   - Design: A translucent glowing circular pip:
     ```tsx
     <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-cyan-400/70 shadow-[0_0_10px_rgba(6,182,212,0.8)] backdrop-blur-sm pointer-events-none transition-transform hover:scale-125" />
     ```
3. **Capture Target Ring (Captures & En Passant)**:
   - When a legal move targets an enemy piece or en passant square, an aggressive danger ring frames the target:
   - Design: An animated pulsating hollow ring inset within the square:
     ```tsx
     <div className="absolute inset-1.5 sm:inset-2 rounded-2xl border-2 border-rose-500/80 bg-rose-500/15 shadow-[0_0_14px_rgba(244,63,94,0.5)] animate-pulse pointer-events-none" />
     ```
4. **Last Move Highlight (Trail)**:
   - The origin square (`from`) and arrival square (`to`) of the most recent move receive a calm, persistent sky-blue wash:
   - CSS: `bg-cyan-500/20 border border-cyan-400/30`. This enables both players to immediately register the opponent's move at a glance.
5. **King-in-Check Danger Aura**:
   - When a King is attacked, the King's square immediately pulses with a dramatic crimson threat gradient:
   - Design:
     ```tsx
     <div className="absolute inset-0 bg-gradient-to-r from-red-600/70 via-rose-600/40 to-transparent animate-pulse rounded-xl border-2 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.85)] pointer-events-none z-10" />
     ```

### 2.4 High-Fidelity SVG Piece Set
Rather than relying on inconsistent OS Unicode glyphs, the arena will employ dedicated, precision-rendered SVG vector pieces (King, Queen, Rook, Bishop, Knight, Pawn):
- **White Pieces**: Crisp titanium-white body (`#f8fafc`), subtle metallic silver stroke (`#94a3b8`), soft inner shadow, and cyan rim-light reflection (`drop-shadow(0 2px 4px rgba(0,0,0,0.4))`).
- **Black Pieces**: Deep obsidian body (`#0f172a`), smoked charcoal accents (`#334155`), rose/amber rim-light contour, and crisp drop-shadow (`drop-shadow(0 2px 6px rgba(0,0,0,0.8))`).
- Both sets are razor-sharp across all DPI displays (Retina, 4K, Mobile).

### 2.5 Captured Pieces Rack & Material Score Differential
- Located in the player status bars above and below the board.
- Displays captured pieces grouped chronologically or by value: Pawns, Knights, Bishops, Rooks, Queens.
- Pieces rendered as compact 16-20px silhouette icons with multiplier badges for duplicates (e.g. `♟ × 3`).
- **Dynamic Material Differential Counter**:
  - Computed in real time using standard FIDE values: `Pawn=1, Knight=3, Bishop=3, Rook=5, Queen=9`.
  - If a player holds a material lead (e.g. White has +3), an emerald pill badge appears next to their captured rack:
    ```tsx
    <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 font-mono font-black text-xs shadow-sm">
      +3
    </span>
    ```
  - If material is equal, the badge remains hidden to avoid unnecessary visual noise.

### 2.6 Pawn Promotion Selection Modal
When a pawn reaches rank 8 (White) or rank 1 (Black), a sleek floating glass modal overlays the board:
- Positioned directly over the promotion column or centered with a backdrop blur.
- Features 4 large, tactile choice buttons: Queen (♛, 9 pts), Knight (♞, 3 pts), Rook (♜, 5 pts), Bishop (♝, 3 pts).
- Each choice card displays:
  * High-res SVG piece illustration.
  * Piece name and point value.
  * Keyboard shortcut indicator (`[Q]`, `[N]`, `[R]`, `[B]`).
  * Hover state: expands with neon cyan glow and soft haptic audio.
- Dismissing is impossible without selecting, ensuring state integrity.

### 2.7 Game Over Victory / Draw Modal
Triggered on Checkmate, Stalemate, Timeout, Resignation, 50-Move Rule, or Insufficient Material:
- Centered glass dialog (`bg-slate-950/95 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-200`).
- **Celebration Effect**: On player victory, triggers a burst of esports confetti via `canvas-confetti` (installed in `package.json`).
- **Header**:
  * Checkmate Win: Glowing emerald/amber trophy emblem, text "VICTORY BY CHECKMATE".
  * Checkmate Defeat: Crimson cracked shield, text "DEFEAT — CHECKMATE".
  * Stalemate / Draw: Balanced scales or slate shield, text "DRAW — STALEMATE" (or specific draw clause).
- **Match Telemetry**: Total moves played, match duration, accuracy / piece captures.
- **Action Buttons**:
  * "New Game / Rematch" (gradient emerald/cyan button).
  * "Review Board" (minimizes modal to a compact floating bar so players can analyze the end position).
  * "Exit to Catalog" (navigates cleanly back to `BoardView`).

---

## 3. Interaction Architecture (Click-to-Move & Drag-and-Drop)

### 3.1 Unified Pointer Event Lifecycle
To guarantee universal desktop and mobile touch responsiveness without double-firing bugs, all input is managed through the modern HTML5 Pointer Events API (`PointerEvent`):

```
[Pointer Down] ──► Select Piece ──► Highlight Valid Squares
       │
       ├─► [Drag Threshold Exceeded (> 6px)] ──► Spawn Drag Ghost Piece
       │                                                 │
       │                                           [Pointer Move] ──► Update Ghost Position
       │                                                 │
       │                                           [Pointer Up]   ──► Detect Target Square
       │                                                 │
       │                                                 ├── Valid   ──► Execute Move
       │                                                 └── Invalid ──► Snap Back to Source
       │
       └─► [Pointer Up within Threshold] ──► Keep Selection Active (Click-to-Move Phase 1)
                                                     │
                                           [Subsequent Click]
                                                     │
                                                     ├── Valid Target Square ──► Execute Move
                                                     ├── Own Other Piece     ──► Re-select Piece
                                                     └── Empty Invalid Space ──► Deselect
```

### 3.2 Mobile Touch Optimizations
1. **Viewport Lock**: Apply `touch-action: none` and `user-select: none` across the board container to eliminate pinch-zoom accidental gestures and rubber-band scrolling during gameplay.
2. **Touch Drag Offset**: When dragging on a touch device, human thumbs naturally occlude the square underneath. A vertical offset of `-32px` is applied to the dragging ghost piece on touch pointers, ensuring the target square and piece are always 100% visible to the player.
3. **Square Target Hitboxes**: Each square calculates its bounding client rect `getBoundingClientRect()`. Drop target resolution uses:
   ```ts
   const col = Math.floor((clientX - boardRect.left) / squareSize);
   const row = Math.floor((clientY - boardRect.top) / squareSize);
   ```
   Ensuring 100% accurate drop detection even at high dragging speeds.

---

## 4. Bot AI Engine Architecture

### 4.1 Three Distinct AI Tiers

| AI Tier | Target Elo | Depth / Search Strategy | Evaluation Criteria | Personality & Speed |
|---------|------------|-------------------------|---------------------|---------------------|
| **Casual** | ~800–1000 | Depth 1 + Heuristics | Immediate captures, piece safety, random legal moves | Friendly, playful, occasional tactical blunders. Response time: 200–500ms |
| **Blitz** | ~1400–1600 | Depth 3 Minimax with Alpha-Beta | Material values, Piece-Square Tables (PST), mobility | Tactically sharp, punishes hanging pieces, develops toward center. Response time: 300–800ms |
| **Grandmaster** | ~2100–2200+ | Depth 4–5 Minimax + Iterative Deepening | Dynamic material, PST interpolation, center control, king safety, threat detection, MVV-LVA move ordering | Tenacious defense, aggressive positional pressure, deep tactical combinations. Response time: 800–1800ms |

### 4.2 Bot Algorithms & Evaluation Details

#### 1. Piece Values
```ts
const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};
```

#### 2. Piece-Square Tables (PST)
Positional tables (8x8 arrays) reward pieces for holding advantageous squares:
- **Pawns**: Rewarded for advancing towards promotion, pushing central files `d4`/`e4`, penalized for backward/isolated files.
- **Knights**: Heavily rewarded for central outposts (`c3, d4, e4, f3, c6, d5, e5, f6`), severely penalized for rim squares (`a1, h1, a8, h8` — "a knight on the rim is dim").
- **Bishops**: Rewarded for open diagonals and long-range center control; penalized for getting trapped behind friendly pawns.
- **Rooks**: Rewarded for controlling 7th rank and open central files.
- **Queens**: Moderate central positioning; penalized for premature opening exposure.
- **King**:
  * *Opening / Middlegame*: Strongly rewarded for castling to the corner (`g1/b1` or `g8/b8`) behind intact pawn shields; penalized for wandering into the center.
  * *Endgame*: Transitions to active king centralization (`d4/e4/d5/e5`) to assist pawn promotion.

#### 3. Advanced Evaluation Heuristics (Grandmaster Tier)
- **Center Control**: Points awarded for pawns and pieces attacking or occupying `{d4, e4, d5, e5}` and `{c4, c5, f4, f5}`.
- **King Safety**: Penalties for missing pawn shield in front of castled king, penalties for open semi-files facing the king.
- **Pawn Structure**: Penalties for doubled pawns (-20), isolated pawns (-25), backward pawns (-15); bonuses for passed pawns (+30 to +120 scaling with rank).
- **Move Ordering**: To maximize Alpha-Beta pruning cutoffs:
  1. Principal Variation (PV) move from previous iterative deepening pass.
  2. Winning and equal captures ordered via **MVV-LVA** (Most Valuable Victim - Least Valuable Attacker, e.g., `P x Q` evaluated first, `Q x P` evaluated later).
  3. Killer moves (quiet moves that caused beta cutoffs at the same ply in sibling branches).
  4. Checks.
  5. Quiet moves.

### 4.3 Non-Blocking Execution Model (Preserving 60 FPS)
Heavy chess minimax calculation (visiting 100,000+ nodes at depth 5) would freeze React's main thread for 1–2 seconds if executed synchronously, causing jank, dropped animations, and frozen timers.

To ensure strict 60fps UI performance:
1. **Primary: Dedicated Web Worker (`chessAi.worker.ts`)**:
   - The AI engine runs inside an isolated Web Worker.
   - The React component posts the current board state and difficulty config:
     ```ts
     worker.postMessage({
       type: 'EVALUATE_MOVE',
       fen: currentFen,
       difficulty: 'grandmaster',
       depth: 4,
       timeLimitMs: 1500,
     });
     ```
   - While the worker calculates, React renders smooth blinking turn indicators and unhindered clock countdowns.
   - Upon completion, the worker replies with:
     ```ts
     { type: 'MOVE_READY', bestMove: { from: 'e2', to: 'e4' }, evaluation: 35, nodes: 42100 }
     ```
2. **Fallback: Asynchronous Time-Sliced Generator**:
   - In environments where inline Web Worker instantiation is restricted, an asynchronous chunked search yields control to the browser event loop every 15ms via `requestAnimationFrame` or `setTimeout(0)`, ensuring frame rates never drop below 60fps.

---

## 5. Game Modes & Timers Architecture

### 5.1 Game Modes

#### Mode 1: Human vs AI
- **Color Selection**:
  * Play as White (human plays first).
  * Play as Black (bot initiates first move as White, board automatically renders from Black's perspective).
  * Random Color (50/50 randomized roll with an engaging pre-game reveal).
- **Difficulty Selection**: Switchable at any time or preset at game launch (Casual, Blitz, Grandmaster).
- **AI Thinking Indicator**: A subtle pulse animation with "Alex (Bot) is calculating…" in the opponent's card.

#### Mode 2: Local Pass-and-Play (2-Player)
- Two humans play on the same device.
- **Board Orientation Options**:
  1. *Static Orientation*: Board stays fixed (White at bottom), ideal for desktop laptops.
  2. *Auto-Flip*: The board smoothly rotates 180° after each completed turn so each player views the board from their own side (ideal for tablets laid flat between players).
  3. *Manual Flip*: An instant flip button (`RotateCw` icon) available in the header.

### 5.2 Esports Clocks & Blitz Timers
A tournament-grade digital chess clock system:

1. **Clock Presets**:
   - **Bullet**: 1 min + 0s
   - **Blitz**: 3 min + 0s (Default Viper Blitz standard)
   - **Blitz+Increment**: 3 min + 2s increment per move
   - **Rapid**: 5 min + 0s (or 5m + 3s)
   - **Classical**: 10 min + 0s
   - **Unlimited**: No time limit (ideal for casual learning and tactical puzzles)
2. **Clock Mechanics**:
   - High-precision timestamp tracking (`Date.now()`) to eliminate browser timer throttling or drift.
   - When a move is committed, any time increment (+2s, +3s) is instantly added to the active player's clock.
   - **Low-Time Warning**:
     * `< 30 seconds`: Digits turn warm amber with soft glow.
     * `< 10 seconds`: Clock border pulses crimson, and a subtle soft tick sounds on each second.
   - **Timeout (Flag Fall)**: When a player's clock reaches `00:00.0`, the game terminates immediately with "Loss on time" (or Draw if the opponent has insufficient mating material).

### 5.3 Match Controls (Undo, Restart, Resign, Draw)
All controls feature instant confirmation dialogs to prevent accidental triggers:
- **Undo (`RotateCcw`)**:
  * In Human vs AI: Reverts 2 half-moves (rolling back both the AI's move and the player's last move) to return the turn to the human.
  * In Pass-and-Play: Reverts 1 half-move.
- **Restart (`RefreshCw`)**: Prompts "Restart match with current settings?" and cleanly resets the board and clocks.
- **Resign (`Flag`)**: Active player concedes defeat.
- **Draw Offer (`Handshake`)**: Offers a peaceful conclusion; AI automatically evaluates position balance before accepting or declining.

### 5.4 Algebraic Move History Log
- A clean, scrollable sidebar displaying standard SAN (Standard Algebraic Notation, e.g. `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. O-O`).
- Features a current-move highlight and allows clicking past moves to inspect historical board positions in read-only review mode.

---

## 6. Audio Feedback System (Web Audio API Synthesizer)

Rather than risking missing audio files or network 404s, Viper Chess Arena will utilize an integrated Web Audio API sound synthesizer (`chessAudio.ts`):
- **Zero Assets Required**: 100% synthesized through native browser `AudioContext`.
- **Ultra-Low Latency**: < 5ms sound generation, synchronized with visual piece animations.
- **Sound Profiles**:
  1. **Piece Move**: Soft wooden impact (`sine` wave 160Hz -> 70Hz exponentially decaying over 80ms).
  2. **Capture**: Tactile double-click snap (`triangle` wave with micro-burst white noise, 110ms).
  3. **Castle**: Sliding wooden double-tap (two quick thuds spaced 60ms apart).
  4. **Check Warning**: Resonant metallic chime (dual harmonic `sine` waves 440Hz + 880Hz ringing for 280ms).
  5. **Victory / Checkmate**: Triumphant ascending triad chord (C5 - E5 - G5 with gentle reverb).
  6. **Stalemate / Defeat**: Descending minor interval.
  7. **Low Time Pulse**: Soft 1000Hz tick on final 10 seconds.
- **Audio Toggle**: Mute / Unmute toggle button integrated into `GameWindowControls` `extraControls` (matching `DominoArena.tsx`).

---

## 7. Component Architecture & File Map

To cleanly partition responsibilities without polluting existing modules, the following file structure is designed:

```
src/
├── components/
│   └── arena/
│       ├── ChessArena.tsx           # Master Arena container (integrates GameWindowControls, layout, state)
│       ├── ChessBoard.tsx           # 8x8 Board grid, coordinates, drag/drop canvas, highlight overlays
│       ├── ChessSquare.tsx          # Individual square: obsidian/crystal styling, dots, rings, pointer events
│       ├── ChessPiece.tsx           # High-resolution SVG pieces with drag preview & drop shadows
│       ├── PromotionModal.tsx       # Floating Queen/Rook/Bishop/Knight selector
│       ├── GameOverModal.tsx        # Victory/Draw dialog with match telemetry & canvas-confetti
│       ├── ChessClock.tsx           # Precision digital Blitz timers with low-time warning
│       └── MoveHistory.tsx          # PGN / SAN notation log with jump-to-turn navigation
├── games/
│   └── chess/
│       ├── chessEngine.ts           # Pure TS FIDE rule engine, move generator, state validator
│       ├── chessAi.ts               # Casual, Blitz, Grandmaster minimax logic & evaluation functions
│       ├── chessAi.worker.ts        # Dedicated Web Worker for zero-jank background search
│       ├── chessAudio.ts            # Web Audio API sound synthesizer
│       └── chessTypes.ts            # GameState, Move, PieceType, Color, Difficulty, TimerConfig
```

### Integration Points:
- `src/components/views/BoardView.tsx`: Update `BOARD_GAMES` so Chess has `isPlayable: true`.
- `src/App.tsx`: Add `'chess'` to `activeArena` union and render `<ChessArena />` in fullscreen mode.

---

## 8. Summary & Next Steps
With these UX, visual, AI, and game-mode specifications formalized, the implementation team has a complete blueprint for delivering an esports-grade, visual-first Chess Arena that honors Viper's luxury aesthetic and meets all user acceptance criteria.
