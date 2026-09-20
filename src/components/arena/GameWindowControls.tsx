import React, { useState, useEffect } from 'react';
import { X, Minus, Maximize2, Minimize2, Menu } from 'lucide-react';
import { SnakeLogo } from '../common/SnakeLogo';

interface GameWindowControlsProps {
  gameTitle: string;
  gameTag?: string;
  onExit: () => void;
  showNavbar?: boolean;
  onToggleNavbar?: () => void;
  extraControls?: React.ReactNode;
}

export const GameWindowControls: React.FC<GameWindowControlsProps> = ({
  gameTitle,
  gameTag,
  onExit,
  showNavbar,
  onToggleNavbar,
  extraControls,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  return (
    <div className="w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 z-30 select-none">
      {/* Left: Minimal Game Brand Indicator */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#850120] to-rose-950 border border-rose-800/60 flex items-center justify-center p-1 shadow-sm">
          <SnakeLogo size={18} color="#ffffff" glow />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">
            {gameTitle}
          </span>
          {gameTag && (
            <span className="hidden sm:inline-block text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-400">
              {gameTag}
            </span>
          )}
        </div>
      </div>

      {/* Right: Game Specific Actions + Window Control Cluster */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Extra Game Actions (Rules, Reset, Sound, Stakes) */}
        {extraControls && (
          <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
            {extraControls}
          </div>
        )}

        {/* Toggle Standard Navbar (if handler provided) */}
        {onToggleNavbar && (
          <button
            onClick={onToggleNavbar}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
              showNavbar
                ? 'bg-rose-950/60 border-rose-700/60 text-rose-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={showNavbar ? 'Hide Navigation Bar' : 'Show Navigation Bar'}
          >
            <Menu className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Nav</span>
          </button>
        )}

        {/* Gaming Window Controls: Minimize, Fullscreen, Close */}
        <div className="flex items-center bg-slate-900 rounded-xl border border-slate-800 p-0.5 shadow-inner">
          {/* Minimize / Return Button */}
          <button
            onClick={onExit}
            className="p-1.5 sm:px-2.5 sm:py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Minimize / Return to Catalog"
            aria-label="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 sm:px-2.5 sm:py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Close / Exit Button */}
          <button
            onClick={onExit}
            className="p-1.5 sm:px-2.5 sm:py-1.5 text-slate-400 hover:text-white hover:bg-rose-600 rounded-lg transition"
            title="Exit Game (Close)"
            aria-label="Exit Game"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameWindowControls;

