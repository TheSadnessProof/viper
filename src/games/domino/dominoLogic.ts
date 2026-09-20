export interface DominoTile {
  id: string;
  left: number;
  right: number;
}

export interface PlacedTile {
  tile: DominoTile;
  isFlipped: boolean; // if left/right was swapped to match the chain
  sidePlaced: 'left' | 'right' | 'root';
}

export interface DominoGameState {
  board: PlacedTile[];
  playerHand: DominoTile[];
  opponentHandCount: number;
  opponentHand: DominoTile[]; // For AI bot tracking
  boneyard: DominoTile[];
  currentTurn: 'player' | 'opponent';
  status: 'playing' | 'player_won' | 'opponent_won' | 'draw_locked';
  leftEndNumber: number | null;
  rightEndNumber: number | null;
  historyLog: string[];
  playerPoints: number;
  opponentPoints: number;
}

// Generate the complete standard Double-Six set (28 tiles)
export function generateDoubleSixSet(): DominoTile[] {
  const tiles: DominoTile[] = [];
  let id = 1;
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      tiles.push({ id: `tile-${id++}`, left: i, right: j });
    }
  }
  return tiles;
}

// Fisher-Yates shuffle
export function shuffleTiles(tiles: DominoTile[]): DominoTile[] {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Check if a tile can be placed on the current board
export function getValidPlacements(
  tile: DominoTile,
  leftEnd: number | null,
  rightEnd: number | null
): { canPlayLeft: boolean; canPlayRight: boolean } {
  if (leftEnd === null || rightEnd === null) {
    // Empty board: can play anywhere
    return { canPlayLeft: true, canPlayRight: true };
  }

  const matchesLeft = tile.left === leftEnd || tile.right === leftEnd;
  const matchesRight = tile.left === rightEnd || tile.right === rightEnd;

  return { canPlayLeft: matchesLeft, canPlayRight: matchesRight };
}

// Sum of pips in hand
export function calculatePipTotal(hand: DominoTile[]): number {
  return hand.reduce((sum, t) => sum + t.left + t.right, 0);
}

// Initialize a new 1v1 match
export function initDominoGame(): DominoGameState {
  const set = shuffleTiles(generateDoubleSixSet());
  const playerHand = set.slice(0, 7);
  const opponentHand = set.slice(7, 14);
  const boneyard = set.slice(14);

  // Pick highest double to start, or random
  let firstTurn: 'player' | 'opponent' = Math.random() > 0.5 ? 'player' : 'opponent';

  return {
    board: [],
    playerHand,
    opponentHandCount: 7,
    opponentHand,
    boneyard,
    currentTurn: firstTurn,
    status: 'playing',
    leftEndNumber: null,
    rightEndNumber: null,
    historyLog: [`Game started. ${firstTurn === 'player' ? 'You play' : 'Opponent plays'} first.`],
    playerPoints: 0,
    opponentPoints: 0,
  };
}

// Apply a tile placement to the board
export function placeTileOnBoard(
  state: DominoGameState,
  tile: DominoTile,
  targetSide: 'left' | 'right',
  who: 'player' | 'opponent'
): DominoGameState {
  let newBoard = [...state.board];
  let newLeftEnd = state.leftEndNumber;
  let newRightEnd = state.rightEndNumber;
  let isFlipped = false;

  if (newBoard.length === 0) {
    // First tile on board
    newBoard.push({ tile, isFlipped: false, sidePlaced: 'root' });
    newLeftEnd = tile.left;
    newRightEnd = tile.right;
  } else if (targetSide === 'left' && newLeftEnd !== null) {
    // Connecting to left end
    if (tile.right === newLeftEnd) {
      isFlipped = false;
      newLeftEnd = tile.left;
    } else if (tile.left === newLeftEnd) {
      isFlipped = true;
      newLeftEnd = tile.right;
    }
    newBoard.unshift({ tile, isFlipped, sidePlaced: 'left' });
  } else if (targetSide === 'right' && newRightEnd !== null) {
    // Connecting to right end
    if (tile.left === newRightEnd) {
      isFlipped = false;
      newRightEnd = tile.right;
    } else if (tile.right === newRightEnd) {
      isFlipped = true;
      newRightEnd = tile.left;
    }
    newBoard.push({ tile, isFlipped, sidePlaced: 'right' });
  }

  // Update hands
  let newPlayerHand = [...state.playerHand];
  let newOpponentHand = [...state.opponentHand];
  let newOpponentHandCount = state.opponentHandCount;

  if (who === 'player') {
    newPlayerHand = newPlayerHand.filter((t) => t.id !== tile.id);
  } else {
    newOpponentHand = newOpponentHand.filter((t) => t.id !== tile.id);
    newOpponentHandCount = newOpponentHand.length;
  }

  // Check victory: empty hand
  let newStatus: DominoGameState['status'] = 'playing';
  let pointsAwarded = 0;
  const log = [
    ...state.historyLog,
    `${who === 'player' ? 'You' : 'Opponent'} played [${tile.left}|${tile.right}] on the ${targetSide}.`,
  ];

  if (who === 'player' && newPlayerHand.length === 0) {
    newStatus = 'player_won';
    pointsAwarded = calculatePipTotal(newOpponentHand);
    log.push(`🎉 Domino! You emptied your hand! Won +${pointsAwarded} pts.`);
  } else if (who === 'opponent' && newOpponentHand.length === 0) {
    newStatus = 'opponent_won';
    pointsAwarded = calculatePipTotal(newPlayerHand);
    log.push(`Domino! Opponent emptied hand. Lost ${pointsAwarded} pts.`);
  }

  return {
    ...state,
    board: newBoard,
    leftEndNumber: newLeftEnd,
    rightEndNumber: newRightEnd,
    playerHand: newPlayerHand,
    opponentHand: newOpponentHand,
    opponentHandCount: newOpponentHandCount,
    status: newStatus,
    currentTurn: who === 'player' ? 'opponent' : 'player',
    historyLog: log.slice(-15),
    playerPoints: who === 'player' && newStatus === 'player_won' ? state.playerPoints + pointsAwarded : state.playerPoints,
    opponentPoints: who === 'opponent' && newStatus === 'opponent_won' ? state.opponentPoints + pointsAwarded : state.opponentPoints,
  };
}

// Draw a tile from boneyard
export function drawTileFromBoneyard(
  state: DominoGameState,
  who: 'player' | 'opponent'
): { state: DominoGameState; drawnTile: DominoTile | null } {
  if (state.boneyard.length === 0) return { state, drawnTile: null };

  const drawnTile = state.boneyard[0];
  const remainingBoneyard = state.boneyard.slice(1);

  if (who === 'player') {
    return {
      state: {
        ...state,
        playerHand: [...state.playerHand, drawnTile],
        boneyard: remainingBoneyard,
        historyLog: [...state.historyLog, 'You drew a tile from the boneyard.'].slice(-15),
      },
      drawnTile,
    };
  } else {
    return {
      state: {
        ...state,
        opponentHand: [...state.opponentHand, drawnTile],
        opponentHandCount: state.opponentHandCount + 1,
        boneyard: remainingBoneyard,
        historyLog: [...state.historyLog, 'Opponent drew a tile from boneyard.'].slice(-15),
      },
      drawnTile,
    };
  }
}

// Bot AI move evaluation
export function getBotMove(state: DominoGameState): {
  tile: DominoTile;
  targetSide: 'left' | 'right';
} | null {
  for (const tile of state.opponentHand) {
    const { canPlayLeft, canPlayRight } = getValidPlacements(
      tile,
      state.leftEndNumber,
      state.rightEndNumber
    );

    if (canPlayRight) return { tile, targetSide: 'right' };
    if (canPlayLeft) return { tile, targetSide: 'left' };
  }
  return null;
}
