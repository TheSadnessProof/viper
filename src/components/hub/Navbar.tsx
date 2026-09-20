import React, { useState } from 'react';
import { SnakeLogo } from '../common/SnakeLogo';
import { User, Swords, Layers, LayoutGrid } from 'lucide-react';

export type NavCategory = 'pvp' | 'cards' | 'board';

interface NavbarProps {
  activeCategory?: NavCategory;
  onSelectCategory?: (category: NavCategory) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeCategory: controlledCategory,
  onSelectCategory,
}) => {
  const [internalCategory, setInternalCategory] = useState<NavCategory>('pvp');
  const active = controlledCategory ?? internalCategory;

  const handleSelect = (cat: NavCategory) => {
    setInternalCategory(cat);
    onSelectCategory?.(cat);
  };

  const categories = [
    { id: 'pvp' as const, label: 'PvP', icon: Swords, badge: '1v1' },
    { id: 'cards' as const, label: 'Cards', icon: Layers },
    { id: 'board' as const, label: 'Board', icon: LayoutGrid },
  ];

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

        {/* Categories Navigation */}
        <nav className="flex items-center gap-1.5 bg-slate-900/70 p-1 rounded-2xl border border-slate-800 shadow-inner">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = active === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => handleSelect(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#850120] to-rose-900 text-white shadow-md shadow-rose-950/50 border border-rose-700/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300' : 'text-slate-400'}`} />
                <span>{cat.label}</span>
                {cat.badge && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-extrabold ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {cat.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

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
