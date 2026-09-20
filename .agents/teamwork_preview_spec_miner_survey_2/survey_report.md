# Viper Chess Engine: Authoritative FIDE Specification & Architectural Blueprint

**Agent**: Spec Miner 2 (Viper Chess Survey Team)  
**Date**: 2026-09-20  
**Target Platform**: Viper Gaming Platform (`src/games/chess/`)  
**Specification Baseline**: FIDE Laws of Chess (incorporating latest FIDE Handbook standards)

---

## 1. Executive Summary

This document establishes the definitive specification, mathematical formulations, data structures, move validation algorithms, terminal conditions, and pure TypeScript architecture required to implement a **100% FIDE-compliant Chess Engine** for the Viper platform.

The engine is architected in **pure TypeScript** with zero external chess dependencies, zero DOM coupling, and zero state mutation. It serves as the deterministic core powering:
1. **Interactive Chess Arena UI** (click/drag validation, legal move indicators, danger aura)
2. **Bot AI Engine** (Casual, Blitz, and Grandmaster evaluation trees)
3. **Pass-and-Play Local Multi-player**
4. **Historical State Recovery** (O(1) undo/redo stack, FEN import/export, SAN generation)

---

## 2. Features Discovered

The following feature matrix enumerates every functional interface required for a complete, tournament-grade FIDE chess engine.

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Board Model | 8x8 Coordinate Representation | Dual 0..63 index and `(file, rank)` coordinate mapping with algebraic notation (`a1`..`h8`). | Board index `0..63` or `File (0..7), Rank (0..7)` | Algebraic square string (e.g. `'e4'`) or index | Returns `null` or throws on out-of-bound indices (<0 or >63). | FIDE Art. 2.1; FEN standard |
| 2 | Board Model | Square Color Evaluation | Determines light/dark square color parity based on file and rank coordinates. | `Square` | `'light' \| 'dark'` | Invalid square throws `RangeError`. | FIDE Art. 2.1 |
| 3 | Piece Model | Piece Representation | Strongly typed color (`'w' \| 'b'`) and piece role (`'p' \| 'n' \| 'b' \| 'r' \| 'q' \| 'k'`). | `Piece` object or char code | Normalized piece object `{ color, type }` | Invalid char returns `null`. | FIDE Art. 2.2 |
| 4 | Movement | Pawn Advance (Single) | 1-square forward move to an empty square along current file. | Pawn square, active color, board occupancy | Valid target square or empty move set | Blocked if target square occupied; no error. | FIDE Art. 3.7.a |
| 5 | Movement | Pawn Advance (Double) | 2-square forward move from initial rank (rank 2 for White, rank 7 for Black) through empty intermediate square. | Pawn square on rank 2/7, board occupancy | Valid target square and sets `enPassantTargetSquare` | Blocked if intermediate or destination square occupied. | FIDE Art. 3.7.b |
| 6 | Movement | Pawn Diagonal Capture | 1-square diagonal forward capture into square occupied by enemy piece. | Pawn square, active color, enemy piece positions | Target square list | Invalid if square empty or occupied by friendly piece. | FIDE Art. 3.7.c |
| 7 | Movement | Knight L-Hop | Non-sliding leap to 8 radial offsets (+-1, +-2). Can jump over intervening pieces. | Knight square, active color, board occupancy | Legal target squares (empty or enemy) | Filtered if target has friendly piece or outside board bounds. | FIDE Art. 3.6 |
| 8 | Movement | Bishop Diagonal Ray Slider | Ray-cast sliding along 4 diagonal vectors until blocked or capturing enemy. | Bishop square, board occupancy | List of empty squares and up to 1 enemy square per ray | Rays stop at first friendly/enemy piece; bounds checked. | FIDE Art. 3.5 |
| 9 | Movement | Rook Orthogonal Ray Slider | Ray-cast sliding along 4 orthogonal vectors (rank/file) until blocked or capturing enemy. | Rook square, board occupancy | List of empty squares and up to 1 enemy square per ray | Rays stop at first friendly/enemy piece; bounds checked. | FIDE Art. 3.3 |
| 10 | Movement | Queen Omnidirectional Slider | Combination of 4 diagonal rays and 4 orthogonal rays (8 directional rays). | Queen square, board occupancy | Valid target squares along all 8 rays | Blocked by intervening pieces along rays. | FIDE Art. 3.4 |
| 11 | Movement | King Radial Move | 1-square step in any of 8 directions to empty or enemy-occupied square. | King square, active color, board occupancy | Target squares not defended by enemy | Filtered if destination is under enemy attack. | FIDE Art. 3.8.a |
| 12 | Special Move | Kingside Castling (O-O) | King moves 2 squares towards h-flank (e1->g1 or e8->g8); Rook jumps (h1->f1 or h8->f8). | Board state, castling rights flag, attack map | Updated state with king and rook relocated | Disallowed if king/rook moved, in check, through check, into check, or squares occupied. | FIDE Art. 3.8.b |
| 13 | Special Move | Queenside Castling (O-O-O) | King moves 2 squares towards a-flank (e1->c1 or e8->c8); Rook jumps (a1->d1 or a8->d8). | Board state, castling rights flag, attack map | Updated state with king and rook relocated | Disallowed if king/rook moved, in check, through check, into check, or intervening squares (b, c, d) occupied. | FIDE Art. 3.8.b |
| 14 | Special Move | En Passant Capture | Pawn captures enemy pawn that just double-pushed by moving diagonally to crossed square. | Board state with `enPassantTargetSquare` | Pawn moves to target square, enemy pawn removed from adjacent rank | Excluded if not executed immediately on subsequent ply. Disallowed if King exposed horizontally. | FIDE Art. 3.7.d |
| 15 | Special Move | Pawn Promotion | Pawn reaching 8th rank (White) or 1st rank (Black) transformed into Q, R, B, or N. | Pawn reaching promotion rank, chosen `promotion` piece | Replaces pawn with selected piece on target square | Rejects promotion to King or Pawn. Mandatory promotion. | FIDE Art. 3.7.e |
| 16 | King Safety | Square Attack Evaluation | Computes whether a given square is attacked by any enemy piece. | Square, attacking color, board occupancy | Boolean (`true` / `false`) | Evaluates attacking rays and jumps regardless of whether attacker is pinned. | FIDE Art. 3.9 |
| 17 | King Safety | In-Check Detection | Tests if active player's King square is currently under attack. | Active color, King position, board occupancy | Boolean (`true` / `false`) and list of checker pieces | Gracefully handles missing king in custom setups by throwing. | FIDE Art. 3.9 |
| 18 | Move Filtering | Strict Legal Move Generation | Generates pseudo-legal candidate moves and eliminates any move that leaves king in check. | Current BoardState | Exhaustive list of 100% legal `Move` objects | Rejects moves leaving king exposed to direct/discovered checks. | FIDE Art. 3.9 |
| 19 | Terminal State | Checkmate | Active player is in check and has zero legal moves available. | BoardState (inCheck === true, legalMoves.length === 0) | GameStatus: `'checkmate'`, winner: opponent color | Immediate game termination; no further moves accepted. | FIDE Art. 5.1.a |
| 20 | Terminal State | Stalemate | Active player is NOT in check and has zero legal moves available. | BoardState (inCheck === false, legalMoves.length === 0) | GameStatus: `'stalemate'`, winner: `'draw'` | Immediate game termination; draw recorded. | FIDE Art. 5.2.a |
| 21 | Terminal State | 50-Move Rule | 50 consecutive full moves (100 plies) completed without a pawn move or capture. | `halfmoveClock >= 100` | GameStatus: `'fifty-move-draw'` | Triggered automatically or claimable. | FIDE Art. 5.2.b, 9.3 |
| 22 | Terminal State | Threefold Repetition | Identical board position (pieces, turn, castling rights, e.p. target) occurs 3 times. | Position history keys with occurrence counter | GameStatus: `'threefold-repetition'` | Evaluated against strict position key (excluding move clocks). | FIDE Art. 5.2.c, 9.2 |
| 23 | Terminal State | Insufficient Material | Remaining pieces cannot theoretically produce checkmate (K vs K, KB vs K, KN vs K, KB vs KB same color). | Piece count and square color analysis | GameStatus: `'insufficient-material'` | Automatic immediate draw when dead position reached. | FIDE Art. 5.2.b, 9.6 |
| 24 | Serialization | FEN Import | Parses standard 6-token Forsyth-Edwards Notation string into `BoardState`. | FEN string | Populated `BoardState` object | Throws detailed parse error if token count != 6 or board invalid. | FEN Standard |
| 25 | Serialization | FEN Export | Generates standard 6-token Forsyth-Edwards Notation string from `BoardState`. | `BoardState` object | FEN string | Produces exact canonical FEN string. | FEN Standard |
| 26 | Move History | Reversible Move Stack | Records move metadata for O(1) undo and redo operations. | `BoardState`, `Move` | New state, pushed `HistoryEntry` | Undo on empty stack returns null; redo on empty stack returns null. | Engine Architecture |
| 27 | Notation | SAN Generation | Converts legal move to Standard Algebraic Notation (`Nf3`, `exd5`, `O-O`, `e8=Q#`). | `Move`, prior `BoardState`, legal moves (for disambiguation) | String (e.g. `'Raxd1+'`, `'Qh4#'`) | Handles file/rank/full disambiguation per FIDE Appendix C. | FIDE Appendix C |

---

## 3. Edge Cases Matrix

Below is an exhaustive catalog of subtle, critical chess rule edge cases and their mathematically verified behaviors.

| # | Feature | Input / Setup Scenario | Observed / Required Behavior |
|---|---------|------------------------|------------------------------|
| 1 | Castling | King has never moved, but was previously in check (escaped by blocking or capturing). | **Castling is LEGAL.** Prior check does NOT invalidate castling rights; only king or rook movement destroys rights. |
| 2 | Castling | Rook involved in castling is currently under attack by enemy piece. | **Castling is LEGAL.** FIDE rules require only that the King is not in check, does not pass through check, and does not land in check. Rook being attacked is irrelevant. |
| 3 | Castling | Queenside castling: Square `b1` (for White) or `b8` (for Black) is attacked by enemy bishop/queen. | **Castling is LEGAL.** King moves from `e1` to `c1` passing through `d1`. Square `b1` is traversed only by the Rook (`a1` to `d1`). Attack on `b1` does NOT prevent castling. |
| 4 | Castling | Intermediate square `b1` is occupied by a friendly or enemy piece. | **Castling is ILLEGAL.** All squares between King and Rook (`b1`, `c1`, `d1`) must be completely empty. |
| 5 | Castling | King attempts to castle while in check (e.g., White e1 checked by Bishop on b4). | **Castling is ILLEGAL.** Castling cannot be used to escape check. |
| 6 | Castling | King attempts to castle, but the transit square (`f1` or `d1`) is attacked by enemy piece. | **Castling is ILLEGAL.** King cannot pass through a square attacked by an enemy piece. |
| 7 | Castling | Rook on `a1` is captured by enemy piece on `a1`. Later, White attempts O-O-O. | **Castling is ILLEGAL.** When a rook is captured on its home square, the castling right for that flank is permanently eliminated. |
| 8 | Castling | Rook moves from `h1` to `h2`, then returns to `h1` on the subsequent move. | **Castling is PERMANENTLY ILLEGAL.** Once a rook moves, castling rights for that rook are irrevocably lost. |
| 9 | En Passant | White pawn advances `e2-e4`. Black has pawns on `d4` and `f4`. White's turn ends. Next move, Black plays `Nc6` (skips e.p.). Following move, White plays `a3`. Black now tries `dxe3`. | **Move is ILLEGAL.** En Passant right expires after exactly 1 ply. If not taken immediately, the target square is cleared (`-`). |
| 10 | En Passant | **The "Horizontal Pin" Trap**: White King on `e4`, Black Rook on `a4`, White pawn on `d4`, Black pawn on `c4`. Black plays `c7-c5`. White considers `dxc6 e.p.`. | **Move is ILLEGAL.** Removing both the moving pawn (`d4`) and captured pawn (`c5`) clears the 4th rank, exposing White King on `e4` to Black Rook on `a4`. Engine MUST verify check after removing BOTH pawns! |
| 11 | En Passant | Enemy pawn advances 1 square to `e3`, then on the next turn advances to `e4`. | **En Passant is ILLEGAL.** En Passant is triggered strictly by a single 2-square push from the initial rank. Consecutive single-square advances do not activate e.p. |
| 12 | Promotion | White pawn moves `e7-e8` without specifying a promotion piece type. | **Engine MUST REJECT.** A pawn move to rank 8/1 is syntactically incomplete without promotion selection (`'q' \| 'r' \| 'b' \| 'n'`). |
| 13 | Promotion | White player already has Queen on board. Pawn reaches 8th rank and chooses Queen. | **Move is LEGAL.** Underpromotion and multi-queen games (up to 9 Queens of one color) are 100% legal under FIDE rules. Promotion is never restricted to captured pieces. |
| 14 | Promotion | Pawn on `e7` captures enemy Rook on `f8` and simultaneously promotes to Knight giving check. | **Move is LEGAL.** Captures and promotion occur in a single atomic halfmove. New Knight immediately threatens enemy king. |
| 15 | Check & Pins | Black King on `e8`, White Queen on `e2`, Black Knight on `e7` (absolutely pinned to King). Black Queen on `d8`. Can White King move to `d6` if Black Knight "attacks" `d6`? | **White King CANNOT move to `d6`.** A pinned piece STILL attacks squares and prevents the opponent King from stepping into attack, even though the pinned piece cannot legally move there itself (FIDE Art. 3.9). |
| 16 | Double Check | White delivers check with Bishop on `c4` and discovered check with Rook on `e1` simultaneously. Black has Queen on `f6`. Black considers `Qxe1` or `Qd5` (blocking). | **Both are ILLEGAL. King MUST MOVE.** In a double check, no single piece can capture both checkers or block both lines of fire. The King is forced to make a legal move to an unattacked square. |
| 17 | Stalemate | Black King on `a8`, no other Black pieces. White King on `c7`, White Pawn on `a7`. Black's turn. Black King is not attacked, but has no legal moves (`b8` attacked by King `c7` and pawn `a7`). | **Game is a DRAW (Stalemate).** Black is not in check, zero legal moves exist. Game ends immediately. |
| 18 | Fifty-Move Rule | 99 halfmoves have elapsed without capture or pawn move. White plays `e3-e4` (pawn push). | **Halfmove clock RESETS to 0.** 50-move rule counter resets on ANY pawn push or piece capture. |
| 19 | Fifty-Move Rule | 100 halfmoves have elapsed without capture or pawn push, but the 100th halfmove is checkmate (`Qxf7#`). | **Checkmate TAKES PRECEDENCE.** Checkmate ends the game instantly on that ply before any draw claim or counter applies. |
| 20 | Insufficient Material | White has King + Bishop on light square (`c1`). Black has King + Bishop on dark square (`f8`). | **NOT automatic dead position under strict FIDE.** Helpmate is mathematically possible in a corner. However, if bishops are on the **SAME square color** (e.g. both light squares), it is a **MANDATORY immediate draw**. |
| 21 | Insufficient Material | White has King + 2 Knights. Black has lone King. | **Not a dead position under FIDE**, because a legal checkmate position exists (e.g. corner smothered helpmate), even though checkmate cannot be forced against optimal defense. Engine must not prematurely terminate unless agreed or 50 moves hit. |
| 22 | Threefold Repetition | Position occurs with White pawn on `e4`, Black pawn on `d4`, White just played `c2-c4` (e.p. target `c3` active). Position repeats 4 moves later with identical pieces, but `c3` is no longer an e.p. target. | **NOT identical positions.** FIDE Art. 9.2 states positions are identical ONLY IF the same potential en passant rights exist. Because e.p. was possible on occurrence 1 but impossible on occurrence 2, they do not match! |
| 23 | Threefold Repetition | Identical pieces on identical squares, but on occurrence 1 White could castle kingside, while on occurrence 2 White's rook had moved, destroying castling rights. | **NOT identical positions.** Differing castling availability makes the board states distinct for repetition counting. |

---

## 4. Mathematical Foundations & Board Representation

### 4.1 Board Indexing: The 0..63 Mailbox Grid

A standard chess board consists of 64 squares arranged in an 8x8 grid.
- **Files**: columns designated `a` through `h` (mapped to integers `0..7`).
- **Ranks**: rows designated `1` through `8` (mapped to integers `0..7`).

#### Recommended Coordinate Standard (File-Major Rank-Ascending):
To guarantee zero confusion between algebraic strings, 2D matrix indices, and 1D arrays:
```ts
// Square index: 0 = a1, 7 = h1, 56 = a8, 63 = h8
// Formula: index = (rank * 8) + file
// file = index % 8
// rank = Math.floor(index / 8)
```
- Square `0` = `a1` (White's queenside rook corner)
- Square `7` = `h1` (White's kingside rook corner)
- Square `56` = `a8` (Black's queenside rook corner)
- Square `63` = `h8` (Black's kingside rook corner)

#### Algebraic Conversion Formulas:
```ts
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

export function squareToAlgebraic(index: number): string {
  if (index < 0 || index > 63) throw new RangeError(`Invalid square index: ${index}`);
  const file = index % 8;
  const rank = Math.floor(index / 8);
  return `${FILES[file]}${RANKS[rank]}`;
}

export function algebraicToSquare(sq: string): number {
  if (!/^[a-h][1-8]$/.test(sq)) throw new Error(`Invalid algebraic square: ${sq}`);
  const file = sq.charCodeAt(0) - 97; // 'a' -> 0
  const rank = sq.charCodeAt(1) - 49; // '1' -> 0
  return rank * 8 + file;
}
```

#### Square Color Parity:
In FIDE chess, square `a1` (index 0, file 0, rank 0) is a **dark square**, and square `h1` (index 7, file 7, rank 0) is a **light square** ("white on right").
```ts
export function getSquareColor(index: number): 'light' | 'dark' {
  const file = index % 8;
  const rank = Math.floor(index / 8);
  // (0 + 0) % 2 === 0 -> dark
  // (1 + 0) % 2 === 1 -> light
  return (file + rank) % 2 === 0 ? 'dark' : 'light';
}
```

### 4.2 Directional Ray Vectors & Offsets

Using the `index = rank * 8 + file` mapping, directional steps correspond to exact integer deltas:

| Direction | Delta | File Delta ($\Delta f$) | Rank Delta ($\Delta r$) |
|---|---|---|---|
| **North** (Towards Rank 8) | `+8` | `0` | `+1` |
| **South** (Towards Rank 1) | `-8` | `0` | `-1` |
| **East** (Towards File h) | `+1` | `+1` | `0` |
| **West** (Towards File a) | `-1` | `-1` | `0` |
| **North-East** | `+9` | `+1` | `+1` |
| **North-West** | `+7` | `-1` | `+1` |
| **South-East** | `-7` | `+1` | `-1` |
| **South-West** | `-9` | `-1` | `-1` |

#### Knight Leap Offsets:
Knights move in 8 L-shapes:
```ts
const KNIGHT_OFFSETS = [
  { delta: +17, df: +1, dr: +2 },
  { delta: +15, df: -1, dr: +2 },
  { delta: +10, df: +2, dr: +1 },
  { delta: +6,  df: -2, dr: +1 },
  { delta: -6,  df: +2, dr: -1 },
  { delta: -10, df: -2, dr: -1 },
  { delta: -15, df: +1, dr: -2 },
  { delta: -17, df: -1, dr: -2 },
];
```
*Crucial Boundary Guard*: When applying a delta, the engine must verify that `(sq % 8) + df` remains within `[0..7]` and `Math.floor(sq / 8) + dr` remains within `[0..7]` to prevent board wrapping (e.g. jumping from file `h` to file `a` on the rank above).

---

## 5. Piece Move Generation & Validation Specifications

### 5.1 Pawn Mechanics
- **Direction**: White moves $+8$ (Rank +1); Black moves $-8$ (Rank -1).
- **Start Rank**: White pawn on Rank 1 (indices 8..15); Black pawn on Rank 6 (indices 48..55).
- **Single Push**:
  - Destination: `sq + forwardDelta`.
  - Condition: Destination square must be empty (`board[target] === null`).
- **Double Push**:
  - Allowed only if pawn is on its starting rank.
  - Intermediate square `sq + forwardDelta` AND target square `sq + 2 * forwardDelta` must BOTH be empty.
  - When executed, sets `enPassantTargetSquare = sq + forwardDelta`.
- **Diagonal Captures**:
  - Offsets: White: `+7` (North-West) and `+9` (North-East); Black: `-9` (South-West) and `-7` (South-East).
  - Condition: Target square must be occupied by an enemy piece OR match `enPassantTargetSquare`.
- **Promotion Trigger**:
  - White pawn reaching Rank 7 (indices 56..63); Black pawn reaching Rank 0 (indices 0..7).
  - Any push or capture reaching this rank produces 4 legal moves: Queen (`'q'`), Rook (`'r'`), Bishop (`'b'`), Knight (`'n'`).

### 5.2 Knight Mechanics
- Non-sliding jumper.
- For each of the 8 knight offsets:
  - Check boundary condition: `0 <= file + df <= 7` and `0 <= rank + dr <= 7`.
  - Target square must be empty OR occupied by an opponent piece.

### 5.3 Bishop, Rook, & Queen Mechanics (Ray Sliders)
- **Rook**: 4 orthogonal rays (`[+8, -8, +1, -1]`).
- **Bishop**: 4 diagonal rays (`[+9, +7, -7, -9]`).
- **Queen**: 8 rays (all 4 orthogonal + 4 diagonal).
- **Ray-Casting Algorithm**:
  1. From `currentSquare`, step along vector `(df, dr)`.
  2. While within board bounds `[0..7] x [0..7]`:
     - If square is empty: add to candidate moves; continue ray.
     - If square contains enemy piece: add to candidate moves (capture); **terminate ray**.
     - If square contains friendly piece: **terminate ray** (do not add).

### 5.4 King Mechanics
- 1 step along any of the 8 directions (`[+8, -8, +1, -1, +9, +7, -7, -9]`).
- Target square must be within bounds and NOT occupied by a friendly piece.
- Special move: Castling (evaluated separately).

---

## 6. Special Moves: Invariants & Execution Details

### 6.1 Castling Specification

Castling is an atomic dual-piece move involving the King and one Rook of the same color.

#### Squares & Coordinates:
| Castling Type | Color | King Start | King End | Rook Start | Rook End | Empty Squares Required | Squares Checked for Attack |
|---|---|---|---|---|---|---|---|
| **Kingside (O-O)** | White | `e1` (4) | `g1` (6) | `h1` (7) | `f1` (5) | `f1` (5), `g1` (6) | `e1` (4), `f1` (5), `g1` (6) |
| **Queenside (O-O-O)** | White | `e1` (4) | `c1` (2) | `a1` (0) | `d1` (3) | `b1` (1), `c1` (2), `d1` (3) | `e1` (4), `d1` (3), `c1` (2) |
| **Kingside (O-O)** | Black | `e8` (60) | `g8` (62) | `h8` (63) | `f8` (61) | `f8` (61), `g8` (62) | `e8` (60), `f8` (61), `g8` (62) |
| **Queenside (O-O-O)** | Black | `e8` (60) | `c8` (58) | `a8` (56) | `d8` (59) | `b8` (57), `c8` (58), `d8` (59) | `e8` (60), `d8` (59), `c8` (58) |

#### Castling Invariant Validation Checklist:
1. **Rights Check**: Active player retains the corresponding boolean flag in `castlingRights`:
   - White Kingside: `castlingRights.w.k === true`
   - White Queenside: `castlingRights.w.q === true`
   - Black Kingside: `castlingRights.b.k === true`
   - Black Queenside: `castlingRights.b.q === true`
2. **Current Check**: King must not currently be in check (`isSquareAttacked(kingStart, enemyColor) === false`).
3. **Transit Check**: King's path square must not be under attack:
   - For White Kingside: `f1` not attacked.
   - For White Queenside: `d1` not attacked.
   - For Black Kingside: `f8` not attacked.
   - For Black Queenside: `d8` not attacked.
4. **Destination Check**: King's landing square must not be under attack (`g1`, `c1`, `g8`, or `c8`).
5. **Clear Corridor**: All squares between King and Rook must be empty (`board[sq] === null`):
   - Kingside requires 2 empty squares (`f1, g1` or `f8, g8`).
   - Queenside requires 3 empty squares (`b1, c1, d1` or `b8, c8, d8`).
   *Note: Square `b1` / `b8` does NOT need to be unattacked; it only needs to be empty.*

#### Updating Castling Rights on Non-Castling Moves:
- If King moves from initial square: active color loses **both** kingside and queenside castling rights immediately.
- If Rook moves from `a1`: White loses `w.q`.
- If Rook moves from `h1`: White loses `w.k`.
- If Rook moves from `a8`: Black loses `b.q`.
- If Rook moves from `h8`: Black loses `b.k`.
- If a piece is **captured** on `a1`, `h1`, `a8`, or `h8`: that square's castling right is permanently revoked.

### 6.2 En Passant Specification

En Passant resolves the asymmetry created by the pawn's initial double push.

#### Mechanics:
1. **Trigger**: When pawn of color $C$ moves from starting rank by $+16$ (White) or $-16$ (Black), the target square crossed is `from + 8` (White) or `from - 8` (Black).
2. **Recording**: State updates `enPassantTargetSquare = crossedSquare`.
3. **Expiration**: If the opponent does not execute an en passant capture on the very next halfmove, `enPassantTargetSquare` resets to `null`.
4. **Capture Execution**:
   - Capturing pawn moves from its current square diagonally to `enPassantTargetSquare`.
   - The captured pawn is located at `(enPassantTargetSquare - forwardDelta)`.
   - The captured pawn is removed from the board; capturing pawn occupies `enPassantTargetSquare`.
5. **Horizontal Pin Safety Guard**:
   - Removing both pawns can open a horizontal ray between an enemy Rook/Queen and the friendly King.
   - Candidate e.p. move must be validated through standard legal filtering to ensure the King is not exposed.

### 6.3 Pawn Promotion Specification

#### Mechanics:
1. **Trigger**: Any pawn advance to Rank 7 (index 56..63 for White) or Rank 0 (index 0..7 for Black).
2. **Piece Options**: Must be exactly one of `'q'` (Queen), `'r'` (Rook), `'b'` (Bishop), or `'n'` (Knight).
3. **Atomic Replacement**: On execution, the pawn is removed and the designated piece of the same color is instantiated on the destination square.
4. **Audio/UI Event**: UI displays promotion selector; move completes only when selection is confirmed.

---

## 7. Check Detection, King Safety, & Legal Move Filtering

### 7.1 Square Attack Detection Algorithm

To test if square $S$ is attacked by color $C_{att}$:
```ts
export function isSquareAttacked(
  board: (Piece | null)[],
  targetSquare: number,
  attackerColor: Color
): boolean {
  const targetFile = targetSquare % 8;
  const targetRank = Math.floor(targetSquare / 8);

  // 1. Check Pawns
  // Attacking white pawns come from south (-1 rank, +-1 file); Black pawns from north (+1 rank, +-1 file)
  const pawnRank = attackerColor === 'w' ? targetRank - 1 : targetRank + 1;
  if (pawnRank >= 0 && pawnRank <= 7) {
    for (const df of [-1, 1]) {
      const pf = targetFile + df;
      if (pf >= 0 && pf <= 7) {
        const piece = board[pawnRank * 8 + pf];
        if (piece && piece.color === attackerColor && piece.type === 'p') {
          return true;
        }
      }
    }
  }

  // 2. Check Knights
  for (const { df, dr } of KNIGHT_OFFSETS) {
    const kf = targetFile + df;
    const kr = targetRank + dr;
    if (kf >= 0 && kf <= 7 && kr >= 0 && kr <= 7) {
      const piece = board[kr * 8 + kf];
      if (piece && piece.color === attackerColor && piece.type === 'n') {
        return true;
      }
    }
  }

  // 3. Check Orthogonal Rays (Rook, Queen)
  for (const [df, dr] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    let f = targetFile + df;
    let r = targetRank + dr;
    while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      const piece = board[r * 8 + f];
      if (piece) {
        if (piece.color === attackerColor && (piece.type === 'r' || piece.type === 'q')) {
          return true;
        }
        break; // Ray blocked
      }
      f += df;
      r += dr;
    }
  }

  // 4. Check Diagonal Rays (Bishop, Queen)
  for (const [df, dr] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    let f = targetFile + df;
    let r = targetRank + dr;
    while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      const piece = board[r * 8 + f];
      if (piece) {
        if (piece.color === attackerColor && (piece.type === 'b' || piece.type === 'q')) {
          return true;
        }
        break; // Ray blocked
      }
      f += df;
      r += dr;
    }
  }

  // 5. Check Adjacent King
  for (const [df, dr] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]]) {
    const kf = targetFile + df;
    const kr = targetRank + dr;
    if (kf >= 0 && kf <= 7 && kr >= 0 && kr <= 7) {
      const piece = board[kr * 8 + kf];
      if (piece && piece.color === attackerColor && piece.type === 'k') {
        return true;
      }
    }
  }

  return false;
}
```

### 7.2 Legal Move Filtering Pipeline

Move generation follows a robust 2-phase architecture:
1. **Pseudo-Legal Generation**: Fast iteration over all friendly pieces generating geometrically permissible moves according to board state, including potential special moves.
2. **King Safety Filtering**:
   - For each pseudo-legal move $M$:
     - Apply move $M$ to a clone or lightweight simulator of `board`.
     - Locate friendly King square after move.
     - Call `isSquareAttacked(kingSq, opponentColor)`.
     - If attacked: discard move (illegal).
     - If unattacked: accept move into `legalMoves`.

---

## 8. Terminal Conditions & Draw Rules

The engine calculates game status after every move using the following decision tree:

```
[Move Executed]
       │
       ▼
Is Active King in Check?
  ├── YES:
  │     └── Are Legal Moves Available?
  │           ├── NO  ──► CHECKMATE (Opponent Wins)
  │           └── YES ──► ACTIVE PLAY (In Check)
  └── NO:
        ├── Are Legal Moves Available?
        │     └── NO  ──► STALEMATE (Draw)
        ├── Is Halfmove Clock >= 100?
        │     └── YES ──► FIFTY-MOVE RULE DRAW
        ├── Has Position Repeated >= 3 Times?
        │     └── YES ──► THREEFOLD REPETITION DRAW
        ├── Is Material Insufficient to Mate?
        │     └── YES ──► INSUFFICIENT MATERIAL DRAW
        └── YES ──► ACTIVE PLAY (Normal)
```

### 8.1 Checkmate vs Stalemate
- **Checkmate**: Active player is in check AND has 0 legal moves. Winner is the player who just moved.
- **Stalemate**: Active player is NOT in check AND has 0 legal moves. Game is drawn.

### 8.2 Fifty-Move Rule (FIDE Art. 9.3)
- `halfmoveClock` increments on every halfmove that is neither a pawn push nor a capture.
- `halfmoveClock` resets to `0` whenever:
  1. A pawn moves (including promotions and double pushes).
  2. Any piece is captured (including en passant).
- When `halfmoveClock >= 100` (50 full moves), game triggers a draw.

### 8.3 Threefold Repetition (FIDE Art. 9.2)
- Engine tracks a dictionary of position hashes: `Map<string, number>`.
- **Position Hash Key Specification**:
  ```
  HashKey = `${PiecePlacementFEN} ${ActiveColor} ${CastlingRightsString} ${EnPassantTargetSquare}`
  ```
  *(Halfmove and fullmove counters are omitted from the repetition key per FIDE Art. 9.2).*
- If `positionMap.get(hashKey) >= 3`, game is declared a draw.

### 8.4 Insufficient Material (Dead Positions, FIDE Art. 9.6)
Material is evaluated whenever no pawns, rooks, or queens remain on the board:
1. **K vs K**: Both players have only a King. -> **Draw**.
2. **K+B vs K**: King and Bishop vs lone King. -> **Draw**.
3. **K+N vs K**: King and Knight vs lone King. -> **Draw**.
4. **K+B vs K+B (Same Color)**: Both players have King and one Bishop, and both bishops reside on squares of identical color (`getSquareColor(b1) === getSquareColor(b2)`). -> **Draw**.
*Note: Opposite-color bishops can legally reach corner helpmates, so under strict FIDE rules they are not immediate dead positions.*

---

## 9. Pure TypeScript Engine Architecture

### 9.1 Recommended Directory Structure

```
src/games/chess/
├── types.ts              # Core domain types & interfaces
├── constants.ts          # Board offsets, initial FEN, piece values
├── fen.ts                # FEN parser, validator, and serializer
├── square.ts             # Square index, algebraic notation, color parity
├── moves.ts              # Move generator (pseudo-legal & legal), attack maps
├── state.ts              # State transitions, immutable clone, make/undo
├── san.ts                # Standard Algebraic Notation parser & serializer
├── evaluation.ts         # Material & positional evaluation for AI bots
├── bot.ts                # Casual, Blitz, Grandmaster bot engine
└── ChessEngine.ts        # Main orchestrator facade class
```

### 9.2 Data Models & TypeScript Types (`types.ts`)

```ts
export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface Piece {
  color: Color;
  type: PieceType;
}

export type Square = number; // 0..63

export interface CastlingRights {
  w: { k: boolean; q: boolean };
  b: { k: boolean; q: boolean };
}

export interface Move {
  from: Square;
  to: Square;
  piece: Piece;
  captured?: Piece;
  promotion?: 'q' | 'r' | 'b' | 'n';
  isCastling?: 'kingside' | 'queenside';
  isEnPassant?: boolean;
  san?: string;
}

export type GameStatus =
  | 'active'
  | 'in_check'
  | 'checkmate'
  | 'stalemate'
  | 'fifty_move_rule'
  | 'threefold_repetition'
  | 'insufficient_material'
  | 'resigned'
  | 'timeout';

export interface HistoryEntry {
  move: Move;
  previousCastlingRights: CastlingRights;
  previousEnPassantTarget: Square | null;
  previousHalfmoveClock: number;
  previousFullmoveNumber: number;
  positionHash: string;
}

export interface ChessState {
  board: (Piece | null)[];
  activeColor: Color;
  castlingRights: CastlingRights;
  enPassantTarget: Square | null;
  halfmoveClock: number;
  fullmoveNumber: number;
  history: HistoryEntry[];
  redoStack: Move[];
  status: GameStatus;
  winner: Color | 'draw' | null;
  positionCounts: Record<string, number>;
}
```

### 9.3 Immutable State Transition Implementation (`state.ts`)

```ts
export function makeMove(state: ChessState, move: Move): ChessState {
  const newBoard = [...state.board];
  const captured = move.captured || newBoard[move.to];
  
  // 1. Record History Entry for O(1) Undo
  const historyEntry: HistoryEntry = {
    move,
    previousCastlingRights: {
      w: { ...state.castlingRights.w },
      b: { ...state.castlingRights.b }
    },
    previousEnPassantTarget: state.enPassantTarget,
    previousHalfmoveClock: state.halfmoveClock,
    previousFullmoveNumber: state.fullmoveNumber,
    positionHash: getPositionHash(state)
  };

  // 2. Relocate Moving Piece
  newBoard[move.to] = move.promotion 
    ? { color: move.piece.color, type: move.promotion }
    : move.piece;
  newBoard[move.from] = null;

  // 3. Handle Special Move Side-Effects
  // A. Castling: move accompanying Rook
  if (move.isCastling === 'kingside') {
    if (move.piece.color === 'w') {
      newBoard[5] = newBoard[7]; // h1 -> f1
      newBoard[7] = null;
    } else {
      newBoard[61] = newBoard[63]; // h8 -> f8
      newBoard[63] = null;
    }
  } else if (move.isCastling === 'queenside') {
    if (move.piece.color === 'w') {
      newBoard[3] = newBoard[0]; // a1 -> d1
      newBoard[0] = null;
    } else {
      newBoard[59] = newBoard[56]; // a8 -> d8
      newBoard[56] = null;
    }
  }

  // B. En Passant: remove captured pawn from crossed square's rank
  if (move.isEnPassant) {
    const capturedPawnSquare = move.piece.color === 'w' ? move.to - 8 : move.to + 8;
    newBoard[capturedPawnSquare] = null;
  }

  // 4. Update Castling Rights
  const nextCastling = {
    w: { ...state.castlingRights.w },
    b: { ...state.castlingRights.b }
  };
  if (move.piece.type === 'k') {
    nextCastling[move.piece.color].k = false;
    nextCastling[move.piece.color].q = false;
  }
  if (move.from === 0 || move.to === 0) nextCastling.w.q = false;
  if (move.from === 7 || move.to === 7) nextCastling.w.k = false;
  if (move.from === 56 || move.to === 56) nextCastling.b.q = false;
  if (move.from === 63 || move.to === 63) nextCastling.b.k = false;

  // 5. Update En Passant Target
  let nextEnPassant: Square | null = null;
  if (move.piece.type === 'p' && Math.abs(move.to - move.from) === 16) {
    nextEnPassant = move.piece.color === 'w' ? move.from + 8 : move.from - 8;
  }

  // 6. Update Halfmove Clock
  const isPawnMove = move.piece.type === 'p';
  const isCapture = captured !== undefined && captured !== null;
  const nextHalfmoveClock = (isPawnMove || isCapture) ? 0 : state.halfmoveClock + 1;

  // 7. Update Fullmove Number
  const nextActiveColor: Color = state.activeColor === 'w' ? 'b' : 'w';
  const nextFullmove = state.activeColor === 'b' ? state.fullmoveNumber + 1 : state.fullmoveNumber;

  // 8. Construct Intermediate State to Evaluate Status
  const nextStateDraft: ChessState = {
    board: newBoard,
    activeColor: nextActiveColor,
    castlingRights: nextCastling,
    enPassantTarget: nextEnPassant,
    halfmoveClock: nextHalfmoveClock,
    fullmoveNumber: nextFullmove,
    history: [...state.history, historyEntry],
    redoStack: [], // Clearing redo stack on new move
    status: 'active',
    winner: null,
    positionCounts: { ...state.positionCounts }
  };

  // 9. Update Position Counter for Repetition
  const newHash = getPositionHash(nextStateDraft);
  nextStateDraft.positionCounts[newHash] = (nextStateDraft.positionCounts[newHash] || 0) + 1;

  // 10. Compute Status & Terminal Conditions
  return evaluateGameStatus(nextStateDraft);
}
```

### 9.4 Reversible Move Stack (Undo / Redo)

Because every move records the prior `castlingRights`, `enPassantTarget`, `halfmoveClock`, and `capturedPiece`, undo is an exact $O(1)$ inverse operation:

```ts
export function undoMove(state: ChessState): ChessState | null {
  if (state.history.length === 0) return null;
  
  const lastEntry = state.history[state.history.length - 1];
  const move = lastEntry.move;
  const newBoard = [...state.board];

  // 1. Revert Moving Piece
  newBoard[move.from] = move.piece;
  newBoard[move.to] = move.isEnPassant ? null : (move.captured || null);

  // 2. Revert Castling Rook
  if (move.isCastling === 'kingside') {
    if (move.piece.color === 'w') {
      newBoard[7] = newBoard[5];
      newBoard[5] = null;
    } else {
      newBoard[63] = newBoard[61];
      newBoard[61] = null;
    }
  } else if (move.isCastling === 'queenside') {
    if (move.piece.color === 'w') {
      newBoard[0] = newBoard[3];
      newBoard[3] = null;
    } else {
      newBoard[56] = newBoard[59];
      newBoard[59] = null;
    }
  }

  // 3. Revert En Passant Captured Pawn
  if (move.isEnPassant) {
    const enemyPawnSq = move.piece.color === 'w' ? move.to - 8 : move.to + 8;
    newBoard[enemyPawnSq] = {
      color: move.piece.color === 'w' ? 'b' : 'w',
      type: 'p'
    };
  }

  // 4. Decrement Position Counter
  const currentHash = getPositionHash(state);
  const nextCounts = { ...state.positionCounts };
  if (nextCounts[currentHash] > 1) {
    nextCounts[currentHash]--;
  } else {
    delete nextCounts[currentHash];
  }

  const restoredState: ChessState = {
    board: newBoard,
    activeColor: move.piece.color,
    castlingRights: lastEntry.previousCastlingRights,
    enPassantTarget: lastEntry.previousEnPassantTarget,
    halfmoveClock: lastEntry.previousHalfmoveClock,
    fullmoveNumber: lastEntry.previousFullmoveNumber,
    history: state.history.slice(0, -1),
    redoStack: [move, ...state.redoStack],
    status: 'active',
    winner: null,
    positionCounts: nextCounts
  };

  return evaluateGameStatus(restoredState);
}
```

### 9.5 FEN (Forsyth-Edwards Notation) Import & Export

#### Canonical Parser Implementation:
```ts
export const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function parseFEN(fen: string): ChessState {
  const parts = fen.trim().split(/\s+/);
  if (parts.length !== 6) {
    throw new Error(`Invalid FEN string: expected 6 fields, got ${parts.length}`);
  }

  const [ranksStr, colorStr, castlingStr, epStr, halfmoveStr, fullmoveStr] = parts;

  // 1. Board Placement
  const board: (Piece | null)[] = new Array(64).fill(null);
  const ranks = ranksStr.split('/');
  if (ranks.length !== 8) throw new Error('Invalid FEN: must contain 8 ranks');

  // FEN lists ranks from 8 down to 1
  for (let r = 0; r < 8; r++) {
    const rankIndex = 7 - r; // rank 8 is index 7
    let file = 0;
    for (const char of ranks[r]) {
      if (file > 7) throw new Error(`Invalid FEN: rank ${8 - r} exceeds 8 squares`);
      if (/[1-8]/.test(char)) {
        file += parseInt(char, 10);
      } else {
        const color: Color = char === char.toUpperCase() ? 'w' : 'b';
        const type = char.toLowerCase() as PieceType;
        board[rankIndex * 8 + file] = { color, type };
        file++;
      }
    }
  }

  // 2. Active Color
  const activeColor: Color = colorStr === 'w' ? 'w' : 'b';

  // 3. Castling Rights
  const castlingRights: CastlingRights = {
    w: { k: castlingStr.includes('K'), q: castlingStr.includes('Q') },
    b: { k: castlingStr.includes('k'), q: castlingStr.includes('q') },
  };

  // 4. En Passant Target
  const enPassantTarget = epStr === '-' ? null : algebraicToSquare(epStr);

  // 5. Clocks
  const halfmoveClock = parseInt(halfmoveStr, 10) || 0;
  const fullmoveNumber = parseInt(fullmoveStr, 10) || 1;

  const state: ChessState = {
    board,
    activeColor,
    castlingRights,
    enPassantTarget,
    halfmoveClock,
    fullmoveNumber,
    history: [],
    redoStack: [],
    status: 'active',
    winner: null,
    positionCounts: {}
  };

  const hash = getPositionHash(state);
  state.positionCounts[hash] = 1;
  return evaluateGameStatus(state);
}

export function toFEN(state: ChessState): string {
  const ranks: string[] = [];
  for (let r = 7; r >= 0; r--) {
    let emptyCount = 0;
    let rankStr = '';
    for (let f = 0; f < 8; f++) {
      const piece = state.board[r * 8 + f];
      if (!piece) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          rankStr += emptyCount;
          emptyCount = 0;
        }
        const char = piece.type;
        rankStr += piece.color === 'w' ? char.toUpperCase() : char;
      }
    }
    if (emptyCount > 0) rankStr += emptyCount;
    ranks.push(rankStr);
  }

  // Castling
  let castling = '';
  if (state.castlingRights.w.k) castling += 'K';
  if (state.castlingRights.w.q) castling += 'Q';
  if (state.castlingRights.b.k) castling += 'k';
  if (state.castlingRights.b.q) castling += 'q';
  if (castling === '') castling = '-';

  // En Passant
  const ep = state.enPassantTarget !== null ? squareToAlgebraic(state.enPassantTarget) : '-';

  return `${ranks.join('/')} ${state.activeColor} ${castling} ${ep} ${state.halfmoveClock} ${state.fullmoveNumber}`;
}
```

---

## 10. SAN (Standard Algebraic Notation) Formatting & Disambiguation

SAN is the human-readable standard required for the move history feed. FIDE Appendix C mandates disambiguation when two or more identical pieces can move to the same destination square:

1. **Pawn Move**:
   - Non-capture: destination square (e.g. `e4`).
   - Capture: origin file + `x` + destination square (e.g. `exd5`).
   - Promotion: append `=Q`, `=R`, `=B`, or `=N` (e.g. `e8=Q` or `exd8=N`).
2. **Piece Move**:
   - Piece letter uppercase (`N`, `B`, `R`, `Q`, `K`).
   - Disambiguation (if multiple friendly pieces of the same type can legally move to destination):
     * If originating files differ: append originating **file** (e.g. `Rad1`).
     * If originating files match but ranks differ: append originating **rank** (e.g. `R1d2`).
     * If both file and rank differ across 3+ pieces (rare multi-queen scenarios): append **full square** (e.g. `Qh4e1`).
   - Capture: insert `x` between piece/disambiguation and destination (e.g. `Nxd5`, `Raxd1`).
3. **Castling**:
   - Kingside: `O-O`
   - Queenside: `O-O-O`
4. **Suffixes**:
   - If move delivers Check: append `+`.
   - If move delivers Checkmate: append `#`.

---

## 11. Test Suites & Verification Scenarios Matrix

To assure 100% compliance, the automated test suite (`src/games/chess/__tests__/engine.test.ts`) must execute the following 20 canonical FIDE test suites:

| Test ID | Test Category | Initial FEN / Setup | Action / Move | Expected Verification |
|---|---|---|---|---|
| **T01** | Initial State | `DEFAULT_FEN` | Inspect legal moves count | Exactly 20 legal moves (16 pawn pushes + 4 knight hops). |
| **T02** | Pawn Push | `DEFAULT_FEN` | `e2-e4` | White pawn on e4, e2 empty, active 'b', ep target 'e3', halfmove 0. |
| **T03** | Kingside Castling | `r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4` | `e1-g1` (O-O) | King on g1, Rook on f1, castling rights `w.k=false, w.q=false`. |
| **T04** | Queenside Castling | `r3k2r/pppq1ppp/2npbn2/2b1p3/2B1P3/2NPBN2/PPPQ1PPP/R3K2R w KQkq - 6 6` | `e1-c1` (O-O-O) | King on c1, Rook on d1, castling rights `w.k=false, w.q=false`. |
| **T05** | Through-Check Castling Block | `4k3/8/8/8/4b3/8/8/R3K2R w KQ - 0 1` (Bishop on e4 attacks f1) | Attempt `e1-g1` | Move must NOT be in `legalMoves`. (King traverses f1 which is in check). |
| **T06** | Into-Check Castling Block | `4k3/8/8/8/3b4/8/8/R3K2R w KQ - 0 1` (Bishop on d4 attacks g1) | Attempt `e1-g1` | Move must NOT be in `legalMoves`. (King lands on g1 which is in check). |
| **T07** | Attacked Rook Castling Allowed | `4k3/8/8/8/7b/8/8/R3K2R w KQ - 0 1` (Bishop on h4 attacks a1 rook) | Attempt `e1-c1` | Move MUST be legal. (Attack on Rook does not prevent castling). |
| **T08** | En Passant Success | `4k3/8/8/3Pp3/8/8/8/4K3 w - e6 0 1` | `d5-e6` | Pawn on e6, enemy pawn on e5 removed, active 'b'. |
| **T09** | En Passant 1-Ply Expiry | White `e2-e4`, Black `a7-a6`, White `d2-d4` | Next turn Black attempts `d4xe3` | Target square cleared; e.p. move rejected as illegal. |
| **T10** | En Passant Horizontal Pin | `k6r/8/8/3Pp2K/8/8/8/8 w - e6 0 1` (Black rook on h5 attacks King on h5 if d5 & e5 vanish) | Attempt `d5-e6` e.p. | Move must be rejected as ILLEGAL because king is exposed horizontally. |
| **T11** | Pawn Promotion Selection | `4k3/4P3/8/8/8/8/8/4K3 w - - 0 1` | `e7-e8` with `promotion: 'q'` | Piece on e8 is Queen; move with `promotion: 'n'` creates Knight. |
| **T12** | Absolute Pin Restriction | `4k3/8/8/8/8/4r3/4B3/4K3 w - - 0 1` (Bishop on e2 pinned by Rook e3) | Attempt Bishop moves | Bishop CANNOT move to d3/f3/c4 (would expose King). May only move along e-file if friendly. |
| **T13** | Pinned Piece Defends Square | `4k3/8/8/8/4b3/8/4K3/4Q3 w - - 0 1` (Black Bishop on e4 pinned to King e8) | Can White King capture e4? | White King CANNOT step to e4; pinned bishop still defends/attacks square. |
| **T14** | Fool's Mate (2-move Checkmate) | 1. `f3 e5` 2. `g4 Qh4#` | Inspect `status` | `status === 'checkmate'`, `winner === 'b'`. |
| **T15** | Scholar's Mate Checkmate | 1. `e4 e5` 2. `Bc4 Nc6` 3. `Qh5 Nf6` 4. `Qxf7#` | Inspect `status` | `status === 'checkmate'`, `winner === 'w'`. |
| **T16** | Stalemate Detection | `7k/5Q2/6K1/8/8/8/8/8 b - - 0 1` | Black's turn, inspect status | `legalMoves.length === 0`, `inCheck === false`, `status === 'stalemate'`. |
| **T17** | 50-Move Rule Trigger | Position with `halfmoveClock: 99`, no pawn move | Non-capture move executed | `halfmoveClock` reaches 100, `status === 'fifty_move_rule'`. |
| **T18** | Threefold Repetition Trigger | Repetition sequence (e.g. `Nf3 Nf6 Ng1 Ng8 Nf3 Nf6 Ng1 Ng8`) | 3rd identical state reached | `status === 'threefold_repetition'`. |
| **T19** | Insufficient Material (K vs K) | `4k3/8/8/8/8/8/8/4K3 w - - 0 1` | Evaluate status | `status === 'insufficient_material'`, `winner === 'draw'`. |
| **T20** | Insufficient Material (KB vs KB same color) | White King e1, Bishop c1 (dark); Black King e8, Bishop f8 (dark) | Evaluate status | Both bishops on dark squares -> `status === 'insufficient_material'`. |

---

## 12. Conclusion & Next Steps for Teamwork

This specification provides the full deterministic foundation for the Viper Chess implementation:
1. **Engine Implementation Team**: Implement the pure TypeScript modules according to Section 9 (`types.ts`, `square.ts`, `moves.ts`, `state.ts`, `fen.ts`, `san.ts`).
2. **AI Team**: Implement evaluation heuristics in `evaluation.ts` (piece-square tables, mobility, king safety) and minimax/alpha-beta search in `bot.ts` without blocking the UI thread (using Web Workers or asynchronous time-slicing).
3. **UI Arena Team**: Wire the engine into `ChessArena.tsx` with drag-and-drop / click-to-move square mapping, reactive turn indicators, danger auras for King in check, and promotion modals.
