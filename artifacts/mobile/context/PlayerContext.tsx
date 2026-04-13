import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface PuzzleRecord {
  seed: number;
  difficulty: string;
  mode: string;
  bestTimeMs: number;
  topScores: number[];
  stars: number;
  completions: number;
  lastPlayedAt: number;
}

export interface PlayerProfile {
  displayName: string;
  totalStars: number;
  totalShapes: number;
  totalPuzzles: number;
  wins: number;
  losses: number;
  longestEndlessStreak: number;
  dailyStreak: number;
  lastDailyDate: string;
  records: Record<string, PuzzleRecord>;
  unlockedThemes: string[];
}

const DEFAULT_PROFILE: PlayerProfile = {
  displayName: "Player",
  totalStars: 0,
  totalShapes: 0,
  totalPuzzles: 0,
  wins: 0,
  losses: 0,
  longestEndlessStreak: 0,
  dailyStreak: 0,
  lastDailyDate: "",
  records: {},
  unlockedThemes: ["animals", "food"],
};

interface PlayerContextValue {
  profile: PlayerProfile;
  updateDisplayName: (name: string) => void;
  saveRecord: (
    seed: number,
    difficulty: string,
    mode: string,
    score: number,
    timeMs: number,
    stars: number,
    shapesCompleted: number
  ) => void;
  updateEndlessStreak: (streak: number) => void;
  recordWin: () => void;
  recordLoss: () => void;
  checkDailyStreak: () => void;
  hasDailyBeenPlayed: () => boolean;
  unlockTheme: (theme: string) => void;
  isLoading: boolean;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

const STORAGE_KEY = "@dotrush/player_profile";

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as PlayerProfile;
          setProfile({ ...DEFAULT_PROFILE, ...parsed });
        } catch {}
      }
      setIsLoading(false);
    });
  }, []);

  const persist = useCallback((updated: PlayerProfile) => {
    setProfile(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const updateDisplayName = useCallback(
    (name: string) => {
      persist({ ...profile, displayName: name.trim() || "Player" });
    },
    [profile, persist]
  );

  const saveRecord = useCallback(
    (
      seed: number,
      difficulty: string,
      mode: string,
      score: number,
      timeMs: number,
      stars: number,
      shapesCompleted: number
    ) => {
      const key = `${seed}_${difficulty}_${mode}`;
      const existing = profile.records[key];
      const newRecord: PuzzleRecord = {
        seed,
        difficulty,
        mode,
        bestTimeMs:
          !existing || timeMs < existing.bestTimeMs
            ? timeMs
            : existing.bestTimeMs,
        topScores: existing
          ? [...existing.topScores, score].sort((a, b) => b - a).slice(0, 3)
          : [score],
        stars: Math.max(existing?.stars ?? 0, stars),
        completions: (existing?.completions ?? 0) + 1,
        lastPlayedAt: Date.now(),
      };

      const newStars =
        profile.totalStars + Math.max(0, stars - (existing?.stars ?? 0));
      const newThemes = [...profile.unlockedThemes];
      if (newStars >= 15 && !newThemes.includes("nature")) newThemes.push("nature");
      if (newStars >= 30 && !newThemes.includes("vehicles")) newThemes.push("vehicles");
      if (newStars >= 50 && !newThemes.includes("space")) newThemes.push("space");
      if (newStars >= 75 && !newThemes.includes("holidays")) newThemes.push("holidays");

      persist({
        ...profile,
        totalStars: newStars,
        totalShapes: profile.totalShapes + shapesCompleted,
        totalPuzzles: profile.totalPuzzles + 1,
        unlockedThemes: newThemes,
        records: { ...profile.records, [key]: newRecord },
      });
    },
    [profile, persist]
  );

  const updateEndlessStreak = useCallback(
    (streak: number) => {
      if (streak > profile.longestEndlessStreak) {
        persist({ ...profile, longestEndlessStreak: streak });
      }
    },
    [profile, persist]
  );

  const recordWin = useCallback(() => {
    persist({ ...profile, wins: profile.wins + 1 });
  }, [profile, persist]);

  const recordLoss = useCallback(() => {
    persist({ ...profile, losses: profile.losses + 1 });
  }, [profile, persist]);

  const checkDailyStreak = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    if (profile.lastDailyDate === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const newStreak =
      profile.lastDailyDate === yesterday ? profile.dailyStreak + 1 : 1;
    persist({ ...profile, dailyStreak: newStreak, lastDailyDate: today });
  }, [profile, persist]);

  const hasDailyBeenPlayed = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    return profile.lastDailyDate === today;
  }, [profile.lastDailyDate]);

  const unlockTheme = useCallback(
    (theme: string) => {
      if (!profile.unlockedThemes.includes(theme)) {
        persist({
          ...profile,
          unlockedThemes: [...profile.unlockedThemes, theme],
        });
      }
    },
    [profile, persist]
  );

  return (
    <PlayerContext.Provider
      value={{
        profile,
        updateDisplayName,
        saveRecord,
        updateEndlessStreak,
        recordWin,
        recordLoss,
        checkDailyStreak,
        hasDailyBeenPlayed,
        unlockTheme,
        isLoading,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
