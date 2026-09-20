# Handoff Report: FIDE Chess Rules & Pure TypeScript Engine Specification

**Agent**: Spec Miner 2 (`teamwork_preview_spec_miner_survey_2`)  
**Date**: 2026-09-20  
**Handoff Type**: Hard (Task Complete)  
**Parent**: Orchestrator (`81d5157f-47b9-4307-8c23-8f5778a5ac63`)

---

## 1. Observation

1. **User Request & Requirements**:
   - In `c:\Users\ditob\Documents\viper\.agents\ORIGINAL_REQUEST.md`, lines 12-17 state:
     > "### R1. Complete & Robust Chess Engine Mechanics
     > Implement or integrate complete FIDE chess rules with 100% legal move validation:
     > - All piece move sets (King, Queen, Rook, Bishop, Knight, Pawn).
     > - Special moves: Castling (kingside & queenside), En Passant, Pawn Promotion selection.
     > - Full game state evaluation: Check detection, Checkmate, Stalemate, Fifty-move rule / Insufficient material draws."
   - Acceptance criteria (lines 39-45):
     > "- [ ] Legal moves for all pieces are strictly validated.
     > - [ ] Castling (both kingside and queenside) works correctly and accounts for check/attacked squares.
     > - [ ] En Passant is correctly enabled on double-pawn pushes and expires immediately on the subsequent turn.
     > - [ ] Pawn promotion presents a clean visual choice (Queen, Rook, Bishop, Knight).
     > - [ ] Check, Checkmate, and Stalemate are detected with an animated, non-intrusive victory/draw modal."

2. **Platform & Package Dependencies**:
   - In `c:\Users\ditob\Documents\viper\package.json`, lines 11-18:
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
     No external chess library (such as `chess.js` or `stockfish`) is installed, mandating either installing a package or implementing an in-house pure TypeScript engine. An in-house pure TypeScript engine provides full control over deterministic state, custom AI bots, lightweight footprint, and zero dependency issues with React 19 / Vite.

3. **Arena & Catalog Integration State**:
   - In `c:\Users\ditob\Documents\viper\src\components\views\BoardView.tsx`, lines 16-23:
     ```tsx
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
     Chess is registered but disabled (`isPlayable: false`).
   - In `c:\Users\ditob\Documents\viper\src\App.tsx`, lines 31 and 42-46:
     ```tsx
     const [activeArena, setActiveArena] = useState<'joker' | 'poker' | 'domino' | null>(null);
     ```
     `'chess'` is not yet in the union or the launch handler.

4. **Engine Specification Deliverable**:
   - Completed detailed specification report at `c:\Users\ditob\Documents\viper\.agents\teamwork_preview_spec_miner_survey_2\survey_report.md` (668 lines, 26KB) containing:
     - 27-item Features Discovered table
     - 23-item Edge Cases table with verified FIDE outcomes
     - Mathematical coordinate standard (`index = rank * 8 + file`)
     - Complete pseudo-code and TypeScript implementations for ray-sliders, square attacks, castling invariants, en passant (including the horizontal dual-pawn pin trap), and pawn promotions
     - Terminal conditions logic (Checkmate, Stalemate, 50-move rule, Threefold repetition key hashing, Insufficient material dead positions)
     - Full data models and immutable state transition functions (`makeMove`, `undoMove`, `parseFEN`, `toFEN`)
     - 20-test verification matrix covering standard and edge-case FIDE scenarios

---

## 2. Logic Chain

1. **Self-Contained Engine vs External Dependency**:
   - Observation: `package.json` contains React 19, Vite 6, and Tailwind v4, but zero chess packages.
   - Deduction: Relying on a third-party npm package could introduce React 19 compatibility issues, bundling overhead, or typing mismatches. A clean, modular pure TypeScript engine under `src/games/chess/` satisfies R1 with 100% testability, zero bundle bloat, and total transparency.

2. **Strict Legal Move Validation Architecture**:
   - Observation: Naive legal move generation is prone to bugs regarding absolute pins and discovered checks. FIDE Art. 3.9 dictates that a pinned piece cannot move if doing so exposes its king, yet it STILL defends squares against opponent king moves.
   - Deduction: A 2-phase generator (generating pseudo-legal candidate moves first, then applying each tentatively and verifying `!isSquareAttacked(friendlyKingSquare, enemyColor)`) guarantees 100% legal compliance with zero special cases omitted.

3. **Subtle Special Move Invariants**:
   - Observation: Castling requires verification of five distinct preconditions (rights flag, king not in check, king not passing through check, king not landing in check, corridor unoccupied). Furthermore, enemy attacks on rook transit squares (e.g. `b1` or `b8`) do NOT prevent queenside castling, and rook being under attack does not prevent castling.
   - Deduction: Explicitly isolating square checks (`e1, f1, g1` for O-O; `e1, d1, c1` for O-O-O) and separating occupancy checks (`b1, c1, d1`) prevents common engine bugs.
   - Observation: In en passant captures, both the moving pawn and the captured pawn are removed simultaneously from the board. In positions where the King and an enemy Rook share the rank, removing both pawns can open a horizontal line of check.
   - Deduction: The legal move filter must execute the actual dual-pawn removal during candidate testing before evaluating king safety.

4. **Terminal State Completeness**:
   - Observation: FIDE defines five standard draw mechanisms: Stalemate (Art. 5.2.a), Fifty-Move Rule (Art. 5.2.b & 9.3), Threefold Repetition (Art. 5.2.c & 9.2), Insufficient Material / Dead Position (Art. 5.2.b & 9.6), and Mutual Agreement.
   - Deduction: Each terminal condition has been formalized mathematically in `survey_report.md`:
     - Stalemate: `inCheck === false && legalMoves.length === 0`
     - Checkmate: `inCheck === true && legalMoves.length === 0`
     - 50-move rule: `halfmoveClock >= 100`
     - Threefold repetition: `positionMap[fenKey] >= 3`
     - Insufficient material: exact piece set reduction checking same-colored bishops vs lone king.

---

## 3. Caveats

1. **Chess960 (Fischer Random)**: This specification covers standard FIDE Chess starting positions (`DEFAULT_FEN`). Dynamic Chess960 rook/king starting positions are out of scope per `ORIGINAL_REQUEST.md`.
2. **Clock Decrement vs Platform Timers**: The engine maintains `halfmoveClock` and `fullmoveNumber` for rule enforcement (50-move rule). Real-time countdown clocks (e.g., 3-minute blitz, 5-minute rapid) are UI/session concerns to be managed by the Arena layer (`ChessArena.tsx` / `useChessTimer`).
3. **Engine Search Algorithms**: Bot AI evaluation heuristics and minimax/alpha-beta search depth are detailed in Explorer 3's UX/AI survey; this specification defines the underlying move generator and state machine upon which the AI operates.

---

## 4. Conclusion

The specification for the Viper Chess Engine is complete, mathematically sound, and fully documented in `survey_report.md`. The design guarantees:
- Complete compliance with FIDE Laws of Chess Articles 2 through 9 and Appendix C.
- Robust, immutable state management with zero mutations.
- Instantaneous $O(1)$ undo and redo through lightweight history snapshots.
- Standard FEN import/export and SAN move formatting.
- Complete edge-case coverage including dual-pawn en passant pins, castling attack boundaries, and dead positions.

The implementation team can directly execute the architecture laid out in Section 9 of `survey_report.md`.

---

## 5. Verification Method

To verify the findings and specifications in this report:

1. **Inspect Specification Artifact**:
   - Read `c:\Users\ditob\Documents\viper\.agents\teamwork_preview_spec_miner_survey_2\survey_report.md`.
   - Verify Section 2 (Features Discovered table) covers 27 distinct engine capabilities.
   - Verify Section 3 (Edge Cases table) covers 23 nuanced edge cases.
   - Verify Section 9 defines the concrete TypeScript interfaces and algorithms.
   - Verify Section 11 details the 20-scenario test suite matrix.

2. **Downstream Test Execution (Once Implemented)**:
   - When the implementation agent builds `src/games/chess/`, run:
     ```powershell
     npm run build
     ```
     Ensure 0 TypeScript or Vite compilation errors.
   - Run automated unit test suite:
     ```powershell
     npm test
     ```
     Verify all 20 test cases from Section 11 pass without failure.

3. **Invalidation Conditions**:
   - If an engine test allows a king to castle while passing through an attacked square (`f1` / `d1`), this specification's invariants were violated.
   - If an en passant capture is permitted when king safety is breached via horizontal exposure, the candidate filter was implemented incorrectly.
