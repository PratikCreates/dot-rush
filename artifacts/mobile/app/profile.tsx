import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
  type DimensionValue,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { IoniconName } from "@/types/icons";
import { useColors } from "@/hooks/useColors";
import { usePlayer } from "@/context/PlayerContext";
import { THEMES, THEME_NAMES } from "@/engine/themes";
import {
  COGNITIVE_FOCUS,
  DIFFICULTY_LOAD,
  TRAINING_ORDER,
  getDailyTrainingPlan,
  getWeeklyTrainingPlan,
} from "@/engine/brainTraining";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateDisplayName } = usePlayer();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.displayName);

  const gradStart = colors.isDark ? "#0D0020" : "#FFF0FC";
  const gradEnd = colors.isDark ? "#0A001A" : "#E8C0FF";

  const trainingStats = profile.trainingStats ?? {};
  const plan = getDailyTrainingPlan({
    totalPuzzles: profile.totalPuzzles,
    lastDailyDate: profile.lastDailyDate,
    records: profile.records,
    trainingStats,
  });
  const weeklyPlan = getWeeklyTrainingPlan({ weakestMode: plan.weakestMode });
  const trainedModeStats = TRAINING_ORDER
    .map((mode) => ({ mode, stat: trainingStats[mode] }))
    .filter((item) => item.stat && item.stat.sessions > 0);
  const averageBrainScore =
    trainedModeStats.length > 0
      ? Math.round(
          trainedModeStats.reduce((sum, item) => sum + (item.stat?.avgComposite ?? 0), 0) /
            trainedModeStats.length
        )
      : 0;
  const averageErrors =
    trainedModeStats.length > 0
      ? (
          trainedModeStats.reduce((sum, item) => {
            const stat = item.stat;
            return sum + (stat ? stat.totalErrors / Math.max(1, stat.sessions) : 0);
          }, 0) / trainedModeStats.length
        ).toFixed(1)
      : "0.0";
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          PROFILE
        </Text>
        <TouchableOpacity
          onPress={() => {
            if (editing) updateDisplayName(name);
            setEditing((v) => !v);
          }}
          style={styles.editBtn}
        >
          <Ionicons
            name={editing ? "checkmark" : "pencil"}
            size={20}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.primary + "33", borderColor: colors.primary },
            ]}
          >
            <Text style={[styles.avatarLetter, { color: colors.primary }]}>
              {(profile.displayName[0] ?? "P").toUpperCase()}
            </Text>
          </View>
          {editing ? (
            <TextInput
              style={[
                styles.nameInput,
                {
                  color: colors.foreground,
                  borderColor: colors.primary,
                  backgroundColor: colors.surface,
                },
              ]}
              value={name}
              onChangeText={setName}
              maxLength={20}
              autoFocus
            />
          ) : (
            <Text style={[styles.displayName, { color: colors.foreground }]}>
              {profile.displayName}
            </Text>
          )}
          <View style={styles.starsDisplay}>
            <Ionicons name="star" size={18} color={colors.primary} />
            <Text style={[styles.starsCount, { color: colors.primary }]}>
              {profile.totalStars} Brain Reps
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          TODAY'S TRAINING PLAN
        </Text>
        <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.planHeader}>
            <View style={[styles.planIcon, { backgroundColor: colors.primary + "22" }]}>
              <Ionicons name="pulse" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.planTitle, { color: colors.foreground }]}>
                {plan.headline}
              </Text>
              <Text style={[styles.planSub, { color: colors.mutedForeground }]}>
                {plan.subline}
              </Text>
            </View>
          </View>
          {plan.steps.map((item, index) => (
            <TouchableOpacity
              key={`${item.mode}-${index}`}
              style={[styles.planStep, { borderColor: COGNITIVE_FOCUS[item.mode].color + "44" }]}
              onPress={() => router.push({ pathname: "/difficulty", params: { mode: item.mode } })}
              activeOpacity={0.8}
            >
              <Text style={[styles.planStepNum, { color: COGNITIVE_FOCUS[item.mode].color }]}>
                {index + 1}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.planStepTitle, { color: colors.foreground }]}>
                  {item.title}
                </Text>
                <Text style={[styles.planStepDetail, { color: colors.mutedForeground }]}>
                  {item.detail}
                </Text>
                <View
                  style={[
                    styles.loadChip,
                    { borderColor: COGNITIVE_FOCUS[item.mode].color + "55" },
                  ]}
                >
                  <Ionicons
                    name={
                      item.recommendedLoad === "hard"
                        ? "flash"
                        : item.recommendedLoad === "medium"
                          ? "fitness"
                          : "leaf"
                    }
                    size={12}
                    color={COGNITIVE_FOCUS[item.mode].color}
                  />
                  <Text
                    style={[
                      styles.loadChipText,
                      { color: COGNITIVE_FOCUS[item.mode].color },
                    ]}
                  >
                    {DIFFICULTY_LOAD[item.recommendedLoad].label}
                  </Text>
                </View>
                <Text style={[styles.planStepReason, { color: COGNITIVE_FOCUS[item.mode].color }]}>
                  {item.reason} {item.loadReason}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          7-DAY BALANCE MAP
        </Text>
        <View style={[styles.weekCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {weeklyPlan.map((item) => (
            <TouchableOpacity
              key={`${item.day}-${item.mode}`}
              style={[styles.weekRow, { borderColor: COGNITIVE_FOCUS[item.mode].color + "44" }]}
              onPress={() => router.push({ pathname: "/difficulty", params: { mode: item.mode } })}
              activeOpacity={0.8}
            >
              <Text style={[styles.weekDay, { color: COGNITIVE_FOCUS[item.mode].color }]}>
                {item.day}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.weekTitle, { color: colors.foreground }]}>
                  {item.focus} · {DIFFICULTY_LOAD[item.load].label}
                </Text>
                <Text style={[styles.weekInstruction, { color: colors.mutedForeground }]}>
                  {item.instruction}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats grid */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          STATS
        </Text>
        <View style={styles.statsGrid}>
          {(
            [
              { label: "PUZZLES", value: profile.totalPuzzles, icon: "grid", color: colors.accent },
              { label: "SHAPES", value: profile.totalShapes, icon: "shapes", color: colors.primary },
              { label: "BRAIN AVG", value: averageBrainScore || "-", icon: "pulse", color: "#FFD700" },
              { label: "STREAK", value: profile.longestEndlessStreak, icon: "infinite", color: "#BF5FFF" },
              { label: "DAILY STK", value: profile.dailyStreak, icon: "calendar", color: "#36D6FF" },
              { label: "ERR/REP", value: averageErrors, icon: "radio-button-off", color: colors.success },
            ] satisfies Array<{ label: string; value: string | number; icon: IoniconName; color: string }>
          ).map((s) => (
            <View
              key={s.label}
              style={[
                styles.statCard,
                { backgroundColor: colors.card, borderColor: s.color + "44" },
              ]}
            >
              <Ionicons name={s.icon} size={20} color={s.color} />
              <Text style={[styles.statValue, { color: s.color }]}>
                {s.value}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        <Text
          style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 16 }]}
        >
          TRAINING SCOREBOARD
        </Text>
        <View style={[styles.mixCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {TRAINING_ORDER.map((mode) => {
            const stat = trainingStats[mode];
            const count = stat?.sessions ?? 0;
            const width: DimensionValue = `${Math.min(100, (stat?.avgComposite ?? 0))}%`;
            return (
              <View key={mode} style={styles.mixRow}>
                <Text style={[styles.mixLabel, { color: colors.foreground }]}>
                  {COGNITIVE_FOCUS[mode].label}
                </Text>
                <View style={[styles.mixTrack, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.mixFill,
                      {
                        backgroundColor: COGNITIVE_FOCUS[mode].color,
                        width,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.mixCount, { color: COGNITIVE_FOCUS[mode].color }]}>
                  {count ? stat?.avgComposite : "-"}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Unlocks */}
        <Text
          style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 16 }]}
        >
          THEME PACKS
        </Text>
        {THEME_NAMES.map((t) => {
          const theme = THEMES[t];
          const unlocked = profile.unlockedThemes.includes(t);
          const progress =
            theme.unlockStars > 0
              ? Math.min(1, profile.totalStars / theme.unlockStars)
              : 1;
          return (
            <View
              key={t}
              style={[
                styles.themeRow,
                {
                  backgroundColor: colors.card,
                  borderColor: unlocked ? colors.success + "55" : colors.border,
                },
              ]}
            >
              <View style={styles.swatchRow}>
                {theme.palette.slice(0, 6).map((c) => (
                  <View
                    key={c}
                    style={[styles.swatch, { backgroundColor: c, opacity: unlocked ? 1 : 0.4 }]}
                  />
                ))}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.themeName, { color: unlocked ? colors.foreground : colors.mutedForeground }]}>
                  {theme.displayName.toUpperCase()}
                </Text>
                {!unlocked && (
                  <View style={styles.progressRow}>
                    <View
                      style={[styles.progressBar, { backgroundColor: colors.border }]}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          {
                            backgroundColor: colors.primary,
                            width: `${progress * 100}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
                      {profile.totalStars}/{theme.unlockStars}★
                    </Text>
                  </View>
                )}
              </View>
              <Ionicons
                name={unlocked ? "checkmark-circle" : "lock-closed"}
                size={22}
                color={unlocked ? colors.success : colors.mutedForeground}
              />
            </View>
          );
        })}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 8 },
  editBtn: { padding: 8 },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  content: { padding: 20, gap: 10 },
  avatarSection: { alignItems: "center", gap: 8, marginBottom: 16 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
  },
  displayName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  nameInput: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    textAlign: "center",
    minWidth: 160,
  },
  starsDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  starsCount: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2.5,
    marginBottom: 6,
  },
  planCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 12,
    marginBottom: 12,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  planIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  planTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  planSub: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  planStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
  },
  planStepNum: {
    width: 22,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  planStepTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  planStepDetail: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    lineHeight: 16,
    marginTop: 2,
  },
  loadChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 7,
  },
  loadChipText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
  },
  planStepReason: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    lineHeight: 14,
    marginTop: 5,
  },
  weekCard: {
    padding: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 8,
    marginBottom: 12,
  },
  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 13,
    padding: 10,
  },
  weekDay: {
    width: 34,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  weekTitle: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  weekInstruction: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    lineHeight: 14,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "30%",
    flexGrow: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  mixCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 10,
  },
  mixRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mixLabel: {
    width: 112,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  mixTrack: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
  },
  mixFill: {
    height: "100%",
    borderRadius: 4,
  },
  mixCount: {
    width: 18,
    textAlign: "right",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  swatchRow: { flexDirection: "row", gap: 3 },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  themeName: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  progressBar: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
});
