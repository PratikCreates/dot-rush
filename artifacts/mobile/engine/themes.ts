export type ThemeName = "animals" | "food" | "nature" | "vehicles" | "space" | "holidays";

export interface Theme {
  name: string;
  displayName: string;
  palette: string[];
  bgHint: string;
  locked: boolean;
  unlockStars: number;
}

export const THEMES: Record<ThemeName, Theme> = {
  animals: {
    name: "animals",
    displayName: "Animals",
    palette: ["#E8A87C", "#85C1E9", "#A9DFBF", "#F1948A", "#D7BDE2", "#FAD7A0", "#AED6F1", "#A3E4D7"],
    bgHint: "#1A1208",
    locked: false,
    unlockStars: 0,
  },
  food: {
    name: "food",
    displayName: "Food",
    palette: ["#FF6B6B", "#FFC107", "#4CAF50", "#2196F3", "#FF9800", "#E91E63", "#9C27B0", "#00BCD4"],
    bgHint: "#1A0808",
    locked: false,
    unlockStars: 0,
  },
  nature: {
    name: "nature",
    displayName: "Nature",
    palette: ["#2ECC71", "#3498DB", "#27AE60", "#1ABC9C", "#16A085", "#2980B9", "#82E0AA", "#76D7C4"],
    bgHint: "#081A08",
    locked: true,
    unlockStars: 15,
  },
  vehicles: {
    name: "vehicles",
    displayName: "Vehicles",
    palette: ["#E74C3C", "#3498DB", "#95A5A6", "#F39C12", "#1A252F", "#27AE60", "#8E44AD", "#D35400"],
    bgHint: "#0D0D1A",
    locked: true,
    unlockStars: 30,
  },
  space: {
    name: "space",
    displayName: "Space",
    palette: ["#9B59B6", "#3498DB", "#E74C3C", "#1ABC9C", "#F39C12", "#D7BDE2", "#7FB3D3", "#A9CCE3"],
    bgHint: "#05050F",
    locked: true,
    unlockStars: 50,
  },
  holidays: {
    name: "holidays",
    displayName: "Holidays",
    palette: ["#E74C3C", "#27AE60", "#F6C90E", "#E91E63", "#3498DB", "#FF9800", "#9C27B0", "#00BCD4"],
    bgHint: "#1A0808",
    locked: true,
    unlockStars: 75,
  },
};

export const THEME_NAMES = Object.keys(THEMES) as ThemeName[];
