import { useCallback, useEffect, useRef, useState } from "react";

// ── Message types (must mirror src/ws/roomManager.ts on the API server) ──────

type MsgOut =
  | { type: "ROOM_CREATED"; roomCode: string; playerId: string }
  | { type: "ROOM_JOINED"; roomCode: string; playerId: string }
  | { type: "ROOM_STATE"; state: RoomState }
  | { type: "GAME_STARTING"; countdown: number }
  | { type: "GAME_STARTED"; seed: number; mode: string }
  | { type: "KICKED" }
  | { type: "BANNED" }
  | { type: "ERROR"; message: string };

export interface RoomPlayer {
  id: string;
  name: string;
  isHost: boolean;
  team: number;
  ready: boolean;
}

export interface BannedEntry {
  id: string;
  name: string;
}

export interface RoomState {
  code: string;
  mode: string;
  hostId: string;
  players: RoomPlayer[];
  banned: BannedEntry[];
}

export type LobbyEvent =
  | { kind: "kicked" }
  | { kind: "banned" }
  | { kind: "game_starting"; countdown: number }
  | { kind: "game_started"; seed: number; mode: string }
  | { kind: "error"; message: string }
  | { kind: "reconnecting" }
  | { kind: "reconnected" };

export interface LobbyWsState {
  connected: boolean;
  roomCode: string | null;
  playerId: string | null;
  roomState: RoomState | null;
  event: LobbyEvent | null;
  createRoom: (playerName: string, mode: string) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  kickPlayer: (targetId: string) => void;
  banPlayer: (targetId: string) => void;
  changeMode: (mode: string) => void;
  startGame: () => void;
  leaveRoom: () => void;
  toggleReady: () => void;
}

const WS_URL = (() => {
  // Check for Expo environment variable
  if (typeof global !== "undefined" && (global as any).process?.env?.EXPO_PUBLIC_WS_URL) {
    return (global as any).process.env.EXPO_PUBLIC_WS_URL;
  }
  
  // Auto-detect from window location (web)
  if (typeof window !== "undefined" && window.location) {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.host}/ws`;
  }
  
  // Default fallback
  return "ws://localhost:8080/ws";
})();

export function useLobbyWs(): LobbyWsState {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [event, setEvent] = useState<LobbyEvent | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const didCleanupRef = useRef(false);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (didCleanupRef.current) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (didCleanupRef.current) return;
        setConnected(true);
        reconnectAttemptsRef.current = 0;
        if (reconnectAttemptsRef.current > 0) {
          setEvent({ kind: "reconnected" });
        }
      };

      ws.onmessage = (e) => {
        if (didCleanupRef.current) return;
        try {
          const msg = JSON.parse(e.data) as MsgOut;
          switch (msg.type) {
            case "ROOM_CREATED":
              setRoomCode(msg.roomCode);
              setPlayerId(msg.playerId);
              break;
            case "ROOM_JOINED":
              setRoomCode(msg.roomCode);
              setPlayerId(msg.playerId);
              break;
            case "ROOM_STATE":
              setRoomState(msg.state);
              break;
            case "GAME_STARTING":
              setEvent({ kind: "game_starting", countdown: msg.countdown });
              break;
            case "GAME_STARTED":
              setEvent({ kind: "game_started", seed: msg.seed, mode: msg.mode });
              break;
            case "KICKED":
              setEvent({ kind: "kicked" });
              setRoomCode(null);
              setPlayerId(null);
              setRoomState(null);
              break;
            case "BANNED":
              setEvent({ kind: "banned" });
              setRoomCode(null);
              setPlayerId(null);
              setRoomState(null);
              break;
            case "ERROR":
              setEvent({ kind: "error", message: msg.message });
              break;
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      ws.onerror = (err) => {
        if (didCleanupRef.current) return;
        console.error("WebSocket error:", err);
      };

      ws.onclose = () => {
        if (didCleanupRef.current) return;
        setConnected(false);
        
        // Attempt reconnection if we were in a room
        if (roomCode && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          setEvent({ kind: "reconnecting" });
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000));
        }
      };
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
      setConnected(false);
    }
  }, [roomCode]);

  useEffect(() => {
    didCleanupRef.current = false;
    connect();
    
    return () => {
      didCleanupRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const send = useCallback((msg: object) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  const createRoom = useCallback(
    (playerName: string, mode: string) => {
      send({ type: "CREATE_ROOM", playerName, mode });
    },
    [send],
  );

  const joinRoom = useCallback(
    (code: string, playerName: string) => {
      send({ type: "JOIN_ROOM", roomCode: code, playerName });
    },
    [send],
  );

  const kickPlayer = useCallback(
    (targetId: string) => {
      send({ type: "KICK_PLAYER", targetId });
    },
    [send],
  );

  const banPlayer = useCallback(
    (targetId: string) => {
      send({ type: "BAN_PLAYER", targetId });
    },
    [send],
  );

  const changeMode = useCallback(
    (mode: string) => {
      send({ type: "CHANGE_MODE", mode });
    },
    [send],
  );

  const startGame = useCallback(() => {
    send({ type: "START_GAME" });
  }, [send]);

  const leaveRoom = useCallback(() => {
    send({ type: "LEAVE_ROOM" });
    setRoomCode(null);
    setPlayerId(null);
    setRoomState(null);
  }, [send]);

  const toggleReady = useCallback(() => {
    send({ type: "READY_TOGGLE" });
  }, [send]);

  return {
    connected,
    roomCode,
    playerId,
    roomState,
    event,
    createRoom,
    joinRoom,
    kickPlayer,
    banPlayer,
    changeMode,
    startGame,
    leaveRoom,
    toggleReady,
  };
}
