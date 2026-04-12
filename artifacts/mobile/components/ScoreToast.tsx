import React, { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  label: string;
  points: number;
  onDone: () => void;
}

export default function ScoreToast({ label, points, onDone }: Props) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -30,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(600),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onDone());
  }, []);

  const isPositive = points > 0;
  const color = isPositive ? colors.success : colors.destructive;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
          backgroundColor: color + "22",
          borderColor: color + "66",
        },
      ]}
    >
      <Text style={[styles.text, { color }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: "40%",
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    zIndex: 100,
  },
  text: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    textAlign: "center",
  },
});
