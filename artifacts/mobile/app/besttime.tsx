import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors, type AppColors } from "@/hooks/useColors";
import { usePlayer } from "@/context/PlayerContext";
import type { IoniconName } from "@/types/icons";

const DIFFICULTIES: Array<{ key: string; label: string; color: string; icon: IoniconName }> = [
  { key: "easy", label: "EASY", color: "#39FF14", icon: "leaf" },
  { key: "medium", label: "MEDIUM", color: "#FFD700", icon: "flash" },
  { key: "hard", label: "HARD", color: "#FF3F3F", icon: "flame" },
];

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const centis = Math.floor((ms % 1000) / 10);
  if (min > 0) {
    return `${min}m ${sec.toString().padStart(2, "0")}.${centis.toString().padStart(2, "0")}s`;
  }
  return `${sec}.${centis.toString().padStart(2, "0")}s`;
}

interface BestEntry {
  seed: number;
  bestTimeMs: number;
  stars: number;
  completions: number;
}

interface DifficultyBoardProps {
  difficulty: { key: string; label: string; color: string; icon: IoniconName };
  entries: BestEntry[];
  colors: AppColors;
  onPlay: () => void;
}

function DifficultyBoard({ difficulty, entries, colors, onPlay }: DifficultyBoardProps) {
  const top = entries.slice(0, 5);

  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: difficulty.color + "44" }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.diffBadge, { backgroundColor: difficulty.color + "22" }]}>
          <Ionicons name={difficulty.icon} size={16} color={difficulty.color} />
          <Text style={[styles.diffLabel, { color: difficulty.color }]}>{difficulty.label}</Text>
        </View>
        <TouchableOpacity
          style={[styles.playBtn, { backgroundColor: difficulty.color }]}
          onPress={onPlay}
          activeOpacity={0.8}
        >
          <Ionicons name="play" size={12} color="#000" />
          <Text style={styles.playBtnText}>PLAY</Text>
        </TouchableOpacity>
      </View>

      {top.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          No runs yet — tap PLAY to start!
        </Text>
      ) : (
        top.map((entry, i) => (
          <View
            key={entry.seed}
            style={[
              styles.row,
              { borderBottomColor: colors.border },
              i === 0 && { backgroundColor: difficulty.color + "11" },
            ]}
          >
            <Text style={[styles.rank, { color: i === 0 ? difficulty.color : colors.mutedForeground }]}>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
            </Text>
            <Text style={[styles.timeText, { color: i === 0 ? difficulty.color : colors.foreground }]}>
              {formatTime(entry.bestTimeMs)}
            </Text>
            <View style={styles.starsRow}>
              {Array.from({ length: 3 }).map((_, si) => (
                <Ionicons
                  key={si}
                  name={si < entry.stars ? "star" : "star-outline"}
                  size={12}
                  color={si < entry.stars ? "#FFD700" : colors.mutedForeground}
                />
              ))}
            </View>
            <Text style={[styles.runsText, { color: colors.mutedForeground }]}>
              {entry.completions}×
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

export default function BestTimeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = usePlayer();

  const boardByDifficulty = useMemo(() => {
    const result: Record<string, BestEntry[]> = { easy: [], medium: [], hard: [] };
    for (const record of Object.values(profile.records)) {
      if (record.mode !== "speedrun") continue;
      const diff = record.difficulty;
      if (!(diff in result)) continue;
      result[diff].push({
        seed: record.seed,
        bestTimeMs: record.bestTimeMs,
        stars: record.stars,
        completions: record.completions,
      });
    }
    for (const diff of Object.keys(result)) {
      result[diff].sort((a, b) => a.bestTimeMs - b.bestTimeMs);
    }
    return result;
  }, [profile.records]);

  const gradStart = colors.isDark ? "#0D0020" : "#FFF8E0";
  const gradEnd = colors.isDark ? "#0A001A" : "#FFE8A0";

  return (
    <LinearGradient colors={[gradStart, gradEnd]} style={{ flex: 1 }}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12),
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Ionicons name="flash" size={20} color="#FFD700" />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>SPEED RUN</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Your personal best times per difficulty
        </Text>

        {DIFFICULTIES.map((diff) => (
          <DifficultyBoard
            key={diff.key}
            difficulty={diff}
            entries={boardByDifficulty[diff.key] ?? []}
            colors={colors}
            onPlay={() =>
              router.push({
                pathname: "/difficulty",
                params: { mode: "speedrun", preset: diff.key },
              })
            }
          />
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, alignItems: "flex-start" },
  headerTitleWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontSize: 18, fontWeight: "900", letterSpacing: 2 },
  content: { padding: 16, gap: 16 },
  subtitle: { textAlign: "center", fontSize: 13, marginBottom: 4 },
  section: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  diffBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  diffLabel: { fontSize: 13, fontWeight: "800", letterSpacing: 1.5 },
  playBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  playBtnText: { fontSize: 11, fontWeight: "800", color: "#000", letterSpacing: 1 },
  emptyText: { textAlign: "center", fontSize: 13, paddingVertical: 20, paddingHorizontal: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  rank: { width: 28, fontSize: 14, fontWeight: "700" },
  timeText: { flex: 1, fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
  starsRow: { flexDirection: "row", gap: 2 },
  runsText: { fontSize: 12, fontWeight: "600", minWidth: 24, textAlign: "right" },
});
