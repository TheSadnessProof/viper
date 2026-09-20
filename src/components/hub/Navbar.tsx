import React from 'react';
import { SnakeLogo } from '../common/SnakeLogo';
import { User } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#850120] via-rose-950 to-slate-900 border border-rose-900/50 flex items-center justify-center shadow-lg shadow-rose-950/40 group-hover:scale-105 transition-transform duration-200 p-1.5">
            <SnakeLogo size={26} color="#ffffff" glow />
          </div>
          <span className="font-black text-2xl tracking-wider bg-gradient-to-r from-white via-rose-100 to-amber-400 bg-clip-text text-transparent">
            Viper
          </span>
        </div>

        {/* Profile / Auth Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition">
            Log In
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#850120] to-rose-700 hover:from-[#9c0227] hover:to-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-950/40 transition hover:scale-[1.02] active:scale-[0.98]">
            <User className="w-3.5 h-3.5" />
            <span>Sign Up</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
