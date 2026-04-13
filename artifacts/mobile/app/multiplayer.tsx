import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  Modal,
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { IoniconName } from "@/types/icons";
import { useColors } from "@/hooks/useColors";
import { useLobbyWs } from "@/hooks/useLobbyWs";
import { getPositionPoints } from "@/engine/scoring";

type LobbyMode = "menu" | "host" | "join" | "countdown";

const MP_MODES: Array<{ id: string; label: string; desc: string; icon: IoniconName; color: string }> = [
  { id: "race", label: "CLASSIC RACE", desc: "2-4 players, first correct wins", icon: "flag", color: "#FF3CAC" },
  { id: "best5", label: "BEST OF 5", desc: "Cumulative score over 5 rounds", icon: "repeat", color: "#FFD700" },
  { id: "team", label: "TEAM 2v2", desc: "Dots + Color split between teammates", icon: "people", color: "#36D6FF" },
  { id: "tournament", label: "TOURNAMENT", desc: "Up to 8 players, bracket elimination", icon: "trophy", color: "#BF5FFF" },
];

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  team: number;
  ready: boolean;
}

interface BannedPlayer {
  id: string;
  name: string;
  bannedAt: number;
}

function generateRoomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

const POSITION_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32", "#9B7AB8"];
const POSITION_LABELS = ["1st", "2nd", "3rd", "4th"];

export default function MultiplayerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const ws = useLobbyWs();

  const [lobby, setLobby] = useState<LobbyMode>("menu");
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [selectedMode, setSelectedMode] = useState("race");
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [bannedPlayers, setBannedPlayers] = useState<BannedPlayer[]>([]);
  const [countdown, setCountdown] = useState(10);
  const [showBanned, setShowBanned] = useState(false);
  const [showModeSheet, setShowModeSheet] = useState(false);
  const [actionTarget, setActionTarget] = useState<Player | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [teamScores, setTeamScores] = useState<Record<number, number>>({ 1: 0, 2: 0 });

  // Countdown animation
  const countdownScale = useRef(new Animated.Value(1)).current;
  const countdownOpacity = useRef(new Animated.Value(1)).current;
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const gradStart = colors.isDark ? "#0D0020" : "#FFF0FC";
  const gradEnd = colors.isDark ? "#001020" : "#D0F0FF";

  // Sync WebSocket room state → local state
  useEffect(() => {
    if (!ws.roomState) return;
    const rs = ws.roomState;
    setSelectedMode(rs.mode);
    setRoomCode(rs.code);
    setPlayers(
      rs.players.map((p) => ({
        id: p.id,
        name: p.isHost ? `${p.name} (Host)` : p.name,
        isHost: p.isHost,
        team: p.team,
        ready: p.ready,
      }))
    );
    setBannedPlayers(
      rs.banned.map((b) => ({ id: b.id, name: b.name, bannedAt: Date.now() }))
    );
    setIsHost(ws.playerId === rs.hostId);
  }, [ws.roomState, ws.playerId]);

  const startCountdown = () => {
    setLobby("countdown");
    setCountdown(10);
    let c = 10;

    const pulse = () => {
      Animated.sequence([
        Animated.spring(countdownScale, { toValue: 1.3, useNativeDriver: false, friction: 5 }),
        Animated.spring(countdownScale, { toValue: 1, useNativeDriver: false, friction: 5 }),
      ]).start();
    };

    pulse();
    countdownRef.current = setInterval(() => {
      c -= 1;
      setCountdown(c);
      pulse();
      if (c <= 0) {
        clearInterval(countdownRef.current!);
        // Navigate to the game screen with the selected mode and a shared seed
        // The seed is derived from the room code so all players get the same puzzle
        const seedBase = roomCode
          .split("")
          .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        const gameSeed = (seedBase * 31337 + Date.now()) % 999983;
        setTimeout(() => {
          router.push({
            pathname: "/game",
            params: {
              mode: selectedMode,
              difficulty: "medium",
              seed: String(gameSeed),
              multiplayer: "true",
              players: String(players.length),
            },
          });
        }, 150);
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Handle WebSocket events (defined after startCountdown to avoid forward reference)
  useEffect(() => {
    if (!ws.event) return;
    switch (ws.event.kind) {
      case "game_starting":
        startCountdown();
        break;
      case "game_started":
        // Server sent a synchronized seed — navigate all clients to the same puzzle
        clearInterval(countdownRef.current!);
        router.push({
          pathname: "/game",
          params: {
            mode: ws.event.mode,
            difficulty: "medium",
            seed: String(ws.event.seed),
            multiplayer: "true",
            players: String(players.length),
          },
        });
        break;
      case "kicked":
        Alert.alert("Kicked", "You were kicked from the room.");
        setLobby("menu");
        break;
      case "banned":
        Alert.alert("Banned", "You have been banned from this room.");
        setLobby("menu");
        break;
      case "reconnecting":
        Alert.alert("Connection Lost", "Attempting to reconnect...");
        break;
      case "reconnected":
        Alert.alert("Reconnected", "Connection restored!");
        break;
      case "error":
        Alert.alert("Error", ws.event.message);
        break;
      default:
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.event]);

  const handleHost = () => {
    if (ws.connected) {
      // Use real WebSocket room creation
      ws.createRoom("You", selectedMode);
      setIsHost(true);
      setBannedPlayers([]);
      setLobby("host");
    } else {
      // Local simulation fallback (no server reachable)
      const code = generateRoomCode();
      setRoomCode(code);
      setIsHost(true);
      setPlayers([{ id: "host", name: "You (Host)", isHost: true, team: 1, ready: true }]);
      setBannedPlayers([]);
      setLobby("host");
    }
  };

  const handleJoin = () => {
    if (joinCode.length < 4) {
      Alert.alert("Invalid Code", "Please enter a 4-character room code.");
      return;
    }
    if (ws.connected) {
      ws.joinRoom(joinCode.toUpperCase(), "You");
      setRoomCode(joinCode.toUpperCase());
      setIsHost(false);
      setLobby("join");
    } else {
      // Local simulation fallback
      setRoomCode(joinCode);
      setIsHost(false);
      setPlayers([
        { id: "host", name: "Host", isHost: true, team: 1, ready: true },
        { id: "me", name: "You", isHost: false, team: 2, ready: false },
      ]);
      setLobby("join");
    }
  };

  // ── Admin: Kick player ────────────────────────────────────────────────────
  const kickPlayer = (player: Player) => {
    Alert.alert(
      "Kick Player",
      `Kick "${player.name}" from the lobby?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Kick",
          style: "destructive",
          onPress: () => {
            if (ws.connected) {
              ws.kickPlayer(player.id);
            } else {
              setPlayers((prev) => prev.filter((p) => p.id !== player.id));
            }
            setShowActionSheet(false);
          },
        },
      ]
    );
  };

  // ── Admin: Ban player ─────────────────────────────────────────────────────
  const banPlayer = (player: Player) => {
    Alert.alert(
      "Ban Player",
      `Ban "${player.name}"? They won't be able to rejoin this room.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Ban",
          style: "destructive",
          onPress: () => {
            if (ws.connected) {
              ws.banPlayer(player.id);
            } else {
              setPlayers((prev) => prev.filter((p) => p.id !== player.id));
              setBannedPlayers((prev) => [
                ...prev,
                { id: player.id, name: player.name, bannedAt: Date.now() },
              ]);
            }
            setShowActionSheet(false);
          },
        },
      ]
    );
  };

  // ── Admin: Unban player ───────────────────────────────────────────────────
  const unbanPlayer = (banned: BannedPlayer) => {
    setBannedPlayers((prev) => prev.filter((p) => p.id !== banned.id));
  };

  // ── Admin: Change mode ────────────────────────────────────────────────────
  const changeMode = (modeId: string) => {
    if (ws.connected) {
      ws.changeMode(modeId);
    }
    setSelectedMode(modeId);
    setShowModeSheet(false);
  };

  // ── Admin: Restart same mode ──────────────────────────────────────────────
  const restartMode = () => {
    Alert.alert(
      "Restart Mode",
      `Restart the current ${MP_MODES.find((m) => m.id === selectedMode)?.label} game?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restart",
          onPress: () => {
            setPlayers((prev) => prev.map((p) => ({ ...p, ready: false })));
            setTeamScores({ 1: 0, 2: 0 });
            Alert.alert("Game restarted!", "All players have been reset. Start again when ready.");
          },
        },
      ]
    );
  };

  // ── Assign team ───────────────────────────────────────────────────────────
  const toggleTeam = (playerId: string) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, team: p.team === 1 ? 2 : 1 } : p))
    );
  };

  const currentMode = MP_MODES.find((m) => m.id === selectedMode)!;
  const team1Players = players.filter((p) => p.team === 1);
  const team2Players = players.filter((p) => p.team === 2);

  // ── COUNTDOWN SCREEN ──────────────────────────────────────────────────────
  if (lobby === "countdown") {
    const cdColor =
      countdown > 6 ? colors.success : countdown > 3 ? "#FFD700" : colors.destructive;
    return (
      <LinearGradient colors={[gradStart, gradEnd]} style={{ flex: 1 }}>
        <View style={styles.countdownContainer}>
          <Text style={[styles.countdownLabel, { color: colors.mutedForeground }]}>
            GET READY!
          </Text>
          <Animated.Text
            style={[
              styles.countdownNumber,
              {
                color: cdColor,
                transform: [{ scale: countdownScale }],
                textShadowColor: cdColor,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 30,
              },
            ]}
          >
            {countdown === 0 ? "GO!" : countdown}
          </Animated.Text>
          <Text style={[styles.countdownModeLine, { color: colors.primary }]}>
            {currentMode.label}
          </Text>
          <View style={styles.countdownPlayers}>
            {players.map((p, i) => (
              <View
                key={p.id}
                style={[
                  styles.cdPlayerChip,
                  { backgroundColor: [colors.primary, colors.accent, "#FFD700", "#BF5FFF"][i % 4] + "33" },
                ]}
              >
                <Text style={[styles.cdPlayerName, { color: colors.foreground }]}>{p.name}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={() => {
              if (countdownRef.current) clearInterval(countdownRef.current);
              setLobby("host");
            }}
          >
            <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[gradStart, gradEnd]} style={{ flex: 1 }}>
      {/* Header */}
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
          onPress={() => (lobby === "menu" ? router.back() : setLobby("menu"))}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          MULTIPLAYER
        </Text>
        {isHost && lobby !== "menu" ? (
          <TouchableOpacity onPress={() => setShowBanned(true)} style={styles.headerAction}>
            <Ionicons name="ban" size={20} color={colors.destructive} />
            {bannedPlayers.length > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
                <Text style={styles.badgeText}>{bannedPlayers.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── MAIN MENU ── */}
        {lobby === "menu" && (
          <>
            <View
              style={[styles.infoBanner, { backgroundColor: colors.accent + "22", borderColor: colors.accent + "44" }]}
            >
              <Ionicons 
                name={ws.connected ? "wifi" : "wifi-outline"} 
                size={18} 
                color={ws.connected ? colors.success : colors.destructive} 
              />
              <Text style={[styles.infoText, { color: ws.connected ? colors.accent : colors.destructive }]}>
                {ws.connected 
                  ? "Connected · Both devices must be on the same WiFi network"
                  : "Disconnected · Check your connection"}
              </Text>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>GAME TYPE</Text>
            {MP_MODES.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.modeCard,
                  {
                    backgroundColor: selectedMode === m.id ? m.color + "22" : colors.card,
                    borderColor: selectedMode === m.id ? m.color : colors.border,
                  },
                ]}
                onPress={() => setSelectedMode(m.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.modeIcon, { backgroundColor: m.color + "22" }]}>
                  <Ionicons name={m.icon} size={22} color={m.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modeLabel, { color: colors.foreground }]}>{m.label}</Text>
                  <Text style={[styles.modeDesc, { color: colors.mutedForeground }]}>{m.desc}</Text>
                </View>
                {selectedMode === m.id && (
                  <Ionicons name="checkmark-circle" size={20} color={m.color} />
                )}
              </TouchableOpacity>
            ))}

            {/* Scoring table */}
            <View style={[styles.scoringCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginBottom: 10 }]}>
                POSITION POINTS
              </Text>
              {[1, 2, 3, 4].map((pos) => (
                <View key={pos} style={styles.scoringRow}>
                  <Text style={{ fontSize: 18, width: 30 }}>
                    {pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : "4️⃣"}
                  </Text>
                  <Text style={[styles.scoringPos, { color: POSITION_COLORS[pos - 1] }]}>
                    {POSITION_LABELS[pos - 1]}
                  </Text>
                  <View style={{ flex: 1, height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: "hidden" }}>
                    <View
                      style={{
                        height: "100%",
                        backgroundColor: POSITION_COLORS[pos - 1],
                        width: `${(getPositionPoints(pos) / 10) * 100}%`,
                        borderRadius: 4,
                      }}
                    />
                  </View>
                  <Text style={[styles.scoringPts, { color: POSITION_COLORS[pos - 1] }]}>
                    {getPositionPoints(pos)} pts
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
              onPress={handleHost}
              activeOpacity={0.85}
              testID="btn-host"
            >
              <Ionicons name="add-circle" size={22} color={colors.primaryForeground} />
              <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>HOST GAME</Text>
            </TouchableOpacity>

            <View style={[styles.dividerRow]}>
              <View style={[styles.divLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.divText, { color: colors.mutedForeground }]}>OR</Text>
              <View style={[styles.divLine, { backgroundColor: colors.border }]} />
            </View>

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>JOIN ROOM</Text>
            <View style={styles.codeRow}>
              <TextInput
                style={[styles.codeInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                placeholder="4-digit code"
                placeholderTextColor={colors.mutedForeground}
                value={joinCode}
                onChangeText={(t) => setJoinCode(t.replace(/[^0-9]/g, "").slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
              />
              <TouchableOpacity
                style={[styles.joinBtn, { backgroundColor: colors.accent, opacity: joinCode.length === 4 ? 1 : 0.5 }]}
                onPress={handleJoin}
                disabled={joinCode.length !== 4}
                testID="btn-join"
              >
                <Text style={[styles.joinBtnText, { color: colors.accentForeground }]}>JOIN</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── LOBBY (HOST / JOIN) ── */}
        {(lobby === "host" || lobby === "join") && (
          <>
            {/* Room code display */}
            <View style={[styles.codeDisplay, { backgroundColor: colors.card, borderColor: colors.primary + "66" }]}>
              <Text style={[styles.codeDisplayLabel, { color: colors.mutedForeground }]}>ROOM CODE</Text>
              <Text style={[styles.codeDisplayValue, { color: colors.primary }]}>{roomCode}</Text>
              <Text style={[styles.codeHint, { color: colors.mutedForeground }]}>
                {isHost ? "Share this code with other players" : `Joined room ${roomCode}`}
              </Text>
            </View>

            {/* Current mode + admin change */}
            <View style={[styles.currentModeBar, { backgroundColor: colors.card, borderColor: currentMode.color + "44" }]}>
              <View style={[styles.modeIcon, { backgroundColor: currentMode.color + "22" }]}>
                <Ionicons name={currentMode.icon} size={18} color={currentMode.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginBottom: 0 }]}>CURRENT MODE</Text>
                <Text style={[styles.modeLabel, { color: colors.foreground }]}>{currentMode.label}</Text>
              </View>
              {isHost && (
                <TouchableOpacity
                  style={[styles.adminSmallBtn, { backgroundColor: currentMode.color + "22", borderColor: currentMode.color + "66" }]}
                  onPress={() => setShowModeSheet(true)}
                >
                  <Ionicons name="swap-horizontal" size={16} color={currentMode.color} />
                  <Text style={[styles.adminSmallBtnText, { color: currentMode.color }]}>CHANGE</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Team scores */}
            {(selectedMode === "team" || selectedMode === "best5") && (
              <View style={styles.teamScoreRow}>
                {[1, 2].map((t) => (
                  <View key={t} style={[styles.teamScoreCard, { backgroundColor: [colors.primary, colors.accent][t - 1] + "22", borderColor: [colors.primary, colors.accent][t - 1] + "44" }]}>
                    <Text style={[styles.teamScoreLabel, { color: colors.mutedForeground }]}>TEAM {t}</Text>
                    <Text style={[styles.teamScoreValue, { color: [colors.primary, colors.accent][t - 1] }]}>
                      {teamScores[t] ?? 0} pts
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Players list */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              PLAYERS ({players.length}/4)
            </Text>
            {players.map((p, i) => {
              const teamColor = p.team === 1 ? colors.primary : colors.accent;
              return (
                <View
                  key={p.id}
                  style={[styles.playerRow, { backgroundColor: colors.card, borderColor: teamColor + "33" }]}
                >
                  <View style={[styles.playerAvatar, { backgroundColor: teamColor + "33" }]}>
                    <Text style={{ color: teamColor, fontFamily: "Inter_700Bold", fontSize: 16 }}>
                      {p.name[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.playerName, { color: colors.foreground }]}>{p.name}</Text>
                    <Text style={[styles.playerTeam, { color: teamColor }]}>Team {p.team}</Text>
                  </View>
                  {p.isHost && (
                    <View style={[styles.hostBadge, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" }]}>
                      <Text style={[styles.hostBadgeText, { color: colors.primary }]}>HOST</Text>
                    </View>
                  )}
                  {!p.isHost && isHost && (
                    <TouchableOpacity
                      style={[styles.teamToggleBtn, { backgroundColor: teamColor + "22", borderColor: teamColor + "55" }]}
                      onPress={() => toggleTeam(p.id)}
                    >
                      <Ionicons name="swap-horizontal" size={14} color={teamColor} />
                    </TouchableOpacity>
                  )}
                  {/* Admin actions */}
                  {isHost && !p.isHost && (
                    <TouchableOpacity
                      style={styles.adminDotBtn}
                      onPress={() => {
                        setActionTarget(p);
                        setShowActionSheet(true);
                      }}
                    >
                      <Ionicons name="ellipsis-vertical" size={18} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  )}
                  {/* Ready indicator */}
                  <Ionicons
                    name={p.ready ? "checkmark-circle" : "time-outline"}
                    size={18}
                    color={p.ready ? colors.success : colors.mutedForeground}
                  />
                </View>
              );
            })}

            {/* Admin controls */}
            {isHost && (
              <View style={styles.adminPanel}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ADMIN CONTROLS</Text>
                <View style={styles.adminBtnsRow}>
                  <TouchableOpacity
                    style={[styles.adminBtn, { backgroundColor: "#FFD700" + "22", borderColor: "#FFD700" + "55" }]}
                    onPress={() => setShowModeSheet(true)}
                  >
                    <Ionicons name="swap-horizontal" size={18} color="#FFD700" />
                    <Text style={[styles.adminBtnText, { color: "#FFD700" }]}>Mode</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.adminBtn, { backgroundColor: colors.accent + "22", borderColor: colors.accent + "55" }]}
                    onPress={restartMode}
                  >
                    <Ionicons name="refresh" size={18} color={colors.accent} />
                    <Text style={[styles.adminBtnText, { color: colors.accent }]}>Restart</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.adminBtn, { backgroundColor: colors.destructive + "22", borderColor: colors.destructive + "55" }]}
                    onPress={() => setShowBanned(true)}
                  >
                    <Ionicons name="ban" size={18} color={colors.destructive} />
                    <Text style={[styles.adminBtnText, { color: colors.destructive }]}>Banned</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Start game button */}
            {isHost && (
              <TouchableOpacity
                style={[
                  styles.startLobbyBtn,
                  {
                    backgroundColor: players.length >= 2 ? colors.primary : colors.muted,
                    shadowColor: colors.primary,
                    opacity: players.length >= 2 ? 1 : 0.6,
                  },
                ]}
                onPress={() => {
                  if (ws.connected) {
                    ws.startGame();
                  } else {
                    startCountdown();
                  }
                }}
                activeOpacity={0.85}
                testID="btn-start-lobby"
              >
                <Ionicons name="play" size={22} color={colors.primaryForeground} />
                <Text style={[styles.startBtnText, { color: colors.primaryForeground }]}>
                  START GAME ({players.length} players)
                </Text>
              </TouchableOpacity>
            )}

            {!isHost && (
              <View style={[styles.waitingBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="time" size={22} color={colors.accent} />
                <Text style={[styles.waitingText, { color: colors.mutedForeground }]}>
                  Waiting for the host to start the game...
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── MODE CHANGE SHEET ── */}
      <Modal
        visible={showModeSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModeSheet(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModeSheet(false)}
        >
          <View
            style={[styles.bottomSheet, { backgroundColor: colors.card, borderColor: colors.border }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>CHANGE GAME MODE</Text>
            {MP_MODES.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.sheetOption,
                  {
                    backgroundColor: selectedMode === m.id ? m.color + "22" : colors.surface,
                    borderColor: selectedMode === m.id ? m.color : colors.border,
                  },
                ]}
                onPress={() => changeMode(m.id)}
              >
                <View style={[styles.modeIcon, { backgroundColor: m.color + "22" }]}>
                  <Ionicons name={m.icon} size={18} color={m.color} />
                </View>
                <Text style={[styles.sheetOptionText, { color: colors.foreground }]}>{m.label}</Text>
                {selectedMode === m.id && <Ionicons name="checkmark-circle" size={18} color={m.color} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── PLAYER ACTION SHEET ── */}
      <Modal
        visible={showActionSheet && actionTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionSheet(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionSheet(false)}
        >
          <View
            style={[styles.bottomSheet, { backgroundColor: colors.card, borderColor: colors.border }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              {actionTarget?.name}
            </Text>
            <TouchableOpacity
              style={[styles.sheetOption, { backgroundColor: "#FFD700" + "22", borderColor: "#FFD700" + "44" }]}
              onPress={() => {
                setShowActionSheet(false);
                if (actionTarget) toggleTeam(actionTarget.id);
              }}
            >
              <Ionicons name="swap-horizontal" size={20} color="#FFD700" />
              <Text style={[styles.sheetOptionText, { color: colors.foreground }]}>Switch Team</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetOption, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "44" }]}
              onPress={() => actionTarget && kickPlayer(actionTarget)}
            >
              <Ionicons name="exit" size={20} color={colors.destructive} />
              <Text style={[styles.sheetOptionText, { color: colors.destructive }]}>Kick Player</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetOption, { backgroundColor: colors.destructive + "25", borderColor: colors.destructive + "55" }]}
              onPress={() => actionTarget && banPlayer(actionTarget)}
            >
              <Ionicons name="ban" size={20} color={colors.destructive} />
              <Text style={[styles.sheetOptionText, { color: colors.destructive }]}>Ban Player</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── BANNED PLAYERS SHEET ── */}
      <Modal
        visible={showBanned}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBanned(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowBanned(false)}
        >
          <View
            style={[styles.bottomSheet, { backgroundColor: colors.card, borderColor: colors.border }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>BANNED PLAYERS</Text>
            {bannedPlayers.length === 0 ? (
              <View style={styles.emptyBanned}>
                <Ionicons name="checkmark-circle" size={32} color={colors.success} />
                <Text style={[styles.emptyBannedText, { color: colors.mutedForeground }]}>
                  No banned players
                </Text>
              </View>
            ) : (
              bannedPlayers.map((bp) => (
                <View
                  key={bp.id}
                  style={[styles.sheetOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Ionicons name="ban" size={18} color={colors.destructive} />
                  <Text style={[styles.sheetOptionText, { color: colors.foreground, flex: 1 }]}>
                    {bp.name}
                  </Text>
                  <TouchableOpacity
                    style={[styles.unbanBtn, { backgroundColor: colors.success + "22", borderColor: colors.success + "55" }]}
                    onPress={() => unbanPlayer(bp)}
                  >
                    <Ionicons name="checkmark" size={14} color={colors.success} />
                    <Text style={[styles.unbanBtnText, { color: colors.success }]}>Unban</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </TouchableOpacity>
      </Modal>
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
  headerAction: { padding: 8, position: "relative" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  badge: { position: "absolute", top: 4, right: 4, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#FFF", fontSize: 9, fontFamily: "Inter_700Bold" },
  content: { padding: 20, gap: 12 },
  infoBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  infoText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 2.5, marginBottom: 6 },
  modeCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 16, borderWidth: 1.5, gap: 12 },
  modeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modeLabel: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  modeDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  scoringCard: { padding: 16, borderRadius: 16, borderWidth: 1.5, gap: 10 },
  scoringRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  scoringPos: { fontSize: 12, fontFamily: "Inter_700Bold", width: 36 },
  scoringPts: { fontSize: 12, fontFamily: "Inter_700Bold", width: 44, textAlign: "right" },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, borderRadius: 18, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  actionBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  divLine: { flex: 1, height: 1 },
  divText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  codeRow: { flexDirection: "row", gap: 12 },
  codeInput: { flex: 1, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 8, textAlign: "center" },
  joinBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  joinBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  codeDisplay: { alignItems: "center", padding: 24, borderRadius: 20, borderWidth: 2, gap: 6 },
  codeDisplayLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 2.5 },
  codeDisplayValue: { fontSize: 52, fontFamily: "Inter_700Bold", letterSpacing: 12 },
  codeHint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  currentModeBar: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 16, borderWidth: 1.5, gap: 12 },
  adminSmallBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5 },
  adminSmallBtnText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  teamScoreRow: { flexDirection: "row", gap: 12 },
  teamScoreCard: { flex: 1, alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1.5 },
  teamScoreLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  teamScoreValue: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  playerRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 14, borderWidth: 1.5, gap: 10 },
  playerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  playerName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  playerTeam: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 1 },
  hostBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  hostBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  teamToggleBtn: { padding: 8, borderRadius: 10, borderWidth: 1 },
  adminDotBtn: { padding: 8 },
  adminPanel: { gap: 10 },
  adminBtnsRow: { flexDirection: "row", gap: 10 },
  adminBtn: { flex: 1, alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5 },
  adminBtnText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  startLobbyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 18, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  startBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  waitingBox: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, borderWidth: 1 },
  waitingText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  // Countdown
  countdownContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
  countdownLabel: { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 4 },
  countdownNumber: { fontSize: 140, fontFamily: "Inter_700Bold", letterSpacing: -4 },
  countdownModeLine: { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  countdownPlayers: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  cdPlayerChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  cdPlayerName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  cancelBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5 },
  cancelBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  bottomSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: 24, gap: 12, paddingBottom: 36 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  sheetTitle: { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 1, textAlign: "center", marginBottom: 4 },
  sheetOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  sheetOptionText: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  emptyBanned: { alignItems: "center", gap: 8, paddingVertical: 20 },
  emptyBannedText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  unbanBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1.5 },
  unbanBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },
});
