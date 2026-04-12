import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors, type AppColors } from "@/hooks/useColors";
import { usePlayer } from "@/context/PlayerContext";
import { useGame } from "@/context/GameContext";
import StarsRow from "@/components/StarsRow";

const CONFETTI_COLORS = [
  "#FF3CAC", "#36D6FF", "#FFD700", "#39FF14", "#BF5FFF", "#FF8C00",
];

function ConfettiDot({ color, delay }: { color: string; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(anim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  const ty = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 300] });
  const opacity = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
  const x = Math.random() * 320 - 40;
  return (
    <Animated.View
      style={{
        position: "absolute",
        top: -10,
        left: x,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: color,
        opacity,
        transform: [{ translateY: ty }],
      }}
    />
  );
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export default function ResultsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    score: string;
    stars: string;
    timeMs: string;
    seed: string;
    difficulty: string;
    mode: string;
    theme: string;
    failed: string;
  }>();

  const { profile } = usePlayer();
  const { resetGame } = useGame();

  const score = parseInt(params.score ?? "0", 10);
  const stars = parseInt(params.stars ?? "0", 10);
  const timeMs = parseInt(params.timeMs ?? "0", 10);
  const failed = params.failed === "1";

  const scoreAnim = useRef(new Animated.Value(0)).current;
  const starsAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    if (!failed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(starsAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(scoreAnim, {
      toValue: score,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, []);

  const recordKey = `${params.seed}_${params.difficulty}_${params.mode}`;
  const record = profile.records[recordKey];
  const isPersonalBest =
    record &&
    record.topScores.length > 0 &&
    record.topScores[0] === score &&
    record.completions <= 1;

  const starsScale = starsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  const gradStart = colors.isDark ? "#0D0020" : "#FFF0FC";
  const gradEnd = colors.isDark ? "#001A0D" : "#D0FFEE";

  const confetti = failed
    ? []
    : CONFETTI_COLORS.flatMap((c, i) =>
        Array.from({ length: 3 }, (_, j) => ({
          id: `${i}-${j}`,
          color: c,
          delay: i * 60 + j * 180,
        }))
      );

  return (
    <LinearGradient colors={[gradStart, gradEnd]} style={{ flex: 1 }}>
      {/* Confetti */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {confetti.map((c) => (
          <ConfettiDot key={c.id} color={c.color} delay={c.delay} />
        ))}
      </View>

      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 24),
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24),
          },
        ]}
      >
        {/* Status */}
        <Animated.View
          style={[styles.topSection, { transform: [{ translateY: slideAnim }] }]}
        >
          {failed ? (
            <>
              <Ionicons name="time" size={56} color={colors.destructive} />
              <Text style={[styles.statusText, { color: colors.destructive }]}>
                TIME UP!
              </Text>
              <Text style={[styles.statusSub, { color: colors.mutedForeground }]}>
                Better luck next time
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.statusText, { color: colors.primary }]}>
                COMPLETE!
              </Text>
              {isPersonalBest && (
                <View
                  style={[
                    styles.pbBadge,
                    { backgroundColor: colors.primary + "22", borderColor: colors.primary + "66" },
                  ]}
                >
                  <Ionicons name="trophy" size={14} color={colors.primary} />
                  <Text style={[styles.pbText, { color: colors.primary }]}>
                    PERSONAL BEST!
                  </Text>
                </View>
              )}
            </>
          )}
        </Animated.View>

        {/* Stars */}
        {!failed && (
          <Animated.View
            style={[
              styles.starsBox,
              { transform: [{ scale: starsScale }] },
            ]}
          >
            <StarsRow stars={stars} size={40} />
          </Animated.View>
        )}

        {/* Score card */}
        <View
          style={[
            styles.scoreCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Animated.Text
            style={[styles.scoreValue, { color: colors.primary }]}
          >
            {score}
          </Animated.Text>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>
            POINTS
          </Text>

          <View
            style={[styles.divider, { backgroundColor: colors.border }]}
          />

          <View style={styles.statsRow}>
            <StatItem
              label="TIME"
              value={formatTime(timeMs)}
              color={colors.accent}
              colors={colors}
            />
            <StatItem
              label="BEST"
              value={
                record?.topScores[0]
                  ? String(record.topScores[0])
                  : "-"
              }
              color={colors.primary}
              colors={colors}
            />
            <StatItem
              label="PLAYS"
              value={String(record?.completions ?? 1)}
              color={colors.success}
              colors={colors}
            />
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[
              styles.btn,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
            ]}
            onPress={() => {
              resetGame();
              router.replace({
                pathname: "/game",
                params: {
                  seed: String(Math.floor(Math.random() * 999983) + 1),
                  difficulty: params.difficulty,
                  theme: params.theme,
                  mode: params.mode,
                },
              });
            }}
            activeOpacity={0.85}
            testID="btn-play-again"
          >
            <Ionicons name="refresh" size={20} color={colors.primaryForeground} />
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
              PLAY AGAIN
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.btn,
              {
                backgroundColor: colors.isDark ? colors.surfaceHigh : colors.secondary,
                borderColor: colors.border,
                borderWidth: 1.5,
              },
            ]}
            onPress={() => {
              resetGame();
              router.replace("/");
            }}
            activeOpacity={0.85}
            testID="btn-home"
          >
            <Ionicons name="home" size={20} color={colors.foreground} />
            <Text style={[styles.btnText, { color: colors.foreground }]}>
              MENU
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

function StatItem({
  label,
  value,
  color,
  colors,
}: {
  label: string;
  value: string;
  color: string;
  colors: AppColors;
}) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel2, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 24,
  },
  topSection: { alignItems: "center", gap: 8 },
  statusText: {
    fontSize: 42,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 6,
  },
  statusSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  pbBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 4,
  },
  pbText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  starsBox: { alignItems: "center" },
  scoreCard: {
    width: "100%",
    alignItems: "center",
    padding: 24,
    borderRadius: 24,
    borderWidth: 1.5,
    gap: 8,
  },
  scoreValue: {
    fontSize: 56,
    fontFamily: "Inter_700Bold",
    letterSpacing: -2,
  },
  scoreLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
  },
  divider: {
    height: 1,
    width: "80%",
    marginVertical: 8,
  },
  statsRow: {
    flexDirection: "row",
    gap: 24,
  },
  statItem: { alignItems: "center" },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  statLabel2: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    marginTop: 2,
  },
  buttons: { width: "100%", gap: 12 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  btnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
});
