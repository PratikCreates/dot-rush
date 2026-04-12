export interface ScoreEvent {
  type:
    | "shape_connected"
    | "shape_colored_correct"
    | "region_correct"
    | "wrong_tap"
    | "wrong_color"
    | "speed_bonus";
  points: number;
  label: string;
}

export const SCORE_SHAPE_CONNECTED = 10;
export const SCORE_FULL_SHAPE_CORRECT = 40;
export const SCORE_REGION_CORRECT = 5;
export const PENALTY_WRONG_TAP = -2;
export const PENALTY_WRONG_COLOR = -1;
export const MISTAKE_LIMIT = 3;

/**
 * Position-based points for multiplayer/team races.
 * 1st → 10, 2nd → 7, 3rd → 4, 4th+ → 1
 */
export const POSITION_POINTS: Record<number, number> = {
  1: 10,
  2: 7,
  3: 4,
  4: 1,
};

export function getPositionPoints(position: number): number {
  if (position <= 0) return 0;
  return POSITION_POINTS[position] ?? 1;
}

/**
 * Calculate team aggregate score from individual finishing positions.
 * Each player's position maps to points; team total is summed.
 */
export function calculateTeamScore(
  playerPositions: Array<{ playerId: string; teamId: string; position: number }>
): Record<string, number> {
  const teamScores: Record<string, number> = {};
  for (const p of playerPositions) {
    const pts = getPositionPoints(p.position);
    teamScores[p.teamId] = (teamScores[p.teamId] ?? 0) + pts;
  }
  return teamScores;
}

/**
 * Rank teams by their total score, returning sorted array highest first.
 */
export function rankTeams(
  teamScores: Record<string, number>
): Array<{ teamId: string; score: number; rank: number }> {
  const entries = Object.entries(teamScores).map(([teamId, score]) => ({
    teamId,
    score,
  }));
  entries.sort((a, b) => b.score - a.score);
  return entries.map((e, i) => ({ ...e, rank: i + 1 }));
}

export function calculateSpeedBonus(secondsRemaining: number): number {
  return Math.max(0, Math.floor(secondsRemaining));
}

export function calculateStars(
  score: number,
  maxScore: number,
  timeRemaining: number,
  timeLimitSec: number,
  wrongTaps: number
): number {
  const accuracy = 1 - wrongTaps * 0.05;
  const timeRatio = timeRemaining / timeLimitSec;
  const scoreRatio = maxScore > 0 ? score / maxScore : 1;
  const combined = scoreRatio * 0.5 + timeRatio * 0.3 + accuracy * 0.2;
  if (combined >= 0.85) return 3;
  if (combined >= 0.6) return 2;
  return 1;
}

export function getTimeLimitSec(difficulty: string, mode: string): number {
  if (mode === "timed" || mode === "endless" || mode === "accuracy") return 0;
  const limits: Record<string, Record<string, number>> = {
    easy: { challenge: 180, daily: 300 },
    medium: { challenge: 360, daily: 480 },
    hard: { challenge: 720, daily: 900 },
  };
  return limits[difficulty]?.[mode] ?? 300;
}
