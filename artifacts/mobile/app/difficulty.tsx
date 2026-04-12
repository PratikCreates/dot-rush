import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { usePlayer } from "@/context/PlayerContext";
import { THEMES, ThemeName, THEME_NAMES } from "@/engine/themes";
import { Difficulty } from "@/engine/puzzleGenerator";
import { getDailyPuzzleSeed } from "@/engine/puzzleGenerator";

const DIFFICULTIES: Array<{
  key: Difficulty;
  label: string;
  dots: number;
  shapes: string;
  color: string;
  desc: string;
}> = [
  {
    key: "easy",
    label: "EASY",
    dots: 64,
    shapes: "8 shapes",
    color: "#39FF14",
    desc: "Simple polygons, wider spacing",
  },
  {
    key: "medium",
    label: "MEDIUM",
    dots: 128,
    shapes: "16 shapes",
    color: "#FFD700",
    desc: "Complex shapes, irregular figures",
  },
  {
    key: "hard",
    label: "HARD",
    dots: 256,
    shapes: "28 shapes",
    color: "#FF3CAC",
    desc: "Dense puzzle, non-orthodox shapes",
  },
];

export default function DifficultyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const { profile } = usePlayer();

  const [selectedDiff, setSelectedDiff] = useState<Difficulty>("easy");
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>("animals");

  const handleStart = () => {
    const seed =
      mode === "daily"
        ? getDailyPuzzleSeed()
        : Math.floor(Math.random() * 999983) + 1;

    router.push({
      pathname: "/game",
      params: {
        seed: String(seed),
        difficulty: selectedDiff,
        theme: selectedTheme,
        mode: mode ?? "timed",
      },
    });
  };

  const gradStart = colors.isDark ? "#0D0020" : "#FFF0FC";
  const gradEnd = colors.isDark ? "#0A001A" : "#E8C0FF";

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
          DIFFICULTY
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
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          DOT COUNT
        </Text>
        <View style={styles.diffRow}>
          {DIFFICULTIES.map((d) => {
            const sel = selectedDiff === d.key;
            return (
              <TouchableOpacity
                key={d.key}
                style={[
                  styles.diffCard,
                  {
                    backgroundColor: sel ? d.color + "22" : colors.card,
                    borderColor: sel ? d.color : colors.border,
                    flex: 1,
                  },
                ]}
                onPress={() => setSelectedDiff(d.key)}
                activeOpacity={0.8}
                testID={`diff-${d.key}`}
              >
                <Text style={[styles.diffDots, { color: d.color }]}>
                  {d.dots}
                </Text>
                <Text
                  style={[styles.diffLabel, { color: colors.foreground }]}
                >
                  {d.label}
                </Text>
                <Text
                  style={[styles.diffShapes, { color: colors.mutedForeground }]}
                >
                  {d.shapes}
                </Text>
                {sel && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={d.color}
                    style={{ marginTop: 4 }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <Text
          style={[
            styles.diffDesc,
            { color: colors.mutedForeground, textAlign: "center" },
          ]}
        >
          {DIFFICULTIES.find((d) => d.key === selectedDiff)?.desc}
        </Text>

        <Text
          style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 20 }]}
        >
          COLOR THEME
        </Text>
        <View style={styles.themeGrid}>
          {THEME_NAMES.map((t) => {
            const theme = THEMES[t];
            const locked =
              theme.locked && !profile.unlockedThemes.includes(t);
            const sel = selectedTheme === t;
            return (
              <TouchableOpacity
                key={t}
                style={[
                  styles.themeCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: sel ? colors.primary : colors.border,
                    opacity: locked ? 0.45 : 1,
                  },
                ]}
                onPress={() => !locked && setSelectedTheme(t)}
                activeOpacity={locked ? 1 : 0.8}
                testID={`theme-${t}`}
              >
                <View style={styles.swatchRow}>
                  {theme.palette.slice(0, 5).map((c) => (
                    <View
                      key={c}
                      style={[styles.swatch, { backgroundColor: c }]}
                    />
                  ))}
                </View>
                <Text
                  style={[styles.themeName, { color: colors.foreground }]}
                >
                  {theme.displayName.toUpperCase()}
                </Text>
                {locked && (
                  <View style={styles.lockBadge}>
                    <Ionicons
                      name="lock-closed"
                      size={10}
                      color={colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.lockText,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {theme.unlockStars}★
                    </Text>
                  </View>
                )}
                {sel && !locked && (
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16),
            borderTopColor: colors.border,
            backgroundColor: colors.isDark ? colors.background + "EE" : colors.card + "EE",
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={handleStart}
          activeOpacity={0.85}
          testID="start-game"
        >
          <Ionicons name="play" size={20} color={colors.primaryForeground} />
          <Text style={[styles.startBtnText, { color: colors.primaryForeground }]}>
            START GAME
          </Text>
        </TouchableOpacity>
      </View>
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
  content: { padding: 20, gap: 10 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2.5,
    marginBottom: 6,
  },
  diffRow: { flexDirection: "row", gap: 10 },
  diffCard: {
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 2,
    gap: 3,
  },
  diffDots: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  diffLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  diffShapes: { fontSize: 10, fontFamily: "Inter_400Regular" },
  diffDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  themeCard: {
    width: "47%",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  swatchRow: { flexDirection: "row", gap: 4 },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  themeName: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  lockText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  startBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
});
