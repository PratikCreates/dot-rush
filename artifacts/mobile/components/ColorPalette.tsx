import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  ScrollView,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  palette: string[];
  targetColor?: string;
  onSelectColor: (color: string) => void;
  revealed?: boolean;
}

export default function ColorPalette({
  palette,
  targetColor,
  onSelectColor,
  revealed,
}: Props) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {palette.map((color) => {
          const isHinted = revealed && color === targetColor;
          return (
            <TouchableOpacity
              key={color}
              style={[
                styles.swatch,
                { backgroundColor: color },
                isHinted && {
                  borderColor: colors.success,
                  borderWidth: 3,
                  transform: [{ scale: 1.15 }],
                },
              ]}
              onPress={() => onSelectColor(color)}
              activeOpacity={0.75}
              testID={`color-${color}`}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    alignItems: "center",
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
});
