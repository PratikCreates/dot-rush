import React, { useCallback, useMemo } from "react";
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Text,
  Dimensions,
} from "react-native";
import Svg, {
  Polygon,
  Polyline,
  Circle,
  Line,
  G,
} from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import { Puzzle, PuzzleShape, getCanvasLayout } from "@/engine/puzzleGenerator";

interface Props {
  puzzle: Puzzle;
  shapes: PuzzleShape[];
  selectedShapeId: number | null;
  coloringShapeId: number | null;
  connectedDotCount: number;
  hintDotId: number | null;
  onDotTap: (dotId: number) => void;
  onShapeTap: (shapeId: number) => void;
  canvasWidth: number;
  canvasHeight: number;
}

export default function GameCanvas({
  puzzle,
  shapes,
  selectedShapeId,
  coloringShapeId,
  connectedDotCount,
  hintDotId,
  onDotTap,
  onShapeTap,
  canvasWidth,
  canvasHeight,
}: Props) {
  const colors = useColors();
  const layout = useMemo(
    () => getCanvasLayout(puzzle, canvasWidth, canvasHeight),
    [puzzle, canvasWidth, canvasHeight]
  );

  const getDotPosition = useCallback(
    (dotId: number) => {
      const dot = puzzle.dots.find((d) => d.id === dotId)!;
      return layout.toScreen(dot.x, dot.y);
    },
    [puzzle.dots, layout]
  );

  const { dotRadius } = layout;
  const fontSize = Math.max(7, Math.min(11, dotRadius * 0.85));

  const activeShape = shapes.find((s) => s.id === selectedShapeId) ?? null;
  const colorShape = shapes.find((s) => s.id === coloringShapeId) ?? null;

  return (
    <View style={{ width: canvasWidth, height: canvasHeight }}>
      <Svg
        width={canvasWidth}
        height={canvasHeight}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        {/* Filled completed shapes */}
        {shapes.map((shape) => {
          if (!shape.isConnected) return null;
          const points = shape.dotIds
            .map((id) => {
              const p = getDotPosition(id);
              return `${p.x},${p.y}`;
            })
            .join(" ");
          const fillColor =
            shape.isColored && shape.filledColor
              ? shape.filledColor
              : shape.isConnected
              ? colors.surfaceHigh + "AA"
              : "transparent";
          return (
            <Polygon
              key={`fill-${shape.id}`}
              points={points}
              fill={fillColor}
              stroke={shape.isColored ? shape.color : colors.border}
              strokeWidth={shape.isColored ? 2 : 1.5}
              opacity={shape.isColored ? 1 : 0.7}
            />
          );
        })}

        {/* Outline of all unconnected shapes */}
        {shapes.map((shape) => {
          if (shape.isConnected) return null;
          const isSelected = shape.id === selectedShapeId;
          const isColoring = shape.id === coloringShapeId;
          const points = shape.dotIds
            .map((id) => {
              const p = getDotPosition(id);
              return `${p.x},${p.y}`;
            })
            .join(" ");
          return (
            <Polygon
              key={`outline-${shape.id}`}
              points={points}
              fill={isSelected ? colors.primary + "18" : colors.surface + "60"}
              stroke={
                isSelected
                  ? colors.primary
                  : isColoring
                  ? colors.accent
                  : colors.border
              }
              strokeWidth={isSelected ? 2.5 : 1.5}
              strokeDasharray={isSelected ? undefined : "4,3"}
              opacity={isSelected ? 1 : 0.5}
            />
          );
        })}

        {/* Active shape connection lines */}
        {activeShape &&
          activeShape.dotIds
            .slice(0, connectedDotCount)
            .map((dotId, idx) => {
              if (idx === 0) return null;
              const fromId = activeShape.dotIds[idx - 1];
              const from = getDotPosition(fromId);
              const to = getDotPosition(dotId);
              return (
                <Line
                  key={`conn-${idx}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={colors.primary}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              );
            })}

        {/* Closing line if shape is connected */}
        {activeShape && activeShape.isConnected && connectedDotCount > 1 && (() => {
          const last = getDotPosition(activeShape.dotIds[activeShape.dotIds.length - 1]);
          const first = getDotPosition(activeShape.dotIds[0]);
          return (
            <Line
              x1={last.x}
              y1={last.y}
              x2={first.x}
              y2={first.y}
              stroke={colors.primary}
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })()}
      </Svg>

      {/* Tappable shape overlays for shape selection */}
      {shapes
        .filter((s) => !s.isConnected && s.id !== selectedShapeId)
        .map((shape) => {
          const pts = shape.dotIds.map((id) => getDotPosition(id));
          const minX = Math.min(...pts.map((p) => p.x));
          const maxX = Math.max(...pts.map((p) => p.x));
          const minY = Math.min(...pts.map((p) => p.y));
          const maxY = Math.max(...pts.map((p) => p.y));
          const cx = (minX + maxX) / 2;
          const cy = (minY + maxY) / 2;
          return (
            <TouchableOpacity
              key={`shape-tap-${shape.id}`}
              style={{
                position: "absolute",
                left: cx - 20,
                top: cy - 20,
                width: 40,
                height: 40,
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={() => onShapeTap(shape.id)}
              activeOpacity={0.7}
              testID={`shape-${shape.id}`}
            />
          );
        })}

      {/* Coloring shape overlay */}
      {colorShape && !colorShape.isColored && (() => {
        const pts = colorShape.dotIds.map((id) => getDotPosition(id));
        const minX = Math.min(...pts.map((p) => p.x));
        const maxX = Math.max(...pts.map((p) => p.x));
        const minY = Math.min(...pts.map((p) => p.y));
        const maxY = Math.max(...pts.map((p) => p.y));
        return (
          <View
            style={{
              position: "absolute",
              left: minX,
              top: minY,
              width: maxX - minX,
              height: maxY - minY,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                backgroundColor: colors.accent + "33",
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}
            >
              <Text
                style={{
                  color: colors.accent,
                  fontSize: 10,
                  fontFamily: "Inter_700Bold",
                }}
              >
                Pick color
              </Text>
            </View>
          </View>
        );
      })()}

      {/* Dots for selected shape */}
      {activeShape &&
        activeShape.dotIds.map((dotId, idx) => {
          const pos = getDotPosition(dotId);
          const isConnected = idx < connectedDotCount;
          const isNext = idx === connectedDotCount;
          const isHint = dotId === hintDotId;
          const dotNum = idx + 1;

          return (
            <TouchableOpacity
              key={`dot-${dotId}`}
              style={{
                position: "absolute",
                left: pos.x - dotRadius,
                top: pos.y - dotRadius,
                width: dotRadius * 2,
                height: dotRadius * 2,
                borderRadius: dotRadius,
                backgroundColor: isConnected
                  ? colors.primary
                  : isHint
                  ? colors.success
                  : isNext
                  ? colors.primary + "44"
                  : colors.surface,
                borderWidth: isNext || isHint ? 2.5 : 1.5,
                borderColor: isConnected
                  ? colors.primary
                  : isHint
                  ? colors.success
                  : isNext
                  ? colors.primary
                  : colors.border,
                justifyContent: "center",
                alignItems: "center",
                shadowColor: isNext ? colors.primary : "transparent",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: isNext ? 0.8 : 0,
                shadowRadius: 6,
                elevation: isNext ? 4 : 0,
              }}
              onPress={() => onDotTap(dotId)}
              activeOpacity={0.7}
              testID={`dot-${dotId}`}
            >
              <Text
                style={{
                  color: isConnected ? colors.background : colors.foreground,
                  fontSize: fontSize,
                  fontFamily: "Inter_700Bold",
                  textAlign: "center",
                }}
              >
                {dotNum}
              </Text>
            </TouchableOpacity>
          );
        })}
    </View>
  );
}
