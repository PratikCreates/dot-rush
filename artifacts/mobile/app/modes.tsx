import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { IoniconName } from "@/types/icons";
import { useColors } from "@/hooks/useColors";
import { GameMode } from "@/context/GameContext";
import { usePlayer } from "@/context/PlayerContext";
import { COGNITIVE_FOCUS, getDailyTrainingPlan } from "@/engine/brainTraining";

const MODES: Array<{
  mode: GameMode;
  label: string;
  desc: string;
  icon: IoniconName;
  color: string;
  badge?: string;
}> = [
  {
    mode: "timed",
    label: COGNITIVE_FOCUS.timed.label.toUpperCase(),
    desc: COGNITIVE_FOCUS.timed.short,
    icon: "stopwatch",
    color: COGNITIVE_FOCUS.timed.color,
    badge: "ATTENTION",
  },
  {
    mode: "challenge",
    label: COGNITIVE_FOCUS.challenge.label.toUpperCase(),
    desc: COGNITIVE_FOCUS.challenge.short,
    icon: "flame",
    color: COGNITIVE_FOCUS.challenge.color,
    badge: "CONTROL",
  },
  {
    mode: "daily",
    label: COGNITIVE_FOCUS.daily.label.toUpperCase(),
    desc: COGNITIVE_FOCUS.daily.short,
    icon: "calendar",
    color: COGNITIVE_FOCUS.daily.color,
    badge: "HABIT",
  },
  {
    mode: "endless",
    label: COGNITIVE_FOCUS.endless.label.toUpperCase(),
    desc: COGNITIVE_FOCUS.endless.short,
    icon: "infinite",
    color: COGNITIVE_FOCUS.endless.color,
    badge: "ENDURANCE",
  },
  {
    mode: "accuracy",
    label: COGNITIVE_FOCUS.accuracy.label.toUpperCase(),
    desc: COGNITIVE_FOCUS.accuracy.short,
    icon: "checkmark-circle",
    color: COGNITIVE_FOCUS.accuracy.color,
  },
  {
    mode: "speedrun",
    label: COGNITIVE_FOCUS.speedrun.label.toUpperCase(),
    desc: COGNITIVE_FOCUS.speedrun.short,
    icon: "flash",
    color: COGNITIVE_FOCUS.speedrun.color,
    badge: "SPEED",
  },
];

export default function ModesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { hasDailyBeenPlayed, profile } = usePlayer();
  const plan = getDailyTrainingPlan({
    totalPuzzles: profile.totalPuzzles,
    lastDailyDate: profile.lastDailyDate,
    records: profile.records,
    trainingStats: profile.trainingStats,
  });
  const recommendedByMode = new Map(plan.steps.map((step, index) => [step.mode, { ...step, index }]));

  const gradStart = colors.isDark ? "#0D0020" : "#FFF0FC";
  const gradEnd = colors.isDark ? "#0A001A" : "#E8C0FF";

  const dailyAlreadyPlayed = hasDailyBeenPlayed();

  const handleModeSelect = (mode: GameMode) => {
    if (mode === "daily" && dailyAlreadyPlayed) {
      Alert.alert(
        "Daily Puzzle Complete",
        "You've already completed today's daily puzzle! Come back tomorrow for a new challenge.",
        [{ text: "OK" }]
      );
      return;
    }
    router.push({ pathname: "/difficulty", params: { mode } });
  };

  return (
    <LinearGradient
      colors={[gradStart, gradEnd]}
      style={{ flex: 1 }}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12),
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="back-button"
        >
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          GAME MODE
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.coachCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.coachTitle, { color: colors.foreground }]}>
            {plan.headline}
          </Text>
          <Text style={[styles.coachText, { color: colors.mutedForeground }]}>
            {plan.subline}. Recommended reps are marked below so you can start without planning.
          </Text>
          <View style={styles.planRow}>
            {plan.steps.map((step, index) => (
              <TouchableOpacity
                key={`${step.mode}-${index}`}
                style={[
                  styles.planChip,
                  {
                    backgroundColor: COGNITIVE_FOCUS[step.mode].color + "18",
                    borderColor: COGNITIVE_FOCUS[step.mode].color + "55",
                  },
                ]}
                onPress={() => handleModeSelect(step.mode)}
                activeOpacity={0.8}
              >
                <Text style={[styles.planChipNum, { color: COGNITIVE_FOCUS[step.mode].color }]}>
                  {index + 1}
                </Text>
                <Text style={[styles.planChipText, { color: colors.foreground }]}>
                  {COGNITIVE_FOCUS[step.mode].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {MODES.map((m) => {
          const recommendation = recommendedByMode.get(m.mode);
          return (
            <TouchableOpacity
            key={m.mode}
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: m.color + "44",
                shadowColor: m.color,
                opacity: m.mode === "daily" && dailyAlreadyPlayed ? 0.6 : 1,
              },
            ]}
            onPress={() =>
              m.mode === "speedrun"
                ? router.push("/besttime")
                : handleModeSelect(m.mode)
            }
            activeOpacity={0.8}
            testID={`mode-${m.mode}`}
          >
            <View
              style={[styles.iconBox, { backgroundColor: m.color + "22" }]}
            >
              <Ionicons name={m.icon} size={28} color={m.color} />
            </View>
            <View style={styles.cardText}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                  {m.label}
                </Text>
                {m.mode === "daily" && dailyAlreadyPlayed && (
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                )}
              </View>
              <Text
                style={[styles.cardDesc, { color: colors.mutedForeground }]}
              >
                {m.desc}
              </Text>
              <Text style={[styles.focusDetail, { color: m.color }]}>
                {COGNITIVE_FOCUS[m.mode].detail}
              </Text>
              {recommendation && (
                <Text style={[styles.recommendReason, { color: m.color }]}>
                  Today #{recommendation.index + 1}: {recommendation.reason}
                </Text>
              )}
              {m.mode === "daily" && (
                <Text style={[styles.streakText, { color: m.color }]}>
                  🔥 {profile.dailyStreak} day streak
                </Text>
              )}
            </View>
            {(recommendation || m.badge) && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: m.color + "22", borderColor: m.color + "55" },
                ]}
              >
                <Text style={[styles.badgeText, { color: m.color }]}>
                  {recommendation ? `PLAN ${recommendation.index + 1}` : m.badge}
                </Text>
              </View>
            )}
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.mutedForeground}
            />
            </TouchableOpacity>
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
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  content: { padding: 20, gap: 12 },
  coachCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 5,
    marginBottom: 4,
  },
  coachTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  coachText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
    textAlign: "center",
  },
  planRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  planChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  planChipNum: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  planChipText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  focusDetail: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 16,
    marginTop: 4,
  },
  recommendReason: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    lineHeight: 14,
    marginTop: 5,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  streakText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
  },
});
