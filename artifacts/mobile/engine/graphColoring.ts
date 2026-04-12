export function greedyGraphColor(
  numNodes: number,
  adjacency: Set<number>[],
  palette: string[]
): string[] {
  const colors: string[] = new Array(numNodes).fill("");

  for (let i = 0; i < numNodes; i++) {
    const usedColors = new Set<string>();
    for (const neighbor of adjacency[i]) {
      if (colors[neighbor]) {
        usedColors.add(colors[neighbor]);
      }
    }
    for (const color of palette) {
      if (!usedColors.has(color)) {
        colors[i] = color;
        break;
      }
    }
    if (!colors[i]) colors[i] = palette[i % palette.length];
  }

  return colors;
}
