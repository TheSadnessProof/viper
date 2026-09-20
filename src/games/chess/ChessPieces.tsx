import React from 'react';
import type { Piece } from './chessTypes';

interface ChessPieceProps {
  piece: Piece;
  size?: number | string;
  className?: string;
}

export const ChessPieceView: React.FC<ChessPieceProps> = ({ piece, size = '100%', className = '' }) => {
  const { type, color } = piece;

  const isWhite = color === 'w';
  const fillId = isWhite ? 'whitePieceGrad' : 'blackPieceGrad';
  const strokeColor = isWhite ? '#475569' : '#38bdf8';
  const strokeWidth = isWhite ? 1.4 : 1.6;

  return (
    <svg
      viewBox="0 0 45 45"
      width={size}
      height={size}
      className={`select-none pointer-events-none transition-transform duration-100 drop-shadow-md ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* White Piece Titanium Gradient */}
        <linearGradient id="whitePieceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>

        {/* Black Piece Obsidian Gradient with Cyan Rim */}
        <linearGradient id="blackPieceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="70%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>

        {/* Glow filter for Black pieces to stand out against dark squares */}
        <filter id="pieceGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor={isWhite ? '#00000040' : '#38bdf860'} />
        </filter>
      </defs>

      <g
        fill={`url(#${fillId})`}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#pieceGlow)"
      >
        {type === 'p' && (
          // Pawn
          <path d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 L 34,39.5 C 34,31.58 29.59,27.09 26.59,26.03 28.06,24.84 29,23.03 29,21 29,18.59 27.67,16.5 25.72,15.38 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z" />
        )}

        {type === 'n' && (
          // Knight
          <g>
            <path d="m 22,10 c 10.5,1 16.5,8 16,29 L 15,39 C 15,34 14,29 11,26 8.5,23.5 9,19 11,16 c 1.5,-2 4,-3 5,-2 0.5,-1.5 2,-3 4,-3 z" />
            <path
              d="m 24,18 c 0.38,2.91 -5.55,7.37 -8,9 -3,2 -2.82,4.34 -5,4 -1.04,-0.94 -1.12,-2.14 0,-3 2,-1.5 6,-4 7,-8 z"
              fill={isWhite ? '#cbd5e1' : '#334155'}
            />
            {/* Eye */}
            <circle cx="15" cy="15" r="1.5" fill={isWhite ? '#0f172a' : '#38bdf8'} stroke="none" />
          </g>
        )}

        {type === 'b' && (
          // Bishop
          <g>
            <path d="m 9,36 c 3.39,-0.97 10.11,0.43 13.5,-2 3.39,2.43 10.11,1.03 13.5,2 0,0 1.65,0.54 3,2 -0.68,0.97 -1.65,0.99 -3,0.5 -3.39,-0.49 -10.11,0.91 -13.5,-1.5 -3.39,2.41 -10.11,1.01 -13.5,1.5 -1.35,0.49 -2.32,0.47 -3,-0.5 1.35,-1.46 3,-2 3,-2 z" />
            <path d="m 15,32 c 2.5,2.5 12.5,2.5 15,0 0.5,-1.5 0,-2 0,-2 0,-2.5 -2.5,-4 -2.5,-4 5.5,-1.5 6,-11.5 -5,-15.5 -11,4 -10.5,14 -5,15.5 0,0 -2.5,1.5 -2.5,4 0,0 -0.5,0.5 0,2 z" />
            <circle cx="22.5" cy="8.5" r="2" />
            {/* Slit in the mitre */}
            <path
              d="m 17.5,16 10,0 M 20,20.5 c 0,0 2.5,-1 5,-1 M 22.5,13.5 22.5,24"
              stroke={isWhite ? '#64748b' : '#38bdf8'}
              strokeWidth="1.2"
              fill="none"
            />
          </g>
        )}

        {type === 'r' && (
          // Rook
          <g>
            <path d="m 9,39 27,0 c 0,-3 -2,-5 -4,-6 L 13,33 C 11,34 9,36 9,39 Z" />
            <path d="m 12,33 1.5,-15 18,0 1.5,15 z" />
            <path d="m 9,14 0,4 27,0 0,-4 -3,0 0,3 -4,0 0,-3 -3,0 0,3 -4,0 0,-3 -3,0 0,3 -4,0 0,-3 z" />
            <path d="m 14,18 17,0" stroke={isWhite ? '#64748b' : '#38bdf8'} strokeWidth="1.2" />
          </g>
        )}

        {type === 'q' && (
          // Queen
          <g>
            <path d="m 9,26 c 8.5,-1.5 21,-1.5 27,0 l 2,-12 -7,5 -4,-8 -4.5,8 -7,-5 2.5,12 z" />
            <path d="m 9,26 c 0,2 1.5,2 2.5,4 1,1.5 1,1 0.5,3.5 -1.5,1 -1.5,2.5 -1.5,2.5 -1.5,1.5 0.5,2.5 0.5,2.5 6.5,1 16.5,1 23,0 0,0 1.5,-1 0.5,-2.5 0,0 0,-1.5 -1.5,-2.5 -0.5,-2.5 -0.5,-2 0.5,-3.5 1,-2 2.5,-2 2.5,-4 -8.5,-1.5 -18.5,-1.5 -27,0 z" />
            <circle cx="6" cy="12" r="2" />
            <circle cx="14" cy="9" r="2" />
            <circle cx="22.5" cy="6" r="2" />
            <circle cx="31" cy="9" r="2" />
            <circle cx="39" cy="12" r="2" />
          </g>
        )}

        {type === 'k' && (
          // King
          <g>
            {/* Latin Cross */}
            <path
              d="M 22.5,4 L 22.5,11 M 19,7.5 L 26,7.5"
              stroke={strokeColor}
              strokeWidth="1.8"
              fill="none"
            />
            {/* Crown and Base */}
            <path d="m 22.5,11.5 c -4,0 -7.5,3.5 -7.5,7.5 0,3 2,5.5 4,7.5 -2.5,1 -5,3 -5,6.5 0,3 2,4.5 5,5.5 l 7,0 c 3,-1 5,-2.5 5,-5.5 0,-3.5 -2.5,-5.5 -5,-6.5 2,-2 4,-4.5 4,-7.5 0,-4 -3.5,-7.5 -7.5,-7.5 z" />
            <path d="m 11.5,37 22,0 c 1,0 2,1 2,2 l -26,0 c 0,-1 1,-2 2,-2 z" />
            <circle cx="22.5" cy="19" r="2.5" fill={isWhite ? '#cbd5e1' : '#38bdf8'} stroke="none" />
          </g>
        )}
      </g>
    </svg>
  );
};

export default ChessPieceView;
