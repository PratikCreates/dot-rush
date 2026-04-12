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

function getDifficultyParams(difficulty: Difficulty) {
  switch (difficulty) {
    case "easy":
      return { gridSize: 7, numRegions: 8, targetDots: 64 };
    case "medium":
      return { gridSize: 10, numRegions: 16, targetDots: 128 };
    case "hard":
      return { gridSize: 14, numRegions: 28, targetDots: 256 };
  }
}

type Cell = [number, number];

function growRegions(gridSize: number, numRegions: number, rng: SeededRandom): number[][] {
  const grid: number[][] = Array.from({ length: gridSize }, () =>
    new Array(gridSize).fill(-1)
  );

  const seeds: Cell[] = [];
  let attempts = 0;
  while (seeds.length < numRegions && attempts < 1000) {
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

export function generatePuzzle(difficulty: Difficulty, seed: number, theme: ThemeName): Puzzle {
  const { gridSize, numRegions } = getDifficultyParams(difficulty);
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
    dotRadius: Math.max(7, Math.min(14, cellSize * 0.35)),
    toScreen: (gx: number, gy: number) => ({
      x: offsetX + gx * cellSize,
      y: offsetY + gy * cellSize,
    }),
  };
}
