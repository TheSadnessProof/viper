import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ChessGameState, Move, Piece, PieceType, Square } from './chessTypes';
import { getLegalMoves, findKingSquare, getSquareColor } from './chessLogic';
import { ChessPieceView } from './ChessPieces';

interface ChessBoardViewProps {
  gameState: ChessGameState;
  onMove: (move: Move) => void;
  orientation?: 'white' | 'black';
  disabled?: boolean;
  lastMove?: Move | null;
}

interface DragState {
  square: Square;
  piece: Piece;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
  isTouch: boolean;
}

const FILES_WHITE = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS_WHITE = ['8', '7', '6', '5', '4', '3', '2', '1'];

const FILES_BLACK = ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
const RANKS_BLACK = ['1', '2', '3', '4', '5', '6', '7', '8'];

function getSquareFromGrid(row: number, col: number, orientation: 'white' | 'black'): Square {
  if (orientation === 'white') {
    const rank = 7 - row;
    const file = col;
    return rank * 8 + file;
  } else {
    const rank = row;
    const file = 7 - col;
    return rank * 8 + file;
  }
}

export const ChessBoardView: React.FC<ChessBoardViewProps> = ({
  gameState,
  onMove,
  orientation = 'white',
  disabled = false,
  lastMove = null,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);

  // Compute legal moves for current state
  const legalMoves = React.useMemo(() => {
    return disabled ? [] : getLegalMoves(gameState);
  }, [gameState, disabled]);

  // Legal moves for currently selected square
  const selectedMoves = React.useMemo(() => {
    if (selectedSquare === null) return [];
    return legalMoves.filter((m) => m.from === selectedSquare);
  }, [legalMoves, selectedSquare]);

  const legalTargetsMap = React.useMemo(() => {
    const map = new Map<Square, Move>();
    for (const m of selectedMoves) {
      map.set(m.to, m);
    }
    return map;
  }, [selectedMoves]);

  // King check position
  const kingInCheckSquare = React.useMemo(() => {
    if (!gameState.isCheck) return null;
    return findKingSquare(gameState.board, gameState.turn);
  }, [gameState.board, gameState.turn, gameState.isCheck]);

  // Handle move attempt
  const handleAttemptMove = useCallback(
    (from: Square, to: Square) => {
      const candidates = legalMoves.filter((m) => m.from === from && m.to === to);
      if (candidates.length === 0) {
        // Not a legal move
        setSelectedSquare(null);
        return;
      }

      // Check for promotion
      if (candidates.some((m) => m.promotion)) {
        setPendingPromotion({ from, to });
        return;
      }

      onMove(candidates[0]);
      setSelectedSquare(null);
    },
    [legalMoves, onMove]
  );

  // Complete promotion selection
  const handleSelectPromotion = (promoType: PieceType) => {
    if (!pendingPromotion) return;
    const { from, to } = pendingPromotion;
    const move = legalMoves.find(
      (m) => m.from === from && m.to === to && m.promotion === promoType
    );
    if (move) {
      onMove(move);
    }
    setPendingPromotion(null);
    setSelectedSquare(null);
  };

  // Keyboard shortcut listener for promotion (Q, R, B, N)
  useEffect(() => {
    if (!pendingPromotion) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'q') handleSelectPromotion('q');
      else if (key === 'r') handleSelectPromotion('r');
      else if (key === 'b') handleSelectPromotion('b');
      else if (key === 'n') handleSelectPromotion('n');
      else if (key === 'escape') {
        setPendingPromotion(null);
        setSelectedSquare(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingPromotion, legalMoves]);

  // Pointer event handlers for dual-mode input
  const handlePointerDown = (square: Square, e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || pendingPromotion) return;

    const piece = gameState.board[square];

    // If we have a square already selected and tapped an allowed destination:
    if (selectedSquare !== null && legalTargetsMap.has(square)) {
      handleAttemptMove(selectedSquare, square);
      return;
    }

    // Only allow selecting pieces of the active player's color
    if (piece && piece.color === gameState.turn) {
      setSelectedSquare(square);

      const isTouch = e.pointerType === 'touch';
      setDragState({
        square,
        piece,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        isDragging: false,
        isTouch,
      });

      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      // Tapped elsewhere
      setSelectedSquare(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState) return;

    const dist = Math.hypot(e.clientX - dragState.startX, e.clientY - dragState.startY);
    const isDragging = dragState.isDragging || dist > 6;

    setDragState((prev) =>
      prev
        ? {
            ...prev,
            currentX: e.clientX,
            currentY: e.clientY,
            isDragging,
          }
        : null
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Safe ignore
    }

    if (dragState.isDragging && boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      // Apply -32px touch offset on touch devices so finger does not occlude the target square
      const testY = dragState.isTouch ? e.clientY - 32 : e.clientY;
      const testX = e.clientX;

      if (testX >= rect.left && testX <= rect.right && testY >= rect.top && testY <= rect.bottom) {
        const squareWidth = rect.width / 8;
        const squareHeight = rect.height / 8;
        const col = Math.floor((testX - rect.left) / squareWidth);
        const row = Math.floor((testY - rect.top) / squareHeight);

        if (col >= 0 && col < 8 && row >= 0 && row < 8) {
          const targetSquare = getSquareFromGrid(row, col, orientation);
          if (targetSquare !== dragState.square) {
            handleAttemptMove(dragState.square, targetSquare);
          }
        }
      }
    }

    setDragState(null);
  };

  const handlePointerCancel = () => {
    setDragState(null);
  };

  // Files and ranks coordinate labels based on orientation
  const filesList = orientation === 'white' ? FILES_WHITE : FILES_BLACK;
  const ranksList = orientation === 'white' ? RANKS_WHITE : RANKS_BLACK;

  return (
    <div className="relative w-full max-w-[min(88vw,70vh,620px)] aspect-square mx-auto select-none touch-none p-2 sm:p-3 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl">
      {/* 8x8 Board Grid */}
      <div
        ref={boardRef}
        className="w-full h-full grid grid-cols-8 grid-rows-8 rounded-xl overflow-hidden border border-slate-700/60 relative"
      >
        {Array.from({ length: 64 }).map((_, idx) => {
          const row = Math.floor(idx / 8);
          const col = idx % 8;
          const square = getSquareFromGrid(row, col, orientation);
          const piece = gameState.board[square];

          const isDarkSquare = getSquareColor(square) === 'dark';
          const isSelected = selectedSquare === square;
          const isCheckSquare = kingInCheckSquare === square;
          const isLastMoveSquare =
            lastMove && (lastMove.from === square || lastMove.to === square);

          const legalMove = legalTargetsMap.get(square);
          const isLegalTarget = Boolean(legalMove);
          const isCaptureTarget =
            isLegalTarget &&
            (piece !== null ||
              legalMove?.isEnPassant ||
              (gameState.enPassant !== null && square === gameState.enPassant));

          const isCurrentlyDragged =
            dragState?.isDragging && dragState.square === square;

          // Coordinate indicators
          const showFile = row === 7;
          const showRank = col === 0;

          return (
            <div
              key={square}
              onPointerDown={(e) => handlePointerDown(square, e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              className={`relative flex items-center justify-center cursor-pointer transition-colors duration-150 ${
                isDarkSquare
                  ? 'bg-slate-800/95 hover:bg-slate-750'
                  : 'bg-slate-200/95 hover:bg-slate-100'
              } ${
                isSelected
                  ? 'bg-amber-400/30 ring-2 ring-inset ring-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.5)] z-10'
                  : ''
              } ${
                isLastMoveSquare && !isSelected
                  ? 'bg-cyan-500/25 ring-1 ring-inset ring-cyan-400/50'
                  : ''
              }`}
            >
              {/* King Danger Aura Indicator */}
              {isCheckSquare && (
                <div className="absolute inset-0 bg-gradient-to-r from-red-600/70 via-rose-600/40 to-transparent animate-pulse rounded-lg border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.9)] pointer-events-none z-10" />
              )}

              {/* Destination Dot Indicator (Quiet moves) */}
              {isLegalTarget && !isCaptureTarget && (
                <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.9)] backdrop-blur-sm pointer-events-none z-20 transition-transform animate-in zoom-in-75 duration-100" />
              )}

              {/* Capture Ring Indicator */}
              {isCaptureTarget && (
                <div className="absolute inset-1 sm:inset-1.5 rounded-xl border-2 border-rose-500/90 bg-rose-500/20 shadow-[0_0_14px_rgba(244,63,94,0.6)] animate-pulse pointer-events-none z-20" />
              )}

              {/* File coordinate (bottom-right) */}
              {showFile && (
                <span
                  className={`absolute bottom-0.5 right-1 text-[9px] sm:text-[11px] font-mono font-bold select-none pointer-events-none ${
                    isDarkSquare ? 'text-slate-400/70' : 'text-slate-500/80'
                  }`}
                >
                  {filesList[col]}
                </span>
              )}

              {/* Rank coordinate (top-left) */}
              {showRank && (
                <span
                  className={`absolute top-0.5 left-1 text-[9px] sm:text-[11px] font-mono font-bold select-none pointer-events-none ${
                    isDarkSquare ? 'text-slate-400/70' : 'text-slate-500/80'
                  }`}
                >
                  {ranksList[row]}
                </span>
              )}

              {/* Piece rendering */}
              {piece && (
                <div
                  className={`w-[84%] h-[84%] flex items-center justify-center transition-opacity duration-100 ${
                    isCurrentlyDragged ? 'opacity-20' : 'opacity-100'
                  }`}
                >
                  <ChessPieceView piece={piece} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Drag Ghost Piece */}
      {dragState?.isDragging && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14 sm:w-16 sm:h-16 drop-shadow-[0_12px_24px_rgba(0,0,0,0.9)] scale-110"
          style={{
            left: `${dragState.currentX}px`,
            top: `${dragState.currentY + (dragState.isTouch ? -32 : 0)}px`,
          }}
        >
          <ChessPieceView piece={dragState.piece} />
        </div>
      )}

      {/* Pawn Promotion Modal */}
      {pendingPromotion && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-4 z-40 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 sm:p-6 max-w-sm w-full shadow-2xl flex flex-col items-center">
            <h3 className="text-white font-extrabold text-base sm:text-lg mb-1 tracking-wide">
              Promote Pawn
            </h3>
            <p className="text-slate-400 text-xs mb-5">
              Choose your ascended piece or press key [Q, R, B, N]
            </p>

            <div className="grid grid-cols-4 gap-2.5 sm:gap-3 w-full">
              {(
                [
                  { type: 'q', name: 'Queen', pts: 9, key: 'Q' },
                  { type: 'r', name: 'Rook', pts: 5, key: 'R' },
                  { type: 'b', name: 'Bishop', pts: 3, key: 'B' },
                  { type: 'n', name: 'Knight', pts: 3, key: 'N' },
                ] as const
              ).map((item) => (
                <button
                  key={item.type}
                  onClick={() => handleSelectPromotion(item.type)}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 hover:border-cyan-400 hover:bg-slate-750 transition group hover:scale-105 shadow-md"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 mb-1 group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                    <ChessPieceView piece={{ type: item.type, color: gameState.turn }} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-200 group-hover:text-cyan-300">
                    {item.name}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    [{item.key}]
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setPendingPromotion(null);
                setSelectedSquare(null);
              }}
              className="mt-4 text-xs text-slate-400 hover:text-slate-200 transition underline underline-offset-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChessBoardView;
