import React, { useState, useEffect } from 'react';
import { Navbar, NavCategory } from './components/hub/Navbar';
import { LobbyView } from './components/views/LobbyView';
import { CardsView } from './components/views/CardsView';
import { BoardView } from './components/views/BoardView';
import { CombatView } from './components/views/CombatView';
import { DominoArena } from './components/arena/DominoArena';
import { JokerArena } from './components/arena/JokerArena';
import { PokerArena } from './components/arena/PokerArena';
import { ChessArena } from './games/chess/ChessArena';
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
  const [activeArena, setActiveArena] = useState<'joker' | 'poker' | 'domino' | 'chess' | null>(null);
  const [inGameShowNavbar, setInGameShowNavbar] = useState(false);

  const navigateTo = (cat: NavCategory) => {
    setCurrentCategory(cat);
    const targetPath = cat === 'lobby' ? '/lobby' : `/${cat}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  const handleLaunchGame = (gameId: string) => {
    if (gameId === 'joker') setActiveArena('joker');
    else if (gameId === 'poker') setActiveArena('poker');
    else if (gameId === 'domino') setActiveArena('domino');
    else if (gameId === 'chess') setActiveArena('chess');
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentCategory(getCategoryFromLocation());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // If a game arena is actively running, render it full screen
  if (activeArena) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        {/* Same standard navigation bar if user toggled it on */}
        {inGameShowNavbar && (
          <Navbar
            activeCategory={currentCategory}
            onSelectCategory={(cat) => {
              setActiveArena(null);
              navigateTo(cat);
            }}
          />
        )}
        <div className="flex-1 w-full flex flex-col">
          {activeArena === 'joker' && (
            <JokerArena
              onExit={() => setActiveArena(null)}
              showNavbar={inGameShowNavbar}
              onToggleNavbar={() => setInGameShowNavbar((prev) => !prev)}
            />
          )}
          {activeArena === 'poker' && (
            <PokerArena
              onExit={() => setActiveArena(null)}
              showNavbar={inGameShowNavbar}
              onToggleNavbar={() => setInGameShowNavbar((prev) => !prev)}
            />
          )}
          {activeArena === 'domino' && (
            <DominoArena
              onExit={() => setActiveArena(null)}
              showNavbar={inGameShowNavbar}
              onToggleNavbar={() => setInGameShowNavbar((prev) => !prev)}
            />
          )}
          {activeArena === 'chess' && (
            <ChessArena
              onExit={() => setActiveArena(null)}
              showNavbar={inGameShowNavbar}
              onToggleNavbar={() => setInGameShowNavbar((prev) => !prev)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-rose-900 selection:text-white">
      <Navbar activeCategory={currentCategory} onSelectCategory={navigateTo} />

      <main className="flex-1 w-full">
        {currentCategory === 'lobby' && <LobbyView onNavigate={navigateTo} />}
        {currentCategory === 'cards' && <CardsView onPlay={handleLaunchGame} />}
        {currentCategory === 'board' && <BoardView onPlay={handleLaunchGame} />}
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
