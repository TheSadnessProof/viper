import React from 'react';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 select-none">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 mb-6 text-2xl shadow-xl">
          🎮
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Game Platform
        </h1>
        <p className="text-sm text-zinc-500">
          Clean blank canvas ready. Tell me which game you want to add first.
        </p>
      </div>
    </div>
  );
};

export default App;
