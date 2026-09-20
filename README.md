# DuelArena — Classic & Skill Game Platform

A modern web gaming hub for real-time 1v1 duels, classical games, and high-stakes matches:
* **Domino Duel**: Classic Draw & Block 1v1 with authentic bone-ivory tiles, open ends matching, boneyard, and tactical AI opponent.
* **Joker (Caucasian / Eastern European Classic)**: Trick-taking card duel with exact-trick bidding, trump suits, and high-powered Joker cards.
* **Heads-Up Poker**: 1v1 Texas Hold'em with community board, hole cards, pot bets, and blind structures.
* **Backgammon & Speed Chess**: Previewed in the game catalog.

---

## Tech Stack
* **Framework**: React 19 + TypeScript
* **Bundler & Dev Server**: Vite 6
* **Styling**: Tailwind CSS v4 + Lucide React Icons
* **FX**: Canvas Confetti for victory celebrations

---

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

3. **Production build**:
   ```bash
   npm run build
   ```

---

## Architecture

```text
src/
├── components/
│   ├── arena/       # Interactive duel arena tables (Domino, Joker, Poker)
│   ├── hub/         # Game Hub home, Hero banner, Game cards, Leaderboards, Matchmaking modal
│   └── layout/      # Navbar with user balance & quick match
├── context/         # GamePlatformContext (active view, user chips, matchmaking)
├── data/            # Game catalog & metadata
├── games/           # Authoritative game logic engines (e.g. dominoLogic.ts)
├── types/           # TypeScript interfaces for games, users, rooms, and duels
├── App.tsx          # Main view routing
├── main.tsx         # React DOM mount
└── index.css        # Tailwind styles & game table textures
```
