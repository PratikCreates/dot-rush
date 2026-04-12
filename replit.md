# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.
Primary artifact is **Dot Rush** — a mobile game built with Expo React Native.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 with WebSocket relay (ws package)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Dot Rush Mobile Game

### Artifact: `artifacts/mobile`

Expo React Native app — "Dot Rush: Connect, Color & Conquer"

**Game Concept**: Players see a reference image made of solid colored polygon shapes.
They must (1) connect numbered dots in sequence to trace each shape's outline,
then (2) fill the completed region with the correct color.

### Screens
- `/` — Main menu (Play Solo, Multiplayer, Profile, How to Play)
- `/modes` — Game mode selection (6 single-player modes)
- `/difficulty` — Easy/Medium/Hard selection (64/128/256 dots)
- `/game` — Main game canvas with connect-dots and color-fill gameplay
- `/results` — Results screen with stars and score
- `/profile` — Player profile with stats and theme selection
- `/multiplayer` — Multiplayer lobby with real WebSocket networking
- `/howtoplay` — 5-step interactive animated tutorial

### Key Engine Files
- `engine/puzzleGenerator.ts` — Procedural puzzle generation with exact dot count targeting (64/128/256)
- `engine/scoring.ts` — Position-based scoring (1st=10, 2nd=7, 3rd=4, 4th+=1)
- `engine/themes.ts` — Color palette themes
- `engine/graphColoring.ts` — Greedy graph coloring for adjacent regions
- `engine/seededRandom.ts` — Seeded PRNG for reproducible puzzles

### Key Hook Files
- `hooks/useColors.ts` — Dark/light mode palette hook (returns `AppColors & { isDark: boolean }`)
- `hooks/useLobbyWs.ts` — WebSocket hook for real multiplayer lobby networking
- `context/GameContext.tsx` — Game state management
- `context/PlayerContext.tsx` — Player profile & AsyncStorage persistence

### Multiplayer
- Real WebSocket relay via `artifacts/api-server/src/ws/roomManager.ts`
- WebSocket endpoint: `ws://localhost:8080/ws` (development)
- External endpoint: `wss://${REPLIT_DEV_DOMAIN}:8080/ws`
- Room operations: create, join, kick, ban, change mode, start game
- Local simulation fallback when WebSocket is not reachable

### Design System
- **Light mode**: `#FFF0FC` background, `#E6008A` primary (hot pink)
- **Dark mode**: `#0D0020` background, `#FF3CAC` primary
- **Accent**: `#36D6FF` cyan
- **Font**: Inter (400/500/600/700)
- Candy Crush-inspired vibrant retro palette

### Packages Installed
- `expo-linear-gradient`, `expo-haptics`, `expo-font`
- `react-native-svg@15.12.1`
- `@react-native-async-storage/async-storage@2.2.0`
- `react-native-safe-area-context`

## API Server

### Artifact: `artifacts/api-server`

Express 5 server with WebSocket relay for multiplayer.

- HTTP health: `GET /api/healthz`
- WebSocket: `ws://localhost:8080/ws` — room management for multiplayer
- Room messages: CREATE_ROOM, JOIN_ROOM, KICK_PLAYER, BAN_PLAYER, CHANGE_MODE, START_GAME, LEAVE_ROOM, READY_TOGGLE
