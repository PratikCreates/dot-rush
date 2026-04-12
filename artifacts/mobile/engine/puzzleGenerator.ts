import { SeededRandom } from "./seededRandom";
import { greedyGraphColor } from "./graphColoring";
import { THEMES, ThemeName } from "./themes";

export type Difficulty = "easy" | "medium" | "hard";

export interface Dot {
  id: number;
  x: number;
  y: number;
}

export interface PuzzleShape {
  id: number;
  dotIds: number[];
  color: string;
  isConnected: boolean;
  isColored: boolean;
  filledColor: string | null;
}

export interface Puzzle {
  seed: number;
  difficulty: Difficulty;
  theme: ThemeName;
  gridSize: number;
  dots: Dot[];
  shapes: PuzzleShape[];
  totalDots: number;
}

const DIFFICULTY_PARAMS: Record<Difficulty, { gridSize: number; numRegions: number; targetDots: number }> = {
  easy:   { gridSize: 9,  numRegions: 10, targetDots: 64  },
  medium: { gridSize: 12, numRegions: 18, targetDots: 128 },
  hard:   { gridSize: 16, numRegions: 32, targetDots: 256 },
};

type Cell = [number, number];

function growRegions(gridSize: number, numRegions: number, rng: SeededRandom): number[][] {
  const grid: number[][] = Array.from({ length: gridSize }, () =>
    new Array(gridSize).fill(-1)
  );

  const seeds: Cell[] = [];
  let attempts = 0;
  while (seeds.length < numRegions && attempts < 2000) {
    attempts++;
    const r = rng.nextInt(0, gridSize - 1);
    const c = rng.nextInt(0, gridSize - 1);
    if (grid[r][c] === -1) {
      grid[r][c] = seeds.length;
      seeds.push([r, c]);
    }
  }

  const dirs: Cell[] = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  let frontier: Array<[number, Cell]> = seeds.map((cell, i) => [i, cell]);

  while (frontier.length > 0) {
    frontier = rng.shuffle(frontier);
    const next: Array<[number, Cell]> = [];
    for (const [region, [r, c]] of frontier) {
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize && grid[nr][nc] === -1) {
          grid[nr][nc] = region;
          next.push([region, [nr, nc]]);
        }
      }
    }
    frontier = next;
  }

  return grid;
}

function getRegionCells(grid: number[][], numRegions: number): Map<number, Cell[]> {
  const map = new Map<number, Cell[]>();
  for (let i = 0; i < numRegions; i++) map.set(i, []);
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const region = grid[r][c];
      if (region >= 0) map.get(region)!.push([r, c]);
    }
  }
  return map;
}

function extractBoundaryPolygon(cells: Cell[], grid: number[][]): Array<{ x: number; y: number }> {
  const cellSet = new Set(cells.map(([r, c]) => `${r},${c}`));

  const edges: Array<{ from: { x: number; y: number }; to: { x: number; y: number } }> = [];

  for (const [row, col] of cells) {
    if (!cellSet.has(`${row - 1},${col}`)) {
      edges.push({ from: { x: col, y: row }, to: { x: col + 1, y: row } });
    }
    if (!cellSet.has(`${row},${col + 1}`)) {
      edges.push({ from: { x: col + 1, y: row }, to: { x: col + 1, y: row + 1 } });
    }
    if (!cellSet.has(`${row + 1},${col}`)) {
      edges.push({ from: { x: col + 1, y: row + 1 }, to: { x: col, y: row + 1 } });
    }
    if (!cellSet.has(`${row},${col - 1}`)) {
      edges.push({ from: { x: col, y: row + 1 }, to: { x: col, y: row } });
    }
  }

  if (edges.length === 0) return [];

  const adj = new Map<string, Array<{ x: number; y: number }>>();
  for (const { from, to } of edges) {
    const key = `${from.x},${from.y}`;
    if (!adj.has(key)) adj.set(key, []);
    adj.get(key)!.push(to);
  }

  const start = edges[0].from;
  const startKey = `${start.x},${start.y}`;
  const polygon: Array<{ x: number; y: number }> = [start];
  let currentKey = startKey;
  let prevKey = "";

  for (let safety = 0; safety < edges.length * 2; safety++) {
    const nexts = adj.get(currentKey) ?? [];
    let next: { x: number; y: number } | null = null;
    for (const n of nexts) {
      const nKey = `${n.x},${n.y}`;
      if (nKey !== prevKey) {
        next = n;
        break;
      }
    }
    if (!next) break;
    const nextKey = `${next.x},${next.y}`;
    if (nextKey === startKey) break;
    prevKey = currentKey;
    polygon.push(next);
    currentKey = nextKey;
  }

  return simplifyPolygon(polygon);
}

function simplifyPolygon(poly: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  if (poly.length <= 3) return poly;
  const result: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < poly.length; i++) {
    const prev = poly[(i - 1 + poly.length) % poly.length];
    const curr = poly[i];
    const next = poly[(i + 1) % poly.length];
    const cross =
      (curr.x - prev.x) * (next.y - prev.y) -
      (curr.y - prev.y) * (next.x - prev.x);
    if (Math.abs(cross) > 0.001) {
      result.push(curr);
    }
  }
  return result.length >= 3 ? result : poly;
}

function computeAdjacency(grid: number[][], gridSize: number, numRegions: number): Set<number>[] {
  const adj: Set<number>[] = Array.from({ length: numRegions }, () => new Set());
  const dirs: Cell[] = [[0, 1], [1, 0]];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr < gridSize && nc < gridSize) {
          const a = grid[r][c], b = grid[nr][nc];
          if (a !== b && a >= 0 && b >= 0) {
            adj[a].add(b);
            adj[b].add(a);
          }
        }
      }
    }
  }
  return adj;
}

/**
 * Add midpoint dots along shape edges until the total dot count reaches exactly `target`.
 * Selects the longest available edge globally on each iteration so shapes
 * receive extra dots in a visually balanced way.
 */
function subdivideEdgesToTarget(
  shapes: PuzzleShape[],
  dots: Dot[],
  dotMap: Map<string, number>,
  target: number,
): void {
  let safetyLimit = target * 3; // prevent infinite loops

  while (dots.length < target && safetyLimit-- > 0) {
    let bestSi = -1;
    let bestDi = -1;
    let bestLen = 0;

    for (let si = 0; si < shapes.length; si++) {
      const { dotIds } = shapes[si];
      for (let di = 0; di < dotIds.length; di++) {
        const a = dots[dotIds[di]];
        const b = dots[dotIds[(di + 1) % dotIds.length]];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        if (len > bestLen) {
          bestLen = len;
          bestSi = si;
          bestDi = di;
        }
      }
    }

    if (bestSi < 0 || bestLen < 0.01) break; // nothing more to subdivide

    const shape = shapes[bestSi];
    const a = dots[shape.dotIds[bestDi]];
    const b = dots[shape.dotIds[(bestDi + 1) % shape.dotIds.length]];
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const key = `${mx},${my}`;

    let midId: number;
    if (dotMap.has(key)) {
      midId = dotMap.get(key)!;
      // Already exists — still insert into this shape's dotIds if missing
      if (shape.dotIds.includes(midId)) {
        // Edge is already as short as it can go; skip
        break;
      }
    } else {
      midId = dots.length;
      dotMap.set(key, midId);
      dots.push({ id: midId, x: mx, y: my });
    }

    // Insert midId after bestDi in this shape's boundary sequence
    shape.dotIds.splice(bestDi + 1, 0, midId);
  }
}

/**
 * Remove extra dots from shapes, preferring to merge collinear / very-short
 * edges until the total unique dot count equals the target. This handles the
 * case where the grid naturally generates more dots than the target.
 *
 * Note: shared dots (used by multiple shapes) cannot be removed.
 */
function pruneDotsToTarget(
  shapes: PuzzleShape[],
  dots: Dot[],
  dotMap: Map<string, number>,
  target: number,
): void {
  let safetyLimit = (dots.length - target) * 4;

  // Build per-dot usage count so we never remove shared dots
  const usageCount = new Map<number, number>();
  for (const shape of shapes) {
    for (const id of shape.dotIds) {
      usageCount.set(id, (usageCount.get(id) ?? 0) + 1);
    }
  }

  while (dots.length > target && safetyLimit-- > 0) {
    let bestSi = -1;
    let bestDi = -1;
    let bestLen = Infinity;

    for (let si = 0; si < shapes.length; si++) {
      const { dotIds } = shapes[si];
      if (dotIds.length <= 3) continue; // can't shrink a triangle
      for (let di = 0; di < dotIds.length; di++) {
        const id = dotIds[di];
        if ((usageCount.get(id) ?? 0) > 1) continue; // shared — skip
        const a = dots[dotIds[(di - 1 + dotIds.length) % dotIds.length]];
        const b = dots[id];
        const c = dots[dotIds[(di + 1) % dotIds.length]];
        const cross =
          (b.x - a.x) * (c.y - a.y) -
          (b.y - a.y) * (c.x - a.x);
        // Prefer near-collinear points (small cross product) with shortest total edge
        const totalLen = Math.hypot(b.x - a.x, b.y - a.y) + Math.hypot(c.x - b.x, c.y - b.y);
        const score = Math.abs(cross) * 10 + totalLen;
        if (score < bestLen) {
          bestLen = score;
          bestSi = si;
          bestDi = di;
        }
      }
    }

    if (bestSi < 0) break;

    const shape = shapes[bestSi];
    const removedId = shape.dotIds[bestDi];
    shape.dotIds.splice(bestDi, 1);
    usageCount.set(removedId, (usageCount.get(removedId) ?? 1) - 1);

    // If the dot is now unused, remove it from the global list
    if ((usageCount.get(removedId) ?? 0) === 0) {
      // Mark as deleted; compact at the end
      dotMap.forEach((v, k) => { if (v === removedId) dotMap.delete(k); });
      dots[removedId] = { id: -1, x: 0, y: 0 }; // tombstone
    }
  }

  // Compact: rebuild dots array and remap IDs
  const remap = new Map<number, number>();
  const newDots: Dot[] = [];
  for (const d of dots) {
    if (d.id >= 0) {
      remap.set(d.id, newDots.length);
      newDots.push({ id: newDots.length, x: d.x, y: d.y });
    }
  }
  dots.splice(0, dots.length, ...newDots);
  for (const shape of shapes) {
    shape.dotIds = shape.dotIds.map((id) => remap.get(id) ?? id);
  }
}

export function generatePuzzle(difficulty: Difficulty, seed: number, theme: ThemeName): Puzzle {
  const { gridSize, numRegions, targetDots } = DIFFICULTY_PARAMS[difficulty];
  const rng = new SeededRandom(seed);

  const grid = growRegions(gridSize, numRegions, rng);
  const regionCells = getRegionCells(grid, numRegions);
  const adjacency = computeAdjacency(grid, gridSize, numRegions);

  const palette = THEMES[theme].palette;
  const colorAssignment = greedyGraphColor(numRegions, adjacency, palette);

  const dotMap = new Map<string, number>();
  const dots: Dot[] = [];
  const shapes: PuzzleShape[] = [];

  for (let i = 0; i < numRegions; i++) {
    const cells = regionCells.get(i)!;
    if (cells.length === 0) continue;

    const polygon = extractBoundaryPolygon(cells, grid);
    if (polygon.length < 3) continue;

    const dotIds: number[] = [];
    for (const pt of polygon) {
      const key = `${pt.x},${pt.y}`;
      if (!dotMap.has(key)) {
        const id = dots.length;
        dotMap.set(key, id);
        dots.push({ id, x: pt.x, y: pt.y });
      }
      dotIds.push(dotMap.get(key)!);
    }

    if (dotIds.length < 3) continue;

    shapes.push({
      id: i,
      dotIds,
      color: colorAssignment[i] || palette[0],
      isConnected: false,
      isColored: false,
      filledColor: null,
    });
  }

  // Adjust dot count to hit the exact target
  if (dots.length < targetDots) {
    subdivideEdgesToTarget(shapes, dots, dotMap, targetDots);
  } else if (dots.length > targetDots) {
    pruneDotsToTarget(shapes, dots, dotMap, targetDots);
  }

  return {
    seed,
    difficulty,
    theme,
    gridSize,
    dots,
    shapes,
    totalDots: dots.length,
  };
}

export function getDailyPuzzleSeed(): number {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return parseInt(dateStr, 10) % 999983;
}

export function getCanvasLayout(puzzle: Puzzle, canvasWidth: number, canvasHeight: number) {
  const padding = 24;
  const availW = canvasWidth - padding * 2;
  const availH = canvasHeight - padding * 2;
  const cellSize = Math.min(availW / puzzle.gridSize, availH / puzzle.gridSize);
  const offsetX = padding + (availW - cellSize * puzzle.gridSize) / 2;
  const offsetY = padding + (availH - cellSize * puzzle.gridSize) / 2;

  return {
    cellSize,
    offsetX,
    offsetY,
    dotRadius: Math.max(6, Math.min(14, cellSize * 0.35)),
    toScreen: (gx: number, gy: number) => ({
      x: offsetX + gx * cellSize,
      y: offsetY + gy * cellSize,
    }),
  };
}
