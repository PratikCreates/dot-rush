import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Puzzle, PuzzleShape, generatePuzzle } from "@/engine/puzzleGenerator";
import { Difficulty } from "@/engine/puzzleGenerator";
import { ThemeName } from "@/engine/themes";
import {
  SCORE_SHAPE_CONNECTED,
  SCORE_FULL_SHAPE_CORRECT,
  SCORE_REGION_CORRECT,
  PENALTY_WRONG_TAP,
  MISTAKE_LIMIT,
  ScoreEvent,
} from "@/engine/scoring";

export type GameMode = "timed" | "challenge" | "daily" | "endless" | "accuracy";

export interface ConnectionState {
  shapeId: number | null;
  connectedDotCount: number;
  mistakes: number;
}

export interface GameState {
  puzzle: Puzzle | null;
  shapes: PuzzleShape[];
  score: number;
  scoreEvents: ScoreEvent[];
  wrongTaps: number;
  elapsedMs: number;
  isComplete: boolean;
  isFailed: boolean;
  connection: ConnectionState;
  selectedShapeId: number | null;
  coloringShapeId: number | null;
  activeMode: GameMode;
  activeDifficulty: Difficulty;
  activeTheme: ThemeName;
  activeSeed: number;
  endlessStreak: number;
}

interface GameContextValue {
  state: GameState;
  startGame: (
    seed: number,
    difficulty: Difficulty,
    theme: ThemeName,
    mode: GameMode
  ) => void;
  tapDot: (dotId: number) => ScoreEvent | null;
  tapColorRegion: (shapeId: number, color: string) => ScoreEvent | null;
  selectShapeToConnect: (shapeId: number) => void;
  setElapsed: (ms: number) => void;
  failGame: () => void;
  useHint: () => number | null;
  useColorReveal: () => string | null;
  resetGame: () => void;
}

const DEFAULT_STATE: GameState = {
  puzzle: null,
  shapes: [],
  score: 0,
  scoreEvents: [],
  wrongTaps: 0,
  elapsedMs: 0,
  isComplete: false,
  isFailed: false,
  connection: { shapeId: null, connectedDotCount: 0, mistakes: 0 },
  selectedShapeId: null,
  coloringShapeId: null,
  activeMode: "timed",
  activeDifficulty: "easy",
  activeTheme: "animals",
  activeSeed: 0,
  endlessStreak: 0,
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(DEFAULT_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;

  const startGame = useCallback(
    (seed: number, difficulty: Difficulty, theme: ThemeName, mode: GameMode) => {
      const puzzle = generatePuzzle(difficulty, seed, theme);
      setState({
        ...DEFAULT_STATE,
        puzzle,
        shapes: puzzle.shapes.map((s) => ({ ...s })),
        activeMode: mode,
        activeDifficulty: difficulty,
        activeTheme: theme,
        activeSeed: seed,
      });
    },
    []
  );

  const selectShapeToConnect = useCallback((shapeId: number) => {
    setState((prev) => {
      const shape = prev.shapes.find((s) => s.id === shapeId);
      if (!shape || shape.isConnected) return prev;
      return {
        ...prev,
        selectedShapeId: shapeId,
        coloringShapeId: null,
        connection: { shapeId, connectedDotCount: 0, mistakes: 0 },
      };
    });
  }, []);

  const tapDot = useCallback((dotId: number): ScoreEvent | null => {
    const current = stateRef.current;
    const { connection, shapes, activeMode } = current;
    if (!connection.shapeId === null) return null;

    const shapeId = connection.shapeId;
    if (shapeId === null) return null;
    const shape = shapes.find((s) => s.id === shapeId);
    if (!shape || shape.isConnected) return null;

    const expectedDotId = shape.dotIds[connection.connectedDotCount];

    if (dotId !== expectedDotId) {
      if (activeMode === "accuracy") {
        setState((prev) => ({
          ...prev,
          connection: { ...prev.connection, connectedDotCount: 0, mistakes: 0 },
          score: Math.max(0, prev.score + PENALTY_WRONG_TAP),
          wrongTaps: prev.wrongTaps + 1,
        }));
      } else {
        const newMistakes = connection.mistakes + 1;
        const reset = newMistakes >= MISTAKE_LIMIT;
        setState((prev) => ({
          ...prev,
          connection: {
            ...prev.connection,
            mistakes: reset ? 0 : newMistakes,
            connectedDotCount: reset ? 0 : prev.connection.connectedDotCount,
          },
          score: Math.max(0, prev.score + PENALTY_WRONG_TAP),
          wrongTaps: prev.wrongTaps + 1,
        }));
      }
      return { type: "wrong_tap", points: PENALTY_WRONG_TAP, label: "Wrong dot!" };
    }

    const newCount = connection.connectedDotCount + 1;
    const shapeComplete = newCount >= shape.dotIds.length;

    if (shapeComplete) {
      setState((prev) => {
        const updatedShapes = prev.shapes.map((s) =>
          s.id === shapeId ? { ...s, isConnected: true } : s
        );
        const allConnected = updatedShapes.every((s) => s.isConnected);
        return {
          ...prev,
          shapes: updatedShapes,
          score: prev.score + SCORE_SHAPE_CONNECTED,
          connection: { shapeId: null, connectedDotCount: 0, mistakes: 0 },
          selectedShapeId: null,
          coloringShapeId: shapeId,
          isComplete: allConnected && updatedShapes.every((s) => s.isColored),
        };
      });
      return {
        type: "shape_connected",
        points: SCORE_SHAPE_CONNECTED,
        label: "+10 Shape!",
      };
    } else {
      setState((prev) => ({
        ...prev,
        connection: { ...prev.connection, connectedDotCount: newCount },
      }));
      return null;
    }
  }, []);

  const tapColorRegion = useCallback(
    (shapeId: number, color: string): ScoreEvent | null => {
      const current = stateRef.current;
      const shape = current.shapes.find((s) => s.id === shapeId);
      if (!shape || !shape.isConnected || shape.isColored) return null;

      const isCorrect = color === shape.color;
      if (isCorrect) {
        setState((prev) => {
          const updatedShapes = prev.shapes.map((s) =>
            s.id === shapeId
              ? { ...s, isColored: true, filledColor: color }
              : s
          );
          const allDone = updatedShapes.every((s) => s.isConnected && s.isColored);
          const bonusPoints = SCORE_FULL_SHAPE_CORRECT + SCORE_REGION_CORRECT;
          return {
            ...prev,
            shapes: updatedShapes,
            score: prev.score + bonusPoints,
            coloringShapeId: null,
            isComplete: allDone,
          };
        });
        return {
          type: "shape_colored_correct",
          points: SCORE_FULL_SHAPE_CORRECT,
          label: "+40 Full Score!",
        };
      } else {
        setState((prev) => ({
          ...prev,
          score: Math.max(0, prev.score - 1),
          wrongTaps: prev.wrongTaps + 1,
        }));
        return { type: "wrong_color", points: -1, label: "Wrong color!" };
      }
    },
    []
  );

  const setElapsed = useCallback((ms: number) => {
    setState((prev) => ({ ...prev, elapsedMs: ms }));
  }, []);

  const failGame = useCallback(() => {
    setState((prev) => ({ ...prev, isFailed: true }));
  }, []);

  const useHint = useCallback((): number | null => {
    const { connection, shapes } = stateRef.current;
    if (connection.shapeId === null) return null;
    const shape = shapes.find((s) => s.id === connection.shapeId);
    if (!shape) return null;
    return shape.dotIds[connection.connectedDotCount];
  }, []);

  const useColorReveal = useCallback((): string | null => {
    const { coloringShapeId, shapes } = stateRef.current;
    if (coloringShapeId === null) return null;
    const shape = shapes.find((s) => s.id === coloringShapeId);
    return shape?.color ?? null;
  }, []);

  const resetGame = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  return (
    <GameContext.Provider
      value={{
        state,
        startGame,
        tapDot,
        tapColorRegion,
        selectShapeToConnect,
        setElapsed,
        failGame,
        useHint,
        useColorReveal,
        resetGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
