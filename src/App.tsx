import React, { useState } from 'react';
import { GamePlatformProvider, useGamePlatform } from './context/GamePlatformContext';
import { GameCategory } from './types';
import { GAMES_CATALOG } from './data/games';
import { Navbar } from './components/hub/Navbar';
import { HeroBanner } from './components/hub/HeroBanner';
import { GameCard } from './components/hub/GameCard';
import { DuelMatchmakingModal } from './components/hub/DuelMatchmakingModal';
import { DominoArena } from './components/arena/DominoArena';
import { JokerArena } from './components/arena/JokerArena';
import { PokerArena } from './components/arena/PokerArena';
import { LeaderboardView } from './components/hub/LeaderboardView';
import { Shield, Zap } from 'lucide-react';
import { SnakeLogo } from './components/common/SnakeLogo';

const PlatformContent: React.FC = () => {
  const { currentView, setCurrentView, selectedStake } = useGamePlatform();
  const [selectedCategory, setSelectedCategory] = useState<GameCategory>('all');

  const filteredGames = GAMES_CATALOG.filter((g) => {
    if (selectedCategory === 'all') return true;
    return g.category === selectedCategory;
  });

  // Render active duel arenas
  if (currentView === 'domino') {
    return <DominoArena stake={selectedStake} onExit={() => setCurrentView('hub')} />;
  }

  if (currentView === 'joker') {
    return <JokerArena onExit={() => setCurrentView('hub')} />;
  }

  if (currentView === 'poker') {
    return <PokerArena onExit={() => setCurrentView('hub')} />;
  }

  // Otherwise render the Hub or Leaderboard
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'leaderboard' ? (
          <LeaderboardView />
        ) : (
          <>
            <HeroBanner
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />

            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
                  <SnakeLogo size={20} color="#e11d48" />
                  <span>Viper Duel Arenas & Tables</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select a game to start playing or queue for an instant 1v1 match.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                {filteredGames.length} Games Ready
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          </>
        )}
      </main>

      <DuelMatchmakingModal />

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-900 bg-slate-950 py-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <SnakeLogo size={18} color="#e11d48" />
            <span className="font-extrabold text-white tracking-tight">
              VIPER<span className="text-amber-500">ARENA</span>
            </span>
            <span>—</span>
            <span>Tactical & Classic Gaming Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Zap className="w-3.5 h-3.5" />
              <span>React 19 + TypeScript + Vite</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Modular Game Engine Ready</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <GamePlatformProvider>
      <PlatformContent />
    </GamePlatformProvider>
  );
};

export default App;
