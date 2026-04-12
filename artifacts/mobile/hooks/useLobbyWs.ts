/**
 * useLobbyWs – WebSocket hook for Dot Rush multiplayer lobby.
 *
 * Connects to the API server WebSocket endpoint and manages
 * real-time room state (create, join, kick, ban, start game, etc.).
 */

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
  | { kind: "error"; message: string };

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

const WS_URL =
  process.env["EXPO_PUBLIC_WS_URL"] ??
  (typeof window !== "undefined" && window.location
    ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`
    : "ws://localhost:8080/ws");

export function useLobbyWs(): LobbyWsState {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [event, setEvent] = useState<LobbyEvent | null>(null);

  // Establish connection once on mount
  useEffect(() => {
    let ws: WebSocket;
    let didCleanup = false;

    try {
      ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!didCleanup) setConnected(true);
      };

      ws.onclose = () => {
        if (!didCleanup) setConnected(false);
      };

      ws.onerror = () => {
        if (!didCleanup) setConnected(false);
      };

      ws.onmessage = (ev) => {
        if (didCleanup) return;
        let msg: MsgOut;
        try {
          msg = JSON.parse(ev.data as string) as MsgOut;
        } catch {
          return;
        }
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
      };
    } catch {
      // WebSocket not available in this environment (e.g. SSR)
    }

    return () => {
      didCleanup = true;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

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
      if (!roomCode || !playerId) return;
      send({ type: "KICK_PLAYER", roomCode, targetId, requesterId: playerId });
    },
    [send, roomCode, playerId],
  );

  const banPlayer = useCallback(
    (targetId: string) => {
      if (!roomCode || !playerId) return;
      send({ type: "BAN_PLAYER", roomCode, targetId, requesterId: playerId });
    },
    [send, roomCode, playerId],
  );

  const changeMode = useCallback(
    (mode: string) => {
      if (!roomCode || !playerId) return;
      send({ type: "CHANGE_MODE", roomCode, mode, requesterId: playerId });
    },
    [send, roomCode, playerId],
  );

  const startGame = useCallback(() => {
    if (!roomCode || !playerId) return;
    send({ type: "START_GAME", roomCode, requesterId: playerId });
  }, [send, roomCode, playerId]);

  const leaveRoom = useCallback(() => {
    if (!roomCode || !playerId) return;
    send({ type: "LEAVE_ROOM", roomCode, playerId });
    setRoomCode(null);
    setPlayerId(null);
    setRoomState(null);
  }, [send, roomCode, playerId]);

  const toggleReady = useCallback(() => {
    if (!roomCode || !playerId) return;
    send({ type: "READY_TOGGLE", roomCode, playerId });
  }, [send, roomCode, playerId]);

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
