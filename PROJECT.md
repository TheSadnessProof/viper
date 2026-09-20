# Project: Viper Chess

## Architecture
Viper Chess is an interactive, visual-first, dark-luxury esports FIDE chess game built within the Viper gaming platform.
It follows a clean, decoupled architecture:
1. **Core Engine (`src/games/chess/chessLogic.ts`, `chessTypes.ts`)**: Pure TypeScript, zero-dependency, deterministic FIDE chess rules engine. Provides immutable state transitions (`makeMove`, `undoMove`), legal move validation (pseudo-legal generation filtered by king safety), special moves (castling, en passant, promotion), terminal state evaluation (checkmate, stalemate, 50-move rule, insufficient material, repetition), and FEN import/export.
2. **AI & Audio Services (`src/games/chess/chessAi.ts`, `chessAi.worker.ts`, `chessAudio.ts`)**:
   - 3 Bot AI tiers (Casual, Blitz, Grandmaster) powered by minimax with alpha-beta pruning, piece-square tables, and move ordering. Executed in a dedicated Web Worker to ensure 60fps UI responsiveness.
   - Procedural Web Audio API sound synthesizer generating instant audio feedback for moves, captures, checks, castling, and game over.
3. **UI & Arena Components (`src/games/chess/ChessArena.tsx`, `ChessBoardView.tsx`, `ChessPieces.tsx`)**:
   - Obsidian glass & crystal 8x8 chessboard with cyan/sky esports neon accents and zero text clutter.
   - 5 luminous visual move indicators (cyan destination dots, rose capture rings, crimson check aura, selected piece highlight, last move trail).
   - Unified Pointer Events supporting both click-to-move and drag-and-drop on desktop and touch.
   - Captured pieces rack with live material differential counter (`+3`).
   - Integrated GameWindowControls (Exit, Fullscreen, Minimize, Navbar toggle, extraControls for AI difficulty, timers, sound, restart).
4. **Viper Platform Integration (`src/App.tsx`, `src/components/views/BoardView.tsx`, `src/data/games.ts`)**:
   - Fullscreen arena lifecycle management in `App.tsx`.
   - `BoardView.tsx` playable activation (`isPlayable: true`) routing to ChessArena.
5. **Automated Testing (`tests/chess/`)**:
   - Comprehensive test suite leveraging Node 24 native test runner (`node --experimental-strip-types --test`).

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Board Coordinate & Mailbox Representation | 0..63 index mapping, rank/file math, algebraic notation (e.g. 'e4') | M1 | Spec Miner 2 §2 |
| 2 | Piece Move Generation: Pawn | Single push, double push, diagonal captures | M1 | R1, AC |
| 3 | Piece Move Generation: Major/Minor Pieces | Knight jump vectors, Bishop/Rook/Queen ray sliders | M1 | R1, AC |
| 4 | Piece Move Generation: King | 1-step in 8 directions with boundary checks | M1 | R1, AC |
| 5 | Special Moves: Castling | Kingside (O-O) & Queenside (O-O-O), move rights tracking, empty squares, transit/landing check prevention | M1 | R1, AC |
| 6 | Special Moves: En Passant | Target square tracking, double-push trigger, 1-ply expiration, horizontal pin check | M1 | R1, AC |
| 7 | Special Moves: Pawn Promotion | Auto-detection on rank 8/rank 1, promotion to Q, R, B, N | M1 | R1, AC |
| 8 | Check Detection & Attack Evaluation | King square attacked by enemy pieces, ray & jump attack detection | M1 | R1, AC |
| 9 | Strict Legal Move Validation | Filter candidate moves: king never left in check, absolute pin enforcement | M1 | R1, AC |
| 10 | Terminal States & Draw Evaluation | Checkmate, Stalemate, 50-move rule, Insufficient material dead positions, Threefold repetition | M1 | R1, AC |
| 11 | State Transitions & History Stack | Immutable `makeMove`, `undoMove`, FEN import/export, SAN move notation | M1 | Spec Miner 2 §9 |
| 12 | Bot AI: Casual Tier (~900 Elo) | Fast heuristic random legal moves with capture preference | M2 | R3, AC |
| 13 | Bot AI: Blitz Tier (~1500 Elo) | Minimax depth 3 with alpha-beta pruning and piece-square tables | M2 | R3, AC |
| 14 | Bot AI: Grandmaster Tier (~2100+ Elo) | Minimax depth 4-5 with alpha-beta, piece-square tables, center control, king safety, MVV-LVA | M2 | R3, AC |
| 15 | Non-Blocking AI Execution | Web Worker (`chessAi.worker.ts`) with async fallback for 60fps UI | M2 | R3, AC |
| 16 | Procedural Audio Synthesizer | Web Audio API sound effects for move, capture, check, castling, victory, defeat | M2 | R2, AC |
| 17 | Obsidian & Crystal Board Aesthetics | Dark luxury glass squares (`slate-800/90` and `slate-200/90`) with cyan neon styling | M2 | R2, AC |
| 18 | 5 Visual Move Indicators | Cyan destination dots, rose capture rings, crimson check aura, piece selection, last-move trail | M2 | R2, AC |
| 19 | Zero Text Clutter UI | Purely visual HUD, minimal chrome, coordinate labels (a-h, 1-8) | M2 | R2, AC |
| 20 | Dual Input Interaction | Unified Pointer Events for click-to-move and drag-and-drop with touch offset | M2 | R2, AC |
| 21 | Captured Pieces Rack & Material Diff | Trays for captured White/Black pieces with live `+N` differential badge | M2 | R2, AC |
| 22 | Promotion Selection Modal | Sleek floating dialog over board for Q, R, B, N choice | M2 | R1, AC |
| 23 | Game Clocks & Timers | 1m, 3m, 5m, 10m, Unlimited clocks with active countdown and flag-fall handling | M2 | R3, AC |
| 24 | Game Modes & Board Flip | Human vs AI (White/Black/Random) and Pass-and-Play (2 humans with optional 180° flip) | M2 | R3, AC |
| 25 | Game Over Modal & Celebration | Non-intrusive modal showing outcome with confetti celebration on victory | M2 | R1, R2, AC |
| 26 | Fullscreen Arena Integration | `ChessArena.tsx` with `GameWindowControls` (Exit, Fullscreen, Minimize, Nav toggle, extraControls) | M2 | R4, AC |
| 27 | BoardView Playable Wiring | Mark `id: 'chess'` as `isPlayable: true` with launch handler in `BoardView.tsx` | M2 | R4, AC |
| 28 | App.tsx Arena State Management | Add `'chess'` to `activeArena`, wire `handleLaunchGame('chess')`, fullscreen toggle | M2 | R4, AC |
| 29 | E2E Opaque-Box Test Suite | Comprehensive test suite covering Tiers 1-4 with Node 24 native test runner | E2E | AC |
| 30 | Build & Acceptance Verification | Pass 100% E2E tests, clean `npm run build` with 0 errors | Final | AC |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Test Suite Creation | Design & write opaque-box test suite (Tiers 1-4) in `tests/chess/` using Node 24 runner | none | DONE |
| M1 | Chess Engine Core & Rule Validation | `chessTypes.ts`, `chessLogic.ts`: FIDE moves, castling, en passant, promotion, check, checkmate, stalemate, draws, FEN | none | DONE |
| M2 | Arena UI, Bot AI & Platform Integration | `chessAi.ts`, `chessAi.worker.ts`, `chessAudio.ts`, `ChessPieces.tsx`, `ChessBoardView.tsx`, `ChessArena.tsx`, `BoardView.tsx`, `App.tsx` | M1 | DONE |
| M3 | Final Acceptance & Adversarial Hardening | Pass 100% E2E tests (Tiers 1-4), adversarial coverage hardening (Tier 5), verify `npm run build` | E2E, M2 | PLANNED |

---

## Interface Contracts

### `chessTypes.ts` ↔ `chessLogic.ts` ↔ UI / AI
```typescript
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

export interface Piece {
  type: PieceType;
  color: PieceColor;
}

export type Square = number; // 0..63 (0 = a8, 7 = h8, 56 = a1, 63 = h1)

export interface Move {
  from: Square;
  to: Square;
  promotion?: PieceType;
  isCapture?: boolean;
  isCastling?: boolean;
  isEnPassant?: boolean;
  san?: string;
}

export interface CastlingRights {
  whiteKingside: boolean;
  whiteQueenside: boolean;
  blackKingside: boolean;
  blackQueenside: boolean;
}

export interface ChessGameState {
  board: (Piece | null)[];
  turn: PieceColor;
  castling: CastlingRights;
  enPassant: Square | null;
  halfmoveClock: number;
  fullmoveNumber: number;
  history: {
    move: Move;
    captured: Piece | null;
    prevCastling: CastlingRights;
    prevEnPassant: Square | null;
    prevHalfmoveClock: number;
    fen: string;
  }[];
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  drawReason?: 'stalemate' | 'insufficient_material' | 'fifty_move' | 'threefold_repetition';
}
```

### Engine Functions
- `createInitialGameState(): ChessGameState`
- `getLegalMoves(state: ChessGameState, fromSquare?: Square): Move[]`
- `makeMove(state: ChessGameState, move: Move): ChessGameState`
- `undoMove(state: ChessGameState): ChessGameState`
- `toFEN(state: ChessGameState): string`
- `fromFEN(fen: string): ChessGameState`
- `isSquareAttacked(board: (Piece | null)[], square: Square, byColor: PieceColor): boolean`

### AI Contract (`chessAi.ts`)
- `getBestMove(state: ChessGameState, difficulty: 'casual' | 'blitz' | 'grandmaster'): Promise<Move | null>`

### Audio Contract (`chessAudio.ts`)
- `playChessSound(sound: 'move' | 'capture' | 'check' | 'castle' | 'victory' | 'defeat'): void`

---

## Code Layout
- `src/games/chess/chessTypes.ts` - Data types and interfaces (DONE)
- `src/games/chess/chessLogic.ts` - Core FIDE engine, move generation, rule validation (DONE)
- `src/games/chess/chessAi.ts` - AI Bot minimax with alpha-beta pruning and heuristics (DONE)
- `src/games/chess/chessAi.worker.ts` - Dedicated Web Worker for off-thread AI search (DONE)
- `src/games/chess/chessAudio.ts` - Procedural Web Audio API sound effects (DONE)
- `src/games/chess/ChessPieces.tsx` - High-contrast SVG chess pieces with subtle glow (DONE)
- `src/games/chess/ChessBoardView.tsx` - 8x8 interactive board, indicators, drag-and-drop & click-to-move (DONE)
- `src/games/chess/ChessArena.tsx` - Fullscreen arena view with GameWindowControls, timers, player racks, HUD (DONE)
- `src/components/views/BoardView.tsx` - Playable card registration (DONE)
- `src/App.tsx` - Top-level arena routing and fullscreen state (DONE)
- `tests/chess/chessLogic.test.ts` - Comprehensive FIDE engine tests (DONE)
- `tests/chess/chessE2E.test.ts` - Comprehensive E2E game scenario tests (DONE)
