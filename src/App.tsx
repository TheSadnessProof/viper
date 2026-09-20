import React, { useState, useEffect } from 'react';
import { Navbar, NavCategory } from './components/hub/Navbar';
import { LobbyView } from './components/views/LobbyView';
import { CardsView } from './components/views/CardsView';
import { BoardView } from './components/views/BoardView';
import { CombatView } from './components/views/CombatView';
import { SnakeLogo } from './components/common/SnakeLogo';

function getCategoryFromLocation(): NavCategory {
  const path = window.location.pathname.toLowerCase().replace(/^\/+/, '').split('/')[0];
  if (path === 'cards') return 'cards';
  if (path === 'board') return 'board';
  if (path === 'combat') return 'combat';
  if (path === 'lobby') return 'lobby';

  // Check hash fallback
  const hash = window.location.hash.toLowerCase().replace(/^[#/]+/, '').split('/')[0];
  if (hash === 'cards') return 'cards';
  if (hash === 'board') return 'board';
  if (hash === 'combat') return 'combat';
  if (hash === 'lobby') return 'lobby';

  return 'lobby';
}

export const App: React.FC = () => {
  const [currentCategory, setCurrentCategory] = useState<NavCategory>(getCategoryFromLocation);

  const navigateTo = (cat: NavCategory) => {
    setCurrentCategory(cat);
    const targetPath = cat === 'lobby' ? '/lobby' : `/${cat}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentCategory(getCategoryFromLocation());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-rose-900 selection:text-white">
      <Navbar activeCategory={currentCategory} onSelectCategory={navigateTo} />

      <main className="flex-1 w-full">
        {currentCategory === 'lobby' && <LobbyView onNavigate={navigateTo} />}
        {currentCategory === 'cards' && <CardsView />}
        {currentCategory === 'board' && <BoardView />}
        {currentCategory === 'combat' && <CombatView />}
      </main>

      {/* Subtle footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <SnakeLogo size={16} color="#850120" />
            <span className="font-bold text-slate-300">Viper</span>
            <span>—</span>
            <span>Tactical & Classic Gaming Repository</span>
          </div>
          <div className="text-slate-500 font-mono text-[11px]">
            Lobby &bull; Cards &bull; Board &bull; Combat
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
