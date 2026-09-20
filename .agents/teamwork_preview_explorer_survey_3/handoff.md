# Handoff Report — Explorer 3 (UX, Visual Design, Bot AI & Game Modes Survey)

**Agent**: Explorer 3 (`teamwork_preview_explorer_survey_3`)  
**Parent**: Project Orchestrator (`orchestrator_1` / Conv ID: `81d5157f-47b9-4307-8c23-8f5778a5ac63`)  
**Timestamp**: 2026-09-21T02:10:00+04:00  
**Handoff Type**: Hard Handoff (Task Complete)  

---

## 1. Observation

1. **`package.json` Dependencies & Build Environment**:
   - `file:///c:/Users/ditob/Documents/viper/package.json`, lines 11–18:
     ```json
     "dependencies": {
       "canvas-confetti": "^1.9.4",
       "clsx": "^2.1.1",
       "lucide-react": "^1.16.0",
       "react": "^19.0.0",
       "react-dom": "^19.0.0",
       "tailwind-merge": "^3.0.2"
     }
     ```
   - `@tailwindcss/vite: ^4.0.9`, `tailwindcss: ^4.0.9`, `vite: ^6.2.0`, `typescript: ~5.7.2`.
   - Observation: No third-party chess libraries (e.g. `chess.js`) or audio libraries (e.g. `howler`) are installed. Chess engine and audio synthesizer must be built in native TypeScript / Web Audio API.

2. **Existing Game Arena Implementation Patterns**:
   - `file:///c:/Users/ditob/Documents/viper/src/components/arena/GameWindowControls.tsx`, lines 5–21:
     - `GameWindowControls` requires `gameTitle`, `gameTag`, `onExit`, `showNavbar`, `onToggleNavbar`, and `extraControls`.
     - Lines 64–70 provide an `extraControls` slot for custom buttons (sound toggle, restart match, stake info).
   - `file:///c:/Users/ditob/Documents/viper/src/components/arena/DominoArena.tsx`, lines 33, 166–178:
     - Implements sound mute toggle using `Volume2`/`VolumeX` and match reset using `RotateCcw`.
     - Lines 80–89 demonstrate victory celebration with `canvas-confetti`:
       ```ts
       confetti({
         particleCount: 120,
         spread: 80,
         origin: { y: 0.6 },
         colors: ['#10b981', '#f59e0b', '#3b82f6', '#ec4899'],
       });
       ```

3. **Platform Routing & Launch Mechanism**:
   - `file:///c:/Users/ditob/Documents/viper/src/App.tsx`, lines 30–46, 58–96:
     - `activeArena` is a string union `'joker' | 'poker' | 'domino' | null`.
     - When active, the arena renders fullscreen:
       ```tsx
       if (activeArena) {
         return (
           <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
             ...
           </div>
         );
       }
       ```
   - `file:///c:/Users/ditob/Documents/viper/src/components/views/BoardView.tsx`, lines 16–23:
     ```ts
     {
       id: 'chess',
       title: 'Chess',
       category: 'board',
       coverImage: '/covers/chess.jpg',
       isPlayable: false,
       accentBorder: 'border-sky-500/30',
       glowColor: 'from-sky-500/20',
     }
     ```
     - Chess currently has `isPlayable: false` and uses cyan/sky styling (`border-sky-500/30`, `from-sky-500/20`).

4. **Visual Design & Styling System**:
   - `file:///c:/Users/ditob/Documents/viper/src/index.css`, lines 3–11:
     - Font family is `'Plus Jakarta Sans'`, monospace font is `'JetBrains Mono'`.
   - `file:///c:/Users/ditob/Documents/viper/src/data/games.ts`, lines 68–81:
     - Chess catalog entry: `accentColor: '#06b6d4'`, `bannerGradient: 'from-cyan-600/30 via-sky-950/40 to-slate-950'`, tagline: `'3-Minute Blitz Showdown'`.

5. **Audio Files Status**:
   - Grep search for `Audio` across `src/` yielded no results.
   - `public/` contains only `covers/`, `favicon.svg`, and `snake-logo.svg`. No external `.mp3` or `.wav` sound files exist.

---

## 2. Logic Chain

1. **Visual Language Synthesis**:
   - *From Observation 3 & 4*: Viper designates the sky/cyan neon palette (`#06b6d4`, `#38bdf8`) for Chess, combined with deep obsidian slate (`bg-slate-950`, `bg-slate-900`) and Plus Jakarta Sans / JetBrains Mono typography.
   - *Deduction*: Chess squares should use obsidian glass (`bg-slate-800/90`) for dark squares and frosted titanium crystal (`bg-slate-200/90`) for light squares, creating tournament-grade visual contrast while fitting seamlessly into the Viper esports shell.

2. **Zero-Text-Clutter Indicator Strategy**:
   - *From ORIGINAL_REQUEST.md (R2)*: The board interface must have zero text clutter and intuitive visual move indicators.
   - *Deduction*: Turn, check, and move viability must be conveyed purely via luminous geometry:
     * Non-capture moves: cyan translucent glowing center dots (`bg-cyan-400/70 shadow-[0_0_10px_rgba(6,182,212,0.8)]`).
     * Capture moves: pulsating hollow danger rings (`border-2 border-rose-500/80 bg-rose-500/15`).
     * King-in-check: radial crimson aura (`bg-gradient-to-r from-red-600/70 via-rose-600/40 to-transparent animate-pulse`).
     * Last move trail: cyan wash (`bg-cyan-500/20 border border-cyan-400/30`).

3. **Dual-Input Mechanics**:
   - *From ORIGINAL_REQUEST.md (Acceptance Criteria)*: Both click-to-move and drag-and-drop must function across desktop and touch.
   - *Deduction*: Using the unified HTML5 Pointer Events API (`onPointerDown`, `onPointerMove`, `onPointerUp`) with `setPointerCapture` guarantees single-event handling across mouse and touch, eliminates drag ghost latency, and allows adding a `-32px` vertical touch offset so user thumbs don't obscure destination squares on mobile.

4. **Bot AI Performance & UI Responsiveness**:
   - *From ORIGINAL_REQUEST.md (R3, Acceptance Criteria)*: Three bot tiers (Casual, Blitz, Grandmaster) must respond without freezing the UI.
   - *Deduction*: Minimax at depth 4-5 visits tens of thousands of nodes. If executed on the main thread, this will block React rendering and freeze timer ticks. Running the search inside a dedicated Web Worker (`chessAi.worker.ts`) completely isolates engine computation, keeping UI animations and digital clocks at a solid 60fps.

5. **Audio Feedback without External Assets**:
   - *From Observation 5 & ORIGINAL_REQUEST.md (Acceptance Criteria)*: Visual sound effects are required, but no audio assets exist in `public/`.
   - *Deduction*: Synthesizing procedural sounds via Web Audio API (`AudioContext`) provides instant, zero-latency feedback for moves, captures, castling, check, and victory, with zero network load and zero risk of 404s.

---

## 3. Caveats

1. **Web Worker Bundling in Vite**:
   - In Vite 6, Web Workers are imported using `new Worker(new URL('./chessAi.worker.ts', import.meta.url), { type: 'module' })`. A fallback asynchronous time-sliced generator should also be included in `chessAi.ts` in case a restricted test or sandbox environment does not support Web Workers.
2. **Opening Book / Tablebase**:
   - To keep bundle size optimal and dependencies minimal, Grandmaster tier relies on algorithmic evaluation (material, PSTs, center control, king safety) rather than multi-megabyte opening books or endgame tablebases.
3. **Audio Autoplay Policy**:
   - Modern browsers require user interaction before playing audio via `AudioContext`. Audio initialization must occur upon the player's first click or drag interaction on the board.

---

## 4. Conclusion

The comprehensive survey and architectural design for the Viper Chess Arena UX, visual styling, bot AI tiers, and game modes is complete. 

The detailed specifications have been written to:
`c:\Users\ditob\Documents\viper\.agents\teamwork_preview_explorer_survey_3\survey_report.md`

Key deliverables defined in the report:
- **Visual & Aesthetic Specifications**: Obsidian & crystal squares, coordinate labeling, 5 glowing move indicators, captured piece racks with dynamic material counter (`+3`), floating pawn promotion modal, and esports game-over modal with confetti.
- **Interaction Model**: Unified pointer events for desktop and touch with thumb-offset drag preview.
- **Three-Tier AI Engine**: Casual (~900 Elo), Blitz (~1500 Elo), and Grandmaster (~2100+ Elo) operating on a dedicated Web Worker to guarantee 60fps UI responsiveness.
- **Game Modes & Clocks**: Pass-and-Play with 180° auto-flip, Human vs AI with color selection, precision Blitz timers (1m, 3m, 5m, 10m, Unlimited), and Web Audio API synthesizer.

---

## 5. Verification Method

To independently verify the findings and design documented in this survey:
1. **Inspect Survey Report**:
   ```powershell
   cat c:\Users\ditob\Documents\viper\.agents\teamwork_preview_explorer_survey_3\survey_report.md
   ```
2. **Inspect Existing Viper Arena Patterns**:
   - Verify `GameWindowControls` interface in `c:\Users\ditob\Documents\viper\src\components\arena\GameWindowControls.tsx`.
   - Verify `BoardView.tsx` game launch mechanism in `c:\Users\ditob\Documents\viper\src\components\views\BoardView.tsx`.
   - Verify `App.tsx` arena state management in `c:\Users\ditob\Documents\viper\src\App.tsx`.
3. **Verify Build Environment**:
   ```powershell
   npm run build
   ```
   (Confirms TypeScript compilation passes and existing dependencies match `package.json`).
