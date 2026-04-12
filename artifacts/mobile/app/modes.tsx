import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { IoniconName } from "@/types/icons";
import { useColors } from "@/hooks/useColors";
import { GameMode } from "@/context/GameContext";

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
    label: "TIME TRIAL",
    desc: "Race the clock. Beat your personal best!",
    icon: "stopwatch",
    color: "#FF3CAC",
    badge: "CLASSIC",
  },
  {
    mode: "challenge",
    label: "CHALLENGE",
    desc: "Strict countdown. Fail if time runs out.",
    icon: "flame",
    color: "#FF8C00",
    badge: "HARD",
  },
  {
    mode: "daily",
    label: "DAILY PUZZLE",
    desc: "Same puzzle for everyone. Streaks rewarded!",
    icon: "calendar",
    color: "#36D6FF",
    badge: "DAILY",
  },
  {
    mode: "endless",
    label: "ENDLESS",
    desc: "Auto-generates puzzles. How far can you go?",
    icon: "infinite",
    color: "#BF5FFF",
    badge: "STREAK",
  },
  {
    mode: "accuracy",
    label: "ACCURACY",
    desc: "No timer. Zero wrong taps allowed.",
    icon: "checkmark-circle",
    color: "#39FF14",
  },
  {
    mode: "speedrun",
    label: "SPEED RUN",
    desc: "Fastest completion wins. Personal best tracked.",
    icon: "flash",
    color: "#FFD700",
    badge: "FASTEST",
  },
];

export default function ModesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const gradStart = colors.isDark ? "#0D0020" : "#FFF0FC";
  const gradEnd = colors.isDark ? "#0A001A" : "#E8C0FF";

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
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Choose how you want to play
        </Text>
        {MODES.map((m) => (
          <TouchableOpacity
            key={m.mode}
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: m.color + "44",
                shadowColor: m.color,
              },
            ]}
            onPress={() =>
              router.push({ pathname: "/difficulty", params: { mode: m.mode } })
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
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                {m.label}
              </Text>
              <Text
                style={[styles.cardDesc, { color: colors.mutedForeground }]}
              >
                {m.desc}
              </Text>
            </View>
            {m.badge && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: m.color + "22", borderColor: m.color + "55" },
                ]}
              >
                <Text style={[styles.badgeText, { color: m.color }]}>
                  {m.badge}
                </Text>
              </View>
            )}
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
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
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginBottom: 8,
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
});
