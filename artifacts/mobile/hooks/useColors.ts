import { useColorScheme } from "react-native";
import colors from "@/constants/colors";

export type AppColors = typeof colors.light & { radius: number; isDark: boolean };

export function useColors(): AppColors {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const palette = isDark ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius, isDark };
}
