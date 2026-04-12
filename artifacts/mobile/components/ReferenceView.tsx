import React, { useMemo } from "react";
import { View } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { Puzzle, getCanvasLayout } from "@/engine/puzzleGenerator";

interface Props {
  puzzle: Puzzle;
  size: number;
}

export default function ReferenceView({ puzzle, size }: Props) {
  const layout = useMemo(
    () => getCanvasLayout(puzzle, size, size),
    [puzzle, size]
  );

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <Svg width={size} height={size}>
        {puzzle.shapes.map((shape) => {
          const points = shape.dotIds
            .map((id) => {
              const dot = puzzle.dots.find((d) => d.id === id)!;
              const pos = layout.toScreen(dot.x, dot.y);
              return `${pos.x},${pos.y}`;
            })
            .join(" ");
          return (
            <Polygon
              key={shape.id}
              points={points}
              fill={shape.color}
              stroke={"#00000030"}
              strokeWidth={0.8}
            />
          );
        })}
      </Svg>
    </View>
  );
}
