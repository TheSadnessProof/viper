# Original User Request

## 2026-09-20T22:06:57Z

Implement a sophisticated, visual-first, interactive Chess game in the Viper gaming platform featuring complete legal chess rules, bot AI with Casual/Blitz/Grandmaster difficulties, local Pass-and-Play mode, ultra-sleek dark esports board aesthetics, and seamless fullscreen arena integration with zero text clutter.

Working directory: c:\Users\ditob\Documents\viper
Integrity mode: development

## Requirements

### R1. Complete & Robust Chess Engine Mechanics
Implement or integrate complete FIDE chess rules with 100% legal move validation:
- All piece move sets (King, Queen, Rook, Bishop, Knight, Pawn).
- Special moves: Castling (kingside & queenside), En Passant, Pawn Promotion selection.
- Full game state evaluation: Check detection, Checkmate, Stalemate, Fifty-move rule / Insufficient material draws.

### R2. Sophisticated, Visual-First Chess Arena UI
Deliver an ultra-sleek, beautiful board interface matching Viper's dark luxury visual identity:
- Dark glass / obsidian & crystal squares with smooth hover/selection states.
- Crisp, elegant chess piece visuals with subtle glow and clean contrast.
- Visual move indicators: valid destination dots, capture target rings, and king-in-check danger aura.
- Captured pieces rack displaying captured material differential.
- Zero text clutter — no verbose paragraphs or tutorials; purely visual, responsive, and intuitive.

### R3. Multiple Game Modes & Bot AI
Support distinct play options:
- Human vs Bot AI with selectable difficulties: Casual (fast/friendly), Blitz (tactical), and Grandmaster (deep evaluation).
- Local Pass-and-Play (2 humans sharing the board).
- Move timers / Blitz clocks and interactive undo / restart actions.

### R4. Viper Platform & Fullscreen Integration
- Create ChessArena.tsx equipped with GameWindowControls (Exit X, Fullscreen toggle, Minimize, Nav toggle).
- Update BoardView.tsx so Chess is marked isPlayable: true with direct launch handler.
- Wire into App.tsx arena state management so clicking "Play" on Chess immediately opens the arena in full screen, and exiting returns smoothly to the catalog.

## Acceptance Criteria

### Core Rules & Mechanics
- [ ] Legal moves for all pieces are strictly validated.
- [ ] Castling (both kingside and queenside) works correctly and accounts for check/attacked squares.
- [ ] En Passant is correctly enabled on double-pawn pushes and expires immediately on the subsequent turn.
- [ ] Pawn promotion presents a clean visual choice (Queen, Rook, Bishop, Knight).
- [ ] Check, Checkmate, and Stalemate are detected with an animated, non-intrusive victory/draw modal.

### Visual & Interactive Polish
- [ ] Click-to-move and drag-and-drop interaction both work smoothly on desktop and touch.
- [ ] Turn indicator, captured piece trays, and timer are displayed with zero text clutter.
- [ ] Visual sound effects / subtle audio feedback for piece moves, captures, check, and game over.

### AI & Modes
- [ ] Bot opponent responds reliably across Casual, Blitz, and Grandmaster settings without freezing UI.
- [ ] Pass-and-Play mode allows two players to alternate turns seamlessly.

### Platform & Build Verification
- [ ] Automated tests verify standard piece movements, castling, en passant, promotion, and checkmate.
- [ ] npm run build passes with 0 TypeScript and Vite compilation errors.
- [ ] Chess launches from BoardView and exits cleanly via GameWindowControls back to the board catalog.
