import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { IoniconName } from "@/types/icons";
import { useColors } from "@/hooks/useColors";
import { usePlayer } from "@/context/PlayerContext";
import { THEMES, THEME_NAMES } from "@/engine/themes";
import StarsRow from "@/components/StarsRow";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateDisplayName } = usePlayer();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.displayName);

  const winRate =
    profile.wins + profile.losses > 0
      ? Math.round((profile.wins / (profile.wins + profile.losses)) * 100)
      : 0;

  const gradStart = colors.isDark ? "#0D0020" : "#FFF0FC";
  const gradEnd = colors.isDark ? "#0A001A" : "#E8C0FF";

  const STAR_MILESTONES = [15, 30, 50, 75];

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
              {profile.totalStars} Stars
            </Text>
          </View>
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
              { label: "WIN RATE", value: `${winRate}%`, icon: "trophy", color: "#FFD700" },
              { label: "STREAK", value: profile.longestEndlessStreak, icon: "infinite", color: "#BF5FFF" },
              { label: "DAILY STK", value: profile.dailyStreak, icon: "calendar", color: "#36D6FF" },
              { label: "WINS", value: profile.wins, icon: "ribbon", color: colors.success },
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
