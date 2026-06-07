import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const sourcePath = new URL("../artifacts/mobile/engine/brainTraining.ts", import.meta.url);
const source = fs.readFileSync(sourcePath, "utf8");

const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
});

const sandbox = {
  exports: {},
  module: { exports: {} },
  require(specifier) {
    throw new Error(`Unexpected runtime import in brainTraining test: ${specifier}`);
  },
};
sandbox.exports = sandbox.module.exports;
vm.runInNewContext(outputText, sandbox, { filename: "brainTraining.cjs" });

const {
  getBrainScore,
  getTrainingRecommendation,
  updateTrainingStat,
  getDailyTrainingPlan,
  getWeeklyTrainingPlan,
  getRecommendedTrainingLoad,
  COGNITIVE_FOCUS,
  DIFFICULTY_LOAD,
  TRAINING_ORDER,
} =
  sandbox.module.exports;

assert.equal(Object.keys(COGNITIVE_FOCUS).length, 6, "all six training modes should be described");
assert.equal(TRAINING_ORDER.length, 6, "daily planning should cover all six modes");
assert.equal(DIFFICULTY_LOAD.easy.label, "Warm-up Load");
assert.equal(DIFFICULTY_LOAD.medium.label, "Training Load");
assert.equal(DIFFICULTY_LOAD.hard.label, "Peak Load");

const newModeLoad = getRecommendedTrainingLoad(undefined);
assert.equal(newModeLoad.load, "easy");
assert.equal(newModeLoad.reason, "Start with a warm-up load until this system has a baseline.");
assert.equal(
  getRecommendedTrainingLoad({
    sessions: 4,
    avgComposite: 91,
    bestComposite: 98,
    totalErrors: 3,
    totalTimeMs: 200_000,
    lastPlayedAt: 1,
  }).load,
  "hard"
);
assert.equal(
  getRecommendedTrainingLoad({
    sessions: 3,
    avgComposite: 58,
    bestComposite: 70,
    totalErrors: 5,
    totalTimeMs: 200_000,
    lastPlayedAt: 1,
  }).load,
  "easy"
);
assert.equal(
  getRecommendedTrainingLoad({
    sessions: 3,
    avgComposite: 74,
    bestComposite: 80,
    totalErrors: 5,
    totalTimeMs: 200_000,
    lastPlayedAt: 1,
  }).load,
  "medium"
);

const cleanRep = getBrainScore({
  score: 720,
  stars: 3,
  wrongTaps: 0,
  timeMs: 60_000,
  failed: false,
});
assert.equal(cleanRep.accuracy, 100);
assert.equal(cleanRep.control, 100);
assert.equal(cleanRep.trainingLoad, "High-quality rep");
assert.ok(cleanRep.composite >= 90, "clean completed reps should score highly");

const messyRep = getBrainScore({
  score: 180,
  stars: 1,
  wrongTaps: 6,
  timeMs: 180_000,
  failed: true,
});
assert.equal(messyRep.accuracy, 52);
assert.equal(messyRep.control, 32);
assert.equal(messyRep.trainingLoad, "Recovery rep");
assert.ok(messyRep.composite < cleanRep.composite, "errors and failure should lower the composite");

const cleanAdvice = getTrainingRecommendation({
  brain: cleanRep,
  wrongTaps: 0,
  failed: false,
});
assert.equal(cleanAdvice.loadAdvice, "increase");
assert.match(cleanAdvice.nextRep, /Move up one load/);

const recoveryAdvice = getTrainingRecommendation({
  brain: messyRep,
  wrongTaps: 6,
  failed: true,
});
assert.equal(recoveryAdvice.loadAdvice, "recover");
assert.match(recoveryAdvice.nextRep, /Drop one load/);

const firstStat = updateTrainingStat({
  brain: cleanRep,
  wrongTaps: 0,
  timeMs: 60_000,
  playedAt: 100,
});
assert.equal(firstStat.sessions, 1);
assert.equal(firstStat.avgComposite, cleanRep.composite);
assert.equal(firstStat.bestComposite, cleanRep.composite);
assert.equal(firstStat.totalErrors, 0);
assert.equal(firstStat.totalTimeMs, 60_000);
assert.equal(firstStat.lastPlayedAt, 100);

const secondStat = updateTrainingStat({
  existing: firstStat,
  brain: messyRep,
  wrongTaps: 6,
  timeMs: 180_000,
  playedAt: 200,
});
assert.equal(secondStat.sessions, 2);
assert.equal(secondStat.avgComposite, Math.round((cleanRep.composite + messyRep.composite) / 2));
assert.equal(secondStat.bestComposite, cleanRep.composite);
assert.equal(secondStat.totalErrors, 6);
assert.equal(secondStat.totalTimeMs, 240_000);
assert.equal(secondStat.lastPlayedAt, 200);

const dailyPlan = getDailyTrainingPlan({
  totalPuzzles: 8,
  lastDailyDate: "2026-06-06",
  now: Date.parse("2026-06-07T09:00:00.000Z"),
  records: {
    a: { mode: "timed", lastPlayedAt: Date.parse("2026-06-06T09:00:00.000Z") },
    b: { mode: "accuracy", lastPlayedAt: Date.parse("2026-06-06T09:10:00.000Z") },
  },
  trainingStats: {
    timed: { sessions: 3, avgComposite: 82, bestComposite: 91, totalErrors: 2, totalTimeMs: 180_000, lastPlayedAt: 1 },
    accuracy: { sessions: 2, avgComposite: 61, bestComposite: 72, totalErrors: 7, totalTimeMs: 140_000, lastPlayedAt: 2 },
  },
});
assert.equal(dailyPlan.headline, "Keep the system balanced");
assert.equal(dailyPlan.touchedModes, 2);
assert.equal(dailyPlan.weakestMode, "accuracy");
assert.equal(dailyPlan.nextMode, "challenge");
assert.equal(dailyPlan.steps.length, 3);
assert.equal(dailyPlan.steps[0].mode, "daily");
assert.equal(dailyPlan.steps[0].shortTitle, "Daily Neuroset");
assert.equal(dailyPlan.steps[1].shortTitle, "Precision Lab");
assert.match(dailyPlan.steps[1].detail, /Current average: 61\/100/);
assert.equal(dailyPlan.steps[0].recommendedLoad, "easy");
assert.equal(dailyPlan.steps[1].recommendedLoad, "easy");
assert.ok(dailyPlan.steps.every((step) => step.loadReason.length > 20), "daily steps should explain load choice");

const completedDailyPlan = getDailyTrainingPlan({
  totalPuzzles: 8,
  lastDailyDate: "2026-06-07",
  now: Date.parse("2026-06-07T09:00:00.000Z"),
  records: {
    a: { mode: "timed", lastPlayedAt: Date.parse("2026-06-06T09:00:00.000Z") },
    b: { mode: "daily", lastPlayedAt: Date.parse("2026-06-07T08:00:00.000Z") },
  },
  trainingStats: {
    timed: { sessions: 3, avgComposite: 82, bestComposite: 91, totalErrors: 2, totalTimeMs: 180_000, lastPlayedAt: 1 },
    daily: { sessions: 1, avgComposite: 88, bestComposite: 88, totalErrors: 0, totalTimeMs: 90_000, lastPlayedAt: 2 },
  },
});
assert.notEqual(completedDailyPlan.steps[0].mode, "daily", "completed daily should not be a blocked first action");
assert.equal(completedDailyPlan.steps[0].mode, completedDailyPlan.nextMode);
assert.equal(new Set(completedDailyPlan.steps.map((step) => step.mode)).size, 3, "plan should avoid duplicate reps");
assert.ok(completedDailyPlan.steps.every((step) => step.shortTitle.length > 0), "each step should have a stable display label");
assert.ok(completedDailyPlan.steps.every((step) => DIFFICULTY_LOAD[step.recommendedLoad]), "each step should have a valid recommended load");
assert.match(completedDailyPlan.steps[0].reason, /Daily anchor is complete/);

const dailyLeastPlayedPlan = getDailyTrainingPlan({
  totalPuzzles: 20,
  lastDailyDate: "2026-06-07",
  now: Date.parse("2026-06-07T19:00:00.000Z"),
  records: {
    daily: { mode: "daily", lastPlayedAt: Date.parse("2026-06-07T08:00:00.000Z") },
    timed1: { mode: "timed", lastPlayedAt: Date.parse("2026-06-07T08:10:00.000Z") },
    timed2: { mode: "timed", lastPlayedAt: Date.parse("2026-06-07T08:20:00.000Z") },
    accuracy1: { mode: "accuracy", lastPlayedAt: Date.parse("2026-06-07T08:30:00.000Z") },
    accuracy2: { mode: "accuracy", lastPlayedAt: Date.parse("2026-06-07T08:40:00.000Z") },
    challenge1: { mode: "challenge", lastPlayedAt: Date.parse("2026-06-07T08:50:00.000Z") },
    challenge2: { mode: "challenge", lastPlayedAt: Date.parse("2026-06-07T08:55:00.000Z") },
    endless1: { mode: "endless", lastPlayedAt: Date.parse("2026-06-07T09:00:00.000Z") },
    endless2: { mode: "endless", lastPlayedAt: Date.parse("2026-06-07T09:05:00.000Z") },
    speed1: { mode: "speedrun", lastPlayedAt: Date.parse("2026-06-07T09:10:00.000Z") },
    speed2: { mode: "speedrun", lastPlayedAt: Date.parse("2026-06-07T09:15:00.000Z") },
  },
  trainingStats: {
    daily: { sessions: 1, avgComposite: 90, bestComposite: 90, totalErrors: 0, totalTimeMs: 80_000, lastPlayedAt: 1 },
    timed: { sessions: 2, avgComposite: 79, bestComposite: 89, totalErrors: 3, totalTimeMs: 180_000, lastPlayedAt: 2 },
    accuracy: { sessions: 2, avgComposite: 83, bestComposite: 87, totalErrors: 2, totalTimeMs: 160_000, lastPlayedAt: 3 },
    challenge: { sessions: 1, avgComposite: 77, bestComposite: 77, totalErrors: 4, totalTimeMs: 90_000, lastPlayedAt: 4 },
    endless: { sessions: 1, avgComposite: 85, bestComposite: 85, totalErrors: 1, totalTimeMs: 100_000, lastPlayedAt: 5 },
    speedrun: { sessions: 1, avgComposite: 86, bestComposite: 86, totalErrors: 1, totalTimeMs: 70_000, lastPlayedAt: 6 },
  },
});
assert.equal(dailyLeastPlayedPlan.nextMode, "daily", "daily can still be the least-played mode internally");
assert.notEqual(dailyLeastPlayedPlan.steps[0].mode, "daily", "starter must remain actionable after daily completion");
assert.equal(dailyLeastPlayedPlan.steps[0].mode, "timed", "starter should choose the least-covered non-daily mode");

const weeklyPlan = getWeeklyTrainingPlan({
  weakestMode: "challenge",
  now: Date.parse("2026-06-07T09:00:00.000Z"),
});
assert.equal(weeklyPlan.length, 7, "weekly protocol should cover a full week");
assert.equal(weeklyPlan[0].mode, "daily", "weekly protocol should begin with a baseline daily rep");
assert.equal(weeklyPlan[1].mode, "challenge", "weakest mode should get the second slot");
assert.equal(weeklyPlan[1].load, "medium", "weakest-mode slot should use training load");
assert.equal(new Set(weeklyPlan.map((item) => item.day)).size, 7, "weekly rows should have distinct day labels");
assert.equal(new Set(weeklyPlan.slice(0, 6).map((item) => item.mode)).size, 6, "first six days should cover each system once");
assert.ok(
  weeklyPlan.every((item) => COGNITIVE_FOCUS[item.mode] && DIFFICULTY_LOAD[item.load] && item.instruction.length > 20),
  "weekly rows should be display-ready"
);

const dailyWeakestWeeklyPlan = getWeeklyTrainingPlan({
  weakestMode: "daily",
  now: Date.parse("2026-06-07T09:00:00.000Z"),
});
assert.equal(dailyWeakestWeeklyPlan[0].mode, "daily");
assert.equal(dailyWeakestWeeklyPlan[1].mode, "accuracy", "daily weakest should fall back to a non-daily control rep");

console.log("brain-training tests passed");
