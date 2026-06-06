import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { IoniconName } from "@/types/icons";
import { useColors } from "@/hooks/useColors";
import { usePlayer } from "@/context/PlayerContext";
import { getDailyTrainingPlan } from "@/engine/brainTraining";

const { width, height } = Dimensions.get("window");

const FLOAT_DOTS = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  x: Math.random() * width,
  y: Math.random() * height,
  size: 8 + Math.random() * 18,
  color: ["#FF3CAC", "#36D6FF", "#FFD700", "#39FF14", "#FF8C00", "#BF5FFF"][
    i % 6
  ],
  dur: 3000 + Math.random() * 4000,
}));

function FloatingDot({ dot }: { dot: (typeof FLOAT_DOTS)[0] }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: dot.dur,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: dot.dur,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const ty = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -28] });
  const opacity = anim.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [0.2, 0.6, 0.6, 0.2],
  });
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: dot.x,
        top: dot.y,
        width: dot.size,
        height: dot.size,
        borderRadius: dot.size / 2,
        backgroundColor: dot.color,
        opacity,
        transform: [{ translateY: ty }],
      }}
    />
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = usePlayer();
  const plan = getDailyTrainingPlan({
    totalPuzzles: profile.totalPuzzles,
    lastDailyDate: profile.lastDailyDate,
    records: profile.records,
    trainingStats: profile.trainingStats,
  });
  const logoAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(logoAnim, {
      toValue: 1,
      friction: 6,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, []);

  const logoScale = logoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  const gradStart = colors.isDark ? "#0D0020" : "#FFF0FC";
  const gradMid = colors.isDark ? "#1A0035" : "#F5D6FF";
  const gradEnd = colors.isDark ? "#0A001A" : "#E8C0FF";

  return (
    <LinearGradient
      colors={[gradStart, gradMid, gradEnd]}
      style={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}
    >
      {FLOAT_DOTS.map((dot) => (
        <FloatingDot key={dot.id} dot={dot} />
      ))}

      <Animated.View
        style={[styles.logoArea, { transform: [{ scale: logoScale }] }]}
      >
        <Text style={[styles.logoSubtitle, { color: colors.mutedForeground }]}>
          VISUAL FOCUS · MEMORY · SPEED CONTROL
        </Text>
        <Text style={[styles.logoTitle, { color: colors.primary }]}>DOT</Text>
        <Text style={[styles.logoTitle, { color: colors.accent }]}>RUSH</Text>
        <View style={[styles.logoBadge, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "55" }]}>
          <Text style={[styles.logoBadgeText, { color: colors.primary }]}>
            {profile.totalStars} ★  BRAIN REPS
          </Text>
        </View>
        <View style={[styles.promiseCard, { backgroundColor: colors.card + "DD", borderColor: colors.border }]}>
          <Text style={[styles.promiseTitle, { color: colors.foreground }]}>
            {plan.headline}
          </Text>
          <Text style={[styles.promiseText, { color: colors.mutedForeground }]}>
            {plan.steps.map((step) => step.title).join(" · ")}
          </Text>
          <Text style={[styles.promiseHint, { color: colors.primary }]}>
            {plan.subline}
          </Text>
          <View style={styles.planMiniRow}>
            {plan.steps.map((step, index) => (
              <View
                key={`${step.mode}-${index}`}
                style={[styles.planMiniPill, { borderColor: colors.primary + "55" }]}
              >
                <Text style={[styles.planMiniNum, { color: colors.primary }]}>
                  {index + 1}
                </Text>
                <Text style={[styles.planMiniText, { color: colors.foreground }]}>
                  {step.shortTitle}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>

      <View style={styles.buttons}>
        <MenuButton
          label="START TODAY'S PLAN"
          icon="fitness"
          bgColor={colors.primary}
          textColor={colors.primaryForeground}
          onPress={() => router.push("/modes")}
          testID="btn-start-plan"
        />
        <MenuButton
          label="TRAINING MODES"
          icon="grid"
          bgColor={colors.isDark ? colors.surfaceHigh : colors.secondary}
          textColor={colors.foreground}
          onPress={() => router.push("/modes")}
          testID="btn-training-modes"
        />
        <MenuButton
          label="MULTIPLAYER"
          icon="people"
          bgColor={colors.accent}
          textColor={colors.accentForeground}
          onPress={() => router.push("/multiplayer")}
          testID="btn-multiplayer"
        />
        <View style={styles.bottomRow}>
          <MenuButton
            label="PROFILE"
            icon="person-circle"
            bgColor={colors.isDark ? colors.surfaceHigh : colors.secondary}
            textColor={colors.foreground}
            onPress={() => router.push("/profile")}
            testID="btn-profile"
            flex
          />
          <MenuButton
            label="TRAINING GUIDE"
            icon="help-circle"
            bgColor={"#BF5FFF"}
            textColor={"#FFFFFF"}
            onPress={() => router.push("/howtoplay")}
            testID="btn-howtoplay"
            flex
          />
        </View>
      </View>

      <Text
        style={[
          styles.footer,
          {
            color: colors.mutedForeground,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 8),
          },
        ]}
      >
        64 · 128 · 256 DOT NEURODRILLS
      </Text>
    </LinearGradient>
  );
}

function MenuButton({
  label,
  icon,
  bgColor,
  textColor,
  onPress,
  testID,
  flex,
}: {
  label: string;
  icon: IoniconName;
  bgColor: string;
  textColor: string;
  onPress: () => void;
  testID?: string;
  flex?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
      friction: 8,
    }).start();
  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();

  return (
    <Animated.View style={{ transform: [{ scale }], flex: flex ? 1 : undefined }}>
      <TouchableOpacity
        style={[
          styles.menuBtn,
          {
            backgroundColor: bgColor,
            shadowColor: bgColor,
            flex: flex ? 1 : undefined,
          },
        ]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        testID={testID}
      >
        <Ionicons
          name={icon}
          size={22}
          color={textColor}
          style={{ marginRight: 10 }}
        />
        <Text style={[styles.menuBtnText, { color: textColor }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoArea: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoSubtitle: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  logoTitle: {
    fontSize: 72,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0,
    lineHeight: 76,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 2, height: 4 },
    textShadowRadius: 8,
  },
  logoBadge: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  logoBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  promiseCard: {
    width: Math.min(width * 0.82, 420),
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 4,
  },
  promiseTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  promiseText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
    textAlign: "center",
  },
  promiseHint: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    lineHeight: 14,
    letterSpacing: 1,
    textAlign: "center",
    textTransform: "uppercase",
  },
  planMiniRow: {
    gap: 7,
    marginTop: 6,
  },
  planMiniPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  planMiniNum: {
    width: 18,
    height: 18,
    borderRadius: 9,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 18,
    fontFamily: "Inter_700Bold",
  },
  planMiniText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "Inter_600SemiBold",
  },
  buttons: {
    width: "80%",
    gap: 14,
  },
  bottomRow: {
    flexDirection: "row",
    gap: 10,
  },
  menuBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  menuBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 3,
  },
});
