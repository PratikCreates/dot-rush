# 🎮 Dot Rush

A fast-paced puzzle game where you connect dots to form shapes and color them correctly. Built with React Native (Expo) and Express.

## 🎯 Game Modes

- **Time Trial** - Race against the clock to beat your personal best
- **Challenge** - Strict countdown mode - fail if time runs out
- **Daily Puzzle** - Same puzzle for everyone, with daily streak tracking
- **Endless** - Auto-generates puzzles with increasing difficulty
- **Accuracy** - No timer, but zero mistakes allowed
- **Speed Run** - Fastest completion wins

## 🎨 Features

### Core Gameplay
- ✅ Connect dots in sequence to form shapes
- ✅ Color completed shapes with the correct color
- ✅ Multiple difficulty levels (Easy, Medium, Hard)
- ✅ 6 unlockable color themes
- ✅ Star rating system based on performance
- ✅ Hint system and color reveal power-ups

### Game Enhancements (Recently Added)
- ✅ **Pause/Resume** - Pause the game anytime with a modal menu
- ✅ **Endless Mode Progression** - Continue to next level or end your run
- ✅ **Daily Puzzle Validation** - Prevents multiple plays per day
- ✅ **Daily Streak Counter** - Track your consecutive daily completions
- ✅ **Level Counter** - See your current level in endless mode

### Multiplayer Features
- ✅ WebSocket-based real-time multiplayer
- ✅ Room creation with 4-digit codes
- ✅ Host controls (kick, ban, mode selection)
- ✅ Team assignment for 2v2 modes
- ✅ **Auto-reconnection** - Automatic reconnection with exponential backoff
- ✅ **Connection Status** - Real-time connection indicator
- ✅ Synchronized game start with countdown

### Player Progression
- ✅ Profile with stats tracking
- ✅ Personal best records per puzzle
- ✅ Theme unlocking at star milestones (15, 30, 50, 75 stars)
- ✅ Win/loss tracking
- ✅ Endless streak records

## 🏗️ Architecture

### Mobile App (`artifacts/mobile`)
- **Framework**: Expo 54 + React Native
- **Routing**: Expo Router (file-based)
- **State Management**: React Context (GameContext, PlayerContext)
- **Storage**: AsyncStorage for local persistence
- **Styling**: StyleSheet with theme support (dark/light mode)

### API Server (`artifacts/api-server`)
- **Framework**: Express 5
- **WebSocket**: ws library for multiplayer
- **Logging**: Pino
- **Build**: esbuild

### Game Engine (`artifacts/mobile/engine`)
- **Puzzle Generation**: Voronoi-like region growing algorithm
- **Graph Coloring**: Greedy algorithm for color assignment
- **Seeded RNG**: Reproducible puzzles for daily mode
- **Scoring**: Points for connections, colors, and accuracy

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- Expo CLI

### Installation

```bash
# Install dependencies
pnpm install

# Start API server (in one terminal)
cd artifacts/api-server
pnpm dev

# Start mobile app (in another terminal)
cd artifacts/mobile
pnpm dev
```

### Environment Variables

**Mobile App** (`.env`):
```
EXPO_PUBLIC_WS_URL=ws://localhost:8080/ws
```

**API Server** (`.env`):
```
PORT=8080
```

## 📱 Screens

- **Home** - Main menu with floating dot animation
- **Modes** - Game mode selection with descriptions
- **Difficulty** - Choose difficulty and theme
- **Game** - Main gameplay screen with canvas, HUD, and controls
- **Results** - Score summary with stars and personal best
- **Profile** - Player stats and theme unlocking
- **Multiplayer** - Room creation, joining, and lobby management
- **How to Play** - Tutorial with animated examples

## 🎮 Controls

- **Tap a shape** - Select it for dot connection
- **Tap dots in order** - Connect them sequentially
- **Tap color swatch** - Color the completed shape
- **Hint button** - Highlight the next dot to tap
- **Color reveal** - Show the correct color for current shape
- **Pause button** - Pause the game (top right)

## 🔧 Recent Improvements

### Game Features
1. **Pause/Resume System**
   - Modal pause menu with resume and quit options
   - Timer pauses when game is paused
   - Prevents accidental quits

2. **Endless Mode Enhancements**
   - Auto-generates next level on completion
   - Continue or end run modal
   - Level counter in header
   - Cumulative score tracking

3. **Daily Puzzle System**
   - Validates same-day constraint
   - Shows completion status on modes screen
   - Daily streak counter with fire emoji
   - Prevents multiple plays per day

### Multiplayer Improvements
4. **WebSocket Reconnection**
   - Automatic reconnection with exponential backoff
   - Max 5 reconnection attempts
   - Reconnecting/reconnected alerts
   - Proper cleanup on unmount

5. **Connection Status**
   - Real-time connection indicator
   - Visual feedback (green/red icon)
   - Connection status text

### Code Quality
6. **TypeScript Fixes**
   - Resolved process.env access issues
   - Cross-environment compatibility
   - Proper type definitions

## 📊 Game Mechanics

### Scoring
- **Shape Connected**: +10 points
- **Shape Colored Correctly**: +40 points
- **Region Correct**: +5 points
- **Wrong Tap**: -2 points
- **Wrong Color**: -1 point
- **Speed Bonus**: Based on remaining time

### Star Rating
- 3 stars: High score, fast time, few mistakes
- 2 stars: Good performance
- 1 star: Completed but with issues
- 0 stars: Failed or time expired

### Mistake System
- 3 mistakes allowed per shape connection
- After 3 mistakes, connection resets
- Accuracy mode: 0 mistakes allowed

## 🎨 Themes

1. **Animals** (Default)
2. **Food** (Default)
3. **Nature** (15 stars)
4. **Vehicles** (30 stars)
5. **Space** (50 stars)
6. **Holidays** (75 stars)

## 🐛 Known Issues & Future Improvements

### To Be Implemented
- [ ] Multiplayer real-time game sync (progress tracking)
- [ ] Best of 5 round management
- [ ] Tournament bracket system
- [ ] Team 2v2 dot/color split
- [ ] Global leaderboards
- [ ] Achievements system
- [ ] Undo/redo functionality
- [ ] Tutorial mode
- [ ] Sound effects and music
- [ ] Haptic feedback improvements

### Performance Optimizations Needed
- [ ] Puzzle generation caching
- [ ] SVG rendering optimization for hard mode
- [ ] Lazy loading for multiplayer player lists

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or feedback, please open an issue on GitHub.
