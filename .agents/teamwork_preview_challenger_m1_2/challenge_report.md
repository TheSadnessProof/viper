# Adversarial Challenge Report: FIDE Terminal Conditions & Engine Edge Cases

**Agent**: Challenger 2 (Milestone 1)  
**Target Module**: `src/games/chess/chessLogic.ts`, `src/games/chess/chessTypes.ts`  
**Execution Harness**: `.agents/teamwork_preview_challenger_m1_2/terminal_stress.ts`  
**Date**: 2026-09-20T22:26:30Z  

---

## Challenge Summary

**Overall risk assessment**: **LOW** (Zero critical bugs or FIDE specification deviations detected in core engine)

The adversarial stress testing targeted subtle terminal states, complex pins, boundary triggers, and special moves within `src/games/chess/chessLogic.ts`. Across 48 empirical verification tests executed using Node's native test runner (`node --experimental-strip-types --test`), all edge case invariants held with 100% precision:
1. **Fifty-Move Rule Exact Boundary**: Triggers strictly on the 100th halfmove (`halfmoveClock === 100`), never at 99, resets cleanly to 0 on any pawn advance, regular capture, or en passant capture, and yields precedence to checkmate.
2. **Threefold Repetition Transpositions**: Correctly identifies non-consecutive repetitions separated by 12 to 16 moves, distinguishes positions when castling rights are surrendered, and rolls back cleanly with `undoMove`.
3. **Insufficient Material Bishop Color Parity**: Differentiates same-colored bishops ($K+B$ vs $K+B$ where both occupy light squares or both occupy dark squares $\rightarrow$ draw) from opposite-colored bishops ($K+B$ vs $K+B$ on opposite square colors $\rightarrow$ NOT a draw, as checkmate is legally attainable via helpmate), adhering strictly to FIDE Art. 9.6.
4. **Castling Legality Invariants Under Check**: King in check cannot castle under any condition (rook check, bishop check, knight check, pawn check, queen check), even if the checking piece is pinned to the opponent king (FIDE Art. 3.9) or if castling would counter-attack the checking piece. Correctly allows queenside castling when only the non-transit square `b1`/`b8` is attacked.
5. **En Passant Pin Traps**: Accurately prevents illegal en passant captures that uncover horizontal checks along ranks 5 or 4 (rank-pin trap), vertical checks along files (file-pin trap), and diagonal checks (ray-pin trap).
6. **Promotion Terminal Variations**: Handles promotions delivering check (`+`), checkmate (`#`), smothered knight mate (`#`), and stalemates (underpromotion to Bishop, Queen promotion trapping opposing cornered king).

---

## Challenges & Stress Hypotheses

### [Low] Challenge 1: Fifty-Move Rule Boundary & Priority Inversion
- **Assumption Challenged**: If the 100th halfmove delivers checkmate or capture, will the engine prematurely award a fifty-move draw, or will checkmate / clock reset take precedence?
- **Attack Scenario**: Set up position at `halfmoveClock: 99`. White plays a move that delivers checkmate (`Qg7#`). If draw evaluation runs before checkmate evaluation, the engine would misclassify the game as a fifty-move draw instead of checkmate.
- **Blast Radius**: High if failed (a win erroneously awarded as a draw).
- **Stress Test Verification**:
  - `halfmoveClock: 99` $\rightarrow$ non-pawn non-capture $\rightarrow$ `halfmoveClock: 100`, `isDraw: true`, `drawReason: 'fifty_move'` (**PASS**).
  - `halfmoveClock: 99` $\rightarrow$ pawn move $\rightarrow$ `halfmoveClock: 0`, `isDraw: false` (**PASS**).
  - `halfmoveClock: 99` $\rightarrow$ capture $\rightarrow$ `halfmoveClock: 0`, `isDraw: false` (**PASS**).
  - `halfmoveClock: 99` $\rightarrow$ en passant capture $\rightarrow$ `halfmoveClock: 0`, `isDraw: false` (**PASS**).
  - `halfmoveClock: 99` $\rightarrow$ checkmate move $\rightarrow$ `isCheckmate: true`, `isDraw: false` (**PASS**). In `evaluateGameStatus()`, `legalMoves.length === 0 && state.isCheck` returns immediately before halfmoveClock evaluation.
  - `halfmoveClock: 100` $\rightarrow$ `undoMove()` $\rightarrow$ `halfmoveClock: 99`, `isDraw: false` (**PASS**).

### [Low] Challenge 2: Threefold Repetition Across Non-Consecutive Transpositions
- **Assumption Challenged**: Does threefold repetition only track immediate oscillatory repetitions (e.g. $A \rightarrow B \rightarrow A \rightarrow B \rightarrow A$), or does it correctly identify transpositions occurring across multi-move sequences (10+ moves apart)? Does it falsely count repetitions when castling rights have been lost?
- **Attack Scenario**: 
  1. Occurrence 1: Initial starting position ($T=0$, castling `KQkq`).
  2. Maneuver A (12 plies): Knights circle center and return ($T=12$). Occurrence 2.
  3. Maneuver B (16 plies): Knights navigate rim via $h3/h6/f4/f5/d5/d4/e3/e6$ and return ($T=28$). Occurrence 3.
  4. Also test King moving $e1-e2-e1$ losing castling rights: does the engine falsely match this with $T=0$?
- **Blast Radius**: Premature draw or missed repetition draw.
- **Stress Test Verification**:
  - Occurrence 1 $\rightarrow$ Maneuver A (12 plies) $\rightarrow$ Occurrence 2 (`isDraw: false`) $\rightarrow$ Maneuver B (16 plies) $\rightarrow$ Occurrence 3 (`isDraw: true`, `drawReason: 'threefold_repetition'`) (**PASS**).
  - King steps off and back ($e1-e2-e1, e8-e7-e8$): castling rights become `-`. Does NOT trigger repetition with `KQkq` position (**PASS**).
  - Repeating the no-castle state 3 times triggers threefold repetition for the no-castle state (**PASS**).
  - `undoMove()` on repetition move immediately reverts `isDraw` to `false` (**PASS**).

### [Low] Challenge 3: Insufficient Material Bishop Square Parity
- **Assumption Challenged**: Does the engine distinguish between same-colored bishops and opposite-colored bishops in $K+B$ vs $K+B$ endgames?
- **Attack Scenario**:
  - $K+B$ vs $K+B$ where White has a bishop on $c4$ (light) and Black has a bishop on $f5$ (light) $\rightarrow$ draw.
  - $K+B$ vs $K+B$ where White has a bishop on $c1$ (dark) and Black has a bishop on $f8$ (dark) $\rightarrow$ draw.
  - $K+B$ vs $K+B$ where White has a bishop on $c1$ (dark) and Black has a bishop on $c8$ (light) $\rightarrow$ CANNOT be an automatic draw (FIDE allows helpmate in the corner).
- **Blast Radius**: Erroneous forced draw in playable opposite-color bishop endgames.
- **Stress Test Verification**:
  - $K$ vs $K \rightarrow$ `isInsufficientMaterial: true`, `isDraw: true` (**PASS**).
  - $K+B$ vs $K \rightarrow$ `isInsufficientMaterial: true` (**PASS**).
  - $K+N$ vs $K \rightarrow$ `isInsufficientMaterial: true` (**PASS**).
  - $K+B$ vs $K+B$ (same light squares $c4/f5$) $\rightarrow$ `isInsufficientMaterial: true` (**PASS**).
  - $K+B$ vs $K+B$ (same dark squares $c1/f8$) $\rightarrow$ `isInsufficientMaterial: true` (**PASS**).
  - $K+B$ vs $K+B$ (opposite squares $c1/c8$) $\rightarrow$ `isInsufficientMaterial: false`, `isDraw: false` (**PASS**).
  - $K+N+N$ vs lone King $\rightarrow$ `isInsufficientMaterial: false` (FIDE compliant: not a dead position) (**PASS**).
  - Capturing final pawn with $Bc1xg5$ leaving $K+B$ vs $K \rightarrow$ immediately transitions to `isDraw: true`, `drawReason: 'insufficient_material'` (**PASS**).

### [Low] Challenge 4: King in Check Castling Invariants
- **Assumption Challenged**: Can a King in check ever castle under any circumstance (e.g., if the checking piece is pinned, if castling rook attacks the checker, or if check was delivered by a minor piece)?
- **Attack Scenario**: Test castling from check under all 5 piece types (R, B, N, P, Q) for both colors, plus absolute pin on checking piece.
- **Blast Radius**: Illegal escape from check via castling.
- **Stress Test Verification**:
  - White King in check along e-file by Rook $\rightarrow$ O-O and O-O-O illegal (**PASS**).
  - White King in check along diagonal by Bishop $\rightarrow$ O-O and O-O-O illegal (**PASS**).
  - White King in check by Knight $\rightarrow$ O-O and O-O-O illegal (**PASS**).
  - White King in check by Pawn $\rightarrow$ O-O and O-O-O illegal (**PASS**).
  - Black King in check along e-file $\rightarrow$ O-O and O-O-O illegal (**PASS**).
  - Black King in check by Knight $\rightarrow$ O-O and O-O-O illegal (**PASS**).
  - Checking piece is absolute-pinned to opposing King $\rightarrow$ Castling strictly forbidden (**PASS**).
  - Castling rook would counter-attack checking piece $\rightarrow$ Castling forbidden (**PASS**).
  - Attacked transit squares ($f1, d1$) $\rightarrow$ Castling forbidden (**PASS**).
  - Attacked landing squares ($g1, c1$) $\rightarrow$ Castling forbidden (**PASS**).
  - Attacked non-transit corner square ($b1$) $\rightarrow$ Queenside castling remains legal (**PASS**).

### [Low] Challenge 5: En Passant Horizontal Pin Trap & Geometry
- **Assumption Challenged**: In an en passant capture, TWO pawns vanish from the rank simultaneously (the capturing pawn moves forward diagonally, and the captured pawn is removed). If an enemy Rook or Queen is on the same rank, this dual disappearance can expose the King to check along the rank. Does the engine catch this?
- **Attack Scenario**:
  - Rank 5: Black Rook on $a5$, Black Pawn on $d5$, White Pawn on $e5$, White King on $h5$. Black plays $d7-d5$. White candidate move: $e5xd6$ e.p.
  - Rank 4: Black King on $h4$, Black Pawn on $e4$, White Pawn on $d4$, White Rook on $a4$. White plays $d2-d4$. Black candidate move: $e4xd3$ e.p.
  - Queen horizontal pin on rank 5.
  - Vertical pin along file.
  - Diagonal pin along diagonal.
- **Blast Radius**: King left in check after illegal en passant.
- **Stress Test Verification**:
  - White rank-5 horizontal pin trap $\rightarrow$ $e5xd6$ e.p. strictly illegal, filtered out (**PASS**).
  - Black rank-4 horizontal pin trap $\rightarrow$ $e4xd3$ e.p. strictly illegal, filtered out (**PASS**).
  - Queen on $a5$ pin trap $\rightarrow$ $f5xg6$ e.p. strictly illegal (**PASS**).
  - Attacker replaced by non-sliding Knight $\rightarrow$ $e5xd6$ e.p. legal (**PASS**).
  - King on different rank ($h6$) $\rightarrow$ $e5xd6$ e.p. legal (**PASS**).
  - Vertical pin along e-file $\rightarrow$ e.p. illegal (**PASS**).
  - Diagonal pin ray $\rightarrow$ e.p. off diagonal ray illegal (**PASS**).

### [Low] Challenge 6: Pawn Promotion Variations & Terminal States
- **Assumption Challenged**: Do pawn promotions correctly evaluate check (`+`), checkmate (`#`), smothered mate (`#`), and stalemates (`isStalemate: true`)?
- **Attack Scenario**:
  - Direct check with Queen promotion: $e8=Q+$.
  - Underpromotion delivering check with Knight: $e8=N+$.
  - Queen promotion checkmate: $f8=Q\#$.
  - Smothered knight underpromotion checkmate: $e8=N\#$.
  - Underpromotion to Bishop causing stalemate: $g8=B$.
  - Queen promotion causing stalemate: $e8=Q$.
  - Pinned pawn on 7th rank cannot promote if exposing friendly King to check.
- **Blast Radius**: Incorrect SAN notation or missed terminal state evaluation on promotion.
- **Stress Test Verification**: All 7 scenarios pass with exact SAN suffixes and state flags (**PASS**).

---

## Stress Test Results Summary

| Suite | Name | Scenarios | Pass | Fail |
|---|---|---|---|---|
| Suite 1 | Fifty-Move Rule Exact Boundary & Reset Mechanics | 8 | 8 | 0 |
| Suite 2 | Threefold Repetition with Non-Consecutive Transpositions | 4 | 4 | 0 |
| Suite 3 | Insufficient Material Variations & Bishop Square Parity | 11 | 11 | 0 |
| Suite 4 | King in Check Cannot Castle Under Any Circumstance | 11 | 11 | 0 |
| Suite 5 | En Passant Horizontal Pin Trap & Non-Standard Pins | 7 | 7 | 0 |
| Suite 6 | Pawn Promotion Variations (Check, Checkmate, Stalemate) | 7 | 7 | 0 |
| **Total** | **Adversarial Stress Test Suite** | **48** | **48** | **0** |

---

## Unchallenged Areas
- **Bot AI Minimax & Alpha-Beta Search**: Scheduled under Milestone 2 scope (`src/games/chess/chessAi.ts`).
- **Web Audio Sound Synthesizer**: Scheduled under Milestone 2 scope (`src/games/chess/chessAudio.ts`).
- **Obsidian Glass Board & UI Components**: Scheduled under Milestone 3 scope (`src/games/chess/ChessBoardView.tsx`, `ChessArena.tsx`).

---

## Final Assessment
The core chess rules engine implementation in `src/games/chess/chessLogic.ts` is robust, mathematically precise, zero-dependency, and strictly compliant with standard FIDE laws of chess. No bugs were found across all targeted adversarial dimensions.
