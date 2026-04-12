import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface Props {
  stars: number;
  size?: number;
}

export default function StarsRow({ stars, size = 24 }: Props) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {[1, 2, 3].map((i) => (
        <Ionicons
          key={i}
          name={i <= stars ? "star" : "star-outline"}
          size={size}
          color={i <= stars ? colors.primary : colors.border}
        />
      ))}
    </View>
  );
}
