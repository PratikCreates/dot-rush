import type { GameMode } from "@/context/GameContext";
import type { Difficulty } from "@/engine/puzzleGenerator";

export interface CognitiveFocus {
  label: string;
  short: string;
  detail: string;
  color: string;
}

export const COGNITIVE_FOCUS: Record<GameMode, CognitiveFocus> = {
  timed: {
    label: "Focus Sprint",
    short: "Attention, sequencing, and controlled speed",
    detail: "Build sustained attention by tracing ordered paths while keeping a steady pace.",
    color: "#FF3CAC",
  },
  challenge: {
    label: "Pressure Control",
    short: "Inhibition, stress control, and fast correction",
    detail: "Practice staying accurate when the clock is tight and wrong taps are costly.",
    color: "#FF8C00",
  },
  daily: {
    label: "Daily Neuroset",
    short: "Habit, pattern memory, and recall",
    detail: "Use a consistent daily puzzle to build a repeatable cognitive warm-up routine.",
    color: "#36D6FF",
  },
  endless: {
    label: "Adaptive Flow",
    short: "Cognitive endurance and task switching",
    detail: "Move through fresh puzzles to train stamina without losing precision.",
    color: "#BF5FFF",
  },
  accuracy: {
    label: "Precision Lab",
    short: "Impulse control and visual discrimination",
    detail: "Slow down, inspect the field, and make every tap deliberate.",
    color: "#39FF14",
  },
  speedrun: {
    label: "Processing Speed",
    short: "Rapid scanning and motor planning",
    detail: "Compress solve time while keeping enough control to avoid costly mistakes.",
    color: "#FFD700",
  },
};

export const DIFFICULTY_LOAD: Record<Difficulty, { label: string; detail: string }> = {
  easy: {
    label: "Warm-up Load",
    detail: "Best for a daily reset, beginners, or low-friction focus practice.",
  },
  medium: {
    label: "Training Load",
    detail: "A balanced drill for working memory, scanning, and sequencing.",
  },
  hard: {
    label: "Peak Load",
    detail: "Dense visual field training for advanced attention and planning.",
  },
};

export interface BrainScore {
  accuracy: number;
  control: number;
  pace: number;
  composite: number;
  trainingLoad: string;
}

export interface TrainingRecommendation {
  headline: string;
  nextRep: string;
  loadAdvice: "increase" | "hold" | "recover";
}

export interface CognitiveTrainingStat {
  sessions: number;
  avgComposite: number;
  bestComposite: number;
  totalErrors: number;
  totalTimeMs: number;
  lastPlayedAt: number;
}

export const TRAINING_ORDER: GameMode[] = [
  "timed",
  "accuracy",
  "challenge",
  "daily",
  "endless",
  "speedrun",
];

export interface TrainingPlanInput {
  totalPuzzles: number;
  lastDailyDate?: string;
  records: Record<string, { mode: string; lastPlayedAt: number }>;
  trainingStats?: Record<string, CognitiveTrainingStat | undefined>;
  now?: number;
}

export interface TrainingPlanStep {
  mode: GameMode;
  title: string;
  shortTitle: string;
  detail: string;
  reason: string;
  recommendedLoad: Difficulty;
  loadReason: string;
}

export interface DailyTrainingPlan {
  headline: string;
  subline: string;
  touchedModes: number;
  weakestMode: GameMode;
  nextMode: GameMode;
  steps: TrainingPlanStep[];
}

export interface WeeklyTrainingDay {
  day: string;
  mode: GameMode;
  load: Difficulty;
  focus: string;
  instruction: string;
}

export function getRecommendedTrainingLoad(stat?: CognitiveTrainingStat): {
  load: Difficulty;
  reason: string;
} {
  if (!stat || stat.sessions === 0) {
    return {
      load: "easy",
      reason: "Start with a warm-up load until this system has a baseline.",
    };
  }

  const avgErrors = stat.totalErrors / Math.max(1, stat.sessions);
  if (stat.avgComposite >= 86 && avgErrors <= 1.5) {
    return {
      load: "hard",
      reason: "Recent reps are clean enough for a peak-load challenge.",
    };
  }

  if (stat.avgComposite < 62 || avgErrors >= 4) {
    return {
      load: "easy",
      reason: "Use a recovery load to rebuild control before adding density.",
    };
  }

  return {
    load: "medium",
    reason: "Training load is the right balance of challenge and control.",
  };
}

export function getBrainScore({
  score,
  stars,
  wrongTaps,
  timeMs,
  failed,
}: {
  score: number;
  stars: number;
  wrongTaps: number;
  timeMs: number;
  failed: boolean;
}): BrainScore {
  const timeMinutes = Math.max(0.25, timeMs / 60000);
  const accuracy = Math.max(0, Math.round(100 - wrongTaps * 8));
  const control = failed ? Math.max(30, accuracy - 20) : accuracy;
  const pace = Math.min(100, Math.round(score / timeMinutes / 12));
  const composite = Math.round((accuracy * 0.4) + (control * 0.35) + (pace * 0.25));
  const trainingLoad = stars >= 3 ? "High-quality rep" : stars === 2 ? "Useful rep" : "Recovery rep";

  return {
    accuracy,
    control,
    pace,
    composite,
    trainingLoad,
  };
}

export function getDailyTrainingPlan({
  totalPuzzles,
  lastDailyDate = "",
  records,
  trainingStats = {},
  now = Date.now(),
}: TrainingPlanInput): DailyTrainingPlan {
  const recentCutoff = now - 7 * 86400000;
  const recentRecords = Object.values(records).filter((record) => record.lastPlayedAt >= recentCutoff);
  const recentModeCounts = TRAINING_ORDER.map((mode) => ({
    mode,
    count: recentRecords.filter((record) => record.mode === mode).length,
  }));
  const touchedModes = recentModeCounts.filter((item) => item.count > 0).length;
  const nextMode =
    recentModeCounts.find((item) => item.count === 0)?.mode ??
    [...recentModeCounts].sort((a, b) => a.count - b.count)[0]?.mode ??
    "timed";
  const trainedModeStats = TRAINING_ORDER
    .map((mode) => ({ mode, stat: trainingStats[mode] }))
    .filter((item): item is { mode: GameMode; stat: CognitiveTrainingStat } =>
      Boolean(item.stat && item.stat.sessions > 0)
    );
  const weakestMode =
    trainedModeStats.sort((a, b) => a.stat.avgComposite - b.stat.avgComposite)[0]?.mode ?? nextMode;
  const today = new Date(now).toISOString().split("T")[0];
  const hasDailyToday = lastDailyDate === today;
  const nonDailyMode =
    (nextMode !== "daily" ? nextMode : undefined) ??
    [...recentModeCounts].filter((item) => item.mode !== "daily").sort((a, b) => a.count - b.count)[0]?.mode ??
    "timed";
  const starterMode = hasDailyToday ? nonDailyMode : "daily";
  const controlMode = weakestMode === starterMode ? "accuracy" : weakestMode;
  const closerMode =
    starterMode !== "accuracy" && controlMode !== "accuracy"
      ? "accuracy"
      : TRAINING_ORDER.find((mode) => mode !== starterMode && mode !== controlMode && mode !== "daily") ?? "timed";
  const starterLoad = getRecommendedTrainingLoad(trainingStats[starterMode]);
  const controlLoad = getRecommendedTrainingLoad(trainingStats[controlMode]);
  const closerLoad = getRecommendedTrainingLoad(trainingStats[closerMode]);

  return {
    headline: totalPuzzles < 3 ? "Build your baseline" : "Keep the system balanced",
    subline: `${touchedModes}/6 brain systems touched in the last 7 days`,
    touchedModes,
    weakestMode,
    nextMode,
    steps: [
      {
        mode: starterMode,
        title: hasDailyToday
          ? `Start with ${COGNITIVE_FOCUS[starterMode].label}`
          : "Start with a Daily Neuroset",
        shortTitle: COGNITIVE_FOCUS[starterMode].label,
        detail: hasDailyToday
          ? `${COGNITIVE_FOCUS[starterMode].short}.`
          : "One shared puzzle anchors habit and recall.",
        reason: hasDailyToday
          ? "Daily anchor is complete; the next rep should cover an undertrained system."
          : "A daily anchor makes progress easier to compare.",
        recommendedLoad: starterLoad.load,
        loadReason: starterLoad.reason,
      },
      {
        mode: controlMode,
        title: `Train ${COGNITIVE_FOCUS[controlMode].label}`,
        shortTitle: COGNITIVE_FOCUS[controlMode].label,
        detail: trainingStats[controlMode]?.sessions
          ? `Current average: ${trainingStats[controlMode]?.avgComposite}/100. ${COGNITIVE_FOCUS[controlMode].short}.`
          : COGNITIVE_FOCUS[controlMode].short,
        reason: "This is the lowest current training score or the least-covered system.",
        recommendedLoad: controlLoad.load,
        loadReason: controlLoad.reason,
      },
      {
        mode: closerMode,
        title: `Close with ${COGNITIVE_FOCUS[closerMode].label}`,
        shortTitle: COGNITIVE_FOCUS[closerMode].label,
        detail: closerMode === "accuracy"
          ? "Finish the session by reducing impulse taps."
          : `${COGNITIVE_FOCUS[closerMode].short}.`,
        reason: closerMode === "accuracy"
          ? "Ending with control practice prevents speed from becoming sloppy."
          : "A distinct closer keeps the session balanced instead of repeating one system.",
        recommendedLoad: closerLoad.load,
        loadReason: closerLoad.reason,
      },
    ],
  };
}

export function getWeeklyTrainingPlan({
  weakestMode,
  now = Date.now(),
}: {
  weakestMode?: GameMode;
  now?: number;
} = {}): WeeklyTrainingDay[] {
  const start = new Date(now);
  const instructionByMode: Record<GameMode, { load: Difficulty; instruction: string }> = {
    daily: { load: "easy", instruction: "Use this as a clean baseline and avoid chasing speed." },
    timed: { load: "medium", instruction: "Keep your eyes one dot ahead and finish without panic taps." },
    accuracy: { load: "easy", instruction: "End the week with a low-error control check." },
    challenge: { load: "easy", instruction: "Practice pressure recovery; slow down after the first mistake." },
    endless: { load: "medium", instruction: "Stop after fatigue shows up; quality beats extra rounds." },
    speedrun: { load: "hard", instruction: "Push pace only if the first half stays clean." },
  };
  const weakestNonDaily = weakestMode && weakestMode !== "daily" ? weakestMode : "accuracy";
  const modeRotation: GameMode[] = [
    "daily",
    weakestNonDaily,
    ...TRAINING_ORDER.filter((mode) => mode !== "daily" && mode !== weakestNonDaily),
    weakestNonDaily === "accuracy" ? "timed" : "accuracy",
  ];

  return modeRotation.map((mode, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const item = instructionByMode[mode];
    const isWeaknessSlot = index === 1;
    return {
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      mode,
      load: isWeaknessSlot ? "medium" : item.load,
      focus: COGNITIVE_FOCUS[mode].label,
      instruction: isWeaknessSlot
        ? "Give the weakest system one deliberate training rep."
        : item.instruction,
    };
  });
}

export function updateTrainingStat({
  existing,
  brain,
  wrongTaps,
  timeMs,
  playedAt = Date.now(),
}: {
  existing?: CognitiveTrainingStat;
  brain: BrainScore;
  wrongTaps: number;
  timeMs: number;
  playedAt?: number;
}): CognitiveTrainingStat {
  const sessions = (existing?.sessions ?? 0) + 1;
  const avgComposite = Math.round(
    (((existing?.avgComposite ?? 0) * (sessions - 1)) + brain.composite) / sessions
  );

  return {
    sessions,
    avgComposite,
    bestComposite: Math.max(existing?.bestComposite ?? 0, brain.composite),
    totalErrors: (existing?.totalErrors ?? 0) + wrongTaps,
    totalTimeMs: (existing?.totalTimeMs ?? 0) + timeMs,
    lastPlayedAt: playedAt,
  };
}

export function getTrainingRecommendation({
  brain,
  wrongTaps,
  failed,
}: {
  brain: BrainScore;
  wrongTaps: number;
  failed: boolean;
}): TrainingRecommendation {
  if (failed || brain.composite < 55) {
    return {
      headline: "Rebuild control",
      nextRep: "Drop one load, scan the whole board once, then tap only after naming the next dot.",
      loadAdvice: "recover",
    };
  }

  if (wrongTaps >= 4 || brain.accuracy < 72) {
    return {
      headline: "Reduce impulse taps",
      nextRep: "Stay on the same load and pause for half a beat before every corner or color choice.",
      loadAdvice: "hold",
    };
  }

  if (brain.pace < 60 && brain.accuracy >= 85) {
    return {
      headline: "Raise tempo carefully",
      nextRep: "Keep the same load, but try to finish the first shape five seconds faster without adding errors.",
      loadAdvice: "hold",
    };
  }

  if (brain.composite >= 88 && wrongTaps <= 1) {
    return {
      headline: "Increase load",
      nextRep: "Move up one load or switch to Speed Run while keeping errors at one or fewer.",
      loadAdvice: "increase",
    };
  }

  return {
    headline: "Lock in consistency",
    nextRep: "Repeat this mode once more and aim for the same score with fewer hesitation taps.",
    loadAdvice: "hold",
  };
}
