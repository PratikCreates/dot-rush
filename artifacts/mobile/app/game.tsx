import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useGame, GameMode } from "@/context/GameContext";
import { usePlayer } from "@/context/PlayerContext";
import { Difficulty } from "@/engine/puzzleGenerator";
import { ThemeName } from "@/engine/themes";
import { THEMES } from "@/engine/themes";
import { calculateStars, calculateSpeedBonus, getTimeLimitSec } from "@/engine/scoring";
import GameCanvas from "@/components/GameCanvas";
import ColorPalette from "@/components/ColorPalette";
import HUD from "@/components/HUD";
import ReferenceView from "@/components/ReferenceView";
import ScoreToast from "@/components/ScoreToast";

const { width, height } = Dimensions.get("window");

interface ToastItem {
  id: number;
  label: string;
  points: number;
}

export default function GameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    seed: string;
    difficulty: string;
    theme: string;
    mode: string;
  }>();

  const { state, startGame, tapDot, tapColorRegion, selectShapeToConnect, setElapsed, failGame, useHint, useColorReveal } = useGame();
  const { saveRecord, updateEndlessStreak } = usePlayer();

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [hintDotId, setHintDotId] = useState<number | null>(null);
  const [colorRevealed, setColorRevealed] = useState(false);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [colorHintsLeft, setColorHintsLeft] = useState(3);

  const startRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameStartedRef = useRef(false);
  const resultSavedRef = useRef(false);

  const seed = parseInt(params.seed ?? "1", 10);
  const difficulty = (params.difficulty ?? "easy") as Difficulty;
  const theme = (params.theme ?? "animals") as ThemeName;
  const mode = (params.mode ?? "timed") as GameMode;
  const timeLimitSec = getTimeLimitSec(difficulty, mode);

  useEffect(() => {
    if (!gameStartedRef.current) {
      gameStartedRef.current = true;
      startGame(seed, difficulty, theme, mode);
      startRef.current = Date.now();
    }
  }, []);

  // Timer
  useEffect(() => {
    if (!state.puzzle || state.isComplete || state.isFailed) return;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      setElapsed(elapsed);

      if (timeLimitSec > 0 && elapsed >= timeLimitSec * 1000) {
        clearInterval(timerRef.current!);
        failGame();
      }
    }, 200);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.puzzle, state.isComplete, state.isFailed]);

  // Navigate when done
  useEffect(() => {
    if ((state.isComplete || state.isFailed) && !resultSavedRef.current && state.puzzle) {
      resultSavedRef.current = true;
      clearInterval(timerRef.current!);

      const timeMs = state.elapsedMs;
      const shapesColored = state.shapes.filter((s) => s.isColored).length;
      const speedBonus = timeLimitSec > 0
        ? calculateSpeedBonus((timeLimitSec * 1000 - timeMs) / 1000)
        : 0;
      const finalScore = state.score + speedBonus;
      const maxScore = state.shapes.length * (10 + 40 + 5);
      const stars = state.isComplete
        ? calculateStars(finalScore, maxScore, timeLimitSec > 0 ? timeLimitSec - timeMs / 1000 : 999, timeLimitSec || 999, state.wrongTaps)
        : 0;

      saveRecord(seed, difficulty, mode, finalScore, timeMs, stars, shapesColored);
      if (mode === "endless") updateEndlessStreak(shapesColored);

      setTimeout(() => {
        router.replace({
          pathname: "/results",
          params: {
            score: String(finalScore),
            stars: String(stars),
            timeMs: String(timeMs),
            seed: String(seed),
            difficulty,
            mode,
            theme,
            failed: state.isFailed ? "1" : "0",
          },
        });
      }, 400);
    }
  }, [state.isComplete, state.isFailed]);

  const addToast = useCallback((label: string, points: number) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { id, label, points }]);
  }, []);

  const handleDotTap = useCallback(
    (dotId: number) => {
      const event = tapDot(dotId);
      if (event) {
        addToast(event.label, event.points);
        if (event.points > 0) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } else {
        Haptics.selectionAsync();
      }
      setHintDotId(null);
    },
    [tapDot, addToast]
  );

  const handleColorTap = useCallback(
    (color: string) => {
      const shapeId = state.coloringShapeId;
      if (shapeId === null) return;
      const event = tapColorRegion(shapeId, color);
      if (event) {
        addToast(event.label, event.points);
        if (event.points > 0) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
      setColorRevealed(false);
    },
    [state.coloringShapeId, tapColorRegion, addToast]
  );

  const handleHint = useCallback(() => {
    if (hintsLeft <= 0) return;
    const dotId = useHint();
    if (dotId !== null) {
      setHintDotId(dotId);
      setHintsLeft((n) => n - 1);
      addToast("Hint used!", 0);
    }
  }, [hintsLeft, useHint, addToast]);

  const handleColorReveal = useCallback(() => {
    if (colorHintsLeft <= 0 || state.coloringShapeId === null) return;
    setColorRevealed(true);
    setColorHintsLeft((n) => n - 1);
    addToast("Color revealed!", 0);
  }, [colorHintsLeft, state.coloringShapeId, addToast]);

  const handleQuit = useCallback(() => {
    Alert.alert("Quit Game", "Are you sure you want to quit?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Quit",
        style: "destructive",
        onPress: () => {
          clearInterval(timerRef.current!);
          router.back();
        },
      },
    ]);
  }, []);

  if (!state.puzzle) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.primary }]}>
          GENERATING PUZZLE...
        </Text>
      </View>
    );
  }

  const palette = THEMES[theme].palette;
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const hudH = 72;
  const headerH = 48;
  const paletteH = state.coloringShapeId !== null ? 80 : 0;
  const canvasH = height - topPad - hudH - headerH - paletteH - bottomPad - 8;
  const canvasW = width;

  const shapesConnected = state.shapes.filter((s) => s.isConnected).length;
  const shapesColored = state.shapes.filter((s) => s.isColored).length;

  const gradStart = colors.isDark ? "#0D0020" : "#FFF0FC";
  const gradEnd = colors.isDark ? "#150030" : "#F0D0FF";

  const coloringShape = state.shapes.find((s) => s.id === state.coloringShapeId);
  const targetColor = coloringShape?.color;

  return (
    <LinearGradient colors={[gradStart, gradEnd]} style={{ flex: 1 }}>
      {/* Top header */}
      <View
        style={[
          styles.topHeader,
          {
            paddingTop: topPad + 4,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={handleQuit} style={styles.quitBtn}>
          <Ionicons name="close" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
        <View style={styles.modeLabel}>
          <Text style={[styles.modeLabelText, { color: colors.primary }]}>
            {mode.toUpperCase()}
          </Text>
          <Text style={[styles.diffLabel, { color: colors.mutedForeground }]}>
            {difficulty.toUpperCase()} · {state.puzzle.totalDots} DOTS
          </Text>
        </View>
        <ReferenceView puzzle={state.puzzle} size={44} />
      </View>

      {/* HUD */}
      <HUD
        score={state.score}
        elapsedMs={state.elapsedMs}
        timeLimitSec={timeLimitSec}
        mode={mode}
        shapesTotal={state.shapes.length}
        shapesConnected={shapesConnected}
        shapesColored={shapesColored}
      />

      {/* Game canvas */}
      <View style={{ flex: 1 }}>
        <GameCanvas
          puzzle={state.puzzle}
          shapes={state.shapes}
          selectedShapeId={state.selectedShapeId}
          coloringShapeId={state.coloringShapeId}
          connectedDotCount={state.connection.connectedDotCount}
          hintDotId={hintDotId}
          onDotTap={handleDotTap}
          onShapeTap={selectShapeToConnect}
          canvasWidth={canvasW}
          canvasHeight={canvasH}
        />

        {/* Score toasts */}
        {toasts.map((t) => (
          <ScoreToast
            key={t.id}
            label={t.label}
            points={t.points}
            onDone={() =>
              setToasts((prev) => prev.filter((x) => x.id !== t.id))
            }
          />
        ))}

        {/* Instructions */}
        {state.selectedShapeId === null && state.coloringShapeId === null && (
          <View style={styles.instructionBubble}>
            <Text style={[styles.instructionText, { color: colors.mutedForeground }]}>
              Tap a shape to start connecting dots
            </Text>
          </View>
        )}

        {state.selectedShapeId !== null && (
          <View style={styles.instructionBubble}>
            <Text style={[styles.instructionText, { color: colors.primary }]}>
              Tap dot #{state.connection.connectedDotCount + 1} · {state.connection.mistakes}/3 mistakes
            </Text>
          </View>
        )}
      </View>

      {/* Color palette */}
      {state.coloringShapeId !== null && (
        <View
          style={[
            styles.paletteBar,
            {
              backgroundColor: colors.card + "F0",
              borderTopColor: colors.border,
            },
          ]}
        >
          <ColorPalette
            palette={palette}
            targetColor={targetColor}
            onSelectColor={handleColorTap}
            revealed={colorRevealed}
          />
        </View>
      )}

      {/* Power-up bar */}
      <View
        style={[
          styles.powerBar,
          {
            paddingBottom: bottomPad + 8,
            borderTopColor: colors.border,
            backgroundColor: colors.isDark ? colors.background + "AA" : colors.card + "AA",
          },
        ]}
      >
        <PowerBtn
          icon="bulb"
          label={`${hintsLeft}`}
          color={colors.primary}
          onPress={handleHint}
          disabled={hintsLeft <= 0 || state.selectedShapeId === null}
        />
        <PowerBtn
          icon="color-palette"
          label={`${colorHintsLeft}`}
          color={colors.accent}
          onPress={handleColorReveal}
          disabled={colorHintsLeft <= 0 || state.coloringShapeId === null}
        />
        <View style={styles.mistakesDisplay}>
          <Text style={[styles.mistakesLabel, { color: colors.mutedForeground }]}>
            WRONG
          </Text>
          <Text style={[styles.mistakesValue, { color: colors.destructive }]}>
            {state.wrongTaps}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function PowerBtn({
  icon,
  label,
  color,
  onPress,
  disabled,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.powerBtn,
        {
          backgroundColor: color + (disabled ? "22" : "33"),
          borderColor: color + (disabled ? "33" : "88"),
          opacity: disabled ? 0.4 : 1,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[styles.powerLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  quitBtn: { padding: 8 },
  modeLabel: { alignItems: "center" },
  modeLabelText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  diffLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
  },
  instructionBubble: {
    position: "absolute",
    bottom: 8,
    alignSelf: "center",
  },
  instructionText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  paletteBar: {
    borderTopWidth: 1,
  },
  powerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingTop: 8,
    paddingHorizontal: 24,
    borderTopWidth: 1,
  },
  powerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  powerLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  mistakesDisplay: {
    alignItems: "center",
    marginLeft: 8,
  },
  mistakesLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  mistakesValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
});
