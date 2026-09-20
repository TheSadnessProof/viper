export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';
export type Color = PieceColor;

export interface Piece {
  type: PieceType;
  color: PieceColor;
}

/**
 * Square index from 0 to 63.
 * 0 = a1, 7 = h1, 56 = a8, 63 = h8.
 * Formula: index = rank * 8 + file (where file 0..7 is a..h, rank 0..7 is 1..8).
 */
export type Square = number;

export interface Move {
  from: Square;
  to: Square;
  promotion?: PieceType;
  isCapture?: boolean;
  isCastling?: boolean;
  isEnPassant?: boolean;
  san?: string;
  piece?: Piece;
}

export interface CastlingRights {
  whiteKingside: boolean;
  whiteQueenside: boolean;
  blackKingside: boolean;
  blackQueenside: boolean;
}

export interface HistoryEntry {
  move: Move;
  captured: Piece | null;
  prevCastling: CastlingRights;
  prevEnPassant: Square | null;
  prevHalfmoveClock: number;
  fen: string;
}

export type DrawReason = 'stalemate' | 'insufficient_material' | 'fifty_move' | 'threefold_repetition';

export interface ChessGameState {
  board: (Piece | null)[];
  turn: PieceColor;
  castling: CastlingRights;
  enPassant: Square | null;
  halfmoveClock: number;
  fullmoveNumber: number;
  history: HistoryEntry[];
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  drawReason?: DrawReason;
}

export type ChessState = ChessGameState;
