import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Dimensions,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Polygon, Circle, Line, Text as SvgText } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import type { IoniconName } from "@/types/icons";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");
const DEMO_SIZE = Math.min(width - 48, 320);

interface Step {
  id: number;
  title: string;
  subtitle: string;
  color: string;
  icon: IoniconName;
  Demo: React.ComponentType<{ colors: any; anim: Animated.Value }>;
}

// ── Demo 1: Tap a shape to select it ──────────────────────────────────────
function SelectShapeDemo({ colors, anim }: { colors: any; anim: Animated.Value }) {
  const scale = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 1] });
  const glowOp = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 0.9, 0.2] });
  const pts = "60,20 140,20 160,80 100,110 40,80";
  return (
    <View style={{ alignItems: "center", justifyContent: "center", height: 140 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Svg width={200} height={130}>
          <Polygon
            points={pts}
            fill={colors.primary + "33"}
            stroke={colors.primary}
            strokeWidth={2.5}
            strokeDasharray="6,4"
          />
        </Svg>
      </Animated.View>
      <Animated.View
        style={{
          position: "absolute",
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.primary,
          opacity: glowOp,
          top: 52,
          left: "50%",
          marginLeft: -22,
        }}
      />
      <Text style={[styles.demoCaption, { color: colors.mutedForeground }]}>
        Tap any dashed shape to begin
      </Text>
    </View>
  );
}

// ── Demo 2: Connect numbered dots in order ─────────────────────────────────
function ConnectDotsDemo({ colors, anim }: { colors: any; anim: Animated.Value }) {
  const dotPositions = [
    { x: 50, y: 30, num: 1 },
    { x: 150, y: 30, num: 2 },
    { x: 170, y: 90, num: 3 },
    { x: 100, y: 120, num: 4 },
    { x: 30, y: 90, num: 5 },
  ];

  const progress = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 5] });

  const [visibleLines, setVisibleLines] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setVisibleLines((v) => (v + 1) % 6);
    }, 400);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={{ alignItems: "center", justifyContent: "center", height: 150 }}>
      <Svg width={200} height={140}>
        {dotPositions.map((dot, i) => {
          const isConnected = i < visibleLines;
          if (i < visibleLines - 1 && i + 1 < dotPositions.length) {
            const next = dotPositions[i + 1];
            return (
              <Line
                key={`line-${i}`}
                x1={dot.x}
                y1={dot.y}
                x2={next.x}
                y2={next.y}
                stroke={colors.primary}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            );
          }
          return null;
        })}
        {dotPositions.map((dot, i) => {
          const isConnected = i < visibleLines;
          const isNext = i === visibleLines;
          return (
            <React.Fragment key={`dot-${i}`}>
              <Circle
                cx={dot.x}
                cy={dot.y}
                r={14}
                fill={isConnected ? colors.primary : isNext ? colors.primary + "44" : colors.surface}
                stroke={isNext ? colors.primary : colors.border}
                strokeWidth={isNext ? 2.5 : 1.5}
              />
              <SvgText
                x={dot.x}
                y={dot.y + 5}
                textAnchor="middle"
                fill={isConnected ? "#FFF" : colors.foreground}
                fontSize={11}
                fontWeight="bold"
              >
                {dot.num}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
      <Text style={[styles.demoCaption, { color: colors.mutedForeground }]}>
        Tap dots 1 → 2 → 3 → 4 → 5 in order
      </Text>
    </View>
  );
}

// ── Demo 3: Color the completed shape ──────────────────────────────────────
function ColorShapeDemo({ colors, anim }: { colors: any; anim: Animated.Value }) {
  const COLORS = ["#FF3CAC", "#36D6FF", "#FFD700", "#39FF14", "#BF5FFF"];
  const [selected, setSelected] = useState(0);
  const [filled, setFilled] = useState(false);
  const fillOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = setInterval(() => {
      setSelected((v) => (v + 1) % COLORS.length);
      setFilled(false);
      fillOp.setValue(0);
      Animated.timing(fillOp, { toValue: 1, duration: 400, useNativeDriver: false }).start();
    }, 900);
    return () => clearInterval(id);
  }, []);

  const pts = "100,10 170,60 145,130 55,130 30,60";
  const fillColor = fillOp.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surface, COLORS[selected]],
  });

  return (
    <View style={{ alignItems: "center", justifyContent: "center", height: 160 }}>
      <Svg width={200} height={140}>
        <Polygon
          points={pts}
          fill={COLORS[selected] + "CC"}
          stroke={COLORS[selected]}
          strokeWidth={2}
        />
      </Svg>
      <View style={styles.swatchRow}>
        {COLORS.map((c, i) => (
          <View
            key={c}
            style={[
              styles.swatch,
              { backgroundColor: c, borderWidth: i === selected ? 3 : 1.5, borderColor: i === selected ? "#FFF" : "transparent" },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.demoCaption, { color: colors.mutedForeground }]}>
        Pick the matching color from the palette
      </Text>
    </View>
  );
}

// ── Demo 4: Complete all shapes ─────────────────────────────────────────────
function CompleteDemo({ colors, anim }: { colors: any; anim: Animated.Value }) {
  const starScale = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.8, 1.2, 0.8] });
  const shapes = [
    { pts: "20,20 60,10 80,50 50,70 10,55", color: "#FF3CAC" },
    { pts: "90,15 140,10 155,55 110,70 75,50", color: "#36D6FF" },
    { pts: "160,20 190,35 185,75 155,80 140,50", color: "#FFD700" },
    { pts: "30,85 70,80 80,120 40,130 15,110", color: "#39FF14" },
    { pts: "90,80 140,75 155,115 100,135 65,115", color: "#BF5FFF" },
  ];
  return (
    <View style={{ alignItems: "center", justifyContent: "center", height: 160 }}>
      <Svg width={200} height={140}>
        {shapes.map((s, i) => (
          <Polygon key={i} points={s.pts} fill={s.color + "CC"} stroke={s.color} strokeWidth={1.5} />
        ))}
      </Svg>
      <Animated.View style={{ flexDirection: "row", gap: 6, transform: [{ scale: starScale }] }}>
        {[1, 2, 3].map((i) => (
          <Ionicons key={i} name="star" size={28} color={colors.primary} />
        ))}
      </Animated.View>
      <Text style={[styles.demoCaption, { color: colors.mutedForeground }]}>
        Fill all shapes to earn up to 3 stars!
      </Text>
    </View>
  );
}

// ── Demo 5: Multiplayer scoring ─────────────────────────────────────────────
function ScoringDemo({ colors, anim }: { colors: any; anim: Animated.Value }) {
  const glow = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1, 0.5] });
  const positions = [
    { pos: 1, pts: 10, color: "#FFD700", icon: "🥇" },
    { pos: 2, pts: 7, color: "#C0C0C0", icon: "🥈" },
    { pos: 3, pts: 4, color: "#CD7F32", icon: "🥉" },
    { pos: 4, pts: 1, color: colors.mutedForeground, icon: "4th" },
  ];
  return (
    <View style={{ gap: 8, paddingHorizontal: 8 }}>
      {positions.map((p) => (
        <View key={p.pos} style={[styles.scoringRow, { backgroundColor: colors.surface, borderColor: p.color + "44" }]}>
          <Text style={{ fontSize: 20, width: 34 }}>{p.icon}</Text>
          <Text style={[styles.scoringPos, { color: p.color }]}>
            {p.pos === 1 ? "1st" : p.pos === 2 ? "2nd" : p.pos === 3 ? "3rd" : "4th+"}
          </Text>
          <View style={{ flex: 1 }}>
            <View style={[styles.pointsBar, { backgroundColor: colors.border }]}>
              <Animated.View
                style={[
                  styles.pointsFill,
                  {
                    backgroundColor: p.color,
                    width: `${(p.pts / 10) * 100}%`,
                    opacity: glow,
                  },
                ]}
              />
            </View>
          </View>
          <Text style={[styles.scoringPts, { color: p.color }]}>{p.pts} pts</Text>
        </View>
      ))}
      <Text style={[styles.demoCaption, { color: colors.mutedForeground }]}>
        Team scores are summed across all players
      </Text>
    </View>
  );
}

const STEPS: Step[] = [
  {
    id: 1,
    title: "Select a Shape",
    subtitle: "Tap any dashed outline on the puzzle to choose which shape to work on next.",
    color: "#FF3CAC",
    icon: "hand-left",
    Demo: SelectShapeDemo,
  },
  {
    id: 2,
    title: "Connect the Dots",
    subtitle: "Tap the numbered dots in order (1, 2, 3…) to trace the outline. Wrong tap? You get 3 chances before reset.",
    color: "#36D6FF",
    icon: "git-network",
    Demo: ConnectDotsDemo,
  },
  {
    id: 3,
    title: "Color It In",
    subtitle: "After connecting all dots, the color palette appears. Pick the matching color to fill the shape correctly.",
    color: "#FFD700",
    icon: "color-palette",
    Demo: ColorShapeDemo,
  },
  {
    id: 4,
    title: "Complete the Puzzle",
    subtitle: "Fill every shape to win. Faster and fewer mistakes = more stars!",
    color: "#39FF14",
    icon: "trophy",
    Demo: CompleteDemo,
  },
  {
    id: 5,
    title: "Multiplayer Scoring",
    subtitle: "In races, finishing position earns team points. 1st = 10pts, 2nd = 7pts, 3rd = 4pts, 4th+ = 1pt.",
    color: "#BF5FFF",
    icon: "people",
    Demo: ScoringDemo,
  },
];

export default function HowToPlayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 1200, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const goStep = (next: number) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: 1, duration: 150, useNativeDriver: false }),
      Animated.timing(slideAnim, { toValue: 0, duration: 150, useNativeDriver: false }),
    ]).start();
    setStep(next);
  };

  const current = STEPS[step];
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
          HOW TO PLAY
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Step indicators */}
      <View style={styles.stepDots}>
        {STEPS.map((s, i) => (
          <TouchableOpacity key={s.id} onPress={() => goStep(i)} style={styles.stepDotBtn}>
            <View
              style={[
                styles.stepDot,
                {
                  backgroundColor: i === step ? current.color : colors.border,
                  width: i === step ? 24 : 8,
                },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Step card */}
        <View
          style={[
            styles.stepCard,
            {
              backgroundColor: colors.card,
              borderColor: current.color + "66",
              shadowColor: current.color,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.stepHeader}>
            <View style={[styles.stepIconBox, { backgroundColor: current.color + "22" }]}>
              <Ionicons name={current.icon} size={26} color={current.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.stepNum, { color: current.color }]}>
                STEP {step + 1} OF {STEPS.length}
              </Text>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                {current.title}
              </Text>
            </View>
          </View>

          <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
            {current.subtitle}
          </Text>

          {/* Demo animation */}
          <View style={[styles.demoBox, { backgroundColor: colors.isDark ? colors.surface : colors.muted, borderColor: colors.border }]}>
            <current.Demo colors={colors} anim={anim} />
          </View>
        </View>

        {/* Tip box */}
        <View style={[styles.tipBox, { backgroundColor: current.color + "15", borderColor: current.color + "44" }]}>
          <Ionicons name="bulb" size={16} color={current.color} />
          <Text style={[styles.tipText, { color: colors.foreground }]}>
            {[
              "Use the 💡 hint button if you're stuck — it highlights the next dot!",
              "3 wrong taps in a row resets the current shape's progress.",
              "Use the 🎨 color hint to reveal the correct color for a connected shape.",
              "Speed bonus: the faster you finish, the more bonus points you earn!",
              "Team score = sum of all teammates' position points across all rounds.",
            ][step]}
          </Text>
        </View>

        {/* Nav buttons */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[
              styles.navBtn,
              {
                backgroundColor: colors.isDark ? colors.surfaceHigh : colors.secondary,
                opacity: step === 0 ? 0.3 : 1,
              },
            ]}
            onPress={() => step > 0 && goStep(step - 1)}
            disabled={step === 0}
          >
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
            <Text style={[styles.navBtnText, { color: colors.foreground }]}>PREV</Text>
          </TouchableOpacity>

          {step < STEPS.length - 1 ? (
            <TouchableOpacity
              style={[styles.navBtn, { backgroundColor: current.color, shadowColor: current.color }]}
              onPress={() => goStep(step + 1)}
            >
              <Text style={[styles.navBtnText, { color: "#FFF" }]}>NEXT</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navBtn, { backgroundColor: current.color, shadowColor: current.color }]}
              onPress={() => router.back()}
            >
              <Ionicons name="game-controller" size={20} color="#FFF" />
              <Text style={[styles.navBtnText, { color: "#FFF" }]}>PLAY NOW</Text>
            </TouchableOpacity>
          )}
        </View>
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
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  stepDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
  },
  stepDotBtn: { padding: 4 },
  stepDot: {
    height: 8,
    borderRadius: 4,
  },
  content: { padding: 20, gap: 16 },
  stepCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    gap: 14,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  stepHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
  stepIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNum: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginBottom: 2,
  },
  stepTitle: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  stepDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  demoBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  demoCaption: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center", marginTop: 8 },
  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  tipText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  navRow: { flexDirection: "row", gap: 12 },
  navBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  navBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  swatchRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderColor: "#FFF",
  },
  scoringRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  scoringPos: { fontSize: 13, fontFamily: "Inter_700Bold", width: 36 },
  pointsBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  pointsFill: { height: "100%", borderRadius: 4 },
  scoringPts: { fontSize: 13, fontFamily: "Inter_700Bold", width: 48, textAlign: "right" },
});
