import React from 'react';
import { DominoTile } from '../../games/domino/dominoLogic';

interface DominoTileViewProps {
  tile: DominoTile;
  orientation?: 'vertical' | 'horizontal';
  isFlipped?: boolean;
  isPlayable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

// Dot positions for standard pips 0-6
const PipGrid: React.FC<{ count: number; size: 'sm' | 'md' | 'lg' }> = ({ count, size }) => {
  const dotSizeClass = size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : 'w-2.5 h-2.5';

  const renderDots = () => {
    switch (count) {
      case 0:
        return <div className="w-full h-full" />;
      case 1:
        return (
          <div className="w-full h-full flex items-center justify-center">
            <span className={`${dotSizeClass} rounded-full bg-slate-900 shadow-inner`} />
          </div>
        );
      case 2:
        return (
          <div className="w-full h-full flex flex-col justify-between p-1">
            <div className="flex justify-start">
              <span className={`${dotSizeClass} rounded-full bg-slate-900 shadow-inner`} />
            </div>
            <div className="flex justify-end">
              <span className={`${dotSizeClass} rounded-full bg-slate-900 shadow-inner`} />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="w-full h-full flex flex-col justify-between p-1">
            <div className="flex justify-start">
              <span className={`${dotSizeClass} rounded-full bg-slate-900 shadow-inner`} />
            </div>
            <div className="flex justify-center">
              <span className={`${dotSizeClass} rounded-full bg-slate-900 shadow-inner`} />
            </div>
            <div className="flex justify-end">
              <span className={`${dotSizeClass} rounded-full bg-slate-900 shadow-inner`} />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="w-full h-full flex flex-col justify-between p-1">
            <div className="flex justify-between">
              <span className={`${dotSizeClass} rounded-full bg-slate-900 shadow-inner`} />
              <span className={`${dotSizeClass} rounded-full bg-slate-900 shadow-inner`} />
            </div>
            <div className="flex justify-between">
              <span className={`${dotSizeClass} rounded-full bg-slate-900 shadow-inner`} />
              <span className={`${dotSizeClass} rounded-full bg-slate-900 shadow-inner`} />
            </div>
          </div>
        );
      case 5:
        return (
          <div className="w-full h-full flex flex-col justify-between p-1">
            <div className="flex justify-between">
              <span className={`${dotSizeClass} rounded-full bg-slate-900 shadow-inner`} />
              <span className={`${dotSizeClass} rounded-full bg-slate-900 shadow-inner`} />
            </div>
            <div className="flex justify-center">
              <span className={`${dotSizeClass} rounded-full bg-slate-900 shadow-inner`} />
            </div>
            <div className="flex justify-between">
              <span className={`${dotSizeClass} rounded-full bg-slate-900 shadow-inner`} />
              <span className={`${dotSizeClass} rounded-full bg-slate-900 shadow-inner`} />
            </div>
          </div>
        );
      case 6:
        return (
          <div className="w-full h-full flex flex-col justify-between p-1">
            <div className="flex justify-between">
              <span className={`${dotSizeClass} rounded-full bg-slate-900 shadow-inner`} />
              <span className={`${dotSizeClass} rounded-full bg-slate-900 shadow-inner`} />
            </div>
            <div className="flex justify-between">
              <span className={`${dotSizeClass} rounded-full bg-slate-900 shadow-inner`} />
              <span className={`${dotSizeClass} rounded-full bg-slate-900 shadow-inner`} />
            </div>
            <div className="flex justify-between">
              <span className={`${dotSizeClass} rounded-full bg-slate-900 shadow-inner`} />
              <span className={`${dotSizeClass} rounded-full bg-slate-900 shadow-inner`} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return <div className="w-full h-full">{renderDots()}</div>;
};

export const DominoTileView: React.FC<DominoTileViewProps> = ({
  tile,
  orientation = 'vertical',
  isFlipped = false,
  isPlayable = false,
  isSelected = false,
  onClick,
  size = 'md',
}) => {
  const firstPip = isFlipped ? tile.right : tile.left;
  const secondPip = isFlipped ? tile.left : tile.right;

  // Dimensions
  const sizeClasses = {
    sm: orientation === 'vertical' ? 'w-9 h-18' : 'w-18 h-9',
    md: orientation === 'vertical' ? 'w-12 h-24' : 'w-24 h-12',
    lg: orientation === 'vertical' ? 'w-14 h-28' : 'w-28 h-14',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`
        relative rounded-lg font-sans transition-all duration-150 select-none
        ${sizeClasses[size]}
        ${isPlayable ? 'cursor-pointer hover:-translate-y-1.5 ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/20' : ''}
        ${isSelected ? 'ring-4 ring-amber-400 -translate-y-2 shadow-xl shadow-amber-500/30' : ''}
        ${!isPlayable && !isSelected && onClick ? 'opacity-50 cursor-not-allowed' : ''}
        bg-gradient-to-b from-amber-50 via-stone-100 to-amber-100
        border border-stone-300 shadow-md
      `}
    >
      {orientation === 'vertical' ? (
        <div className="w-full h-full flex flex-col p-1">
          <div className="flex-1 flex items-center justify-center">
            <PipGrid count={firstPip} size={size} />
          </div>
          {/* Dividing bar with brass spinner center */}
          <div className="relative w-full h-[2px] bg-stone-400/80 my-0.5 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 border border-amber-700 shadow-sm" />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <PipGrid count={secondPip} size={size} />
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-row p-1">
          <div className="flex-1 flex items-center justify-center">
            <PipGrid count={firstPip} size={size} />
          </div>
          {/* Dividing bar with brass spinner center */}
          <div className="relative h-full w-[2px] bg-stone-400/80 mx-0.5 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 border border-amber-700 shadow-sm" />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <PipGrid count={secondPip} size={size} />
          </div>
        </div>
      )}
    </button>
  );
};
