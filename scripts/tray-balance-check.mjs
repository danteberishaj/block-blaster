const BOARD_SIZE = 8;
const RUNS_PER_FILL = 400;
const FILL_RATES = [0.35, 0.5, 0.65, 0.75, 0.82];

const TEMPLATES = [
  [[0, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
  [[0, 0], [1, 0]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
  [[0, 0], [1, 0], [1, 1]],
  [[0, 1], [1, 1], [1, 0]],
  [[0, 0], [0, 1], [1, 0]],
  [[0, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1]],
  [[0, 1], [1, 1], [2, 1], [2, 0]],
  [[0, 0], [0, 1], [0, 2], [1, 0]],
  [[0, 0], [0, 1], [0, 2], [1, 2]],
  [[0, 0], [0, 1], [0, 2], [1, 1]],
  [[0, 1], [1, 0], [1, 1], [1, 2]],
  [[0, 1], [0, 2], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 1], [1, 2]],
];

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalize(cells) {
  const minR = Math.min(...cells.map(([r]) => r));
  const minC = Math.min(...cells.map(([, c]) => c));
  const shifted = cells.map(([r, c]) => [r - minR, c - minC]);
  const height = Math.max(...shifted.map(([r]) => r)) + 1;
  const width = Math.max(...shifted.map(([, c]) => c)) + 1;
  return { cells: shifted, width, height };
}

function makeShape(templateIndex) {
  return normalize(TEMPLATES[templateIndex]);
}

function randomShape(rand) {
  return makeShape(Math.floor(rand() * TEMPLATES.length));
}

function randomTray(rand) {
  return [randomShape(rand), randomShape(rand), randomShape(rand)];
}

function shapeCatalog() {
  return TEMPLATES.map((_, index) => makeShape(index));
}

function createBoard(fillRate, rand) {
  const board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => (rand() < fillRate ? 1 : null))
  );
  return settleBoard(board);
}

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

function canPlace(board, shape, row, col) {
  for (const [dr, dc] of shape.cells) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false;
    if (board[r][c] !== null) return false;
  }
  return true;
}

function placeShape(board, shape, row, col) {
  const next = cloneBoard(board);
  for (const [dr, dc] of shape.cells) next[row + dr][col + dc] = 1;
  return next;
}

function clearLines(board) {
  let rows = 0;
  let cols = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (board[r].every((cell) => cell !== null)) rows += 1;
  }
  for (let c = 0; c < BOARD_SIZE; c++) {
    let full = true;
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (board[r][c] === null) {
        full = false;
        break;
      }
    }
    if (full) cols += 1;
  }
  return rows + cols;
}

function settleBoard(board) {
  const next = cloneBoard(board);
  const fullRows = [];
  const fullCols = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    if (next[r].every((cell) => cell !== null)) fullRows.push(r);
  }
  for (let c = 0; c < BOARD_SIZE; c++) {
    let full = true;
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (next[r][c] === null) {
        full = false;
        break;
      }
    }
    if (full) fullCols.push(c);
  }

  for (const r of fullRows) {
    for (let c = 0; c < BOARD_SIZE; c++) next[r][c] = null;
  }
  for (const c of fullCols) {
    for (let r = 0; r < BOARD_SIZE; r++) next[r][c] = null;
  }

  return next;
}

function canPlaceAnywhere(board, shape) {
  for (let r = 0; r <= BOARD_SIZE - shape.height; r++) {
    for (let c = 0; c <= BOARD_SIZE - shape.width; c++) {
      if (canPlace(board, shape, r, c)) return true;
    }
  }
  return false;
}

function immediateClearCount(board, shape) {
  let best = 0;
  for (let r = 0; r <= BOARD_SIZE - shape.height; r++) {
    for (let c = 0; c <= BOARD_SIZE - shape.width; c++) {
      if (!canPlace(board, shape, r, c)) continue;
      best = Math.max(best, clearLines(placeShape(board, shape, r, c)));
    }
  }
  return best;
}

function analyzeShapeOpportunity(board, shape) {
  let placements = 0;
  let maxImmediateLineClear = 0;
  for (let r = 0; r <= BOARD_SIZE - shape.height; r++) {
    for (let c = 0; c <= BOARD_SIZE - shape.width; c++) {
      if (!canPlace(board, shape, r, c)) continue;
      placements += 1;
      maxImmediateLineClear = Math.max(
        maxImmediateLineClear,
        clearLines(placeShape(board, shape, r, c))
      );
    }
  }
  return { placements, maxImmediateLineClear };
}

function playableRepairCandidates(board, candidates) {
  return candidates
    .map((shape) => ({ shape, stats: analyzeShapeOpportunity(board, shape) }))
    .filter(({ stats }) => stats.placements > 0)
    .sort((a, b) => {
      if (a.stats.maxImmediateLineClear !== b.stats.maxImmediateLineClear) {
        return a.stats.maxImmediateLineClear - b.stats.maxImmediateLineClear;
      }
      if (a.stats.placements !== b.stats.placements) {
        return a.stats.placements - b.stats.placements;
      }
      return b.shape.cells.length - a.shape.cells.length;
    });
}

function repairTray(board, tray, minPlayable) {
  const targetPlayable = Math.min(minPlayable, tray.length);
  if (trayStats(board, tray).playable >= targetPlayable) {
    return { tray, intervened: false };
  }

  const repairs = playableRepairCandidates(board, shapeCatalog());
  if (repairs.length === 0) return { tray, intervened: false };

  const next = tray.slice();
  const slotsByNeed = next
    .map((shape, index) => ({
      index,
      stats: analyzeShapeOpportunity(board, shape),
    }))
    .sort((a, b) => {
      if (a.stats.placements !== b.stats.placements) {
        return a.stats.placements - b.stats.placements;
      }
      return a.stats.maxImmediateLineClear - b.stats.maxImmediateLineClear;
    });

  let repairIndex = 0;
  for (const { index } of slotsByNeed) {
    if (trayStats(board, next).playable >= targetPlayable) break;
    next[index] = repairs[repairIndex % repairs.length].shape;
    repairIndex += 1;
  }

  return { tray: next, intervened: true };
}

function dealTray(board, tray) {
  if (trayStats(board, tray).playable > 0) {
    return { tray, intervened: false };
  }

  return repairTray(board, tray, 1);
}

function shuffleTray(board, rand, attempts = 8) {
  let bestTray = randomTray(rand);
  let bestStats = trayStats(board, bestTray);
  if (bestStats.playable >= 2) return { tray: bestTray, intervened: false };

  for (let i = 1; i < attempts; i++) {
    const tray = randomTray(rand);
    const stats = trayStats(board, tray);
    if (stats.playable >= 2) return { tray, intervened: false };
    if (
      stats.playable > bestStats.playable ||
      (stats.playable === bestStats.playable &&
        totalPlacements(board, tray) > totalPlacements(board, bestTray))
    ) {
      bestTray = tray;
      bestStats = stats;
    }
  }

  return repairTray(board, bestTray, 2);
}

function trayStats(board, tray) {
  const playable = tray.filter((shape) => canPlaceAnywhere(board, shape)).length;
  const immediateClear = tray.some((shape) => immediateClearCount(board, shape) > 0);
  const multiLine = tray.some((shape) => immediateClearCount(board, shape) >= 2);
  return { playable, immediateClear, multiLine };
}

function totalPlacements(board, tray) {
  return tray.reduce(
    (sum, shape) => sum + analyzeShapeOpportunity(board, shape).placements,
    0
  );
}

function pct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

const rand = rng(0xB10CBA57);
let failed = false;

console.log('Tray balance check');
console.log(`boards per fill: ${RUNS_PER_FILL}`);
console.log('fill | raw dead | dealt dead | intervention | helper dead | helper 2+ | playable lift | clear lift | multi-line dealt');

for (const fillRate of FILL_RATES) {
  const aggregate = {
    randomDead: 0,
    smartDead: 0,
    randomPlayable: 0,
    smartPlayable: 0,
    randomClear: 0,
    smartClear: 0,
    smartMulti: 0,
    helperDead: 0,
    helperTwoPlus: 0,
    intervention: 0,
  };

  for (let i = 0; i < RUNS_PER_FILL; i++) {
    const board = createBoard(fillRate, rand);
    const rawTray = randomTray(rand);
    const plain = trayStats(board, rawTray);
    const dealt = dealTray(board, rawTray);
    const smart = trayStats(board, dealt.tray);
    const helper = trayStats(board, shuffleTray(board, rand).tray);

    aggregate.randomDead += plain.playable === 0 ? 1 : 0;
    aggregate.smartDead += smart.playable === 0 ? 1 : 0;
    aggregate.helperDead += helper.playable === 0 ? 1 : 0;
    aggregate.randomPlayable += plain.playable;
    aggregate.smartPlayable += smart.playable;
    aggregate.randomClear += plain.immediateClear ? 1 : 0;
    aggregate.smartClear += smart.immediateClear ? 1 : 0;
    aggregate.smartMulti += smart.multiLine ? 1 : 0;
    aggregate.helperTwoPlus += helper.playable >= 2 ? 1 : 0;
    aggregate.intervention += dealt.intervened ? 1 : 0;
  }

  const randomDead = aggregate.randomDead / RUNS_PER_FILL;
  const smartDead = aggregate.smartDead / RUNS_PER_FILL;
  const randomPlayable = aggregate.randomPlayable / RUNS_PER_FILL;
  const smartPlayable = aggregate.smartPlayable / RUNS_PER_FILL;
  const playableLift = smartPlayable - randomPlayable;
  const randomClear = aggregate.randomClear / RUNS_PER_FILL;
  const smartClear = aggregate.smartClear / RUNS_PER_FILL;
  const clearLift = smartClear - randomClear;
  const smartMulti = aggregate.smartMulti / RUNS_PER_FILL;
  const intervention = aggregate.intervention / RUNS_PER_FILL;
  const helperDead = aggregate.helperDead / RUNS_PER_FILL;
  const helperTwoPlus = aggregate.helperTwoPlus / RUNS_PER_FILL;

  console.log(
    [
      fillRate.toFixed(2),
      pct(randomDead),
      pct(smartDead),
      pct(intervention),
      pct(helperDead),
      pct(helperTwoPlus),
      playableLift.toFixed(2),
      pct(clearLift),
      pct(smartMulti),
    ].join(' | ')
  );

  if (fillRate <= 0.75 && smartDead > 0.01) failed = true;
  if (helperDead > 0) failed = true;
  if (Math.abs(intervention - randomDead) > 0.01) failed = true;
  if (fillRate >= 0.75 && clearLift > 0.1) failed = true;
}

if (failed) {
  console.error('Tray balance check failed: fairness looks too dead or too curated.');
  process.exit(1);
}
