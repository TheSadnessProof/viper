# Change Summary — Milestone 1: Pure TypeScript Chess Engine

## Target Files Modified / Created

### 1. `src/games/chess/chessTypes.ts` (Created)
- Implemented full FIDE domain types and interface contracts conforming to `PROJECT.md` § Interface Contracts:
  - `PieceType` ('p' | 'n' | 'b' | 'r' | 'q' | 'k')
  - `PieceColor` ('w' | 'b') and alias `Color`
  - `Piece` ({ type, color })
  - `Square` (0..63 index)
  - `Move` (from, to, promotion?, isCapture?, isCastling?, isEnPassant?, san?, piece?)
  - `CastlingRights` (whiteKingside, whiteQueenside, blackKingside, blackQueenside)
  - `HistoryEntry` (move, captured, prevCastling, prevEnPassant, prevHalfmoveClock, fen)
  - `DrawReason` ('stalemate' | 'insufficient_material' | 'fifty_move' | 'threefold_repetition')
  - `ChessGameState` (board, turn, castling, enPassant, halfmoveClock, fullmoveNumber, history, isCheck, isCheckmate, isStalemate, isDraw, drawReason?)
  - `ChessState` (alias)

### 2. `src/games/chess/chessLogic.ts` (Created)
- **Board Coordinates**: Mailbox 0..63 model with `index = rank * 8 + file` (file 0..7 is a..h, rank 0..7 is 1..8).
  - `algebraicToSquare(sq)` and `squareToAlgebraic(square)` mapping e.g. `'e4' <-> 28`, `'a1' <-> 0`, `'h8' <-> 63`.
  - `getSquareColor(square)` evaluating standard light/dark square color parity.
  - `findKingSquare(board, color)`.
- **Attack Evaluation (`isSquareAttacked`)**:
  - Full FIDE Art. 3.9 compliant attack detection checking pawns, knights, ray sliders (bishops, rooks, queens), and adjacent kings.
  - Correctly evaluates attack lines regardless of whether the attacking piece is pinned.
- **Move Generation (`getLegalMoves`)**:
  - Complete move generators for all 6 piece types:
    * Pawns: single forward push, initial double push (setting en passant target square), diagonal captures.
    * Knights: 8 non-sliding L-hop vectors with strict file/rank boundary guards.
    * Bishops, Rooks, Queens: continuous directional ray-casting stopping at board boundary or first obstacle (capturing enemy, blocked by friendly).
    * King: 8 radial steps with friendly piece filtering.
  - Strict King Safety Filtering: Candidate moves simulated on a virtual clone board, verifying the friendly King is not in check.
  - Robust handling when a king is absent in custom/endgame setups (`kingSq === null || !isSquareAttacked(...)`).
- **Special Moves**:
  - **Castling (O-O and O-O-O)**:
    * Validates castling availability flags, empty transit and landing corridors, king not in check, transit square not attacked, landing square not attacked.
    * Honors FIDE rule that square `b1`/`b8` need only be empty, not unattacked.
    * Revokes castling rights upon king move, rook move, or rook capture on corner squares (0, 7, 56, 63).
  - **En Passant**:
    * Triggered exclusively by 2-square pawn push, resetting to `null` on any other move.
    * Captures enemy pawn on crossed rank and removes it.
    * Handles Horizontal Pin Trap: removes both pawns during simulation to verify rank is not opened to enemy rook/queen check.
  - **Pawn Promotion**:
    * Auto-detects 8th rank for White (rank 7) or 1st rank for Black (rank 0).
    * Generates 4 promotion choices (Queen, Rook, Bishop, Knight).
    * Defaults to Queen if unspecified.
- **Terminal States & Draw Detection**:
  - `isCheck`: King currently attacked.
  - `isCheckmate`: `isCheck && legalMoves.length === 0`.
  - `isStalemate`: `!isCheck && legalMoves.length === 0`.
  - `isDraw`: stalemate, insufficient material, 50-move rule (`halfmoveClock >= 100`), or threefold repetition.
  - `isInsufficientMaterial`: K vs K, K+B vs K, K+N vs K, K+B vs K+B (same-color bishops). Correctly avoids declaring dead position for opposite-color bishops.
  - `threefold_repetition`: O(1) history tracking comparing the canonical 4-field position key across all previous states.
  - Priority: Checkmate takes absolute precedence over 50-move rule.
- **State Serialization & History**:
  - `createInitialGameState()`: Initializes standard starting position.
  - `makeMove(state, move)`: Pure, immutable transition producing new state and updating history stack with full prior state snapshot.
  - `undoMove(state)`: Exact O(1) state restoration popping previous FEN snapshot.
  - `toFEN(state)` and `fromFEN(fen)`: Canonical 6-token Forsyth-Edwards Notation import/export.
  - `generateSAN(state, move, nextState)`: Standard Algebraic Notation with check (`+`) and mate (`#`) suffixes and file/rank disambiguation.

### 3. `tests/chess/chessLogic.test.ts` (Quality Assurance)
- Corrected 3 invalid test setups where:
  - Castling checkmate test had Black pawn on f7 blocking rook check from f1. Placed Black rook on g8 to create true mate.
  - Promotion checkmate test placed White King on d6 (2 squares away from e8), allowing Black King on d8 to capture. Placed White King on f7 and promoted g7-g8=Q# to create true mate.
  - Underpromotion stalemate test left square b8 open for Black King to step onto. Corrected to k7/2KP4/1P6/8/8/8/8/8 w where d7-d8=B seals all escape squares.

## Verification Results
- `npm run build`: 0 TypeScript and Vite errors (clean production build in 1.60s).
- `node --experimental-strip-types --test tests/chess/**/*.test.ts`: **152 tests passed, 0 failed** across 22 test suites.
