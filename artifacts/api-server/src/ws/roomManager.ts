import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage, Server } from "http";

// ── Types ────────────────────────────────────────────────────────────────────

export type MsgIn =
  | { type: "CREATE_ROOM"; playerName: string; mode: string }
  | { type: "JOIN_ROOM"; roomCode: string; playerName: string }
  | { type: "READY_TOGGLE"; roomCode: string; playerId: string }
  | { type: "KICK_PLAYER"; roomCode: string; targetId: string; requesterId: string }
  | { type: "BAN_PLAYER"; roomCode: string; targetId: string; requesterId: string }
  | { type: "CHANGE_MODE"; roomCode: string; mode: string; requesterId: string }
  | { type: "START_GAME"; roomCode: string; requesterId: string }
  | { type: "LEAVE_ROOM"; roomCode: string; playerId: string };

export type MsgOut =
  | { type: "ROOM_CREATED"; roomCode: string; playerId: string }
  | { type: "ROOM_JOINED"; roomCode: string; playerId: string }
  | { type: "ROOM_STATE"; state: RoomState }
  | { type: "GAME_STARTING"; countdown: number }
  | { type: "GAME_STARTED"; seed: number; mode: string }
  | { type: "KICKED" }
  | { type: "BANNED" }
  | { type: "ERROR"; message: string };

interface RoomPlayer {
  id: string;
  name: string;
  isHost: boolean;
  team: number;
  ready: boolean;
  ws: WebSocket;
}

interface BannedEntry {
  id: string;
  name: string;
}

interface Room {
  code: string;
  mode: string;
  players: Map<string, RoomPlayer>;
  banned: BannedEntry[];
  hostId: string;
  createdAt: number;
}

export interface RoomState {
  code: string;
  mode: string;
  hostId: string;
  players: Array<{ id: string; name: string; isHost: boolean; team: number; ready: boolean }>;
  banned: BannedEntry[];
}

// ── In-memory room store ─────────────────────────────────────────────────────

const rooms = new Map<string, Room>();
let _idCounter = 0;

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? generateRoomCode() : code;
}

function nextId(): string {
  return `p${++_idCounter}`;
}

function getRoomState(room: Room): RoomState {
  return {
    code: room.code,
    mode: room.mode,
    hostId: room.hostId,
    players: Array.from(room.players.values()).map(({ id, name, isHost, team, ready }) => ({
      id, name, isHost, team, ready,
    })),
    banned: room.banned,
  };
}

function broadcast(room: Room, msg: MsgOut): void {
  const payload = JSON.stringify(msg);
  for (const p of room.players.values()) {
    if (p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(payload);
    }
  }
}

function sendTo(ws: WebSocket, msg: MsgOut): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function removeStaleRooms(): void {
  const cutoff = Date.now() - 3_600_000; // 1 h
  for (const [code, room] of rooms) {
    if (room.createdAt < cutoff && room.players.size === 0) {
      rooms.delete(code);
    }
  }
}

// ── Message handler ──────────────────────────────────────────────────────────

function handleMessage(ws: WebSocket, raw: string): void {
  let msg: MsgIn;
  try {
    msg = JSON.parse(raw) as MsgIn;
  } catch {
    sendTo(ws, { type: "ERROR", message: "Invalid JSON" });
    return;
  }

  switch (msg.type) {
    case "CREATE_ROOM": {
      const code = generateRoomCode();
      const id = nextId();
      const player: RoomPlayer = {
        id, name: msg.playerName, isHost: true, team: 1, ready: true, ws,
      };
      const room: Room = {
        code, mode: msg.mode,
        players: new Map([[id, player]]),
        banned: [],
        hostId: id,
        createdAt: Date.now(),
      };
      rooms.set(code, room);
      sendTo(ws, { type: "ROOM_CREATED", roomCode: code, playerId: id });
      broadcast(room, { type: "ROOM_STATE", state: getRoomState(room) });
      break;
    }

    case "JOIN_ROOM": {
      const room = rooms.get(msg.roomCode);
      if (!room) { sendTo(ws, { type: "ERROR", message: "Room not found" }); return; }
      if (room.players.size >= 4) { sendTo(ws, { type: "ERROR", message: "Room is full" }); return; }
      if (room.banned.some((b) => b.name === msg.playerName)) {
        sendTo(ws, { type: "BANNED" }); return;
      }
      const id = nextId();
      const player: RoomPlayer = {
        id, name: msg.playerName, isHost: false, team: room.players.size % 2 + 1,
        ready: false, ws,
      };
      room.players.set(id, player);
      sendTo(ws, { type: "ROOM_JOINED", roomCode: msg.roomCode, playerId: id });
      broadcast(room, { type: "ROOM_STATE", state: getRoomState(room) });
      break;
    }

    case "READY_TOGGLE": {
      const room = rooms.get(msg.roomCode);
      if (!room) return;
      const player = room.players.get(msg.playerId);
      if (!player) return;
      player.ready = !player.ready;
      broadcast(room, { type: "ROOM_STATE", state: getRoomState(room) });
      break;
    }

    case "KICK_PLAYER": {
      const room = rooms.get(msg.roomCode);
      if (!room || room.hostId !== msg.requesterId) return;
      const target = room.players.get(msg.targetId);
      if (!target) return;
      sendTo(target.ws, { type: "KICKED" });
      target.ws.close();
      room.players.delete(msg.targetId);
      broadcast(room, { type: "ROOM_STATE", state: getRoomState(room) });
      break;
    }

    case "BAN_PLAYER": {
      const room = rooms.get(msg.roomCode);
      if (!room || room.hostId !== msg.requesterId) return;
      const target = room.players.get(msg.targetId);
      if (!target) return;
      room.banned.push({ id: target.id, name: target.name });
      sendTo(target.ws, { type: "BANNED" });
      target.ws.close();
      room.players.delete(msg.targetId);
      broadcast(room, { type: "ROOM_STATE", state: getRoomState(room) });
      break;
    }

    case "CHANGE_MODE": {
      const room = rooms.get(msg.roomCode);
      if (!room || room.hostId !== msg.requesterId) return;
      room.mode = msg.mode;
      broadcast(room, { type: "ROOM_STATE", state: getRoomState(room) });
      break;
    }

    case "START_GAME": {
      const room = rooms.get(msg.roomCode);
      if (!room || room.hostId !== msg.requesterId) return;
      broadcast(room, { type: "GAME_STARTING", countdown: 10 });
      const seed = Math.floor(Math.random() * 999983);
      setTimeout(() => {
        broadcast(room, { type: "GAME_STARTED", seed, mode: room.mode });
      }, 10_000);
      break;
    }

    case "LEAVE_ROOM": {
      const room = rooms.get(msg.roomCode);
      if (!room) return;
      room.players.delete(msg.playerId);
      if (room.players.size === 0) {
        rooms.delete(msg.roomCode);
      } else if (room.hostId === msg.playerId) {
        // Transfer host to the next player
        const next = room.players.values().next().value;
        if (next) {
          next.isHost = true;
          room.hostId = next.id;
        }
        broadcast(room, { type: "ROOM_STATE", state: getRoomState(room) });
      } else {
        broadcast(room, { type: "ROOM_STATE", state: getRoomState(room) });
      }
      break;
    }

    default:
      sendTo(ws, { type: "ERROR", message: "Unknown message type" });
  }
}

// ── Setup ────────────────────────────────────────────────────────────────────

export function attachWebSocketServer(httpServer: Server): void {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage) => {
    ws.on("message", (data) => {
      handleMessage(ws, data.toString());
    });

    ws.on("close", () => {
      // Clean up: remove disconnected players from any room
      for (const [code, room] of rooms) {
        for (const [pid, player] of room.players) {
          if (player.ws === ws) {
            room.players.delete(pid);
            if (room.players.size === 0) {
              rooms.delete(code);
            } else {
              if (room.hostId === pid) {
                const next = room.players.values().next().value;
                if (next) { next.isHost = true; room.hostId = next.id; }
              }
              broadcast(room, { type: "ROOM_STATE", state: getRoomState(room) });
            }
            break;
          }
        }
      }
    });
  });

  // Periodically remove empty stale rooms
  setInterval(removeStaleRooms, 60_000);
}
