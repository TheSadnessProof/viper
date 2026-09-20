import type {
  PieceType,
  PieceColor,
  Piece,
  Square,
  Move,
  CastlingRights,
  HistoryEntry,
  ChessGameState,
} from './chessTypes';

export type { DrawReason } from './chessTypes';

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

export const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const KNIGHT_OFFSETS = [
  { df: 1, dr: 2 },
  { df: -1, dr: 2 },
  { df: 2, dr: 1 },
  { df: -2, dr: 1 },
  { df: 2, dr: -1 },
  { df: -2, dr: -1 },
  { df: 1, dr: -2 },
  { df: -1, dr: -2 },
] as const;

const BISHOP_DIRS = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
] as const;

const ROOK_DIRS = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
] as const;

const ALL_8_DIRS = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
] as const;

/**
 * Converts algebraic coordinate (e.g. 'e4') to 0..63 mailbox index.
 * Formula: index = rank * 8 + file (file 0..7 is a..h, rank 0..7 is 1..8).
 */
export function algebraicToSquare(sq: string): Square {
  if (!sq || typeof sq !== 'string' || sq.length !== 2) {
    throw new Error(`Invalid algebraic square notation: "${sq}"`);
  }
  const file = sq.charCodeAt(0) - 97; // 'a' -> 0
  const rank = sq.charCodeAt(1) - 49; // '1' -> 0
  if (file < 0 || file > 7 || rank < 0 || rank > 7) {
    throw new Error(`Square out of bounds: "${sq}"`);
  }
  return rank * 8 + file;
}

/**
 * Converts 0..63 mailbox index to algebraic coordinate (e.g. 28 -> 'e4').
 */
export function squareToAlgebraic(square: Square): string {
  if (square < 0 || square > 63 || !Number.isInteger(square)) {
    throw new RangeError(`Invalid square index: ${square}`);
  }
  const file = square % 8;
  const rank = Math.floor(square / 8);
  return `${FILES[file]}${RANKS[rank]}`;
}

/**
 * Returns square color parity ('light' | 'dark').
 * a1 (0, 0) is dark, h1 (7, 0) is light.
 */
export function getSquareColor(square: Square): 'light' | 'dark' {
  const file = square % 8;
  const rank = Math.floor(square / 8);
  return (file + rank) % 2 === 0 ? 'dark' : 'light';
}

/**
 * Finds the king square of the given color on the board.
 */
export function findKingSquare(board: (Piece | null)[], color: PieceColor): Square | null {
  for (let sq = 0; sq < 64; sq++) {
    const piece = board[sq];
    if (piece && piece.type === 'k' && piece.color === color) {
      return sq;
    }
  }
  return null;
}

/**
 * Determines whether a target square is attacked by any piece of `byColor`.
 * Evaluates rays, knight hops, pawn attacks, and king adjacency.
 * Per FIDE Art 3.9, attacks count even if the attacking piece is pinned.
 */
export function isSquareAttacked(
  board: (Piece | null)[],
  square: Square,
  byColor: PieceColor
): boolean {
  const targetFile = square % 8;
  const targetRank = Math.floor(square / 8);

  // 1. Pawn attacks
  // Attacking White pawns originate from south (rank - 1); Black pawns from north (rank + 1)
  const pawnRank = byColor === 'w' ? targetRank - 1 : targetRank + 1;
  if (pawnRank >= 0 && pawnRank <= 7) {
    for (const df of [-1, 1]) {
      const pf = targetFile + df;
      if (pf >= 0 && pf <= 7) {
        const piece = board[pawnRank * 8 + pf];
        if (piece && piece.color === byColor && piece.type === 'p') {
          return true;
        }
      }
    }
  }

  // 2. Knight attacks
  for (const { df, dr } of KNIGHT_OFFSETS) {
    const kf = targetFile + df;
    const kr = targetRank + dr;
    if (kf >= 0 && kf <= 7 && kr >= 0 && kr <= 7) {
      const piece = board[kr * 8 + kf];
      if (piece && piece.color === byColor && piece.type === 'n') {
        return true;
      }
    }
  }

  // 3. Orthogonal rays (Rook & Queen)
  for (const [df, dr] of ROOK_DIRS) {
    let f = targetFile + df;
    let r = targetRank + dr;
    while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      const piece = board[r * 8 + f];
      if (piece) {
        if (piece.color === byColor && (piece.type === 'r' || piece.type === 'q')) {
          return true;
        }
        break; // Ray blocked
      }
      f += df;
      r += dr;
    }
  }

  // 4. Diagonal rays (Bishop & Queen)
  for (const [df, dr] of BISHOP_DIRS) {
    let f = targetFile + df;
    let r = targetRank + dr;
    while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      const piece = board[r * 8 + f];
      if (piece) {
        if (piece.color === byColor && (piece.type === 'b' || piece.type === 'q')) {
          return true;
        }
        break; // Ray blocked
      }
      f += df;
      r += dr;
    }
  }

  // 5. King adjacent attacks
  for (const [df, dr] of ALL_8_DIRS) {
    const kf = targetFile + df;
    const kr = targetRank + dr;
    if (kf >= 0 && kf <= 7 && kr >= 0 && kr <= 7) {
      const piece = board[kr * 8 + kf];
      if (piece && piece.color === byColor && piece.type === 'k') {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks whether the current board state has insufficient material for checkmate.
 * Evaluates:
 * - K vs K
 * - K+B vs K
 * - K+N vs K
 * - K+B vs K+B with bishops on the SAME color square.
 */
export function isInsufficientMaterial(board: (Piece | null)[]): boolean {
  let whitePieces: Piece[] = [];
  let blackPieces: Piece[] = [];
  let whiteBishops: Square[] = [];
  let blackBishops: Square[] = [];

  for (let sq = 0; sq < 64; sq++) {
    const piece = board[sq];
    if (!piece) continue;
    if (piece.type === 'p' || piece.type === 'r' || piece.type === 'q') {
      return false; // Pawns, rooks, queens can force checkmate
    }
    if (piece.color === 'w') {
      whitePieces.push(piece);
      if (piece.type === 'b') whiteBishops.push(sq);
    } else {
      blackPieces.push(piece);
      if (piece.type === 'b') blackBishops.push(sq);
    }
  }

  const whiteNonKing = whitePieces.filter(p => p.type !== 'k');
  const blackNonKing = blackPieces.filter(p => p.type !== 'k');

  // Case 1: K vs K
  if (whiteNonKing.length === 0 && blackNonKing.length === 0) {
    return true;
  }

  // Case 2: K+B vs K
  if (
    (whiteNonKing.length === 1 && whiteNonKing[0].type === 'b' && blackNonKing.length === 0) ||
    (blackNonKing.length === 1 && blackNonKing[0].type === 'b' && whiteNonKing.length === 0)
  ) {
    return true;
  }

  // Case 3: K+N vs K
  if (
    (whiteNonKing.length === 1 && whiteNonKing[0].type === 'n' && blackNonKing.length === 0) ||
    (blackNonKing.length === 1 && blackNonKing[0].type === 'n' && whiteNonKing.length === 0)
  ) {
    return true;
  }

  // Case 4: K+B vs K+B (same-colored bishops)
  if (
    whiteNonKing.length === 1 &&
    whiteNonKing[0].type === 'b' &&
    blackNonKing.length === 1 &&
    blackNonKing[0].type === 'b'
  ) {
    const whiteBishopColor = getSquareColor(whiteBishops[0]);
    const blackBishopColor = getSquareColor(blackBishops[0]);
    if (whiteBishopColor === blackBishopColor) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts the 4-part FIDE position key (placement, turn, castling, enPassant) from a FEN string.
 */
function getPositionKeyFromFEN(fen: string): string {
  const tokens = fen.trim().split(/\s+/);
  return tokens.slice(0, 4).join(' ');
}

/**
 * Checks if the current state has occurred 3 or more times throughout the game history.
 */
function checkThreefoldRepetition(state: ChessGameState): boolean {
  const currentKey = getPositionKeyFromFEN(toFEN(state));
  let count = 1; // Current state
  for (const entry of state.history) {
    if (getPositionKeyFromFEN(entry.fen) === currentKey) {
      count++;
      if (count >= 3) return true;
    }
  }
  return false;
}

/**
 * Generates pseudo-legal candidate moves without king-safety filtering.
 */
function generatePseudoLegalMoves(state: ChessGameState, fromSquare?: Square): Move[] {
  const moves: Move[] = [];
  const turn = state.turn;
  const board = state.board;

  const squaresToCheck: Square[] =
    fromSquare !== undefined
      ? [fromSquare]
      : Array.from({ length: 64 }, (_, i) => i);

  for (const from of squaresToCheck) {
    const piece = board[from];
    if (!piece || piece.color !== turn) continue;

    const f = from % 8;
    const r = Math.floor(from / 8);

    switch (piece.type) {
      case 'p': {
        const dir = turn === 'w' ? 1 : -1;
        const startRank = turn === 'w' ? 1 : 6;
        const promoRank = turn === 'w' ? 7 : 0;

        // Single push
        const targetRank = r + dir;
        if (targetRank >= 0 && targetRank <= 7) {
          const targetSq = targetRank * 8 + f;
          if (board[targetSq] === null) {
            if (targetRank === promoRank) {
              const promoTypes: PieceType[] = ['q', 'r', 'b', 'n'];
              for (const p of promoTypes) {
                moves.push({ from, to: targetSq, promotion: p, piece });
              }
            } else {
              moves.push({ from, to: targetSq, piece });

              // Double push from initial pawn rank
              if (r === startRank) {
                const doubleSq = (r + 2 * dir) * 8 + f;
                if (board[doubleSq] === null) {
                  moves.push({ from, to: doubleSq, piece });
                }
              }
            }
          }
        }

        // Diagonal captures
        for (const df of [-1, 1]) {
          const cf = f + df;
          const cr = r + dir;
          if (cf >= 0 && cf <= 7 && cr >= 0 && cr <= 7) {
            const targetSq = cr * 8 + cf;
            const targetPiece = board[targetSq];
            if (targetPiece && targetPiece.color !== turn) {
              if (cr === promoRank) {
                const promoTypes: PieceType[] = ['q', 'r', 'b', 'n'];
                for (const p of promoTypes) {
                  moves.push({ from, to: targetSq, promotion: p, isCapture: true, piece });
                }
              } else {
                moves.push({ from, to: targetSq, isCapture: true, piece });
              }
            } else if (state.enPassant !== null && targetSq === state.enPassant) {
              moves.push({ from, to: targetSq, isCapture: true, isEnPassant: true, piece });
            }
          }
        }
        break;
      }

      case 'n': {
        for (const { df, dr } of KNIGHT_OFFSETS) {
          const kf = f + df;
          const kr = r + dr;
          if (kf >= 0 && kf <= 7 && kr >= 0 && kr <= 7) {
            const targetSq = kr * 8 + kf;
            const targetPiece = board[targetSq];
            if (!targetPiece) {
              moves.push({ from, to: targetSq, piece });
            } else if (targetPiece.color !== turn) {
              moves.push({ from, to: targetSq, isCapture: true, piece });
            }
          }
        }
        break;
      }

      case 'b': {
        for (const [df, dr] of BISHOP_DIRS) {
          let bf = f + df;
          let br = r + dr;
          while (bf >= 0 && bf <= 7 && br >= 0 && br <= 7) {
            const targetSq = br * 8 + bf;
            const targetPiece = board[targetSq];
            if (!targetPiece) {
              moves.push({ from, to: targetSq, piece });
            } else {
              if (targetPiece.color !== turn) {
                moves.push({ from, to: targetSq, isCapture: true, piece });
              }
              break;
            }
            bf += df;
            br += dr;
          }
        }
        break;
      }

      case 'r': {
        for (const [df, dr] of ROOK_DIRS) {
          let rf = f + df;
          let rr = r + dr;
          while (rf >= 0 && rf <= 7 && rr >= 0 && rr <= 7) {
            const targetSq = rr * 8 + rf;
            const targetPiece = board[targetSq];
            if (!targetPiece) {
              moves.push({ from, to: targetSq, piece });
            } else {
              if (targetPiece.color !== turn) {
                moves.push({ from, to: targetSq, isCapture: true, piece });
              }
              break;
            }
            rf += df;
            rr += dr;
          }
        }
        break;
      }

      case 'q': {
        for (const [df, dr] of ALL_8_DIRS) {
          let qf = f + df;
          let qr = r + dr;
          while (qf >= 0 && qf <= 7 && qr >= 0 && qr <= 7) {
            const targetSq = qr * 8 + qf;
            const targetPiece = board[targetSq];
            if (!targetPiece) {
              moves.push({ from, to: targetSq, piece });
            } else {
              if (targetPiece.color !== turn) {
                moves.push({ from, to: targetSq, isCapture: true, piece });
              }
              break;
            }
            qf += df;
            qr += dr;
          }
        }
        break;
      }

      case 'k': {
        for (const [df, dr] of ALL_8_DIRS) {
          const kf = f + df;
          const kr = r + dr;
          if (kf >= 0 && kf <= 7 && kr >= 0 && kr <= 7) {
            const targetSq = kr * 8 + kf;
            const targetPiece = board[targetSq];
            if (!targetPiece) {
              moves.push({ from, to: targetSq, piece });
            } else if (targetPiece.color !== turn) {
              moves.push({ from, to: targetSq, isCapture: true, piece });
            }
          }
        }

        // Castling moves
        if (turn === 'w' && from === 4) {
          // White Kingside (e1-g1)
          if (
            state.castling.whiteKingside &&
            board[7]?.type === 'r' &&
            board[7]?.color === 'w' &&
            board[5] === null &&
            board[6] === null &&
            !isSquareAttacked(board, 4, 'b') &&
            !isSquareAttacked(board, 5, 'b') &&
            !isSquareAttacked(board, 6, 'b')
          ) {
            moves.push({ from: 4, to: 6, isCastling: true, piece });
          }

          // White Queenside (e1-c1)
          if (
            state.castling.whiteQueenside &&
            board[0]?.type === 'r' &&
            board[0]?.color === 'w' &&
            board[1] === null &&
            board[2] === null &&
            board[3] === null &&
            !isSquareAttacked(board, 4, 'b') &&
            !isSquareAttacked(board, 3, 'b') &&
            !isSquareAttacked(board, 2, 'b')
          ) {
            moves.push({ from: 4, to: 2, isCastling: true, piece });
          }
        } else if (turn === 'b' && from === 60) {
          // Black Kingside (e8-g8)
          if (
            state.castling.blackKingside &&
            board[63]?.type === 'r' &&
            board[63]?.color === 'b' &&
            board[61] === null &&
            board[62] === null &&
            !isSquareAttacked(board, 60, 'w') &&
            !isSquareAttacked(board, 61, 'w') &&
            !isSquareAttacked(board, 62, 'w')
          ) {
            moves.push({ from: 60, to: 62, isCastling: true, piece });
          }

          // Black Queenside (e8-c8)
          if (
            state.castling.blackQueenside &&
            board[56]?.type === 'r' &&
            board[56]?.color === 'b' &&
            board[57] === null &&
            board[58] === null &&
            board[59] === null &&
            !isSquareAttacked(board, 60, 'w') &&
            !isSquareAttacked(board, 59, 'w') &&
            !isSquareAttacked(board, 58, 'w')
          ) {
            moves.push({ from: 60, to: 58, isCastling: true, piece });
          }
        }
        break;
      }
    }
  }

  return moves;
}

/**
 * Returns all strictly legal moves for the active color, optionally filtered by `fromSquare`.
 * Moves are generated pseudo-legally and validated against king safety.
 */
export function getLegalMoves(state: ChessGameState, fromSquare?: Square): Move[] {
  if (fromSquare !== undefined) {
    const piece = state.board[fromSquare];
    if (!piece || piece.color !== state.turn) {
      return [];
    }
  }

  const pseudoMoves = generatePseudoLegalMoves(state, fromSquare);
  const legalMoves: Move[] = [];
  const turn = state.turn;
  const opponentColor: PieceColor = turn === 'w' ? 'b' : 'w';

  for (const move of pseudoMoves) {
    const cloneBoard = [...state.board];

    // Apply piece movement
    const movingPiece = move.piece || cloneBoard[move.from]!;
    cloneBoard[move.to] = move.promotion
      ? { color: turn, type: move.promotion }
      : movingPiece;
    cloneBoard[move.from] = null;

    // Side effect: En Passant
    if (move.isEnPassant) {
      const epCapturedSq = turn === 'w' ? move.to - 8 : move.to + 8;
      cloneBoard[epCapturedSq] = null;
    }

    // Side effect: Castling rook movement
    if (move.isCastling) {
      if (move.to === 6) {
        cloneBoard[5] = cloneBoard[7];
        cloneBoard[7] = null;
      } else if (move.to === 2) {
        cloneBoard[3] = cloneBoard[0];
        cloneBoard[0] = null;
      } else if (move.to === 62) {
        cloneBoard[61] = cloneBoard[63];
        cloneBoard[63] = null;
      } else if (move.to === 58) {
        cloneBoard[59] = cloneBoard[56];
        cloneBoard[56] = null;
      }
    }

    // Verify King safety
    const kingSq =
      movingPiece.type === 'k' ? move.to : findKingSquare(cloneBoard, turn);

    if (kingSq === null || !isSquareAttacked(cloneBoard, kingSq, opponentColor)) {
      legalMoves.push(move);
    }
  }

  return legalMoves;
}

/**
 * Generates Standard Algebraic Notation (SAN) for a legal move.
 */
export function generateSAN(
  state: ChessGameState,
  move: Move,
  nextState: ChessGameState
): string {
  const movingPiece = state.board[move.from];
  if (!movingPiece) return '';

  const isCastling =
    move.isCastling ||
    (movingPiece.type === 'k' && Math.abs((move.to % 8) - (move.from % 8)) === 2);

  let san = '';

  if (isCastling) {
    san = move.to % 8 === 6 ? 'O-O' : 'O-O-O';
  } else if (movingPiece.type === 'p') {
    const isCapture =
      move.isCapture ||
      state.board[move.to] !== null ||
      move.isEnPassant ||
      move.to === state.enPassant;
    if (isCapture) {
      san = `${FILES[move.from % 8]}x${squareToAlgebraic(move.to)}`;
    } else {
      san = squareToAlgebraic(move.to);
    }
    if (move.promotion) {
      san += `=${move.promotion.toUpperCase()}`;
    }
  } else {
    const pieceLetter = movingPiece.type.toUpperCase();
    const isCapture =
      move.isCapture || state.board[move.to] !== null;

    // Disambiguation
    const candidateMoves = getLegalMoves(state).filter(
      m =>
        m.from !== move.from &&
        m.to === move.to &&
        state.board[m.from]?.type === movingPiece.type
    );

    let disambig = '';
    if (candidateMoves.length > 0) {
      const sameFile = candidateMoves.some(m => m.from % 8 === move.from % 8);
      const sameRank = candidateMoves.some(
        m => Math.floor(m.from / 8) === Math.floor(move.from / 8)
      );

      if (!sameFile) {
        disambig = FILES[move.from % 8];
      } else if (!sameRank) {
        disambig = RANKS[Math.floor(move.from / 8)];
      } else {
        disambig = squareToAlgebraic(move.from);
      }
    }

    san = `${pieceLetter}${disambig}${isCapture ? 'x' : ''}${squareToAlgebraic(move.to)}`;
  }

  // Suffixes: check (+) or checkmate (#)
  if (nextState.isCheckmate) {
    san += '#';
  } else if (nextState.isCheck) {
    san += '+';
  }

  return san;
}

/**
 * Evaluates terminal states and draw conditions for a draft state.
 */
function evaluateGameStatus(state: ChessGameState): void {
  const opponentColor: PieceColor = state.turn === 'w' ? 'b' : 'w';
  const kingSq = findKingSquare(state.board, state.turn);

  state.isCheck = kingSq !== null && isSquareAttacked(state.board, kingSq, opponentColor);
  const legalMoves = getLegalMoves(state);

  if (legalMoves.length === 0) {
    if (state.isCheck) {
      state.isCheckmate = true;
      state.isStalemate = false;
      state.isDraw = false;
      state.drawReason = undefined;
    } else {
      state.isCheckmate = false;
      state.isStalemate = true;
      state.isDraw = true;
      state.drawReason = 'stalemate';
    }
    return;
  }

  state.isCheckmate = false;
  state.isStalemate = false;

  // Draw evaluation
  if (state.halfmoveClock >= 100) {
    state.isDraw = true;
    state.drawReason = 'fifty_move';
    return;
  }

  if (checkThreefoldRepetition(state)) {
    state.isDraw = true;
    state.drawReason = 'threefold_repetition';
    return;
  }

  if (isInsufficientMaterial(state.board)) {
    state.isDraw = true;
    state.drawReason = 'insufficient_material';
    return;
  }

  state.isDraw = false;
  state.drawReason = undefined;
}

/**
 * Creates an immutable new state resulting from executing `move`.
 */
export function makeMove(state: ChessGameState, move: Move): ChessGameState {
  const movingPiece = state.board[move.from];
  if (!movingPiece) {
    throw new Error(`No piece at source square ${squareToAlgebraic(move.from)}`);
  }
  if (movingPiece.color !== state.turn) {
    throw new Error(
      `Piece color ${movingPiece.color} does not match active turn ${state.turn}`
    );
  }

  const newBoard = [...state.board];
  const targetPiece = state.board[move.to];

  const isEnPassant =
    move.isEnPassant ||
    (movingPiece.type === 'p' &&
      move.to === state.enPassant &&
      move.from % 8 !== move.to % 8);

  const isCastling =
    move.isCastling ||
    (movingPiece.type === 'k' && Math.abs((move.to % 8) - (move.from % 8)) === 2);

  const isPromotionRank =
    movingPiece.type === 'p' &&
    (Math.floor(move.to / 8) === 7 || Math.floor(move.to / 8) === 0);

  const promotionType: PieceType | undefined = isPromotionRank
    ? move.promotion || 'q'
    : undefined;

  const enemyColor: PieceColor = state.turn === 'w' ? 'b' : 'w';
  const capturedPiece: Piece | null = isEnPassant
    ? { color: enemyColor, type: 'p' }
    : targetPiece;

  const isCapture = Boolean(targetPiece || isEnPassant || move.isCapture);

  // 1. Move piece
  newBoard[move.to] = isPromotionRank
    ? { color: movingPiece.color, type: promotionType! }
    : movingPiece;
  newBoard[move.from] = null;

  // 2. Handle Castling rook movement
  if (isCastling) {
    if (move.to === 6) {
      newBoard[5] = newBoard[7];
      newBoard[7] = null;
    } else if (move.to === 2) {
      newBoard[3] = newBoard[0];
      newBoard[0] = null;
    } else if (move.to === 62) {
      newBoard[61] = newBoard[63];
      newBoard[63] = null;
    } else if (move.to === 58) {
      newBoard[59] = newBoard[56];
      newBoard[56] = null;
    }
  }

  // 3. Handle En Passant capture removal
  if (isEnPassant) {
    const epCapturedSq = state.turn === 'w' ? move.to - 8 : move.to + 8;
    newBoard[epCapturedSq] = null;
  }

  // 4. Update Castling Rights
  const nextCastling: CastlingRights = { ...state.castling };
  if (movingPiece.type === 'k') {
    if (movingPiece.color === 'w') {
      nextCastling.whiteKingside = false;
      nextCastling.whiteQueenside = false;
    } else {
      nextCastling.blackKingside = false;
      nextCastling.blackQueenside = false;
    }
  }
  if (move.from === 0 || move.to === 0) nextCastling.whiteQueenside = false;
  if (move.from === 7 || move.to === 7) nextCastling.whiteKingside = false;
  if (move.from === 56 || move.to === 56) nextCastling.blackQueenside = false;
  if (move.from === 63 || move.to === 63) nextCastling.blackKingside = false;

  // 5. Update En Passant target
  let nextEnPassant: Square | null = null;
  if (movingPiece.type === 'p' && Math.abs(move.to - move.from) === 16) {
    nextEnPassant = state.turn === 'w' ? move.from + 8 : move.from - 8;
  }

  // 6. Update Halfmove Clock
  const isPawnMove = movingPiece.type === 'p';
  const nextHalfmoveClock = isPawnMove || isCapture ? 0 : state.halfmoveClock + 1;

  // 7. Update Turn and Fullmove Number
  const nextTurn: PieceColor = state.turn === 'w' ? 'b' : 'w';
  const nextFullmoveNumber =
    state.turn === 'b' ? state.fullmoveNumber + 1 : state.fullmoveNumber;

  // 8. Draft intermediate state to evaluate check & SAN
  const executedMove: Move = {
    from: move.from,
    to: move.to,
    promotion: promotionType,
    isCapture,
    isCastling,
    isEnPassant,
    piece: movingPiece,
  };

  const historyEntry: HistoryEntry = {
    move: executedMove,
    captured: capturedPiece,
    prevCastling: { ...state.castling },
    prevEnPassant: state.enPassant,
    prevHalfmoveClock: state.halfmoveClock,
    fen: toFEN(state),
  };

  const nextState: ChessGameState = {
    board: newBoard,
    turn: nextTurn,
    castling: nextCastling,
    enPassant: nextEnPassant,
    halfmoveClock: nextHalfmoveClock,
    fullmoveNumber: nextFullmoveNumber,
    history: [...state.history, historyEntry],
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isDraw: false,
    drawReason: undefined,
  };

  evaluateGameStatus(nextState);

  // Set SAN notation
  executedMove.san = generateSAN(state, executedMove, nextState);

  return nextState;
}

/**
 * Undoes the last move, returning the previous immutable state.
 */
export function undoMove(state: ChessGameState): ChessGameState {
  if (state.history.length === 0) {
    return state;
  }

  const lastEntry = state.history[state.history.length - 1];
  const prevState = fromFEN(lastEntry.fen);
  prevState.history = state.history.slice(0, -1);

  // Re-evaluate game status in case threefold repetition was affected
  evaluateGameStatus(prevState);

  return prevState;
}

/**
 * Exports current game state to a standard 6-field Forsyth-Edwards Notation string.
 */
export function toFEN(state: ChessGameState): string {
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
        rankStr += piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase();
      }
    }
    if (emptyCount > 0) {
      rankStr += emptyCount;
    }
    ranks.push(rankStr);
  }

  // Turn
  const turnStr = state.turn;

  // Castling
  let castlingStr = '';
  if (state.castling.whiteKingside) castlingStr += 'K';
  if (state.castling.whiteQueenside) castlingStr += 'Q';
  if (state.castling.blackKingside) castlingStr += 'k';
  if (state.castling.blackQueenside) castlingStr += 'q';
  if (castlingStr === '') castlingStr = '-';

  // En Passant
  const epStr = state.enPassant !== null ? squareToAlgebraic(state.enPassant) : '-';

  // Clocks
  const halfmoveStr = state.halfmoveClock.toString();
  const fullmoveStr = state.fullmoveNumber.toString();

  return `${ranks.join('/')} ${turnStr} ${castlingStr} ${epStr} ${halfmoveStr} ${fullmoveStr}`;
}

/**
 * Parses a standard Forsyth-Edwards Notation (FEN) string into a ChessGameState object.
 */
export function fromFEN(fen: string): ChessGameState {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4) {
    throw new Error(
      `Invalid FEN string: expected at least 4 fields, got ${parts.length}`
    );
  }

  const [ranksStr, turnStr, castlingStr, epStr] = parts;
  const halfmoveStr = parts[4] || '0';
  const fullmoveStr = parts[5] || '1';

  // 1. Board placement
  const board: (Piece | null)[] = new Array(64).fill(null);
  const ranks = ranksStr.split('/');
  if (ranks.length !== 8) {
    throw new Error(`Invalid FEN: must contain 8 ranks, got ${ranks.length}`);
  }

  for (let r = 0; r < 8; r++) {
    const rankIndex = 7 - r;
    let file = 0;
    for (const char of ranks[r]) {
      if (char >= '1' && char <= '8') {
        file += parseInt(char, 10);
        if (file > 8) {
          throw new Error(`Invalid FEN: rank exceeds 8 squares`);
        }
      } else if (/^[pnbrqkPNBRQK]$/.test(char)) {
        if (file >= 8) {
          throw new Error(`Invalid FEN: rank exceeds 8 squares`);
        }
        const color: PieceColor = char === char.toUpperCase() ? 'w' : 'b';
        const type = char.toLowerCase() as PieceType;
        board[rankIndex * 8 + file] = { color, type };
        file++;
      } else {
        throw new Error(`Invalid FEN piece character: "${char}"`);
      }
    }
    if (file !== 8) {
      throw new Error(`Invalid FEN: rank must contain exactly 8 squares, got ${file}`);
    }
  }

  // 2. Active turn
  const turn: PieceColor = turnStr === 'b' ? 'b' : 'w';

  // 3. Castling rights
  const castling: CastlingRights = {
    whiteKingside: castlingStr.includes('K'),
    whiteQueenside: castlingStr.includes('Q'),
    blackKingside: castlingStr.includes('k'),
    blackQueenside: castlingStr.includes('q'),
  };

  // 4. En Passant target
  const enPassant = epStr === '-' ? null : algebraicToSquare(epStr);

  // 5. Clocks
  const halfmoveClock = parseInt(halfmoveStr, 10) || 0;
  const fullmoveNumber = parseInt(fullmoveStr, 10) || 1;

  const state: ChessGameState = {
    board,
    turn,
    castling,
    enPassant,
    halfmoveClock,
    fullmoveNumber,
    history: [],
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isDraw: false,
    drawReason: undefined,
  };

  evaluateGameStatus(state);

  return state;
}

/**
 * Creates a fresh game state initialized to the standard FIDE starting position.
 */
export function createInitialGameState(): ChessGameState {
  return fromFEN(DEFAULT_FEN);
}
