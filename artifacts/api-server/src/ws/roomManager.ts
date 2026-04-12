import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage, Server } from "http";

// ── Types ────────────────────────────────────────────────────────────────────

export type MsgIn =
  | { type: "CREATE_ROOM"; playerName: string; mode: string }
  | { type: "JOIN_ROOM"; roomCode: string; playerName: string }
  | { type: "READY_TOGGLE" }
  | { type: "KICK_PLAYER"; targetId: string }
  | { type: "BAN_PLAYER"; targetId: string }
  | { type: "CHANGE_MODE"; mode: string }
  | { type: "START_GAME" }
  | { type: "LEAVE_ROOM" };

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

// ── In-memory stores ─────────────────────────────────────────────────────────

const rooms = new Map<string, Room>();
let _idCounter = 0;

const socketIdentity = new Map<WebSocket, { roomCode: string; playerId: string }>();

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateRoomCode(): string {
  const code = String(Math.floor(1000 + Math.random() * 9000));
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

function resolveIdentity(ws: WebSocket): { room: Room; player: RoomPlayer } | undefined {
  const identity = socketIdentity.get(ws);
  if (!identity) return undefined;
  const room = rooms.get(identity.roomCode);
  if (!room) return undefined;
  const player = room.players.get(identity.playerId);
  if (!player) return undefined;
  return { room, player };
}

function removePlayer(ws: WebSocket): void {
  const identity = socketIdentity.get(ws);
  socketIdentity.delete(ws);
  if (!identity) return;

  const room = rooms.get(identity.roomCode);
  if (!room) return;

  room.players.delete(identity.playerId);

  if (room.players.size === 0) {
    rooms.delete(identity.roomCode);
    return;
  }

  if (room.hostId === identity.playerId) {
    const next = room.players.values().next().value;
    if (next) {
      next.isHost = true;
      room.hostId = next.id;
    }
  }
  broadcast(room, { type: "ROOM_STATE", state: getRoomState(room) });
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
      // Bind this socket to its server-assigned identity — never trust client claims
      socketIdentity.set(ws, { roomCode: code, playerId: id });
      sendTo(ws, { type: "ROOM_CREATED", roomCode: code, playerId: id });
      broadcast(room, { type: "ROOM_STATE", state: getRoomState(room) });
      break;
    }

    case "JOIN_ROOM": {
      if (socketIdentity.has(ws)) {
        sendTo(ws, { type: "ERROR", message: "Already in a room" });
        return;
      }
      const room = rooms.get(msg.roomCode);
      if (!room) { sendTo(ws, { type: "ERROR", message: "Room not found" }); return; }
      if (room.players.size >= 8) { sendTo(ws, { type: "ERROR", message: "Room is full" }); return; }
      if (room.banned.some((b) => b.name === msg.playerName)) {
        sendTo(ws, { type: "BANNED" }); return;
      }
      const id = nextId();
      const player: RoomPlayer = {
        id, name: msg.playerName, isHost: false,
        team: (room.players.size % 2) + 1,
        ready: false, ws,
      };
      room.players.set(id, player);
      // Bind this socket to its server-assigned identity
      socketIdentity.set(ws, { roomCode: msg.roomCode, playerId: id });
      sendTo(ws, { type: "ROOM_JOINED", roomCode: msg.roomCode, playerId: id });
      broadcast(room, { type: "ROOM_STATE", state: getRoomState(room) });
      break;
    }

    case "READY_TOGGLE": {
      const ctx = resolveIdentity(ws);
      if (!ctx) return;
      ctx.player.ready = !ctx.player.ready;
      broadcast(ctx.room, { type: "ROOM_STATE", state: getRoomState(ctx.room) });
      break;
    }

    case "KICK_PLAYER": {
      const ctx = resolveIdentity(ws);
      if (!ctx) return;
      // Only the host may kick; identity is verified via socket, not client claim
      if (ctx.room.hostId !== ctx.player.id) {
        sendTo(ws, { type: "ERROR", message: "Only the host can kick players" });
        return;
      }
      const target = ctx.room.players.get(msg.targetId);
      if (!target) return;
      sendTo(target.ws, { type: "KICKED" });
      socketIdentity.delete(target.ws);
      target.ws.close();
      ctx.room.players.delete(msg.targetId);
      broadcast(ctx.room, { type: "ROOM_STATE", state: getRoomState(ctx.room) });
      break;
    }

    case "BAN_PLAYER": {
      const ctx = resolveIdentity(ws);
      if (!ctx) return;
      if (ctx.room.hostId !== ctx.player.id) {
        sendTo(ws, { type: "ERROR", message: "Only the host can ban players" });
        return;
      }
      const target = ctx.room.players.get(msg.targetId);
      if (!target) return;
      ctx.room.banned.push({ id: target.id, name: target.name });
      sendTo(target.ws, { type: "BANNED" });
      socketIdentity.delete(target.ws);
      target.ws.close();
      ctx.room.players.delete(msg.targetId);
      broadcast(ctx.room, { type: "ROOM_STATE", state: getRoomState(ctx.room) });
      break;
    }

    case "CHANGE_MODE": {
      const ctx = resolveIdentity(ws);
      if (!ctx) return;
      if (ctx.room.hostId !== ctx.player.id) {
        sendTo(ws, { type: "ERROR", message: "Only the host can change the mode" });
        return;
      }
      ctx.room.mode = msg.mode;
      broadcast(ctx.room, { type: "ROOM_STATE", state: getRoomState(ctx.room) });
      break;
    }

    case "START_GAME": {
      const ctx = resolveIdentity(ws);
      if (!ctx) return;
      if (ctx.room.hostId !== ctx.player.id) {
        sendTo(ws, { type: "ERROR", message: "Only the host can start the game" });
        return;
      }
      broadcast(ctx.room, { type: "GAME_STARTING", countdown: 10 });
      const seed = Math.floor(Math.random() * 999_983);
      const { room } = ctx;
      setTimeout(() => {
        broadcast(room, { type: "GAME_STARTED", seed, mode: room.mode });
      }, 10_000);
      break;
    }

    case "LEAVE_ROOM": {
      removePlayer(ws);
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
      removePlayer(ws);
    });
  });

  setInterval(removeStaleRooms, 60_000);
}
