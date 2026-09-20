import { findBestMove, ChessDifficulty } from './chessAi';
import type { ChessGameState } from './chessTypes';

interface WorkerRequest {
  id: string;
  state: ChessGameState;
  difficulty: ChessDifficulty;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, state, difficulty } = event.data;
  try {
    const bestMove = findBestMove(state, difficulty);
    self.postMessage({ id, bestMove });
  } catch (error) {
    self.postMessage({ id, bestMove: null, error: String(error) });
  }
};
