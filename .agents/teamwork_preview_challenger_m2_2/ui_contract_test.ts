import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Import pure TypeScript engine modules and audio service
import { createInitialGameState, fromFEN, algebraicToSquare } from '../../src/games/chess/chessLogic.ts';
import type { Piece, PieceColor, PieceType, ChessGameState } from '../../src/games/chess/chessTypes.ts';
import {
  playChessSound,
  isAudioMuted,
  setAudioMuted,
  toggleAudioMuted,
  type ChessSoundType,
} from '../../src/games/chess/chessAudio.ts';

const PROJECT_ROOT = path.resolve('c:/Users/ditob/Documents/viper');

// Material score definition matching ChessArena.tsx
const PIECE_SCORES: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

// Replicate ChessArena.tsx material calculation logic for testing
function computeMaterialState(board: (Piece | null)[]) {
  const totalPieces: Record<PieceColor, Record<PieceType, number>> = {
    w: { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 },
    b: { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 },
  };

  const remainingPieces: Record<PieceColor, Record<PieceType, number>> = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  };

  for (const piece of board) {
    if (piece) {
      remainingPieces[piece.color][piece.type]++;
    }
  }

  const whiteCapturedList: Piece[] = [];
  const blackCapturedList: Piece[] = [];
  const pieceOrder: PieceType[] = ['q', 'r', 'b', 'n', 'p'];

  for (const type of pieceOrder) {
    const bLost = Math.max(0, totalPieces.b[type] - remainingPieces.b[type]);
    for (let i = 0; i < bLost; i++) {
      whiteCapturedList.push({ type, color: 'b' });
    }

    const wLost = Math.max(0, totalPieces.w[type] - remainingPieces.w[type]);
    for (let i = 0; i < wLost; i++) {
      blackCapturedList.push({ type, color: 'w' });
    }
  }

  let wScore = 0;
  let bScore = 0;
  for (const type of pieceOrder) {
    wScore += remainingPieces.w[type] * PIECE_SCORES[type];
    bScore += remainingPieces.b[type] * PIECE_SCORES[type];
  }

  const diff = wScore - bScore;

  return {
    wScore,
    bScore,
    diff,
    whiteCaptured: whiteCapturedList,
    blackCaptured: blackCapturedList,
    whiteDiff: diff > 0 ? diff : 0,
    blackDiff: diff < 0 ? Math.abs(diff) : 0,
  };
}

// ---------------------------------------------------------------------------
// SUITE 1: Material Balance Differential Calculations
// ---------------------------------------------------------------------------
test('Material Calculation - Initial starting position has zero differential', () => {
  const initial = createInitialGameState();
  const res = computeMaterialState(initial.board);

  assert.equal(res.wScore, 39, 'White initial score should be 39 (8+6+6+10+9)');
  assert.equal(res.bScore, 39, 'Black initial score should be 39 (8+6+6+10+9)');
  assert.equal(res.diff, 0, 'Initial differential should be 0');
  assert.equal(res.whiteDiff, 0, 'whiteDiff should be 0');
  assert.equal(res.blackDiff, 0, 'blackDiff should be 0');
  assert.equal(res.whiteCaptured.length, 0, 'No pieces captured by white initially');
  assert.equal(res.blackCaptured.length, 0, 'No pieces captured by black initially');
});

test('Material Calculation - Single piece differences (Pawn, Minor, Rook, Queen)', () => {
  const initial = createInitialGameState();

  // Remove 1 Black pawn at e7
  const boardPawn = [...initial.board];
  boardPawn[algebraicToSquare('e7')] = null;
  const resPawn = computeMaterialState(boardPawn);
  assert.equal(resPawn.diff, 1, 'White +1 after Black lost pawn');
  assert.equal(resPawn.whiteDiff, 1);
  assert.equal(resPawn.blackDiff, 0);
  assert.equal(resPawn.whiteCaptured.length, 1);
  assert.equal(resPawn.whiteCaptured[0].type, 'p');
  assert.equal(resPawn.whiteCaptured[0].color, 'b');

  // Remove 1 White knight at b1
  const boardKnight = [...initial.board];
  boardKnight[algebraicToSquare('b1')] = null;
  const resKnight = computeMaterialState(boardKnight);
  assert.equal(resKnight.diff, -3, 'Black +3 after White lost knight');
  assert.equal(resKnight.whiteDiff, 0);
  assert.equal(resKnight.blackDiff, 3);
  assert.equal(resKnight.blackCaptured.length, 1);
  assert.equal(resKnight.blackCaptured[0].type, 'n');
  assert.equal(resKnight.blackCaptured[0].color, 'w');

  // Remove 1 Black rook at h8
  const boardRook = [...initial.board];
  boardRook[algebraicToSquare('h8')] = null;
  const resRook = computeMaterialState(boardRook);
  assert.equal(resRook.diff, 5, 'White +5 after Black lost rook');
  assert.equal(resRook.whiteDiff, 5);
  assert.equal(resRook.blackDiff, 0);

  // Remove 1 Black queen at d8
  const boardQueen = [...initial.board];
  boardQueen[algebraicToSquare('d8')] = null;
  const resQueen = computeMaterialState(boardQueen);
  assert.equal(resQueen.diff, 9, 'White +9 after Black lost queen');
  assert.equal(resQueen.whiteDiff, 9);
  assert.equal(resQueen.blackDiff, 0);
});

test('Material Calculation - Symmetrical piece trades', () => {
  const initial = createInitialGameState();
  const board = [...initial.board];
  // Trade Queens (d1 and d8)
  board[algebraicToSquare('d1')] = null;
  board[algebraicToSquare('d8')] = null;

  const res = computeMaterialState(board);
  assert.equal(res.wScore, 30);
  assert.equal(res.bScore, 30);
  assert.equal(res.diff, 0);
  assert.equal(res.whiteDiff, 0);
  assert.equal(res.blackDiff, 0);
  assert.equal(res.whiteCaptured.length, 1);
  assert.equal(res.whiteCaptured[0].type, 'q');
  assert.equal(res.blackCaptured.length, 1);
  assert.equal(res.blackCaptured[0].type, 'q');
});

test('Material Calculation - Asymmetrical piece exchanges', () => {
  // White has Rook (5), Black has Bishop (3) -> White +2
  const emptyBoard: (Piece | null)[] = Array(64).fill(null);
  emptyBoard[0] = { type: 'k', color: 'w' };
  emptyBoard[63] = { type: 'k', color: 'b' };
  emptyBoard[10] = { type: 'r', color: 'w' };
  emptyBoard[20] = { type: 'b', color: 'b' };

  const res1 = computeMaterialState(emptyBoard);
  assert.equal(res1.wScore, 5);
  assert.equal(res1.bScore, 3);
  assert.equal(res1.diff, 2);
  assert.equal(res1.whiteDiff, 2);
  assert.equal(res1.blackDiff, 0);

  // Queen (9) vs 2 Rooks (10) -> Black +1
  emptyBoard[10] = { type: 'q', color: 'w' };
  emptyBoard[20] = { type: 'r', color: 'b' };
  emptyBoard[21] = { type: 'r', color: 'b' };

  const res2 = computeMaterialState(emptyBoard);
  assert.equal(res2.wScore, 9);
  assert.equal(res2.bScore, 10);
  assert.equal(res2.diff, -1);
  assert.equal(res2.whiteDiff, 0);
  assert.equal(res2.blackDiff, 1);
});

test('Material Calculation - Pawn promotions & multiple Queens', () => {
  // White promotes 2 pawns to Queens (3 Queens total, 6 pawns remaining)
  const emptyBoard: (Piece | null)[] = Array(64).fill(null);
  emptyBoard[0] = { type: 'k', color: 'w' };
  emptyBoard[63] = { type: 'k', color: 'b' };
  // White 3 Queens
  emptyBoard[1] = { type: 'q', color: 'w' };
  emptyBoard[2] = { type: 'q', color: 'w' };
  emptyBoard[3] = { type: 'q', color: 'w' };
  // Black 1 Queen
  emptyBoard[4] = { type: 'q', color: 'b' };

  const res = computeMaterialState(emptyBoard);
  assert.equal(res.wScore, 27, '3 Queens = 27 pts');
  assert.equal(res.bScore, 9, '1 Queen = 9 pts');
  assert.equal(res.diff, 18);
  assert.equal(res.whiteDiff, 18);
  assert.equal(res.blackDiff, 0);
});

test('Material Calculation - Maximum theoretical promotion board (9 Queens)', () => {
  const board: (Piece | null)[] = Array(64).fill(null);
  board[0] = { type: 'k', color: 'w' };
  board[63] = { type: 'k', color: 'b' };
  // 9 White Queens
  for (let i = 1; i <= 9; i++) {
    board[i] = { type: 'q', color: 'w' };
  }

  const res = computeMaterialState(board);
  assert.equal(res.wScore, 81, '9 Queens * 9 = 81 pts');
  assert.equal(res.bScore, 0);
  assert.equal(res.diff, 81);
  assert.equal(res.whiteDiff, 81);
  assert.equal(res.blackDiff, 0);
});

test('Material Calculation - Underpromotions (Knight, Rook, Bishop)', () => {
  const board: (Piece | null)[] = Array(64).fill(null);
  board[0] = { type: 'k', color: 'w' };
  board[63] = { type: 'k', color: 'b' };

  // White has 5 Knights
  board[1] = { type: 'n', color: 'w' };
  board[2] = { type: 'n', color: 'w' };
  board[3] = { type: 'n', color: 'w' };
  board[4] = { type: 'n', color: 'w' };
  board[5] = { type: 'n', color: 'w' };

  // Black has 3 Bishops
  board[10] = { type: 'b', color: 'b' };
  board[11] = { type: 'b', color: 'b' };
  board[12] = { type: 'b', color: 'b' };

  const res = computeMaterialState(board);
  assert.equal(res.wScore, 15, '5 Knights * 3 = 15');
  assert.equal(res.bScore, 9, '3 Bishops * 3 = 9');
  assert.equal(res.diff, 6);
  assert.equal(res.whiteDiff, 6);
  assert.equal(res.blackDiff, 0);
});

test('Material Calculation - Fuzz / Stress Test across 2,000 arbitrary configurations', () => {
  const pieceTypes: PieceType[] = ['p', 'n', 'b', 'r', 'q', 'k'];
  const colors: PieceColor[] = ['w', 'b'];

  for (let seed = 0; seed < 2000; seed++) {
    const board: (Piece | null)[] = Array(64).fill(null);
    // Always place kings
    board[0] = { type: 'k', color: 'w' };
    board[63] = { type: 'k', color: 'b' };

    // Place random number of pieces (0 to 20 random pieces)
    const numPieces = Math.floor(Math.random() * 21);
    for (let i = 0; i < numPieces; i++) {
      const sq = 1 + Math.floor(Math.random() * 62);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const type = pieceTypes[Math.floor(Math.random() * 5)]; // non-king
      board[sq] = { type, color };
    }

    const res = computeMaterialState(board);

    // Invariant checks
    assert.ok(res.whiteDiff >= 0, `whiteDiff must be >= 0 (got ${res.whiteDiff})`);
    assert.ok(res.blackDiff >= 0, `blackDiff must be >= 0 (got ${res.blackDiff})`);
    assert.equal(
      res.whiteDiff * res.blackDiff,
      0,
      'Both whiteDiff and blackDiff cannot be simultaneously positive'
    );
    assert.equal(
      res.diff,
      res.whiteDiff - res.blackDiff,
      'diff must equal whiteDiff - blackDiff'
    );

    if (res.wScore > res.bScore) {
      assert.equal(res.whiteDiff, res.wScore - res.bScore);
      assert.equal(res.blackDiff, 0);
    } else if (res.bScore > res.wScore) {
      assert.equal(res.blackDiff, res.bScore - res.wScore);
      assert.equal(res.whiteDiff, 0);
    } else {
      assert.equal(res.whiteDiff, 0);
      assert.equal(res.blackDiff, 0);
    }

    // Captured lists invariants
    for (const p of res.whiteCaptured) {
      assert.equal(p.color, 'b', 'Pieces captured by White must be Black');
    }
    for (const p of res.blackCaptured) {
      assert.equal(p.color, 'w', 'Pieces captured by Black must be White');
    }
  }
});

// ---------------------------------------------------------------------------
// SUITE 2: BoardView.tsx Playable Registration Contract
// ---------------------------------------------------------------------------
test('BoardView.tsx - Exports BOARD_GAMES with chess isPlayable: true', () => {
  const boardViewPath = path.join(PROJECT_ROOT, 'src/components/views/BoardView.tsx');
  assert.ok(fs.existsSync(boardViewPath), 'BoardView.tsx must exist');

  const sourceCode = fs.readFileSync(boardViewPath, 'utf8');

  // Transpile to CJS and evaluate exported constant
  const transpiled = ts.transpileModule(sourceCode, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });

  const mod: { exports: { BOARD_GAMES?: Array<{ id: string; isPlayable: boolean; category: string; title: string }> } } = { exports: {} };
  const runFn = new Function('require', 'exports', 'module', transpiled.outputText);
  runFn(() => ({}), mod.exports, mod);

  assert.ok(Array.isArray(mod.exports.BOARD_GAMES), 'BOARD_GAMES must be an array');

  const chessEntry = mod.exports.BOARD_GAMES.find((g) => g.id === 'chess');
  assert.ok(chessEntry, 'BOARD_GAMES must include chess entry');
  assert.equal(chessEntry.id, 'chess');
  assert.equal(chessEntry.title, 'Chess');
  assert.equal(chessEntry.category, 'board');
  assert.equal(chessEntry.isPlayable, true, 'chess must be marked isPlayable: true');
});

test('BoardView.tsx - AST analysis verifies onPlay handler wiring', () => {
  const boardViewPath = path.join(PROJECT_ROOT, 'src/components/views/BoardView.tsx');
  const sourceCode = fs.readFileSync(boardViewPath, 'utf8');

  const sourceFile = ts.createSourceFile(
    'BoardView.tsx',
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  let hasOnPlayProp = false;
  let hasGameVisualCardWithOnPlay = false;

  function visit(node: ts.Node) {
    // Check Interface BoardViewProps
    if (ts.isInterfaceDeclaration(node) && node.name.text === 'BoardViewProps') {
      for (const member of node.members) {
        if (ts.isPropertySignature(member) && member.name.getText(sourceFile) === 'onPlay') {
          hasOnPlayProp = true;
        }
      }
    }

    // Check JSX Element GameVisualCard passing onPlay
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      if (node.tagName.getText(sourceFile) === 'GameVisualCard') {
        for (const attr of node.attributes.properties) {
          if (ts.isJsxAttribute(attr) && attr.name.getText(sourceFile) === 'onPlay') {
            hasGameVisualCardWithOnPlay = true;
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  assert.ok(hasOnPlayProp, 'BoardViewProps must define onPlay');
  assert.ok(hasGameVisualCardWithOnPlay, 'GameVisualCard must receive onPlay prop');
});

// ---------------------------------------------------------------------------
// SUITE 3: App.tsx Platform Routing Contracts
// ---------------------------------------------------------------------------
test('App.tsx - AST analysis verifies chess arena routing, state, and controls', () => {
  const appPath = path.join(PROJECT_ROOT, 'src/App.tsx');
  assert.ok(fs.existsSync(appPath), 'App.tsx must exist');

  const sourceCode = fs.readFileSync(appPath, 'utf8');
  const sourceFile = ts.createSourceFile(
    'App.tsx',
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  let importsChessArena = false;
  let activeArenaHasChess = false;
  let handleLaunchGameHandlesChess = false;
  let rendersChessArenaWithControls = false;

  function visit(node: ts.Node) {
    // Check import { ChessArena } from './games/chess/ChessArena'
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier.getText(sourceFile).replace(/['"]/g, '');
      if (moduleSpecifier.includes('ChessArena')) {
        const namedBindings = node.importClause?.namedBindings;
        if (namedBindings && ts.isNamedImports(namedBindings)) {
          if (namedBindings.elements.some((el) => el.name.text === 'ChessArena')) {
            importsChessArena = true;
          }
        }
      }
    }

    // Check useState<'joker' | 'poker' | 'domino' | 'chess' | null>
    if (ts.isCallExpression(node) && node.expression.getText(sourceFile).includes('useState')) {
      if (node.typeArguments && node.typeArguments.length > 0) {
        const typeText = node.typeArguments[0].getText(sourceFile);
        if (typeText.includes("'chess'")) {
          activeArenaHasChess = true;
        }
      }
    }

    // Check handleLaunchGame: else if (gameId === 'chess') setActiveArena('chess')
    if (ts.isIfStatement(node)) {
      const conditionText = node.expression.getText(sourceFile);
      if (conditionText.includes("'chess'")) {
        const statementText = node.thenStatement.getText(sourceFile);
        if (statementText.includes("setActiveArena('chess')")) {
          handleLaunchGameHandlesChess = true;
        }
      }
    }

    // Check <ChessArena onExit={() => setActiveArena(null)} showNavbar={...} onToggleNavbar={...} />
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      if (node.tagName.getText(sourceFile) === 'ChessArena') {
        const attrNames = node.attributes.properties
          .filter(ts.isJsxAttribute)
          .map((a) => a.name.getText(sourceFile));

        if (
          attrNames.includes('onExit') &&
          attrNames.includes('showNavbar') &&
          attrNames.includes('onToggleNavbar')
        ) {
          rendersChessArenaWithControls = true;
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  assert.ok(importsChessArena, 'App.tsx must import ChessArena');
  assert.ok(activeArenaHasChess, 'activeArena state must allow chess in its union type');
  assert.ok(handleLaunchGameHandlesChess, "handleLaunchGame must handle 'chess' gameId");
  assert.ok(
    rendersChessArenaWithControls,
    'App.tsx must render ChessArena with onExit, showNavbar, onToggleNavbar'
  );
});

// ---------------------------------------------------------------------------
// SUITE 4: Audio Synthesizer Interface Contract (chessAudio.ts)
// ---------------------------------------------------------------------------
test('chessAudio.ts - Exposes all required sound methods and mute helpers', () => {
  // Verify function exports
  assert.equal(typeof playChessSound, 'function', 'playChessSound must be exported');
  assert.equal(typeof isAudioMuted, 'function', 'isAudioMuted must be exported');
  assert.equal(typeof setAudioMuted, 'function', 'setAudioMuted must be exported');
  assert.equal(typeof toggleAudioMuted, 'function', 'toggleAudioMuted must be exported');

  // Required sound types as per spec
  const requiredSounds: ChessSoundType[] = [
    'move',
    'capture',
    'check',
    'castle',
    'victory',
    'defeat',
  ];

  // In Node environment (window is undefined), playChessSound should degrade gracefully without throwing
  for (const sound of requiredSounds) {
    assert.doesNotThrow(() => {
      playChessSound(sound);
    }, `playChessSound('${sound}') should not throw when AudioContext is unavailable`);
  }

  // Also test illegal sound
  assert.doesNotThrow(() => {
    playChessSound('illegal');
  });

  // Test mute functionality
  setAudioMuted(true);
  assert.equal(isAudioMuted(), true);

  // Calling playChessSound while muted should return immediately and not throw
  assert.doesNotThrow(() => {
    playChessSound('move');
  });

  const toggled = toggleAudioMuted();
  assert.equal(toggled, false);
  assert.equal(isAudioMuted(), false);

  setAudioMuted(false);
  assert.equal(isAudioMuted(), false);
});

test('chessAudio.ts - Mock AudioContext tests synthesis pipelines for all sounds', () => {
  // Set up mock window and AudioContext to exercise procedural sound generators
  const createdOscillators: Array<{
    type: string;
    started: boolean;
    stopped: boolean;
    freqSet: number[];
  }> = [];

  const createdGains: Array<{
    gainSet: number[];
  }> = [];

  class MockGain {
    gain = {
      setValueAtTime: (val: number, _t: number) => this.gainSet.push(val),
      exponentialRampToValueAtTime: (val: number, _t: number) => this.gainSet.push(val),
    };
    gainSet: number[] = [];
    connect(_dest: unknown) {}
  }

  class MockOscillator {
    type = 'sine';
    frequency = {
      setValueAtTime: (val: number, _t: number) => this.freqSet.push(val),
      exponentialRampToValueAtTime: (val: number, _t: number) => this.freqSet.push(val),
    };
    freqSet: number[] = [];
    started = false;
    stopped = false;
    connect(_dest: unknown) {}
    start(_t?: number) {
      this.started = true;
    }
    stop(_t?: number) {
      this.stopped = true;
    }
  }

  class MockAudioContext {
    currentTime = 100.0;
    state = 'running';
    destination = {};
    createOscillator() {
      const osc = new MockOscillator();
      createdOscillators.push(osc);
      return osc;
    }
    createGain() {
      const gain = new MockGain();
      createdGains.push(gain);
      return gain;
    }
    resume() {
      return Promise.resolve();
    }
  }

  (globalThis as unknown as { window: { AudioContext: typeof MockAudioContext } }).window = {
    AudioContext: MockAudioContext,
  };

  setAudioMuted(false);

  const sounds: ChessSoundType[] = ['move', 'capture', 'castle', 'check', 'victory', 'defeat', 'illegal'];

  for (const snd of sounds) {
    const oscBefore = createdOscillators.length;
    playChessSound(snd);
    const oscAfter = createdOscillators.length;
    assert.ok(
      oscAfter > oscBefore,
      `Sound '${snd}' should create at least one oscillator in AudioContext`
    );
  }

  // Cleanup mock window
  delete (globalThis as unknown as { window?: unknown }).window;
});

// ---------------------------------------------------------------------------
// SUITE 5: ChessArena.tsx UI Controls & HUD Integration
// ---------------------------------------------------------------------------
test('ChessArena.tsx - AST analysis verifies GameWindowControls, timers, and HUD features', () => {
  const arenaPath = path.join(PROJECT_ROOT, 'src/games/chess/ChessArena.tsx');
  assert.ok(fs.existsSync(arenaPath), 'ChessArena.tsx must exist');

  const sourceCode = fs.readFileSync(arenaPath, 'utf8');
  const sourceFile = ts.createSourceFile(
    'ChessArena.tsx',
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  let importsGameWindowControls = false;
  let importsChessBoardView = false;
  let importsChessPieceView = false;
  let importsAiService = false;
  let importsAudioService = false;
  let hasGameWindowControlsElement = false;

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      const text = node.getText(sourceFile);
      if (text.includes('GameWindowControls')) importsGameWindowControls = true;
      if (text.includes('ChessBoardView')) importsChessBoardView = true;
      if (text.includes('ChessPieceView')) importsChessPieceView = true;
      if (text.includes('getBestMove')) importsAiService = true;
      if (text.includes('playChessSound')) importsAudioService = true;
    }

    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      if (node.tagName.getText(sourceFile) === 'GameWindowControls') {
        hasGameWindowControlsElement = true;
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  assert.ok(importsGameWindowControls, 'ChessArena must import GameWindowControls');
  assert.ok(importsChessBoardView, 'ChessArena must import ChessBoardView');
  assert.ok(importsChessPieceView, 'ChessArena must import ChessPieceView');
  assert.ok(importsAiService, 'ChessArena must import getBestMove');
  assert.ok(importsAudioService, 'ChessArena must import playChessSound');
  assert.ok(hasGameWindowControlsElement, 'ChessArena must render GameWindowControls');

  // String check for key interactive HUD strings
  assert.ok(sourceCode.includes('TIMER_SECONDS'), 'Must define timer presets');
  assert.ok(sourceCode.includes('PIECE_SCORES'), 'Must define piece values');
  assert.ok(sourceCode.includes('topDiff > 0'), 'Must render top player material diff badge');
  assert.ok(sourceCode.includes('bottomDiff > 0'), 'Must render bottom player material diff badge');
  assert.ok(sourceCode.includes('evaluating...'), 'Must render AI evaluating indicator');
  assert.ok(sourceCode.includes('handleRestartMatch'), 'Must include restart handler');
  assert.ok(sourceCode.includes('handleResign'), 'Must include resign handler');
});

// ---------------------------------------------------------------------------
// SUITE 6: ChessBoardView.tsx Dual Interaction & Visual Indicators Contract
// ---------------------------------------------------------------------------
test('ChessBoardView.tsx - AST & feature analysis verifies move indicators and drag-and-drop', () => {
  const boardViewPath = path.join(PROJECT_ROOT, 'src/games/chess/ChessBoardView.tsx');
  assert.ok(fs.existsSync(boardViewPath), 'ChessBoardView.tsx must exist');

  const sourceCode = fs.readFileSync(boardViewPath, 'utf8');

  // Verify pointer events
  assert.ok(sourceCode.includes('handlePointerDown'), 'Must handle pointer down');
  assert.ok(sourceCode.includes('handlePointerMove'), 'Must handle pointer move');
  assert.ok(sourceCode.includes('handlePointerUp'), 'Must handle pointer up');
  assert.ok(sourceCode.includes('setPointerCapture'), 'Must capture pointer for fluid dragging');

  // Verify touch offset (-32px) for mobile occlusion prevention
  assert.ok(sourceCode.includes('- 32'), 'Must include touch offset for drag visibility');

  // Verify visual move indicators
  assert.ok(sourceCode.includes('isCheckSquare'), 'Must evaluate king in check aura');
  assert.ok(sourceCode.includes('isCaptureTarget'), 'Must evaluate capture target ring');
  assert.ok(sourceCode.includes('isLegalTarget'), 'Must evaluate quiet destination dots');
  assert.ok(sourceCode.includes('isLastMoveSquare'), 'Must highlight last move squares');

  // Verify promotion modal and keyboard hotkeys [Q, R, B, N]
  assert.ok(sourceCode.includes('pendingPromotion'), 'Must support promotion dialog');
  assert.ok(sourceCode.includes("key === 'q'"), 'Must support Queen hotkey');
  assert.ok(sourceCode.includes("key === 'r'"), 'Must support Rook hotkey');
  assert.ok(sourceCode.includes("key === 'b'"), 'Must support Bishop hotkey');
  assert.ok(sourceCode.includes("key === 'n'"), 'Must support Knight hotkey');
});
