import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import { GameMode } from "@/context/GameContext";

interface Props {
  score: number;
  elapsedMs: number;
  timeLimitSec: number;
  mode: GameMode;
  shapesTotal: number;
  shapesConnected: number;
  shapesColored: number;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function HUD({
  score,
  elapsedMs,
  timeLimitSec,
  mode,
  shapesTotal,
  shapesConnected,
  shapesColored,
}: Props) {
  const colors = useColors();

  const hasCountdown = timeLimitSec > 0 && (mode === "challenge" || mode === "daily");
  const remainingMs = hasCountdown
    ? Math.max(0, timeLimitSec * 1000 - elapsedMs)
    : 0;
  const timerColor =
    hasCountdown && remainingMs < 30000
      ? colors.destructive
      : colors.foreground;

  const progressConnected = shapesTotal > 0 ? shapesConnected / shapesTotal : 0;
  const progressColored = shapesTotal > 0 ? shapesColored / shapesTotal : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Score */}
      <View style={styles.statBox}>
        <Text style={[styles.statValue, { color: colors.primary }]}>
          {score}
        </Text>
        <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
          SCORE
        </Text>
      </View>

      {/* Progress */}
      <View style={styles.progressBox}>
        <View style={styles.progressRow}>
          <View
            style={[
              styles.progressBar,
              { backgroundColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${progressConnected * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
            {shapesConnected}/{shapesTotal} shapes
          </Text>
        </View>
        <View style={styles.progressRow}>
          <View
            style={[
              styles.progressBar,
              { backgroundColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.success,
                  width: `${progressColored * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
            {shapesColored}/{shapesTotal} colored
          </Text>
        </View>
      </View>

      {/* Timer */}
      <View style={styles.statBox}>
        <Text style={[styles.statValue, { color: timerColor }]}>
          {hasCountdown ? formatCountdown(remainingMs) : formatTime(elapsedMs)}
        </Text>
        <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
          {hasCountdown ? "LEFT" : "TIME"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  statBox: {
    alignItems: "center",
    minWidth: 60,
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginTop: 1,
  },
  progressBox: {
    flex: 1,
    gap: 6,
  },
  progressRow: {
    gap: 4,
  },
  progressBar: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    textAlign: "right",
  },
});
