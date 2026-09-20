import React from 'react';
import { Navbar } from './components/hub/Navbar';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 w-full" />
    </div>
  );
};

export default App;
